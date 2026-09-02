import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'app.db');

let db;

function init() {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      title TEXT NOT NULL,
      quarter TEXT NOT NULL,
      seconds_per_question INTEGER NOT NULL,
      show_score_to_officer INTEGER NOT NULL DEFAULT 0,
      admin_passcode_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS officers (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_opened',
      opened_at TEXT,
      submitted_at TEXT,
      current_index INTEGER NOT NULL DEFAULT 0,
      order_json TEXT NOT NULL DEFAULT '[]',
      answers_json TEXT NOT NULL DEFAULT '{}',
      tab_switches INTEGER NOT NULL DEFAULT 0,
      reopens_json TEXT NOT NULL DEFAULT '[]',
      reuse_attempts_json TEXT NOT NULL DEFAULT '[]',
      score INTEGER,
      total_questions INTEGER,
      created_at TEXT NOT NULL
    );
  `);

  const existing = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!existing) {
    db.prepare(
      `INSERT INTO settings (id, title, quarter, seconds_per_question, show_score_to_officer, admin_passcode_hash)
       VALUES (1, ?, ?, ?, 0, NULL)`
    ).run('Product & System Knowledge Test', 'Q3 2026', 45);
  }

  return db;
}

export function getDb() {
  return db || init();
}

// ---------- settings ----------
export function getSettings() {
  const row = getDb().prepare('SELECT * FROM settings WHERE id = 1').get();
  return {
    title: row.title,
    quarter: row.quarter,
    secondsPerQuestion: row.seconds_per_question,
    showScoreToOfficer: !!row.show_score_to_officer,
    hasPasscode: !!row.admin_passcode_hash,
  };
}

export function getPasscodeHash() {
  const row = getDb().prepare('SELECT admin_passcode_hash FROM settings WHERE id = 1').get();
  return row.admin_passcode_hash;
}

export function setPasscodeHash(hash) {
  getDb().prepare('UPDATE settings SET admin_passcode_hash = ? WHERE id = 1').run(hash);
}

export function updateSettings({ title, quarter, secondsPerQuestion, showScoreToOfficer }) {
  getDb()
    .prepare(
      `UPDATE settings SET title = ?, quarter = ?, seconds_per_question = ?, show_score_to_officer = ? WHERE id = 1`
    )
    .run(title, quarter, secondsPerQuestion, showScoreToOfficer ? 1 : 0);
}

// ---------- questions ----------
function rowToQuestion(row) {
  return {
    id: row.id,
    text: row.text,
    options: JSON.parse(row.options_json),
    correctIndex: row.correct_index,
  };
}

export function listQuestions() {
  return getDb()
    .prepare('SELECT * FROM questions ORDER BY position ASC, id ASC')
    .all()
    .map(rowToQuestion);
}

export function addQuestion({ text, options, correctIndex }) {
  const db = getDb();
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM questions').get().m;
  const info = db
    .prepare('INSERT INTO questions (text, options_json, correct_index, position) VALUES (?, ?, ?, ?)')
    .run(text, JSON.stringify(options), correctIndex, maxPos + 1);
  return info.lastInsertRowid;
}

export function deleteQuestion(id) {
  getDb().prepare('DELETE FROM questions WHERE id = ?').run(id);
}

export function getQuestionById(id) {
  const row = getDb().prepare('SELECT * FROM questions WHERE id = ?').get(id);
  return row ? rowToQuestion(row) : null;
}

// ---------- officers ----------
function rowToOfficer(row) {
  return {
    code: row.code,
    name: row.name,
    status: row.status,
    openedAt: row.opened_at,
    submittedAt: row.submitted_at,
    currentIndex: row.current_index,
    order: JSON.parse(row.order_json),
    answers: JSON.parse(row.answers_json),
    tabSwitches: row.tab_switches,
    reopens: JSON.parse(row.reopens_json),
    reuseAttempts: JSON.parse(row.reuse_attempts_json),
    score: row.score,
    totalQuestions: row.total_questions,
  };
}

export function getOfficer(code) {
  const row = getDb().prepare('SELECT * FROM officers WHERE code = ?').get(code);
  return row ? rowToOfficer(row) : null;
}

export function listOfficers() {
  return getDb()
    .prepare('SELECT * FROM officers ORDER BY name COLLATE NOCASE ASC')
    .all()
    .map(rowToOfficer);
}

export function listOfficerCodes() {
  return getDb()
    .prepare('SELECT code FROM officers')
    .all()
    .map((r) => r.code);
}

export function createOfficer({ code, name }) {
  getDb()
    .prepare(
      `INSERT INTO officers (code, name, status, current_index, order_json, answers_json, tab_switches, reopens_json, reuse_attempts_json, created_at)
       VALUES (?, ?, 'not_opened', 0, '[]', '{}', 0, '[]', '[]', ?)`
    )
    .run(code, name, new Date().toISOString());
  return getOfficer(code);
}

export function saveOfficer(officer) {
  getDb()
    .prepare(
      `UPDATE officers SET
        status = ?, opened_at = ?, submitted_at = ?, current_index = ?,
        order_json = ?, answers_json = ?, tab_switches = ?,
        reopens_json = ?, reuse_attempts_json = ?, score = ?, total_questions = ?
       WHERE code = ?`
    )
    .run(
      officer.status,
      officer.openedAt,
      officer.submittedAt,
      officer.currentIndex,
      JSON.stringify(officer.order),
      JSON.stringify(officer.answers),
      officer.tabSwitches,
      JSON.stringify(officer.reopens),
      JSON.stringify(officer.reuseAttempts),
      officer.score,
      officer.totalQuestions,
      officer.code
    );
}

export function resetOfficer(code) {
  getDb()
    .prepare(
      `UPDATE officers SET status = 'not_opened', opened_at = NULL, submitted_at = NULL,
        current_index = 0, order_json = '[]', answers_json = '{}', score = NULL, total_questions = NULL
       WHERE code = ?`
    )
    .run(code);
}
