import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, RotateCcw, RefreshCw,
  Send, Trash2, Wifi, Check,
} from 'lucide-react';

export default function Control() {
  const { sessionId } = useParams();
  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(120);
  const [speechText, setSpeechText] = useState('');
  const [sendFeedback, setSendFeedback] = useState(false);

  const wsRef = useRef(null);

  // ── WebSocket ──────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    let ws;
    let reconnectTimer;

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${location.host}?sessionId=${sessionId}&role=control`;
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'state') {
            if (msg.text) setSpeechText(msg.text);
            setSpeed(msg.speed ?? 120);
            setPlaying(msg.playing ?? false);
          }
        } catch {}
      };
    }

    connect();
    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, [sessionId]);

  function send(msg) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  // ── Play / Pause ───────────────────────
  function togglePlay() {
    const next = !playing;
    setPlaying(next);
    send({ type: next ? 'play' : 'pause' });
  }

  // ── Speed ──────────────────────────────
  const speedTimerRef = useRef(null);
  function handleSpeedChange(val) {
    const n = Number(val);
    setSpeed(n);
    clearTimeout(speedTimerRef.current);
    speedTimerRef.current = setTimeout(() => {
      send({ type: 'speed', value: n });
    }, 30);
  }

  // ── Jump ───────────────────────────────
  function jump(seconds) {
    send({ type: 'jump', value: seconds });
  }

  // ── Send text ──────────────────────────
  function handleSendText() {
    const t = speechText.trim();
    if (!t) return;
    send({ type: 'setText', text: t });
    setSendFeedback(true);
    setTimeout(() => setSendFeedback(false), 1500);
  }

  // ── Reset ──────────────────────────────
  function handleReset() {
    send({ type: 'reset' });
  }

  // ── Reconnect ──────────────────────────
  function handleReconnect() {
    if (wsRef.current) wsRef.current.close();
  }

  // ── Styles ─────────────────────────────
  const s = {
    page: {
      background: '#0a0a0a', color: '#eee', minHeight: '100dvh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 16, paddingBottom: 40,
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 4px 16px',
    },
    h1: { fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },
    status: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#666' },
    dot: (ok) => ({
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: ok ? '#00ff88' : '#555',
      boxShadow: ok ? '0 0 8px #00ff88' : 'none',
      transition: 'background 0.3s',
    }),
    card: {
      background: '#141414', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '24px 20px', marginBottom: 12,
    },
    cardTitle: {
      fontSize: 11, textTransform: 'uppercase', letterSpacing: 1,
      color: '#666', marginBottom: 16, fontWeight: 500,
    },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.h1}>
          <MonitorSmartphoneIcon /> Control
        </h1>
        <div style={s.status}>
          <span style={s.dot(connected)} />
          <span>{connected ? 'Conectado' : 'Desconectado'}</span>
        </div>
      </div>

      {/* Play */}
      <div style={s.card}>
        <div style={s.cardTitle}>Reproduccion</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <button
            onClick={togglePlay}
            style={{
              width: 100, height: 100, borderRadius: '50%', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', touchAction: 'manipulation',
              background: playing ? '#00ff88' : 'rgba(255,255,255,0.06)',
              color: playing ? '#000' : '#eee',
              boxShadow: playing ? '0 0 40px rgba(0,255,136,0.15)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {playing ? <Pause size={44} /> : <Play size={44} />}
          </button>
        </div>
      </div>

      {/* Speed */}
      <div style={s.card}>
        <div style={s.cardTitle}>Velocidad</div>
        <div style={{ textAlign: 'center', fontSize: 48, fontWeight: 300, fontVariantNumeric: 'tabular-nums', color: '#00ff88', lineHeight: 1, marginBottom: 4 }}>
          {speed}
          <span style={{ fontSize: 14, color: '#666', fontWeight: 400 }}> px/s</span>
        </div>
        <div style={{ padding: '8px 0' }}>
          <input
            type="range" min={0} max={500} step={1} value={speed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            style={{
              width: '100%', height: 6, accentColor: '#00ff88',
              touchAction: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', padding: '0 2px', marginTop: 4 }}>
          <span>0</span><span>125</span><span>250</span><span>375</span><span>500</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Lenta', val: 60 },
            { label: 'Normal', val: 120 },
            { label: 'Rapida', val: 200 },
            { label: 'Turbo', val: 300 },
          ].map(p => (
            <button
              key={p.val}
              onClick={() => { setSpeed(p.val); send({ type: 'speed', value: p.val }); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: speed === p.val ? 'rgba(0,255,136,0.08)' : 'transparent',
                color: speed === p.val ? '#00ff88' : '#666',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jumps */}
      <div style={s.card}>
        <div style={s.cardTitle}>Saltos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {[
            { icon: SkipBack, label: '-10 s', val: -10 },
            { icon: ChevronLeft, label: '-5 s', val: -5 },
            { icon: ChevronRight, label: '+5 s', val: 5 },
            { icon: SkipForward, label: '+10 s', val: 10 },
          ].map(j => (
            <button
              key={j.val}
              onClick={() => jump(j.val)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '14px 0', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'transparent', color: '#eee',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation',
                transition: 'all 0.12s',
              }}
            >
              <j.icon size={20} style={{ color: '#666' }} />
              <span style={{ fontSize: 10, color: '#666', fontWeight: 400 }}>{j.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={s.card}>
        <div style={s.cardTitle}>Acciones</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ActionBtn onClick={handleReset}>
            <RotateCcw size={16} /> Volver al inicio
          </ActionBtn>
          <ActionBtn onClick={handleReconnect} danger>
            <RefreshCw size={16} /> Reconectar
          </ActionBtn>
        </div>
      </div>

      {/* Text */}
      <div style={s.card}>
        <div style={s.cardTitle}>Texto del speech</div>
        <textarea
          value={speechText}
          onChange={(e) => setSpeechText(e.target.value)}
          placeholder="Pega aca tu speech y presiona Enviar..."
          style={{
            width: '100%', minHeight: 120, background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
            color: '#eee', fontSize: 14, lineHeight: 1.5, padding: 12,
            resize: 'vertical', fontFamily: 'system-ui, sans-serif', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => { setSpeechText(''); send({ type: 'setText', text: '' }); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.04)', color: '#666',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            <Trash2 size={16} /> Limpiar
          </button>
          <button
            onClick={handleSendText}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              flex: 1, padding: 12, borderRadius: 10, border: 'none',
              background: sendFeedback ? '#00ff88' : '#00ff88',
              color: '#000', fontSize: 14, fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            {sendFeedback ? <Check size={16} /> : <Send size={16} />}
            {sendFeedback ? 'Enviado' : 'Enviar texto'}
          </button>
        </div>
      </div>

      {/* Help */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontSize: 12, color: '#666', textAlign: 'center', padding: 12,
      }}>
        <Wifi size={14} />
        Asegurate de que el celular y la laptop esten en la misma red
      </div>
    </div>
  );
}

function MonitorSmartphoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="16" height="16" rx="2" />
      <path d="M2 12h16" />
      <path d="M18 7h2a2 2 0 012 2v8a2 2 0 01-2 2h-5" />
      <rect x="18" y="14" width="2" height="2" />
    </svg>
  );
}

function ActionBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '14px 0', borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'transparent', color: '#eee',
        fontSize: 14, fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}
