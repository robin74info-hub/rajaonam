const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let currentQr = null;
let connected = false;

async function init() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['RajaOnam Bot', 'Chrome', '1.0.0'],
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        currentQr = qr;
        console.log('Pairing QR generated');
      }
      if (connection === 'open') {
        connected = true;
        currentQr = null;
        console.log('WhatsApp connected');
      }
      if (connection === 'close') {
        connected = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed, code:', code);
        if (code !== DisconnectReason.loggedOut) {
          setTimeout(init, 5000);
        } else {
          console.log('Logged out — delete auth_info folder and restart to re-pair');
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (e) {
    console.error('Init error:', e.message);
    setTimeout(init, 10000);
  }
}

app.get('/status', (req, res) => res.json({ connected }));

app.get('/qr', (req, res) => res.json({ qr: currentQr }));

app.post('/send', async (req, res) => {
  const { phone, message } = req.body || {};
  if (!connected) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  try {
    await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/send-image', async (req, res) => {
  const { phone, image_url, caption } = req.body || {};
  if (!connected) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  try {
    await sock.sendMessage(`${phone}@s.whatsapp.net`, { image: { url: image_url }, caption });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(3001, () => {
  console.log('WhatsApp service running on port 3001');
  init();
});
