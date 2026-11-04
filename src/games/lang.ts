export type Lang = 'es' | 'en';

const EN_WORDS = new Set(['en', 'eng', 'english', 'ingles', 'inglés']);

/** "!trivia en" / "!ahorcado ingles" → 'en'. Devuelve null si el texto no es un idioma. */
export function parseLang(text: string | undefined): Lang | null {
  const t = (text ?? '').trim().toLowerCase();
  if (EN_WORDS.has(t)) return 'en';
  if (['es', 'esp', 'español', 'espanol', 'spanish'].includes(t)) return 'es';
  return null;
}
