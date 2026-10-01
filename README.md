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

## Opening the device

The device wakes up shut and waits for the visitor. A click or tap on the lid, Enter or Space, or the lid's own "Open the device" button runs the full swivel; so does grabbing the lid and dragging it around its hinge. A drag released past 30 degrees completes the swivel with the full snap; short of that it springs back. From the home screen, dragging the open screen's bezel (not the glass) back past 30 degrees closes it the same way. "Skip intro" jumps straight to open, silently. With reduced motion the device starts open, and any open/close is a short crossfade with no recoil, lift or glare movement.

Every tuning value (durations, angles, scale, shadow, recoil, glare, drag threshold) is a named constant in `src/components/device/swivelConfig.ts`. `swivelMotion.ts` holds the pure maths (velocity curve, pose, glare transform) and has unit tests; `swivelController.ts` owns the screen layer's transform and the drag. The controller only writes `transform`, `opacity` and `filter` on the screen layer, its shadow and glare layers, and the device body; the desktop camera zoom animates the outer `.device-wrap`, so the two never share an element.

### Sound

The snap plays `public/assets/audio/clack.wav` (about 5 KB), only for a swivel the visitor started (never for skip or the reduced-motion restore). By default only opening clacks; flip `sound.onClose` in `swivelConfig.ts` to clack on closing too. The sound toggle sits in `.device-controls` (bottom right) and the choice is kept in `localStorage` under `sidekick:muted`. Music controls are meant to join it there.

**Licence:** the clack is synthesised by `scripts/generate-clack.mjs` (`npm run assets:audio`), so it is original work released under CC0 1.0 (public domain). No third-party audio is used.

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
