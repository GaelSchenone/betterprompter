import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Sesiones ──────────────────────────────────────────────
const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      state: { text: '', speed: 120, playing: false, position: 0 },
      display: null,
      controls: new Set(),
    });
  }
  return sessions.get(sessionId);
}

// ── Server ────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId');
  const role = url.searchParams.get('role') || 'control';

  if (!sessionId) {
    ws.close(4000, 'sessionId required');
    return;
  }

  const session = getOrCreateSession(sessionId);

  if (role === 'display') {
    // Reemplazar display anterior si existe
    if (session.display && session.display.readyState === ws.OPEN) {
      session.display.close();
    }
    session.display = ws;

    // Enviar estado actual
    send(ws, { type: 'state', ...session.state });

    ws.on('close', () => {
      if (session.display === ws) session.display = null;
      cleanupSession(sessionId);
    });

    // Display escucha posición
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === 'position') {
        session.state.position = msg.value;
      }
    });

  } else {
    // role === 'control'
    session.controls.add(ws);

    send(ws, { type: 'state', ...session.state });

    ws.on('close', () => {
      session.controls.delete(ws);
      cleanupSession(sessionId);
    });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      switch (msg.type) {
        case 'speed':
          session.state.speed = Math.max(0, Math.min(1000, msg.value));
          broadcastToDisplay(session, { type: 'speed', value: session.state.speed });
          break;
        case 'play':
          session.state.playing = true;
          broadcastToDisplay(session, { type: 'play' });
          break;
        case 'pause':
          session.state.playing = false;
          broadcastToDisplay(session, { type: 'pause' });
          break;
        case 'togglePlay':
          session.state.playing = !session.state.playing;
          broadcastToDisplay(session, { type: session.state.playing ? 'play' : 'pause' });
          break;
        case 'jump':
          broadcastToDisplay(session, { type: 'jump', value: msg.value });
          break;
        case 'reset':
          broadcastToDisplay(session, { type: 'reset' });
          break;
        case 'setText':
          session.state.text = msg.text || '';
          session.state.position = 0;
          broadcastToDisplay(session, { type: 'setText', text: session.state.text });
          break;
      }
    });
  }
});

function send(ws, data) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToDisplay(session, data) {
  if (session.display && session.display.readyState === session.display.OPEN) {
    session.display.send(JSON.stringify(data));
  }
}

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  // Solo limpiar si no hay display ni controles
  if (!session.display && session.controls.size === 0) {
    sessions.delete(sessionId);
  }
}

// ── Static files ──────────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// ── API ───────────────────────────────────────────────────
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

app.get('/api/info', (req, res) => {
  const port = server.address().port;
  const ip = getLocalIP();
  res.json({ ip, port });
});

// ── SPA: servir index.html para todas las rutas ──────────
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('BetterPrompter');
  console.log('Teleprompter con control remoto');
  console.log('Display:   http://' + ip + ':' + PORT + '/');
  console.log('Control:   http://' + ip + ':' + PORT + '/control/<session>');
  console.log('Local:     http://localhost:' + PORT);
  console.log('Abri la raiz en la laptop y escanea el QR desde el celular.');
  console.log('');
});
