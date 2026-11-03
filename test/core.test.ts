import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCommand } from '../src/commands/parser.js';
import { CommandRegistry } from '../src/commands/registry.js';
import { BotDatabase } from '../src/db/database.js';
import { parseYtDlpLines } from '../src/services/music.js';
import { BotState } from '../src/state.js';
import { formatDuration } from '../src/utils/format.js';
import { extractText, senderOf } from '../src/whatsapp/message.js';

test('parseCommand separa nombre, argumentos y texto', () => {
  assert.deepEqual(parseCommand('!Play  bad bunny ', '!'), { name: 'play', args: ['bad', 'bunny'], text: 'bad bunny' });
  assert.deepEqual(parseCommand('!ping', '!'), { name: 'ping', args: [], text: '' });
  assert.equal(parseCommand('hola', '!'), null);
  assert.equal(parseCommand('!', '!'), null);
  assert.equal(parseCommand('/play x', '!'), null);
});

test('CommandRegistry resuelve alias y rechaza duplicados', () => {
  const r = new CommandRegistry();
  const cmd = { name: 'play', aliases: ['p'], description: '', execute: async () => {} };
  r.register(cmd);
  assert.equal(r.get('P'), cmd);
  assert.equal(r.get('nada'), undefined);
  assert.throws(() => r.register({ name: 'p', description: '', execute: async () => {} }));
});

test('formatDuration', () => {
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(null), '--:--');
});

test('parseYtDlpLines lee la salida de yt-dlp', () => {
  const out = [
    JSON.stringify({ id: 'abc', title: 'Tema', duration: 200, channel: 'Artista', url: 'https://www.youtube.com/watch?v=abc' }),
    'basura',
    JSON.stringify({ id: 'def', title: 'Otro', url: 'def' }),
    JSON.stringify({ title: 'sin id' }),
  ].join('\n');
  const tracks = parseYtDlpLines(out);
  assert.equal(tracks.length, 2);
  assert.deepEqual(tracks[0], { id: 'abc', title: 'Tema', url: 'https://www.youtube.com/watch?v=abc', duration: 200, uploader: 'Artista' });
  assert.equal(tracks[1]?.url, 'https://www.youtube.com/watch?v=def');
  assert.equal(tracks[1]?.duration, null);
});

test('BotState guarda búsquedas, cooldown y bloqueo', () => {
  let now = 1_000_000;
  const s = new BotState(() => now);
  const track = { id: '1', title: 'A', url: 'u', duration: 1, uploader: null };
  s.saveSearch('u1', [track]);
  assert.equal(s.pickFromSearch('u1', 1), track);
  assert.equal(s.pickFromSearch('u1', 2), undefined);
  now += 11 * 60_000;
  assert.equal(s.pickFromSearch('u1', 1), undefined, 'la búsqueda caduca');

  assert.equal(s.cooldownRemaining('u1', 15), 0);
  s.markUsed('u1');
  now += 5_000;
  assert.equal(s.cooldownRemaining('u1', 15), 10);

  assert.equal(s.tryLock('u1'), true);
  assert.equal(s.tryLock('u1'), false);
  s.unlock('u1');
  assert.equal(s.tryLock('u1'), true);
});

test('BotDatabase guarda usuarios, historial y top', () => {
  const db = new BotDatabase(':memory:');
  db.touchUser('a@s.whatsapp.net', 'Ana');
  db.touchUser('a@s.whatsapp.net', null);
  assert.equal(db.getUser('a@s.whatsapp.net')?.name, 'Ana');

  for (const [title, url] of [['X', 'ux'], ['Y', 'uy'], ['X', 'ux']] as const) {
    db.addHistory({ userJid: 'a@s.whatsapp.net', chatJid: 'c', query: title, title, url, duration: 100 });
  }
  assert.equal(db.getUser('a@s.whatsapp.net')?.requests, 3);
  assert.deepEqual(db.getHistory('a@s.whatsapp.net').map((h) => h.title), ['X', 'Y', 'X']);
  assert.deepEqual(db.getTopSongs(), [{ title: 'X', url: 'ux', plays: 2 }, { title: 'Y', url: 'uy', plays: 1 }]);

  db.setSetting('k', 'v1');
  db.setSetting('k', 'v2');
  assert.equal(db.getSetting('k'), 'v2');
  db.close();
});

test('extractText y senderOf', () => {
  assert.equal(extractText({ message: { conversation: '!ping' } }), '!ping');
  assert.equal(extractText({ message: { extendedTextMessage: { text: '!play a' } } }), '!play a');
  assert.equal(extractText({ message: { ephemeralMessage: { message: { conversation: 'eph' } } } }), 'eph');
  assert.equal(extractText({ message: null }), null);
  assert.equal(senderOf({ key: { remoteJid: '1@s.whatsapp.net' } }), '1@s.whatsapp.net');
  assert.equal(senderOf({ key: { remoteJid: 'g@g.us', participant: '2@s.whatsapp.net' } }), '2@s.whatsapp.net');
});
