import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBotCheck, MusicService, ytdlpBaseArgs, type Track } from '../src/services/music.js';

test('yt-dlp usa Node como motor de JavaScript y cookies solo si existen', () => {
  const args = ytdlpBaseArgs(null);
  assert.ok(args.includes('--js-runtimes'));
  assert.ok(args.some((a) => a.startsWith('node:')));
  assert.ok(!args.includes('--cookies'));
  assert.deepEqual(ytdlpBaseArgs('/x/cookies.txt').slice(-2), ['--cookies', '/x/cookies.txt']);
});

test('detecta el bloqueo "no soy un robot" de YouTube', () => {
  assert.ok(isBotCheck(new Error("ERROR: [youtube] abc: Sign in to confirm you're not a bot.")));
  assert.ok(!isBotCheck(new Error('Video unavailable')));
});

const yt: Track = { id: 'a', title: 'Tema', url: 'https://www.youtube.com/watch?v=a', duration: 100, uploader: null };
const sc: Track = { id: 'b', title: 'Tema', url: 'https://soundcloud.com/x/tema', duration: 100, uploader: null };

test('si YouTube falla al buscar, usa SoundCloud', async () => {
  const music = new MusicService();
  const sources: string[] = [];
  music.search = async (_q, _l, source = 'youtube') => {
    sources.push(source);
    if (source === 'youtube') throw new Error('Sign in to confirm you’re not a bot');
    return [sc];
  };
  assert.deepEqual(await music.resolve('tema'), sc);
  assert.deepEqual(sources, ['youtube', 'soundcloud']);
});

test('si YouTube bloquea la descarga, baja la versión de SoundCloud', async () => {
  const music = new MusicService();
  music.search = async () => [sc];
  (music as unknown as { downloadUrl: (t: Track) => Promise<unknown> }).downloadUrl = async (t: Track) => {
    if (t === yt) throw new Error('Sign in to confirm you’re not a bot');
    return { track: t, file: '/tmp/sc.mp3' };
  };
  const got = await music.download(yt);
  assert.equal(got.track, sc);
});

test('si fallan YouTube y SoundCloud, el error explica el bloqueo', async () => {
  const music = new MusicService();
  music.search = async () => [];
  (music as unknown as { downloadUrl: () => Promise<never> }).downloadUrl = async () => {
    throw new Error('Sign in to confirm you’re not a bot');
  };
  await assert.rejects(music.download(yt), (e: Error & { userMessage?: string }) => /YouTube bloqueó/.test(e.userMessage ?? ''));
});
