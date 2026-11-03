import Database from 'better-sqlite3';
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
];

/**
 * Capa de acceso a SQLite: usuarios, historial de canciones y configuración.
 */
export class BotDatabase {
  private readonly db: Database.Database;

  constructor(file: string) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    const current = this.db.pragma('user_version', { simple: true }) as number;
    for (let version = current; version < MIGRATIONS.length; version++) {
      const sql = MIGRATIONS[version]!;
      this.db.transaction(() => {
        this.db.exec(sql);
        this.db.pragma(`user_version = ${version + 1}`);
      })();
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
    return this.db.prepare(`SELECT * FROM users WHERE jid = ?`).get(jid) as UserRow | undefined;
  }

  setBanned(jid: string, banned: boolean): void {
    this.db.prepare(`UPDATE users SET banned = ? WHERE jid = ?`).run(banned ? 1 : 0, jid);
  }

  addHistory(entry: NewHistoryEntry): void {
    const insert = this.db.transaction((e: NewHistoryEntry) => {
      this.db
        .prepare(
          `INSERT INTO history (user_jid, chat_jid, query, title, url, duration)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(e.userJid, e.chatJid, e.query, e.title, e.url, e.duration);
      this.db.prepare(`UPDATE users SET requests = requests + 1 WHERE jid = ?`).run(e.userJid);
    });
    insert(entry);
  }

  getHistory(userJid: string, limit = 10): HistoryRow[] {
    return this.db
      .prepare(`SELECT * FROM history WHERE user_jid = ? ORDER BY id DESC LIMIT ?`)
      .all(userJid, limit) as HistoryRow[];
  }

  getRecent(limit = 10): HistoryRow[] {
    return this.db.prepare(`SELECT * FROM history ORDER BY id DESC LIMIT ?`).all(limit) as HistoryRow[];
  }

  getTopSongs(limit = 10): TopSong[] {
    return this.db
      .prepare(
        `SELECT title, url, COUNT(*) AS plays FROM history
         GROUP BY url ORDER BY plays DESC, MAX(id) DESC LIMIT ?`,
      )
      .all(limit) as TopSong[];
  }

  getSetting(key: string): string | undefined {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
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
