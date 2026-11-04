import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleText, type IncomingContext } from '../src/commands/handler.js';
import { createRegistry } from '../src/commands/index.js';
import { BotDatabase } from '../src/db/database.js';
import type { AudioService } from '../src/services/audio.js';
import { explain, type MusicService, type Track } from '../src/services/music.js';
import { BotState } from '../src/state.js';
import { GameManager } from '../src/games/manager.js';

const song: Track = { id: 'abc', title: 'Canción de prueba', url: 'https://youtu.be/abc', duration: 180, uploader: 'Artista' };
const longSong: Track = { ...song, id: 'long', title: 'Mix de 2 horas', duration: 7200 };

function setup() {
  const replies: string[] = [];
  const audios: string[] = [];
  const cleaned: string[] = [];
  const music = {
    searchAny: async () => [song, longSong],
    resolve: async (q: string) => (q.includes('larga') ? longSong : q.includes('nada') ? null : song),
    download: async (t: Track) => ({ track: t, file: '/tmp/x.webm' }),
  } as unknown as MusicService;
  const audio = {
    toOpus: async () => '/tmp/x.opus.ogg',
    cleanup: async (...f: string[]) => void cleaned.push(...f),
  } as unknown as AudioService;
  const db = new BotDatabase(':memory:');
  const base: IncomingContext = {
    chatJid: 'chat@s.whatsapp.net',
    senderJid: 'user@s.whatsapp.net',
    senderName: 'Tester',
    isGroup: false,
    services: { db, music, audio, state: new BotState(), games: new GameManager(), gifs: {} as never },
    reply: async (t) => void replies.push(t),
    react: async () => {},
    sendAudio: async (a) => void audios.push(a.file),
    sendGif: async () => {},
  };
  return { base, replies, audios, cleaned, db, registry: createRegistry() };
}

test('ignora mensajes que no son comandos', async () => {
  const { base, registry, replies } = setup();
  assert.equal(await handleText(registry, 'hola', base), false);
  assert.equal(replies.length, 0);
});

test('avisa de comandos desconocidos', async () => {
  const { base, registry, replies } = setup();
  await handleText(registry, '!xyz', base);
  assert.match(replies[0]!, /No conozco/);
});

test('!play descarga, convierte, envía, guarda historial y limpia', async () => {
  const { base, registry, audios, db, cleaned } = setup();
  await handleText(registry, '!play canción', base);
  assert.deepEqual(audios, ['/tmp/x.opus.ogg']);
  assert.equal(db.getHistory('user@s.whatsapp.net')[0]?.title, 'Canción de prueba');
  assert.deepEqual(cleaned, ['/tmp/x.webm', '/tmp/x.opus.ogg']);
});

test('!play rechaza canciones demasiado largas', async () => {
  const { base, registry, audios, replies } = setup();
  await handleText(registry, '!play canción larga', base);
  assert.equal(audios.length, 0);
  assert.match(replies.at(-1)!, /máximo permitido/);
});

test('!play aplica el tiempo de espera', async () => {
  const { base, registry, replies } = setup();
  await handleText(registry, '!play uno', base);
  await handleText(registry, '!p dos', base);
  assert.match(replies.at(-1)!, /Espera \d+s/);
});

test('!buscar y luego !play <número>', async () => {
  const { base, registry, replies, audios } = setup();
  await handleText(registry, '!buscar algo', base);
  assert.match(replies[0]!, /1\.\* Canción de prueba/);
  await handleText(registry, '!play 1', base);
  assert.deepEqual(audios, ['/tmp/x.opus.ogg']);
});

test('!historial y !top', async () => {
  const { base, registry, replies } = setup();
  await handleText(registry, '!historial', base);
  assert.match(replies.at(-1)!, /Aún no/);
  await handleText(registry, '!play x', base);
  await handleText(registry, '!h', base);
  assert.match(replies.at(-1)!, /Canción de prueba/);
  await handleText(registry, '!top', base);
  assert.match(replies.at(-1)!, /1 vez/);
});

test('los errores de un comando se responden sin tumbar el bot', async () => {
  const { base, registry, replies } = setup();
  (base.services.music as unknown as { resolve: () => Promise<never> }).resolve = async () => {
    throw new Error('yt-dlp caído');
  };
  assert.equal(await handleText(registry, '!play x', base), true);
  assert.match(replies.at(-1)!, /error/);
});

test('un error de YouTube con mensaje para el usuario se muestra tal cual', async () => {
  const { base, registry, replies } = setup();
  (base.services.music as unknown as { resolve: () => Promise<never> }).resolve = async () => {
    throw explain(new Error('yt-dlp terminó con código 1: ERROR: Sign in to confirm you’re not a bot'));
  };
  await handleText(registry, '!play x', base);
  assert.match(replies.at(-1)!, /YouTube bloqueó/);
});
