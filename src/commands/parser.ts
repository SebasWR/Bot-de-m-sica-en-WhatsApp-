export interface ParsedCommand {
  name: string;
  args: string[];
  text: string;
}

/** Separa "!play bad bunny" en { name: 'play', args: ['bad', 'bunny'], text: 'bad bunny' }. */
export function parseCommand(input: string, prefix: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith(prefix)) return null;
  const body = trimmed.slice(prefix.length).trim();
  if (!body) return null;
  const [rawName = '', ...rest] = body.split(/\s+/);
  const name = rawName.toLowerCase();
  const text = body.slice(rawName.length).trim();
  return { name, args: rest, text };
}
