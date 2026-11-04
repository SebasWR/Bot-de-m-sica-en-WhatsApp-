import fs from 'node:fs/promises';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from 'baileys';
import qrcode from 'qrcode-terminal';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export interface ConnectionHandlers {
  onSocket(sock: WASocket): void;
}

function statusCodeOf(error: unknown): number | undefined {
  return (error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
}

/** Pide la última versión de WhatsApp Web; si tarda o falla, usa la que trae Baileys. */
async function resolveWaVersion(timeoutMs = 10_000): Promise<{ version?: [number, number, number]; isLatest: boolean }> {
  const fallback = { version: undefined, isLatest: false };
  const timeout = new Promise<typeof fallback>((resolve) => setTimeout(() => resolve(fallback), timeoutMs).unref());
  return Promise.race([
    fetchLatestBaileysVersion()
      .then((r) => ({ version: r.version, isLatest: r.isLatest }))
      .catch(() => fallback),
    timeout,
  ]);
}

/**
 * Abre la conexión con WhatsApp usando Baileys. La sesión se guarda en AUTH_DIR,
 * así solo hay que escanear el QR la primera vez. Se reconecta sola si se corta.
 */
export async function connectToWhatsApp(handlers: ConnectionHandlers, attempt = 0): Promise<WASocket> {
  await fs.mkdir(config.authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version, isLatest } = await resolveWaVersion();
  logger.info({ version: version?.join('.'), isLatest }, 'Conectando a WhatsApp');

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: logger.child({ module: 'baileys' }, { level: 'warn' }),
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  let pairingRequested = false;
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      if (config.pairingNumber && !state.creds.registered && !pairingRequested) {
        pairingRequested = true;
        try {
          const raw = await sock.requestPairingCode(config.pairingNumber);
          const code = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
          logger.info(
            [
              '',
              '==============================================',
              `   CÓDIGO PARA VINCULAR:   ${code}`,
              '==============================================',
              'En el celular del bot: WhatsApp → ⋮ → Dispositivos vinculados →',
              '"Vincular un dispositivo" → "Vincular con el número de teléfono".',
              'Tenés unos 2 minutos. Si se vence, aparece uno nuevo solo.',
            ].join('\n'),
          );
        } catch (err) {
          logger.error({ err }, 'No se pudo pedir el código de emparejamiento');
        }
      } else if (!config.pairingNumber) {
        logger.info('Escanea este QR con WhatsApp → Dispositivos vinculados → Vincular dispositivo');
        qrcode.generate(qr, { small: true });
      }
    }

    if (connection === 'open') {
      attempt = 0;
      logger.info({ user: sock.user?.id }, '✅ Conectado a WhatsApp');
    }

    if (connection === 'close') {
      const code = statusCodeOf(lastDisconnect?.error);
      const loggedOut = code === DisconnectReason.loggedOut;
      const restartAfterPairing = code === DisconnectReason.restartRequired;

      // Si la vinculación quedó a medias (el código se venció o falló), Baileys guardó
      // un "me" sin registrar y al reconectar intenta loguearse → WhatsApp responde 401
      // y queda en bucle. Lo mismo si cerraron la sesión desde el teléfono. En ambos
      // casos empezamos de cero con una sesión limpia y un código nuevo.
      if (loggedOut || (!state.creds.registered && !restartAfterPairing)) {
        sock.ev.off('creds.update', saveCreds);
        await fs.rm(config.authDir, { recursive: true, force: true }).catch(() => {});
        logger.warn(
          loggedOut
            ? 'La sesión se cerró desde el teléfono. Empiezo de cero y te doy un código nuevo.'
            : 'La vinculación no se completó. Pido un código nuevo…',
        );
      }

      const delay = restartAfterPairing ? 500 : Math.min(30_000, 2_000 * 2 ** Math.min(attempt, 4));
      if (!restartAfterPairing) logger.warn({ code, delay }, 'Conexión cerrada, reconectando...');
      setTimeout(() => {
        connectToWhatsApp(handlers, restartAfterPairing ? 0 : attempt + 1).catch((err) => {
          logger.fatal({ err }, 'No se pudo reconectar');
          process.exit(1);
        });
      }, delay);
    }
  });

  handlers.onSocket(sock);
  return sock;
}
