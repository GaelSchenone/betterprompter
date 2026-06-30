# BetterPrompter

**Teleprompter con control remoto desde el celular.**  
Diseñado para presentadores que necesitan ver el speech en una pantalla y controlar la velocidad desde el telefono — como si fuera un pedal, pero sin el pedal.

Crea una **sesion** al abrir la raiz del sitio. Comparti el codigo QR y cualquiera puede controlar la velocidad desde su celular, exactamente como el presentador de Canva.

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/WebSocket-Real--time-000000" alt="WebSocket">
  <img src="https://img.shields.io/badge/Lucide-Icons-00ff88" alt="Lucide Icons">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
</p>

---

## Como funciona

| URL | Que hace |
|-----|----------|
| `https://dominio.com/` | Crea una sesion y abre el teleprompter |
| `https://dominio.com/control/{id}` | Control remoto para esa sesion |

Abris la raiz en la laptop, se genera una sesion unica con un QR. Escaneas el QR con el celular y tenes el control en la mano. Simple.

---

## Features

- **Dos pantallas, un control.** El texto corre en la laptop mientras controlas velocidad desde el celular.
- **Sesiones automaticas.** Cada visita a la raiz genera una sesion nueva — como Canva.
- **QR compartible.** Escaneas y controlas al instante, sin configurar nada.
- **Scroll suave.** Animacion fluida con `requestAnimationFrame`.
- **Modo espejo.** Inverti el texto horizontalmente para vidrio beamsplitter.
- **Control remoto via WebSocket.** Tiempo real, baja latencia.
- **Velocidad ajustable.** Slider + presets (Lenta, Normal, Rapida, Turbo).
- **Saltos instantaneos.** Volve o adelantate 5/10 segundos con un toque.
- **Sin dependencia externa.** React + Lucide empaquetados en el build.
- **Docker listo.** Un comando para deployar en Dokploy o cualquier VPS.
- **Multi-control.** Varios celulares pueden conectarse a la misma sesion.

---

## Arquitectura

```
LAPTOP                            CELULAR
┌─────────────────────┐          ┌─────────────────────┐
│  / (raiz)           │          │  /control/{session} │
│                     │          │                     │
│  ┌───────────────┐  │  WS wss  │  Velocidad          │
│  │ Texto espejado│  │◄────────►│  Play / Pause       │
│  │ scroll suave  │  │          │  Saltos             │
│  │ QR con sesion │  │          │  Texto input        │
│  └───────────────┘  │          └─────────────────────┘
└─────────────────────┘
       │
       │ HDMI
       ▼
  ┌──────────┐
  │  Keynote │
  │ (ext.)   │
  └──────────┘
```

Cada sesion tiene su propio estado (texto, velocidad, posicion) aislado del resto.

---

## Quick Start

### Local

```bash
git clone https://github.com/GaelSchenone/betterprompter.git
cd betterprompter

pnpm install
pnpm dev        # dev con hot-reload
```

### Produccion

```bash
pnpm build
pnpm start      # sirve el build en :3001
```

### Docker

```bash
docker build -t betterprompter .
docker run -d -p 3001:3001 betterprompter
```

### Dokploy

1. Agrega el repo como fuente en Dokploy
2. El `Dockerfile` multi-stage se detecta automaticamente
3. Listo — tu dominio raiz ya funciona sin `/display.html`

---

## Uso

### 1. Abrir el display (laptop)

Navega a `https://tu-dominio.com/` (o `http://localhost:3001`).

Se genera una sesion automaticamente. Pega tu speech con el boton **Texto** o la tecla `T`.

### 2. Conectar el control (celular)

Escanea el **codigo QR** que aparece en la pantalla, o abri directamente:
`https://tu-dominio.com/control/{sessionId}`

Ambos dispositivos deben estar en la **misma red**.

### 3. Controlar

| Control | Funcion |
|---------|---------|
| Play / Pause | Inicia o detiene el scroll |
| Slider de velocidad | Ajusta la velocidad en px/s |
| Presets | Lenta (60), Normal (120), Rapida (200), Turbo (300) |
| Saltos | Retrocede o avanza 5/10 segundos |
| Volver al inicio | Resetea la posicion del scroll |
| Enviar texto | Sincroniza el speech desde el celular |

### Atajos (display)

| Tecla | Accion |
|-------|--------|
| `Space` | Play / Pause |
| `T` | Editar texto |
| `M` | Alternar espejo |
| `F` | Pantalla completa |

---

## Tech Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18, React Router 6, Vite |
| Tiempo real | WebSocket (`ws`) |
| Iconos | Lucide React |
| Server | Node.js, Express |
| Container | Docker multi-stage (node:20-slim) |

---

## Estructura del proyecto

```
betterprompter/
├── server.js              Servidor Express + WebSocket con sesiones
├── src/
│   ├── main.jsx           Entry point React
│   ├── App.jsx            Router ( / y /control/:id )
│   └── pages/
│       ├── Display.jsx    Teleprompter con sesion + QR
│       └── Control.jsx    Control remoto mobile
├── index.html             Vite entry
├── vite.config.js         Configuracion Vite
├── package.json           Dependencias
├── Dockerfile             Build multi-stage
├── LICENSE                MIT
└── README.md
```

---

## Licencia

MIT &copy; 2026 Gael Schenone
