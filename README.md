# room

A personal interactive 3D room built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/). An isometric, orthographic scene where every object in the room is a portal to something — a podcast, a map, a film leaderboard, or a bit of writing.

## Features

- **Isometric 3D scene** — orthographic camera with constrained orbit so the room always looks right
- **Animated character** — idle loop with a wave on hover
- **Interactive objects** — click the character, microphone, map, trophy, bubble, birdies, or TV to open the corresponding overlay
- **Tooltip clamping** — tooltips never overflow off the edge of the screen
- **Mobile-ready** — touch tap fires object interactions; portrait/landscape zoom adjusts automatically; iOS safe-area insets respected

## Interactable Objects

| Object | Opens |
|--------|-------|
| Character | About me panel |
| Microphone | Podcast popup |
| Map | World map view with continent popups |
| Trophy | Film leaderboard |
| Bubble | Reflection popup |
| Birdies | Reflection popup |
| Television | TV popup |

## Tech Stack

- [Three.js](https://threejs.org/) `^0.182` — 3D rendering, GLTF models, OrbitControls, raycasting
- [Vite](https://vitejs.dev/) `^7` — dev server and bundler
- Vanilla JS (ES modules)
- Custom CSS with `@font-face` (Crispy Cream, Kai, Playfair Display)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
room/
├── public/
│   ├── fonts/          # Crispy Cream, Kai, Playfair Display
│   ├── images/         # Textures and poster artwork
│   └── models/         # GLTF/GLB scene files
│       ├── room.glb
│       ├── table.glb
│       ├── character.glb
│       ├── character_idle.glb
│       └── character_wave.glb
└── src/
    ├── main.js         # Scene setup, controls, interactions
    └── style.css       # All UI styles and responsive breakpoints
```

## Mobile Behaviour

- **Portrait phone** (< 768 px) — default zoom set to `7.0` so the full room is visible
- **Landscape phone** — zoom set to `5.5`
- **Touch taps** — update the raycaster mouse vector so the existing click handler fires on mobile
- **Orientation change** — camera reframes 300 ms after rotation
- **iOS home bar** — help button uses `env(safe-area-inset-bottom)` to stay above the home indicator
