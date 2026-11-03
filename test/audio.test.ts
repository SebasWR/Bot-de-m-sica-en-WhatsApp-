import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { AudioService, buildOpusArgs } from '../src/services/audio.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

test('buildOpusArgs usa libopus a 48 kHz', () => {
  const args = buildOpusArgs('in.mp3', 'out.ogg', '64k');
  assert.equal(args.at(-1), 'out.ogg');
  assert.ok(args.includes('libopus'));
  assert.equal(args[args.indexOf('-b:a') + 1], '64k');
  assert.equal(args[args.indexOf('-ar') + 1], '48000');
});

test('convierte MP3 a OGG/Opus con FFmpeg', { skip: !hasFfmpeg && 'ffmpeg no instalado' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-test-'));
  const mp3 = path.join(dir, 'tono.mp3');
  const gen = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', mp3]);
  assert.equal(gen.status, 0, gen.stderr.toString());

  const audio = new AudioService();
  const out = await audio.toOpus(mp3);
  const header = fs.readFileSync(out).subarray(0, 64).toString('latin1');
  assert.ok(header.startsWith('OggS'), 'debe ser un contenedor Ogg');
  assert.ok(header.includes('OpusHead'), 'debe contener audio Opus');

  await audio.cleanup(mp3, out);
  assert.equal(fs.existsSync(out), false);
  fs.rmSync(dir, { recursive: true, force: true });
});
