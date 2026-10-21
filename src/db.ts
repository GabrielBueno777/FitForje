import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Database } from 'bun:sqlite';

const projectRoot = resolve(import.meta.dir, '..');
const configuredPath = Bun.env.FITFORJE_DB_PATH;
const databasePath = configuredPath
  ? resolve(projectRoot, configuredPath)
  : resolve(projectRoot, 'data/fitforje.sqlite');

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath, { create: true });

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'premium')),
    profile_json TEXT NOT NULL DEFAULT '{}',
    workouts_completed INTEGER NOT NULL DEFAULT 0,
    last_action TEXT NOT NULL DEFAULT 'Conta criada',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS workout_completions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_title TEXT NOT NULL,
    week_start TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, workout_title, week_start)
  );

  CREATE INDEX IF NOT EXISTS workout_completions_week_idx ON workout_completions(user_id, week_start);
`);