# Gym Tycoon - Browser Game Starter

A lightweight, production-ready starter shell for a JavaScript browser game using Vite and Canvas.

## Tech Stack

- JavaScript (ES modules)
- Vite
- ESLint + Prettier

## Project Structure

```text
src/
  assets/      # images, sounds, spritesheets
  entities/    # game entities and components
  scenes/      # scene/state implementations
  styles/      # global styles
  systems/     # core engine systems (game loop, input, scene manager)
  ui/          # canvas/UI helpers
  utils/       # generic utility helpers
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

### Quality Checks

```bash
npm run lint
npm run format:check
```

## Extend the Game

1. Add more scenes in `src/scenes` and register them in `src/main.js`.
2. Add gameplay systems in `src/systems` (economy, spawning, progression).
3. Add entities in `src/entities` and render/UI helpers in `src/ui`.
4. Place media in `src/assets`.

## Notes

If PowerShell blocks `npm` with an execution policy error (`npm.ps1 cannot be loaded`), use `npm.cmd` instead:

```bash
npm.cmd install
npm.cmd run dev
```
