# BetterPrompter

**Teleprompter con control remoto desde el celular.**  
Diseñado para presentadores que necesitan ver el speech en una pantalla y controlar la velocidad desde el teléfono — como si fuera un pedal, pero sin el pedal.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/WebSocket-Real--time-000000" alt="WebSocket">
  <img src="https://img.shields.io/badge/Lucide-Icons-00ff88" alt="Lucide Icons">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
</p>

---

## Features

- **Dos pantallas, un control.** El texto corre en la laptop (pantalla externa) mientras controlás velocidad desde el celular.
- **Scroll suave.** Animación fluida con `requestAnimationFrame` — sin tirones, sin CSS cuts.
- **Modo espejo.** Invertí el texto horizontalmente para usar con vidrio beamsplitter (teleprompter real).
- **Control remoto vía WebSocket.** Conexión en tiempo real, baja latencia.
- **Velocidad ajustable.** Slider + presets (Lenta, Normal, Rapida, Turbo).
- **Saltos instantaneos.** Volve o adelantate 5/10 segundos con un toque.
- **Sin dependencia externa.** Lucide Ions servidos localmente — funciona sin internet.
- **Docker listo.** Un comando para deployar en Dokploy, Railway, o cualquier VPS.
- **Multi-control.** Varios celulares pueden conectarse como control simultaneamente.

---

## Arquitectura

```
┌──────────────────────┐       WebSocket        ┌──────────────────────┐
│     LAPTOP           │◄──────────────────────►│      CELULAR         │
│  /display.html       │                        │  /control.html       │
│                      │                        │                      │
│  ┌──────────────┐    │    play/pause/speed    │  ┌──────────────┐    │
│  │ Texto espejado│    │    jump/reset/text     │  │  Velocidad   │    │
│  │ scroll suave  │    │                        │  │  Play/Pause  │    │
│  └──────────────┘    │                        │  │  Saltos      │    │
└──────────────────────┘                        │  │  Texto input │    │
        ▲                                       │  └──────────────┘    │
        │ HDMI / DisplayPort                    └──────────────────────┘
        │                                               ▲
  ┌──────────┐                                          │
  │  Keynote  │                                    Misma red WiFi
  │  (pantalla│
  │   externa)│
  └──────────┘
```

El server Node.js centraliza el estado y lo transmite a todos los clientes conectados via WebSocket.

---

## Quick Start

### Local

```bash
# Clonar
git clone https://github.com/GaelSchenone/betterprompter.git
cd betterprompter

# Instalar dependencias
pnpm install

# Iniciar servidor
pnpm start
```

### Docker

```bash
docker build -t betterprompter .
docker run -d -p 3001:3001 betterprompter
```

### Dokploy

1. Agregá el repo como fuente en Dokploy
2. El `Dockerfile` se detecta automaticamente
3. Seteá `PORT=3001` como variable de entorno si es necesario

---

## Uso

### 1. Abrir el display (laptop)

Navegá a `http://<ip-de-la-laptop>:3001/display.html`

Pega tu speech usando el boton **Texto** o la tecla `T`.  
El texto se muestra espejado (invertido horizontalmente) para usar con vidrio beamsplitter.  
Podes desactivar el espejo con el boton **Espejo** o la tecla `M`.

### 2. Conectar el control (celular)

Escaneá el codigo QR que aparece en la pantalla del display, o navega a:  
`http://<ip-de-la-laptop>:3001/control.html`

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
| Server | Node.js, Express |
| Tiempo real | WebSocket (`ws`) |
| Display | HTML, CSS, Vanilla JS |
| Control | Mobile-first HTML/CSS |
| Iconos | Lucide (servidos localmente) |
| Container | Docker (node:20-slim) |

---

## Estructura del proyecto

```
betterprompter/
├── server.js              Servidor Express + WebSocket
├── package.json           Dependencias
├── Dockerfile             Build container para Dokploy
├── LICENSE                MIT
├── README.md              Este archivo
└── public/
    ├── display.html       Interfaz del teleprompter (laptop)
    ├── control.html       Control remoto (celular)
    └── vendor/
        └── lucide.min.js  Lucide Icons (offline-ready)
```

---

## Licencia

MIT &copy; 2026 Gael Schenone
