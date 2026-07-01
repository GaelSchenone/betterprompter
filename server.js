import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

// ── Sesiones ──────────────────────────────────────────────
const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      state: { text: '', speed: 120, playing: false, position: 0 },
      display: null,
      controls: new Set(),
      createdAt: Date.now(),
    });
  }
  return sessions.get(sessionId);
}

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (!session.display && session.controls.size === 0) {
    sessions.delete(sessionId);
  }
}

// Limpiar sesiones viejas cada 30 min
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > 3_600_000 && !session.display && session.controls.size === 0) {
      sessions.delete(id);
    }
  }
}, 1_800_000);

// ── Server ────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ── Static files (primero) ───────────────────────────────
app.use(express.static(distPath, { index: 'index.html' }));

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

app.get('/api/info', (_req, res) => {
  const port = server.address().port;
  const ip = getLocalIP();
  res.json({ ip, port, uptime: process.uptime() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), sessions: sessions.size });
});

// ── SPA: cualquier otra ruta va al index.html ────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error al servir index.html:', err.message);
      res.status(500).send('Error: ' + err.message);
    }
  });
});

// ── WebSocket ─────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const role = url.searchParams.get('role') || 'control';

    if (!sessionId || sessionId.length < 3) {
      ws.close(4000, 'sessionId invalido');
      return;
    }

    const session = getOrCreateSession(sessionId);

    if (role === 'display') {
      if (session.display && session.display.readyState === ws.OPEN) {
        session.display.close();
      }
      session.display = ws;
      send(ws, { type: 'state', ...session.state });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'position') {
            session.state.position = msg.value;
          }
        } catch { /* ignore malformed */ }
      });

      ws.on('close', () => {
        if (session.display === ws) session.display = null;
        cleanupSession(sessionId);
      });

    } else {
      session.controls.add(ws);
      send(ws, { type: 'state', ...session.state });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          switch (msg.type) {
            case 'speed':
              session.state.speed = Math.max(-500, Math.min(500, msg.value));
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
        } catch { /* ignore malformed */ }
      });

      ws.on('close', () => {
        session.controls.delete(ws);
        cleanupSession(sessionId);
      });
    }

    ws.on('error', (err) => {
      console.error('WS error:', err.message);
    });

  } catch (err) {
    console.error('Error en conexion WS:', err.message);
    ws.close(4000, 'Error interno');
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

// ── Error handler global ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Error no capturado:', err);
  res.status(500).send('Error interno del servidor');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// ── Start ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('BetterPrompter');
  console.log('Teleprompter con control remoto');
  console.log('Display:   http://' + ip + ':' + PORT + '/');
  console.log('Control:   http://' + ip + ':' + PORT + '/control/<session>');
  console.log('Local:     http://localhost:' + PORT);
  console.log('Health:    http://localhost:' + PORT + '/api/health');
  console.log('Abri la raiz en la laptop y escanea el QR desde el celular.');
  console.log('');
});
