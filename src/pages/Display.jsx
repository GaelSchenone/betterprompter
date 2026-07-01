import { useState, useEffect, useRef } from 'react';
import {
  FileText, FlipHorizontal2, Maximize, Scan, X, Check,
} from 'lucide-react';

const SESSION_LENGTH = 6;
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateId() {
  let id = '';
  for (let i = 0; i < SESSION_LENGTH; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}

function wsUrl(sessionId, role) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = new URL(location.href);
  url.protocol = proto;
  url.pathname = '/';
  url.search = `?sessionId=${sessionId}&role=${role}`;
  return url.toString();
}

export default function Display() {
  const [sessionId] = useState(generateId);
  const [text, setText] = useState('');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(120);
  const [mirrored, setMirrored] = useState(true);
  const [fontSize, setFontSize] = useState(48);
  const [connected, setConnected] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState('');

  const positionRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(120);
  const wsRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);
  const toolbarTimerRef = useRef(null);
  const containerRef = useRef(null);

  playingRef.current = playing;
  speedRef.current = speed;

  // ── WebSocket ──────────────────────────
  useEffect(() => {
    let reconnectTimer;
    let ws;

    function connect() {
      const url = wsUrl(sessionId, 'display');
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
          switch (msg.type) {
            case 'state':
              if (msg.text) setText(msg.text);
              setSpeed(msg.speed ?? 120);
              setPlaying(msg.playing ?? false);
              positionRef.current = msg.position ?? 0;
              break;
            case 'speed':
              setSpeed(msg.value);
              break;
            case 'play':
              setPlaying(true);
              break;
            case 'pause':
              setPlaying(false);
              break;
            case 'setText':
              setText(msg.text || '');
              positionRef.current = 0;
              break;
            case 'jump':
              positionRef.current = Math.max(0, positionRef.current + msg.value * speedRef.current);
              break;
            case 'reset':
              positionRef.current = 0;
              break;
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

  // ── Animation loop ─────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function loop(time) {
      if (playingRef.current && lastTimeRef.current) {
        const dt = (time - lastTimeRef.current) / 1000;
        positionRef.current += speedRef.current * dt;
        el.style.transform = mirrored
          ? `translateY(${-positionRef.current}px) scaleX(-1)`
          : `translateY(${-positionRef.current}px) scaleX(1)`;
      }
      lastTimeRef.current = time;
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [mirrored]);

  // ── Toolbar auto-hide ──────────────────
  useEffect(() => {
    const show = () => {
      setShowToolbar(true);
      clearTimeout(toolbarTimerRef.current);
      toolbarTimerRef.current = setTimeout(() => {
        if (!showModal) setShowToolbar(false);
      }, 3000);
    };
    document.addEventListener('mousemove', show);
    return () => {
      document.removeEventListener('mousemove', show);
      clearTimeout(toolbarTimerRef.current);
    };
  }, [showModal]);

  // ── Keyboard ───────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        wsRef.current?.send(JSON.stringify({ type: 'togglePlay' }));
      }
      if (e.key === 't' || e.key === 'T') {
        setModalText(text);
        setShowModal(true);
      }
      if (e.key === 'm' || e.key === 'M') setMirrored(v => !v);
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'Escape') { setShowModal(false); setShowQR(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [text]);

  // ── Control URL ────────────────────────
  const controlUrl = `${location.origin}/control/${sessionId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(controlUrl)}`;

  function handleApplyText() {
    const t = modalText.trim();
    if (t) setText(t);
    wsRef.current?.send(JSON.stringify({ type: 'setText', text: t }));
    positionRef.current = 0;
    setShowModal(false);
  }

  return (
    <div
      style={{
        background: '#000', color: '#fff', height: '100dvh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif', userSelect: 'none',
      }}
      onClick={(e) => {
        if (e.target.closest('[data-stop]')) return;
        wsRef.current?.send(JSON.stringify({ type: 'togglePlay' }));
      }}
    >
      {/* Toolbar */}
      <div data-stop style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'system-ui, sans-serif', fontSize: 13,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transform: showToolbar ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: connected ? '#00ff88' : '#555',
          boxShadow: connected ? '0 0 8px #00ff88' : 'none',
          transition: 'background 0.3s',
        }} />
        <span style={{ color: '#999', fontSize: 12 }}>
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
        <div style={{ flex: 1 }} />

        <TBtn onClick={() => { setModalText(text); setShowModal(true); }} title="Texto (T)">
          <FileText size={16} /> Texto
        </TBtn>
        <TBtn onClick={() => setMirrored(v => !v)} active={mirrored} title="Espejo (M)">
          <FlipHorizontal2 size={16} /> Espejo
        </TBtn>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#ccc', padding: '6px 10px', borderRadius: 6, fontSize: 12,
        }}>
          <span style={{ color: '#999', fontSize: 11 }}>A</span>
          <input type="range" min={20} max={96} value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            style={{ width: 80, accentColor: '#00ff88' }} />
          <span style={{ color: '#999', fontSize: 15 }}>A</span>
        </div>

        <TBtn onClick={toggleFullscreen} title="Fullscreen (F)"><Maximize size={18} /></TBtn>
        <TBtn onClick={() => setShowQR(v => !v)} title="QR"><Scan size={18} /></TBtn>
      </div>

      {/* Scroll text */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={containerRef} style={{
          position: 'absolute', left: '10%', right: '10%', top: 0,
          whiteSpace: 'pre-wrap', wordWrap: 'break-word',
          fontSize, lineHeight: 1.5,
          textShadow: '0 0 30px rgba(255,255,255,0.04)',
          willChange: 'transform', padding: '20px 0',
          transform: mirrored ? 'scaleX(-1)' : 'scaleX(1)',
          width: '80%',
        }}>
          {text ? (
            <div>{text}</div>
          ) : (
            <div style={{ color: '#444', textAlign: 'center', padding: '20vh 0', fontSize: 20, fontFamily: 'system-ui, sans-serif' }}>
              No hay texto cargado<br /><br />
              Presiona <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4, fontSize: 14 }}>T</kbd> o hace clic para pegar tu speech
            </div>
          )}
        </div>
      </div>

      {/* Speed overlay */}
      <div style={{
        position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.15)', fontFamily: 'system-ui, sans-serif',
        fontSize: 14, fontVariantNumeric: 'tabular-nums',
        pointerEvents: 'none', opacity: playing ? 1 : 0, transition: 'opacity 0.5s',
      }}>
        -- {Math.round(speed)} px/s --
      </div>

      {/* Hover hint */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.08)', fontFamily: 'system-ui, sans-serif',
        fontSize: 12, pointerEvents: 'none', transition: 'opacity 1s',
        opacity: showToolbar ? 0 : 1,
      }}>
        Mueve el mouse para mostrar controles
      </div>

      {/* QR */}
      {showQR && (
        <div data-stop style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 50,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16,
          textAlign: 'center', fontFamily: 'system-ui, sans-serif',
        }}>
          <img src={qrSrc} alt="QR" style={{ width: 140, height: 140, borderRadius: 4, display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 11, color: '#888' }}>Escanea para controlar</div>
          <div style={{ fontSize: 11, color: '#00ff88', wordBreak: 'break-all', marginTop: 4 }}>
            {controlUrl}
          </div>
        </div>
      )}

      {/* Text modal */}
      {showModal && (
        <div data-stop style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#111', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: 30, width: '90%', maxWidth: 700,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'system-ui, sans-serif', fontSize: 18, fontWeight: 600, color: '#eee', marginBottom: 16 }}>
              Pega tu speech
            </h2>
            <textarea value={modalText} onChange={e => setModalText(e.target.value)}
              placeholder="Pega aca el texto de tu presentacion..."
              style={{
                flex: 1, minHeight: 300, background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                color: '#eee', fontSize: 16, lineHeight: 1.6, padding: 16,
                resize: 'vertical', fontFamily: 'system-ui, sans-serif', outline: 'none',
              }} autoFocus
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px',
                  borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)',
                  color: '#aaa', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                <X size={16} /> Cancelar
              </button>
              <button onClick={handleApplyText}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px',
                  borderRadius: 8, border: 'none', background: '#00ff88',
                  color: '#000', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                <Check size={16} /> Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TBtn({ children, onClick, active, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: active ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.06)',
      border: active ? '1px solid #00ff88' : '1px solid rgba(255,255,255,0.08)',
      color: active ? '#00ff88' : '#ccc',
      padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
      fontSize: 12, fontFamily: 'system-ui, sans-serif',
      whiteSpace: 'nowrap', transition: 'all 0.2s',
    }}>
      {children}
    </button>
  );
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
}
