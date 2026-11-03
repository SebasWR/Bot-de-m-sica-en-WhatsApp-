import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleText, type IncomingContext } from '../src/commands/handler.js';
import { createRegistry } from '../src/commands/index.js';
import { BotDatabase } from '../src/db/database.js';
import { ConnectFour } from '../src/games/connect4.js';
import {
  parseChoices,
  parseDice,
  parseHand,
  rollDice,
  rpsResult,
  shipPercent,
} from '../src/games/fun.js';
import { Hangman } from '../src/games/hangman.js';
import { GameManager } from '../src/games/manager.js';
import { fold, tag } from '../src/games/text.js';
import { TicTacToe } from '../src/games/tictactoe.js';
import { TriviaGame } from '../src/games/trivia.js';
import type { AudioService } from '../src/services/audio.js';
import type { MusicService } from '../src/services/music.js';
import { BotState } from '../src/state.js';

const ANA = '111@s.whatsapp.net';
const BETO = '222@s.whatsapp.net';
const CARLA = '333@s.whatsapp.net';
const GROUP = 'grupo@g.us';

/** Secuencia fija de "aleatorios" para que las partidas sean reproducibles. */
function seq(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length]!;
}

function setup(opts: { rng?: () => number; isGroup?: boolean } = {}) {
  const replies: { text: string; mentions?: string[]; from: string }[] = [];
  const db = new BotDatabase(':memory:');
  const games = new GameManager(opts.rng ?? Math.random);
  const services = {
    db,
    games,
    state: new BotState(),
    music: {} as MusicService,
    audio: {} as AudioService,
  };
  const isGroup = opts.isGroup ?? true;
  const send = (from: string, text: string, mentions: string[] = []) => {
    const base: IncomingContext = {
      chatJid: isGroup ? GROUP : from,
      senderJid: from,
      senderName: null,
      isGroup,
      mentions,
      services,
      reply: async (t, m) => void replies.push({ text: t, mentions: m, from }),
      react: async () => {},
      sendAudio: async () => {},
    };
    return handleText(registry, text, base);
  };
  const registry = createRegistry();
  const last = () => replies.at(-1)?.text ?? '';
  return { send, replies, last, db, games };
}

// ── Lógica pura ────────────────────────────────────────────────────────

test('TicTacToe detecta ganador, empate y jugadas inválidas', () => {
  const t = new TicTacToe();
  assert.equal(t.parseMove('5'), 4);
  assert.equal(t.parseMove('0'), null);
  assert.equal(t.parseMove('hola'), null);
  for (const [m, p] of [[0, 0], [3, 1], [1, 0], [4, 1], [2, 0]] as const) t.play(m, p);
  assert.equal(t.outcome(), 0);
  assert.equal(t.canPlay(8), false, 'no se juega con la partida terminada');

  const draw = new TicTacToe();
  // X O X / X O O / O X X
  for (const [m, p] of [[0, 0], [1, 1], [2, 0], [4, 1], [3, 0], [5, 1], [7, 0], [6, 1], [8, 0]] as const) draw.play(m, p);
  assert.equal(draw.outcome(), 'draw');
});

test('TicTacToe: el bot difícil gana cuando puede y bloquea cuando debe', () => {
  const win = new TicTacToe();
  win.play(0, 1); win.play(3, 0); win.play(1, 1); win.play(4, 0);
  assert.equal(win.botMove(1, Math.random, 'dificil'), 2);

  const block = new TicTacToe();
  block.play(0, 0); block.play(4, 1); block.play(1, 0);
  assert.equal(block.botMove(1, Math.random, 'dificil'), 2);
});

test('TicTacToe: el bot difícil nunca pierde contra jugadas al azar', () => {
  for (let game = 0; game < 30; game++) {
    const t = new TicTacToe();
    let turn: 0 | 1 = game % 2 === 0 ? 0 : 1;
    while (t.outcome() === null) {
      const move = turn === 1 ? t.botMove(1, Math.random, 'dificil') : t.free()[Math.floor(Math.random() * t.free().length)]!;
      t.play(move, turn);
      turn = turn === 0 ? 1 : 0;
    }
    assert.notEqual(t.outcome(), 0);
  }
});

test('ConnectFour: gravedad, línea horizontal, vertical y diagonal', () => {
  const v = new ConnectFour();
  for (let i = 0; i < 3; i++) { v.play(0, 0); v.play(1, 1); }
  assert.equal(v.outcome(), null);
  assert.equal(v.play(0, 0), 2, 'la cuarta ficha cae en la fila 2');
  assert.equal(v.outcome(), 0);

  const d = new ConnectFour();
  // Diagonal ascendente de 1 en columnas 0..3
  d.play(0, 1);
  d.play(1, 0); d.play(1, 1);
  d.play(2, 0); d.play(2, 0); d.play(2, 1);
  d.play(3, 0); d.play(3, 0); d.play(3, 0); d.play(3, 1);
  assert.equal(d.outcome(), 1);

  const full = new ConnectFour();
  for (let i = 0; i < 6; i++) full.play(0, (i % 2) as 0 | 1);
  assert.equal(full.canPlay(0), false, 'columna llena');
});

