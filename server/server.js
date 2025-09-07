import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import cors from 'cors';
import { nanoid } from 'nanoid';
import twilioPkg from 'twilio';
import {
  getOwnerName, setOwnerName, listContacts, addContact, deleteContact,
  createAlert, addAlertRecipient, markDelivery, getAlert, getAlertByToken,
  recordReaction, listAlerts, addLog, listLogs
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

const PORT = process.env.PORT || 3000;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

const DEMO_MODE = process.env.DEMO_MODE === 'true';

let twilioClient = null;
if (!DEMO_MODE && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = new twilioPkg.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else if (DEMO_MODE) {
  console.log('⚠️ Running in DEMO_MODE – SMS/WhatsApp will be simulated.');
} else {
  console.warn('Twilio credentials not set. SMS/WhatsApp will be disabled until configured.');
}

// Serve static frontend
app.use(express.static(path.join(__dirname, '../client')));

app.get('/api/config', (req, res) => {
  const owner = getOwnerName();
  const contacts = listContacts();
  res.json({ owner_name: owner, contacts, app_base_url: APP_BASE_URL });
});

app.post('/api/setup', (req, res) => {
  const { owner_name, contacts } = req.body || {};
  if (typeof owner_name !== 'string' || !Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  setOwnerName(owner_name.trim());
  const existing = listContacts();
  existing.forEach(c => deleteContact(c.id));
  contacts.forEach(c => {
    if (c.name && c.phone) {
      addContact({
        name: String(c.name),
        phone: String(c.phone),
        via_sms: !!c.via_sms,
        via_whatsapp: !!c.via_whatsapp
      });
    }
  });
  addLog('info', 'setup_completed', { owner_name, contact_count: contacts.length });
  res.json({ ok: true });
});

app.post('/api/alert', async (req, res) => {
  const { message } = req.body || {};
  const owner_name = getOwnerName() || 'Unknown';
  const contacts = listContacts();
  if (!contacts.length) {
    return res.status(400).json({ error: 'No contacts configured' });
  }
  const alert_id = createAlert(message || null);
  addLog('info', 'alert_created', { alert_id, message });

  const results = [];
  for (const c of contacts) {
    const token = nanoid(21);
    const recipient_id = addAlertRecipient({ alert_id, contact_id: c.id, token });
    const link = `${APP_BASE_URL}/response.html?token=${token}`;

    const composed = `ALERT: ${owner_name} needs help.\n${message || ''}\nTap to respond: ${link}`;

    // SMS handling
    if (c.via_sms) {
      if (DEMO_MODE) {
        markDelivery({ recipient_id, delivered: 1 });
        addLog('info', 'sms_sent_demo', { alert_id, recipient_id, to: c.phone });
        results.push({ contact_id: c.id, channel: 'sms', ok: true, demo: true });
      } else if (twilioClient && process.env.TWILIO_SMS_FROM) {
        try {
          const resp = await twilioClient.messages.create({
            body: composed,
            from: process.env.TWILIO_SMS_FROM,
            to: c.phone
          });
          markDelivery({ recipient_id, delivered: 1 });
          addLog('info', 'sms_sent', { alert_id, recipient_id, sid: resp.sid, to: c.phone });
          results.push({ contact_id: c.id, channel: 'sms', ok: true });
        } catch (err) {
          markDelivery({ recipient_id, delivered: 0, error: String(err.message || err) });
          addLog('error', 'sms_error', { alert_id, recipient_id, to: c.phone, error: String(err.message || err) });
          results.push({ contact_id: c.id, channel: 'sms', ok: false, error: String(err.message || err) });
        }
      }
    }

    // WhatsApp handling
    if (c.via_whatsapp) {
      if (DEMO_MODE) {
        markDelivery({ recipient_id, delivered: 1 });
        addLog('info', 'whatsapp_sent_demo', { alert_id, recipient_id, to: c.phone });
        results.push({ contact_id: c.id, channel: 'whatsapp', ok: true, demo: true });
      } else if (twilioClient && process.env.TWILIO_WHATSAPP_FROM) {
        try {
          const resp = await twilioClient.messages.create({
            body: composed,
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: c.phone.startsWith('whatsapp:') ? c.phone : `whatsapp:${c.phone.replace(/^whatsapp:/,'')}`
          });
          markDelivery({ recipient_id, delivered: 1 });
          addLog('info', 'whatsapp_sent', { alert_id, recipient_id, sid: resp.sid, to: c.phone });
          results.push({ contact_id: c.id, channel: 'whatsapp', ok: true });
        } catch (err) {
          markDelivery({ recipient_id, delivered: 0, error: String(err.message || err) });
          addLog('error', 'whatsapp_error', { alert_id, recipient_id, to: c.phone, error: String(err.message || err) });
          results.push({ contact_id: c.id, channel: 'whatsapp', ok: false, error: String(err.message || err) });
        }
      }
    }
  }

  res.json({ ok: true, alert_id, results });
});

app.get('/api/alerts', (req, res) => {
  const alerts = listAlerts();
  res.json({ alerts });
});

app.get('/api/alerts/:id', (req, res) => {
  const { id } = req.params;
  const info = getAlert(Number(id));
  res.json(info);
});

app.get('/api/recipient/:token', (req, res) => {
  const { token } = req.params;
  const row = getAlertByToken(token);
  if (!row) return res.status(404).json({ error: 'Invalid token' });
  res.json(row);
});

app.post('/api/respond', (req, res) => {
  const { token, status, note } = req.body || {};
  if (!token || !['responding','not_responding'].includes(status)) {
    return res.status(400).json({ error: 'Bad request' });
  }
  const ok = recordReaction({ token, status, note });
  if (!ok) return res.status(404).json({ error: 'Unknown token' });
  addLog('info', 'reaction_recorded', { token, status });
  res.json({ ok: true });
});

app.get('/api/logs', (req, res) => {
  const logs = listLogs(500);
  res.json({ logs });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
