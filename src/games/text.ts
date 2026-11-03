/** "549111@s.whatsapp.net" → "@549111". Con `mentions` WhatsApp lo muestra como etiqueta. */
export function tag(jid: string): string {
  return `@${jid.split('@')[0]?.split(':')[0] ?? jid}`;
}

/**
 * Minúsculas y sin tildes, pero conservando la ñ.
 * "Canción" → "cancion", "Ñandú" → "ñandu".
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'ñ');
}
