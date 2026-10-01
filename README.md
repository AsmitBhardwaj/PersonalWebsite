# Asmit Bhardwaj — Sidekick Portfolio

An interactive Sidekick-inspired portfolio built with React, TypeScript, Vite, GSAP, and layered HTML/CSS hardware.

## Run locally

```bash
npm install
npm run dev
```

Quality checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.

## Customize

All personal copy, projects, experience, notes, social URLs, music metadata, wallpaper path, and resume path live in `src/content/portfolio.ts`. Replace `public/assets/wallpaper/winter.svg` with your own local image and add project imagery under `public/assets/projects` when ready.

## Adding an app or game

1. Create `src/apps/MyApp.tsx` exporting a component. It receives `{ input, paused, close }`.
2. Add one entry to `src/apps/registry.ts`: `{ id, label, icon, tone, component }`. The home grid, d-pad navigation and terminal command (`id`, plus optional `aliases`) come from that entry. Set `hidden: true` to keep an app off the home screen.

Apps render inside `.app-host`, which is clipped to the screen (the bottom 14% is covered by the Back/Home bar). Optional `onOpen` / `onClose` on the entry run when the app opens and just before it unmounts; clean up timers and animation frames in effect cleanups, and stop them while `paused` is true (page hidden).

### Input

All input goes through one dispatcher (`src/components/device/useHardwareKeyboard.ts`). Physical keys and on-screen keys produce the same events. While an app is open only that app receives them; the home screen and terminal ignore them, and Back/Escape close the app (the app never sees Escape). The D-pad sends arrow keys, trackball centre and D-pad centre send `Enter`.

```tsx
export function Snake({ input, paused }: AppProps) {
  useAppInput(input, (event) => { /* event.type: 'keydown' | 'keyup', event.key, event.repeat */ });
  // or poll held keys each frame: input.isDown('ArrowLeft'), input.held
}
```

Keys the dispatcher consumes get `preventDefault`, so the page does not scroll. If a native `input`/`textarea`/contenteditable has focus, the browser handles typing and only the key lighting reacts (Escape then does not close the app; use Back).