test('ConnectFour: el bot gana o bloquea', () => {
  const c = new ConnectFour();
  c.play(0, 1); c.play(1, 1); c.play(2, 1);
  assert.equal(c.botMove(1, Math.random, 'normal'), 3);
  assert.equal(c.botMove(0, Math.random, 'normal'), 3);
});

test('Hangman: letras, tildes, ñ y palabra completa', () => {
  const h = new Hangman('Pingüino');
  assert.equal(h.guessLetter('u'), 'hit');
  assert.equal(h.guessLetter('U'), 'repeated');
  assert.equal(h.guessLetter('z'), 'miss');
  assert.equal(h.masked(), '_ _ _ _ Ü _ _ _');
  assert.equal(h.guessWord('pinguino'), true);
  assert.equal(h.solved, true);

  const n = new Hangman('ñandu');
  assert.equal(n.guessLetter('n'), 'hit');
  assert.equal(n.masked(), '_ _ N _ _', 'la n no destapa la ñ');
  assert.equal(n.guessLetter('ñ'), 'hit');

  const lose = new Hangman('sol');
  for (const l of 'abcdef') lose.guessLetter(l);
  assert.equal(lose.lost, true);
});

test('utilidades: fold, tag, dados, ppt, elegir y ship', () => {
  assert.equal(fold('Canción Ñandú'), 'cancion ñandu');
  assert.equal(tag('5491112345678@s.whatsapp.net'), '@5491112345678');
  assert.deepEqual(parseDice(''), { count: 1, sides: 6 });
  assert.deepEqual(parseDice('20'), { count: 1, sides: 20 });
  assert.deepEqual(parseDice('3d8'), { count: 3, sides: 8 });
  assert.deepEqual(parseDice('d20'), { count: 1, sides: 20 });
  assert.equal(parseDice('100d6'), null);
  assert.equal(parseDice('hola'), null);
  const rolls = rollDice(Math.random, { count: 50 > 20 ? 20 : 1, sides: 6 });
  assert.ok(rolls.every((r) => r >= 1 && r <= 6));
  assert.equal(parseHand('Tijeras'), 'tijera');
  assert.equal(parseHand('✊'), 'piedra');
  assert.equal(parseHand('lagarto'), null);
  assert.equal(rpsResult('piedra', 'tijera'), 'win');
  assert.equal(rpsResult('piedra', 'papel'), 'loss');
  assert.equal(rpsResult('papel', 'papel'), 'draw');
  assert.deepEqual(parseChoices('pizza, sushi o tacos'), ['pizza', 'sushi', 'tacos']);
  assert.equal(shipPercent('Ana', 'Juan'), shipPercent('juan', 'ána'), 'el orden y las tildes no importan');
  assert.ok(shipPercent('a', 'b') >= 0 && shipPercent('a', 'b') <= 100);
});

test('GameManager caduca partidas inactivas', () => {
  let now = 0;
  const m = new GameManager(Math.random, () => now, 1000);
  const game = { id: 'x' } as never;
  m.start('c', game);
  now = 900;
  assert.equal(m.active('c'), game);
  m.touch('c');
  now = 1800;
  assert.equal(m.active('c'), game);
  now = 3000;
  assert.equal(m.active('c'), undefined);
});

// ── Partidas completas por el chat ─────────────────────────────────────

test('tateti en grupo: reto, aceptar, turnos, victoria y puntos', async () => {
  // rng 0.1 → empieza quien retó (Ana)
  const { send, last, replies, db } = setup({ rng: seq(0.1) });
  await send(ANA, '!tateti @222', [BETO]);
  assert.match(last(), /reta a @222/);
  assert.deepEqual(replies.at(-1)?.mentions, [ANA, BETO]);

  await send(CARLA, '!aceptar');
  assert.match(last(), /Este reto es para @222/);
  await send(ANA, '!aceptar');
  assert.match(last(), /propio reto/);

  await send(BETO, '!aceptar');
  assert.match(last(), /empieza la partida/);
  assert.match(last(), /Turno de @111/);

  await send(BETO, '1');
  assert.match(last(), /No es tu turno/);
  assert.equal(await send(CARLA, '1'), false, 'los espectadores no juegan');

  await send(ANA, '1');
  await send(BETO, '1');
  assert.match(last(), /no vale/);
  await send(BETO, '4');
  await send(ANA, '2');
  await send(BETO, '5');
  await send(ANA, '!tateti 3'); // también se puede jugar con el comando
  assert.match(last(), /@111 gana/);

  assert.equal(await send(ANA, '9'), false, 'la partida terminó');
  const ranking = db.getGameRanking(GROUP);
  assert.deepEqual(
    ranking.map((r) => [r.user_jid, r.wins, r.losses]),
    [[ANA, 1, 0], [BETO, 0, 1]],
  );
  await send(CARLA, '!puntos');
  assert.match(last(), /🥇 @111 — 1 🏆/);
});

