import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_FILE || join(__dirname, 'data.sqlite');

// Ensure directory exists if path contains folders
const dir = dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  owner_name TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO settings (id, owner_name) SELECT 1, '' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  via_sms INTEGER DEFAULT 1,
  via_whatsapp INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'responding' | 'not_responding'
  note TEXT,
  clicked_at DATETIME,
  delivered INTEGER DEFAULT 0,
  delivery_error TEXT,
  FOREIGN KEY(alert_id) REFERENCES alerts(id),
  FOREIGN KEY(contact_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT DEFAULT 'info',
  event TEXT NOT NULL,
  meta TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

export function getOwnerName() {
  const row = db.prepare('SELECT owner_name FROM settings WHERE id = 1').get();
  return row?.owner_name || '';
}

export function setOwnerName(name) {
  db.prepare('UPDATE settings SET owner_name = ? WHERE id = 1').run(name || '');
}

export function listContacts() {
  return db.prepare('SELECT * FROM contacts ORDER BY id DESC').all();
}

export function addContact({ name, phone, via_sms, via_whatsapp }) {
  return db.prepare('INSERT INTO contacts (name, phone, via_sms, via_whatsapp) VALUES (?, ?, ?, ?)')
    .run(name, phone, via_sms ? 1 : 0, via_whatsapp ? 1 : 0).lastInsertRowid;
}

export function deleteContact(id) {
  return db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
}

export function createAlert(message) {
  return db.prepare('INSERT INTO alerts (message) VALUES (?)').run(message || null).lastInsertRowid;
}

export function addAlertRecipient({ alert_id, contact_id, token }) {
  return db.prepare('INSERT INTO alert_recipients (alert_id, contact_id, token) VALUES (?, ?, ?)')
    .run(alert_id, contact_id, token).lastInsertRowid;
}

export function markDelivery({ recipient_id, delivered, error }) {
  db.prepare('UPDATE alert_recipients SET delivered = ?, delivery_error = ? WHERE id = ?')
    .run(delivered ? 1 : 0, error || null, recipient_id);
}

export function getAlert(alert_id) {
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alert_id);
  const recipients = db.prepare(`
    SELECT ar.*, c.name as contact_name, c.phone as contact_phone 
    FROM alert_recipients ar
    JOIN contacts c ON c.id = ar.contact_id
    WHERE alert_id = ? ORDER BY ar.id ASC
  `).all(alert_id);
  return { alert, recipients };
}

export function getAlertByToken(token) {
  return db.prepare(`
    SELECT ar.*, c.name as contact_name, c.phone as contact_phone, a.created_at as alert_created_at
    FROM alert_recipients ar
    JOIN contacts c ON c.id = ar.contact_id
    JOIN alerts a ON a.id = ar.alert_id
    WHERE token = ?
  `).get(token);
}

export function recordReaction({ token, status, note }) {
  const row = db.prepare('SELECT id FROM alert_recipients WHERE token = ?').get(token);
  if (!row) return false;
  db.prepare('UPDATE alert_recipients SET status = ?, note = ?, clicked_at = CURRENT_TIMESTAMP WHERE token = ?')
    .run(status, note || null, token);
  return true;
}

export function listAlerts() {
  return db.prepare('SELECT * FROM alerts ORDER BY id DESC').all();
}

export function addLog(level, event, metaObj) {
  const meta = metaObj ? JSON.stringify(metaObj) : null;
  db.prepare('INSERT INTO logs (level, event, meta) VALUES (?, ?, ?)').run(level || 'info', event, meta);
}

export function listLogs(limit = 200) {
  return db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?').all(limit);
}

export default db;
