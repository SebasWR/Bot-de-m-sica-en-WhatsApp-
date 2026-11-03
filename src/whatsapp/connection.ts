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
          const code = await sock.requestPairingCode(config.pairingNumber);
          logger.info(`Código de emparejamiento: ${code} (WhatsApp → Dispositivos vinculados → Vincular con número)`);
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
      if (code === DisconnectReason.loggedOut) {
        logger.error(
          `Sesión cerrada desde el teléfono. Borra la carpeta ${config.authDir} y reinicia el bot para escanear un QR nuevo.`,
        );
        process.exit(1);
      }
      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      logger.warn({ code, delay }, 'Conexión cerrada, reconectando...');
      setTimeout(() => {
        connectToWhatsApp(handlers, attempt + 1).catch((err) => {
          logger.fatal({ err }, 'No se pudo reconectar');
          process.exit(1);
        });
      }, delay);
    }
  });

  handlers.onSocket(sock);
  return sock;
}
