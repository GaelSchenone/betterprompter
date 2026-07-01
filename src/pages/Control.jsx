import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';

function wsUrl(sessionId, role) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = new URL(location.href);
  url.protocol = proto;
  url.pathname = '/';
  url.search = `?sessionId=${sessionId}&role=${role}`;
  return url.toString();
}

const SPEED_SENSITIVITY = 4; // px/s por pixel de swipe
const MIN_SPEED = 0;
const MAX_SPEED = 500;

export default function Control() {
  const { sessionId } = useParams();
  const [connected, setConnected] = useState(false);
  const [speed, setSpeed] = useState(120);
  const [direction, setDirection] = useState(null); // 'forward' | 'backward' | null
  const [showTextInput, setShowTextInput] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [sendFeedback, setSendFeedback] = useState(false);

  const wsRef = useRef(null);
  const speedRef = useRef(120);
  const directionRef = useRef(null);
  const startYRef = useRef(0);
  const baseSpeedRef = useRef(120);
  const scrollingRef = useRef(false);

  speedRef.current = speed;
  directionRef.current = direction;

  // ── WebSocket ──────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let ws;
    let reconnectTimer;

    function connect() {
      const url = wsUrl(sessionId, 'control');
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'state') {
            if (msg.text) setSpeechText(msg.text);
            setSpeed(Math.abs(msg.speed ?? 120));
          }
        } catch {}
      };
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [sessionId]);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ── Pointer handlers ───────────────────
  const handlePointerDown = useCallback((dir) => (e) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    scrollingRef.current = true;
    directionRef.current = dir;
    setDirection(dir);

    const currentSpeed = speedRef.current;
    baseSpeedRef.current = currentSpeed;
    startYRef.current = e.clientY;

    // Empezar a scrollear
    const signedSpeed = dir === 'forward' ? currentSpeed : -currentSpeed;
    send({ type: 'speed', value: signedSpeed });
    send({ type: 'play' });
  }, [send]);

  const handlePointerMove = useCallback((e) => {
    if (!scrollingRef.current) return;
    e.preventDefault();

    const deltaY = startYRef.current - e.clientY; // positivo = swipe arriba
    const adjustment = Math.round(deltaY / SPEED_SENSITIVITY);
    let newSpeed = baseSpeedRef.current + adjustment;
    newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed));

    if (newSpeed !== speedRef.current) {
      speedRef.current = newSpeed;
      setSpeed(newSpeed);

      const signedSpeed = directionRef.current === 'forward' ? newSpeed : -newSpeed;
      send({ type: 'speed', value: signedSpeed });
    }
  }, [send]);

  const handlePointerUp = useCallback((e) => {
    if (!scrollingRef.current) return;
    e.preventDefault();

    scrollingRef.current = false;
    directionRef.current = null;
    setDirection(null);
    send({ type: 'pause' });
  }, [send]);

  // ── Text send ──────────────────────────
  const handleSendText = () => {
    const t = speechText.trim();
    if (!t) return;
    send({ type: 'setText', text: t });
    setSendFeedback(true);
    setTimeout(() => setSendFeedback(false), 1500);
  };

  // ── Speed label ────────────────────────
  const speedLabel = speed === 0 ? 'Detenido'
    : speed <= 60 ? 'Muy lenta'
    : speed <= 120 ? 'Lenta'
    : speed <= 200 ? 'Normal'
    : speed <= 300 ? 'Rapida'
    : 'Turbo';

  return (
    <div style={{
      background: '#0a0a0a', color: '#eee', minHeight: '100dvh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 12, paddingBottom: 20,
      display: 'flex', flexDirection: 'column', gap: 8,
      touchAction: 'none', userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 4px 0',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#ccc' }}>
          BetterPrompter
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#666' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connected ? '#00ff88' : '#555',
            boxShadow: connected ? '0 0 6px #00ff88' : 'none',
          }} />
          <span>{connected ? 'Conectado' : 'Desconectado'}</span>
        </div>
      </div>

      {/* ── Speed display ── */}
      <div style={{
        textAlign: 'center', padding: '8px 0 4px',
        transition: 'opacity 0.15s',
        opacity: direction ? 1 : 0.6,
      }}>
        <div style={{
          fontSize: 52, fontWeight: 300, fontVariantNumeric: 'tabular-nums',
          letterSpacing: -1, color: '#00ff88', lineHeight: 1,
          transition: 'all 0.1s',
        }}>
          {speed}
          <span style={{ fontSize: 16, color: '#666', fontWeight: 400 }}> px/s</span>
        </div>
        <div style={{
          fontSize: 12, color: '#555', marginTop: 4,
          letterSpacing: 0.5,
        }}>
          {direction === 'forward' ? 'ADELANTE' : direction === 'backward' ? 'ATRAS' : '--'} / {speedLabel}
        </div>
      </div>

      {/* ── Pedales ── */}
      <div style={{
        flex: 1, display: 'flex', gap: 10,
        minHeight: 0,
      }}>
        {/* Boton ATRAS */}
        <button
          onPointerDown={handlePointerDown('backward')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            flex: 1, borderRadius: 20, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 8,
            background: direction === 'backward'
              ? 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.3) 100%)'
              : 'rgba(255,255,255,0.04)',
            border: direction === 'backward'
              ? '1px solid rgba(255,255,255,0.15)'
              : '1px solid rgba(255,255,255,0.03)',
            transition: 'all 0.1s',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          {/* Flecha atras animada */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            opacity: direction === 'backward' ? 1 : 0.4,
          }}>
            <Triangle dir="left" />
            <Triangle dir="left" />
            <Triangle dir="left" />
          </div>
          <span style={{
            fontSize: 14, fontWeight: 500, letterSpacing: 1,
            color: direction === 'backward' ? '#fff' : '#666',
          }}>
            ATRAS
          </span>
        </button>

        {/* Boton ADELANTE */}
        <button
          onPointerDown={handlePointerDown('forward')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            flex: 1, borderRadius: 20, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 8,
            background: direction === 'forward'
              ? 'linear-gradient(180deg, rgba(0,255,136,0.25) 0%, rgba(0,255,136,0.05) 100%)'
              : 'rgba(0,255,136,0.04)',
            border: direction === 'forward'
              ? '1px solid rgba(0,255,136,0.3)'
              : '1px solid rgba(0,255,136,0.03)',
            transition: 'all 0.1s',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            opacity: direction === 'forward' ? 1 : 0.4,
          }}>
            <Triangle dir="right" />
            <Triangle dir="right" />
            <Triangle dir="right" />
          </div>
          <span style={{
            fontSize: 14, fontWeight: 500, letterSpacing: 1,
            color: direction === 'forward' ? '#00ff88' : '#666',
          }}>
            ADELANTE
          </span>
        </button>
      </div>

      {/* ── Indicador de swipe ── */}
      {direction && (
        <div style={{
          textAlign: 'center', fontSize: 11, color: '#555',
          padding: '2px 0',
          animation: 'pulse 0.3s',
        }}>
          Desliza hacia arriba para mas velocidad, abajo para menos
        </div>
      )}

      {/* ── Botones inferiores ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => send({ type: 'reset' })}
          style={bottomBtn}
        >
          Volver al inicio
        </button>
        <button
          onClick={() => setShowTextInput(v => !v)}
          style={bottomBtn}
        >
          {showTextInput ? 'Ocultar texto' : 'Editar texto'}
        </button>
      </div>

      {/* ── Text input ── */}
      {showTextInput && (
        <div style={{
          background: '#141414', border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: 16, padding: 16,
        }}>
          <textarea
            value={speechText}
            onChange={e => setSpeechText(e.target.value)}
            placeholder="Pega aca tu speech..."
            style={{
              width: '100%', minHeight: 100, background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.03)', borderRadius: 10,
              color: '#eee', fontSize: 14, lineHeight: 1.5, padding: 12,
              resize: 'vertical', fontFamily: 'system-ui, sans-serif',
              outline: 'none', touchAction: 'auto',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => { setSpeechText(''); send({ type: 'setText', text: '' }); }}
              style={{ ...bottomBtn, flex: 1 }}
            >
              Limpiar
            </button>
            <button
              onClick={handleSendText}
              style={{
                ...bottomBtn, flex: 1,
                background: sendFeedback ? '#00ff88' : 'rgba(0,255,136,0.1)',
                color: sendFeedback ? '#000' : '#00ff88',
                border: '1px solid rgba(0,255,136,0.2)',
              }}
            >
              {sendFeedback ? 'Enviado' : 'Enviar texto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente triangulo ──
function Triangle({ dir }) {
  const rotation = dir === 'left' ? 'rotate(180deg)' : 'rotate(0deg)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ transform: rotation }}>
      <path d="M5 12l14-8v16L5 12z" fill="currentColor" />
    </svg>
  );
}

// ── Bottom button style ──
const bottomBtn = {
  flex: 1, padding: '12px 0', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.03)',
  background: 'rgba(255,255,255,0.03)',
  color: '#888', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
};