test('tateti en privado es contra el bot y el bot responde al instante', async () => {
  const { send, last, games } = setup({ rng: seq(0.1), isGroup: false });
  await send(ANA, '!tateti dificil');
  assert.match(last(), /🤖 Bot/);
  await send(ANA, '5');
  assert.match(last(), /🤖 Juego en la \d/);
  assert.ok(games.active(ANA));
  await send(ANA, '!rendirse');
  assert.match(last(), /se rindió\. Gano yo/);
  assert.equal(games.active(ANA), undefined);
});

test('reto abierto, rechazar y una sola partida por chat', async () => {
  const { send, last } = setup({ rng: seq(0.9) });
  await send(ANA, '!tateti');
  assert.match(last(), /busca rival/);
  await send(BETO, '!ahorcado');
  assert.match(last(), /Ya hay una partida de \*❌⭕ Tateti\*/);
  await send(CARLA, '!rechazar');
  assert.match(last(), /Solo los jugadores/);
  await send(ANA, '!rechazar');
  assert.match(last(), /canceló el reto/);
  await send(BETO, '!aceptar');
  assert.match(last(), /No hay ningún reto/);
});

test('4 en raya contra el bot se juega por columnas', async () => {
  const { send, last } = setup({ rng: seq(0.1) });
  await send(ANA, '!4enraya bot');
  assert.match(last(), /🔴 @111/);
  await send(ANA, '4');
  assert.match(last(), /🤖 Juego en la [1-7]/);
  await send(ANA, '9');
  assert.match(last(), /🤖 Juego en la [1-7]/, '"9" no es columna: se ignora y queda la respuesta anterior');
});

test('ahorcado: letras por chat, palabra con el comando, y charla ignorada', async () => {
  const { send, last, games, db } = setup({ rng: seq(0) });
  await send(ANA, '!ahorcado');
  const game = games.active(GROUP) as unknown as { game: Hangman };
  const word = game.game.word;
  assert.match(last(), /Pista/);
  assert.equal(await send(BETO, 'jaja qué difícil'), false, 'la charla normal no cuenta');
  await send(BETO, '!ahorcado zzzz');
  assert.match(last(), /No es \*zzzz\*/);
  await send(CARLA, `!ahorcado ${word}`);
  assert.match(last(), /@333 adivinó/);
  assert.equal(db.getGameRanking(GROUP)[0]?.user_jid, CARLA);
});

test('trivia: un intento por persona y gana el primero que acierta', async () => {
  const { send, last, games } = setup();
  await send(ANA, '!trivia');
  const trivia = games.active(GROUP) as TriviaGame;
  const letters = ['a', 'b', 'c', 'd'];
  const wrong = letters.find((_, i) => i !== trivia.correct)!;
  const right = letters[trivia.correct]!;
  await send(ANA, wrong);
  assert.ok(games.active(GROUP), 'en grupo sigue abierta tras un fallo');
  await send(ANA, right);
  assert.match(last(), /Ya respondiste/);
  await send(BETO, right.toUpperCase());
  assert.match(last(), /Correcto, @222/);
  assert.equal(games.active(GROUP), undefined);
  assert.equal(TriviaGame.parseAnswer('b)'), 1);
  assert.equal(TriviaGame.parseAnswer('hola'), null);
});

test('adivina el número con pistas', async () => {
  // randInt(1,100) con rng 0.42 → 43
  const { send, last } = setup({ rng: seq(0.42) });
  await send(ANA, '!adivina');
  await send(BETO, '50');
  assert.match(last(), /Más bajo/);
  await send(ANA, '10');
  assert.match(last(), /Más alto.*entre \*11\* y \*49\*/s);
  await send(CARLA, '43');
  assert.match(last(), /@333 lo adivinó! Era el \*43\*/);
});

test('ppt, dado, moneda, bola, elegir y ship responden', async () => {
  const { send, last, db } = setup({ rng: seq(0) });
  await send(ANA, '!ppt papel'); // el bot saca piedra
  assert.match(last(), /Ganaste/);
  assert.equal(db.getGameRanking(GROUP, 10, 'ppt')[0]?.wins, 1);
  await send(ANA, '!ppt');
  assert.match(last(), /Elige una/);
  await send(ANA, '!dado 2d6');
  assert.match(last(), /2d6: \*2\*/);
  await send(ANA, '!moneda');
  assert.match(last(), /Cara/);
  await send(ANA, '!bola ¿lloverá?');
  assert.match(last(), /🎱/);
  await send(ANA, '!elegir pizza o tacos');
  assert.match(last(), /\*pizza\*/);
  await send(ANA, '!ship @222 @333', [BETO, CARLA]);
  assert.match(last(), /@222 \+ @333/);
  await send(ANA, '!ship Ana y Juan');
  assert.match(last(), /Ana \+ Juan.*\d+%/s);
});

test('!ayuda muestra secciones y !juegos solo los juegos', async () => {
  const { send, last } = setup();
  await send(ANA, '!ayuda');
  assert.match(last(), /🎵 \*Música\*/);
  assert.match(last(), /🎮 \*Juegos\*/);
  assert.match(last(), /!tateti/);
  await send(ANA, '!juegos');
  assert.doesNotMatch(last(), /!play/);
  assert.match(last(), /!ttt/);
  assert.match(last(), /Cómo se juega/);
});
