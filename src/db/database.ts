import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export interface UserRow {
  jid: string;
  name: string | null;
  first_seen: string;
  last_seen: string;
  requests: number;
  banned: number;
}

export interface HistoryRow {
  id: number;
  user_jid: string;
  chat_jid: string;
  query: string;
  title: string;
  url: string;
  duration: number | null;
  created_at: string;
}

export interface NewHistoryEntry {
  userJid: string;
  chatJid: string;
  query: string;
  title: string;
  url: string;
  duration: number | null;
}

export type GameResult = 'win' | 'loss' | 'draw';

export interface GameRankingRow {
  user_jid: string;
  name: string | null;
  wins: number;
  losses: number;
  draws: number;
}

export interface TopSong {
  title: string;
  url: string;
  plays: number;
}

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
     jid        TEXT PRIMARY KEY,
     name       TEXT,
     first_seen TEXT NOT NULL DEFAULT (datetime('now')),
     last_seen  TEXT NOT NULL DEFAULT (datetime('now')),
     requests   INTEGER NOT NULL DEFAULT 0,
     banned     INTEGER NOT NULL DEFAULT 0
   );
   CREATE TABLE IF NOT EXISTS history (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     user_jid   TEXT NOT NULL REFERENCES users(jid),
     chat_jid   TEXT NOT NULL,
     query      TEXT NOT NULL,
     title      TEXT NOT NULL,
     url        TEXT NOT NULL,
     duration   INTEGER,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_jid, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
   CREATE TABLE IF NOT EXISTS settings (
     key   TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );`,
  // v2: puntos de los juegos (por chat, usuario y juego)
  `CREATE TABLE IF NOT EXISTS game_scores (
     chat_jid TEXT NOT NULL,
     user_jid TEXT NOT NULL,
     game     TEXT NOT NULL,
     wins     INTEGER NOT NULL DEFAULT 0,
     losses   INTEGER NOT NULL DEFAULT 0,
     draws    INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (chat_jid, user_jid, game)
   );`,
];

/** node:sqlite devuelve objetos sin prototipo; los pasamos a objetos normales. */
function plain<T>(row: unknown): T {
  return (row === undefined ? undefined : { ...(row as object) }) as T;
}

function plainAll<T>(rows: unknown[]): T[] {
  return rows.map((r) => ({ ...(r as object) })) as T[];
}

/**
 * Capa de acceso a SQLite: usuarios, historial de canciones y configuración.
 */
export class BotDatabase {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    // node:sqlite viene con Node (sin compilar nada), así funciona igual en Windows, Linux y Codespaces
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.migrate();
  }

  /** Ejecuta fn dentro de una transacción (rollback si falla). */
  private transaction(fn: () => void): void {
    this.db.exec('BEGIN');
    try {
      fn();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  private migrate(): void {
    const row = this.db.prepare('PRAGMA user_version').get() as { user_version: number } | undefined;
    const current = Number(row?.user_version ?? 0);
    for (let version = current; version < MIGRATIONS.length; version++) {
      const sql = MIGRATIONS[version]!;
      this.transaction(() => {
        this.db.exec(sql);
        this.db.exec(`PRAGMA user_version = ${version + 1}`);
      });
    }
  }

  /** Registra o actualiza un usuario cada vez que escribe al bot. */
  touchUser(jid: string, name?: string | null): UserRow {
    this.db
      .prepare(
        `INSERT INTO users (jid, name) VALUES (?, ?)
         ON CONFLICT(jid) DO UPDATE SET
           last_seen = datetime('now'),
           name = COALESCE(excluded.name, users.name)`,
      )
      .run(jid, name ?? null);
    return this.getUser(jid)!;
  }

  getUser(jid: string): UserRow | undefined {
    return plain<UserRow | undefined>(this.db.prepare(`SELECT * FROM users WHERE jid = ?`).get(jid));
  }

  setBanned(jid: string, banned: boolean): void {
    this.db.prepare(`UPDATE users SET banned = ? WHERE jid = ?`).run(banned ? 1 : 0, jid);
  }

  addHistory(entry: NewHistoryEntry): void {
    const e = entry;
    this.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO history (user_jid, chat_jid, query, title, url, duration)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(e.userJid, e.chatJid, e.query, e.title, e.url, e.duration);
      this.db.prepare(`UPDATE users SET requests = requests + 1 WHERE jid = ?`).run(e.userJid);
    });
  }

  getHistory(userJid: string, limit = 10): HistoryRow[] {
    return this.db
      .prepare(`SELECT * FROM history WHERE user_jid = ? ORDER BY id DESC LIMIT ?`)
      .all(userJid, limit).map((r) => plain<HistoryRow>(r));
  }

  getRecent(limit = 10): HistoryRow[] {
    return plainAll<HistoryRow>(this.db.prepare(`SELECT * FROM history ORDER BY id DESC LIMIT ?`).all(limit));
  }

  getTopSongs(limit = 10): TopSong[] {
    return this.db
      .prepare(
        `SELECT title, url, COUNT(*) AS plays FROM history
         GROUP BY url ORDER BY plays DESC, MAX(id) DESC LIMIT ?`,
      )
      .all(limit).map((r) => plain<TopSong>(r));
  }

  /** Suma una victoria, derrota o empate a un usuario en un juego de un chat. */
  addGameResult(chatJid: string, userJid: string, game: string, result: GameResult): void {
    const [w, l, d] = result === 'win' ? [1, 0, 0] : result === 'loss' ? [0, 1, 0] : [0, 0, 1];
    this.db
      .prepare(
        `INSERT INTO game_scores (chat_jid, user_jid, game, wins, losses, draws) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(chat_jid, user_jid, game) DO UPDATE SET
           wins = wins + excluded.wins,
           losses = losses + excluded.losses,
           draws = draws + excluded.draws`,
      )
      .run(chatJid, userJid, game, w, l, d);
  }

  /** Ranking de un chat sumando todos los juegos (o solo uno si se indica). */
  getGameRanking(chatJid: string, limit = 10, game?: string): GameRankingRow[] {
    return this.db
      .prepare(
        `SELECT s.user_jid AS user_jid, u.name AS name,
                SUM(s.wins) AS wins, SUM(s.losses) AS losses, SUM(s.draws) AS draws
         FROM game_scores s LEFT JOIN users u ON u.jid = s.user_jid
         WHERE s.chat_jid = ? AND (? IS NULL OR s.game = ?)
         GROUP BY s.user_jid
         ORDER BY wins DESC, losses ASC, s.user_jid ASC
         LIMIT ?`,
      )
      .all(chatJid, game ?? null, game ?? null, limit).map((r) => plain<GameRankingRow>(r));
  }

  getSetting(key: string): string | undefined {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as unknown as
      | { value: string }
      | undefined;
    return row?.value;
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
      .run(key, value);
  }

  close(): void {
    this.db.close();
  }
}
