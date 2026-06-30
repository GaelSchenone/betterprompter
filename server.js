const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ── Estado compartido ─────────────────────────────────────
const state = {
  text: '',
  speed: 120,
  playing: false,
  position: 0,
};

// ── Clasificar clientes ───────────────────────────────────
const clients = {
  display: null, // solo el último display conectado
  controls: new Set(), // múltiples controles
};

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get('role') || 'control';

  if (role === 'display') {
    clients.display = ws;
    // Enviar estado actual al display
    send(ws, { type: 'state', ...state });

    ws.on('close', () => {
      if (clients.display === ws) clients.display = null;
    });
  } else {
    clients.controls.add(ws);

    ws.on('close', () => {
      clients.controls.delete(ws);
    });
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Un control envía comandos → se reenvían al display
    if (msg.type === 'speed') {
      state.speed = Math.max(0, Math.min(1000, msg.value));
      broadcastToDisplay({ type: 'speed', value: state.speed });
    } else if (msg.type === 'play') {
      state.playing = true;
      broadcastToDisplay({ type: 'play' });
    } else if (msg.type === 'pause') {
      state.playing = false;
      broadcastToDisplay({ type: 'pause' });
    } else if (msg.type === 'togglePlay') {
      state.playing = !state.playing;
      broadcastToDisplay({ type: state.playing ? 'play' : 'pause' });
    } else if (msg.type === 'jump') {
      // msg.value: cantidad en segundos (puede ser negativo)
      broadcastToDisplay({ type: 'jump', value: msg.value });
    } else if (msg.type === 'reset') {
      broadcastToDisplay({ type: 'reset' });
    } else if (msg.type === 'setText') {
      state.text = msg.text;
      broadcastToDisplay({ type: 'setText', text: state.text });
    } else if (msg.type === 'position') {
      state.position = msg.value;
    }
  });
});

function send(ws, data) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToDisplay(data) {
  if (clients.display && clients.display.readyState === clients.display.OPEN) {
    clients.display.send(JSON.stringify(data));
  }
}

// ── Static files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Obtener IP local ──────────────────────────────────────
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

// ── Info endpoint ─────────────────────────────────────────
app.get('/api/info', (req, res) => {
  const port = server.address().port;
  const ip = getLocalIP();
  res.json({
    ip,
    port,
    displayUrl: `http://${ip}:${port}/display.html`,
    controlUrl: `http://${ip}:${port}/control.html`,
  });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('BetterPrompter');
  console.log('Teleprompter con control remoto');
  console.log('Display:   http://' + ip + ':' + PORT + '/display.html');
  console.log('Control:   http://' + ip + ':' + PORT + '/control.html');
  console.log('Local:     http://localhost:' + PORT);
  console.log('Abrí Display en la laptop y Control en el celular.');
  console.log('');
});
