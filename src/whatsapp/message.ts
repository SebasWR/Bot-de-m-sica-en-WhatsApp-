import type { WAMessage } from 'baileys';

function unwrap(msg: Pick<WAMessage, 'message'>) {
  const m = msg.message;
  if (!m) return null;
  // Mensajes temporales / "ver una vez" envuelven el contenido real
  return m.ephemeralMessage?.message ?? m.viewOnceMessage?.message ?? m.viewOnceMessageV2?.message ?? m;
}

/** JIDs mencionados con @ en el mensaje (texto o pie de foto/vídeo). */
export function extractMentions(msg: Pick<WAMessage, 'message'>): string[] {
  const m = unwrap(msg);
  if (!m) return [];
  const info = m.extendedTextMessage?.contextInfo ?? m.imageMessage?.contextInfo ?? m.videoMessage?.contextInfo;
  return (info?.mentionedJid ?? []).filter((j): j is string => typeof j === 'string' && j.length > 0);
}

/** Extrae el texto de un mensaje de WhatsApp (texto simple, respuesta o pie de foto/vídeo). */
export function extractText(msg: Pick<WAMessage, 'message'>): string | null {
  const m = unwrap(msg);
  if (!m) return null;
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.buttonsResponseMessage?.selectedButtonId ??
    m.listResponseMessage?.singleSelectReply?.selectedRowId ??
    null
  );
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

/** Quién envió el mensaje: en grupos es el participante, en privado el chat. */
export function senderOf(msg: Pick<WAMessage, 'key'>): string | null {
  const chat = msg.key.remoteJid;
  if (!chat) return null;
  return isGroupJid(chat) ? (msg.key.participant ?? null) : chat;
}
