# Asmit Bhardwaj — Sidekick Portfolio

An interactive Sidekick-inspired portfolio built with React, TypeScript, Vite, GSAP, and layered HTML/CSS hardware.

## Run locally

```bash
npm install
npm run dev
```

Quality checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.

## Customize

All personal copy, projects, experience, notes, social URLs, music metadata, and wallpaper path live in `src/content/portfolio.ts`. Replace `public/assets/wallpaper/winter.svg` with your own local image and add project imagery under `public/assets/projects` when ready.

## Photos

The Photos app is a photo profile: round avatar, name, post count, a one-line bio (the first sentence of your About copy) and a 3-column grid. Tap a photo, or highlight it with the D-pad and press Enter, to open it with its caption, date and place. Swipe or use left/right to move between photos; Back or Escape returns to the grid, and once more leaves the app.

### Adding photos

1. Drop the originals (JPG, PNG, HEIC, WebP) into `photos-src/`. Delete the three `placeholder-*.jpg` files, or leave them: they are ignored as soon as a real photo exists.
2. Optionally describe them in `photos-src/captions.json`, keyed by filename. Every field is optional:

   ```json
   { "IMG_1234.HEIC": { "caption": "Feria night", "date": "2026-09", "place": "Sevilla" } }
   ```

   `date` is `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. Photos are shown newest first by that date, falling back to the file's modified date.
3. Run `npm run photos` (it also runs automatically before `dev`, `test`, `typecheck` and `build`, so Vercel does it for you).

`scripts/build-photos.mjs` auto-rotates each image from its EXIF orientation, **strips all metadata, including GPS/location**, resizes to 1080px on the long edge plus a 360px thumbnail, and writes WebP to `public/photos/` and a manifest to `src/content/photos.generated.json`. Both are generated and git-ignored; only `photos-src/` is committed. After writing, the script re-reads every output and **fails the build** if any of them still contains an EXIF, XMP or ICC chunk (EXIF is where GPS lives). Your originals are never served.

Set `INSTAGRAM_URL` in `src/content/photos.ts` to show a "Follow on Instagram" link (empty hides it), and `AVATAR_PHOTO` to a source filename to choose the avatar (empty uses the newest photo).

## Opening the device

The device wakes up shut and waits for the visitor. A click or tap on the lid, Enter or Space, or the lid's own "Open the device" button runs the full swivel; so does grabbing the lid and dragging it around its hinge. A drag released past 30 degrees completes the swivel with the full snap; short of that it springs back. From the home screen, dragging the open screen's bezel (not the glass) back past 30 degrees closes it the same way. "Skip intro" jumps straight to open, silently. With reduced motion the device starts open, and any open/close is a short crossfade with no recoil, lift or glare movement.

`SWIVEL_SPEED` in the same file (default 1.5) slows or speeds the whole swivel: it scales the swing, settle, spring-back, recoil and redraw dim together, and the angle-driven shadow, lift and glare follow. Every tuning value (durations, angles, scale, shadow, recoil, glare, drag threshold) is a named constant in `src/components/device/swivelConfig.ts`. `swivelMotion.ts` holds the pure maths (velocity curve, pose, glare transform) and has unit tests; `swivelController.ts` owns the screen layer's transform and the drag. The controller only writes `transform`, `opacity` and `filter` on the screen layer, its shadow and glare layers, and the device body; the desktop camera zoom animates the outer `.device-wrap`, so the two never share an element.

### Sound

The snap plays `public/assets/audio/clack.wav` (about 5 KB), only for a swivel the visitor started (never for skip or the reduced-motion restore). By default only opening clacks; flip `sound.onClose` in `swivelConfig.ts` to clack on closing too. The sound toggle sits in `.device-controls` (bottom right) and the choice is kept in `localStorage` under `sidekick:muted`. Music controls are meant to join it there.

**Licence:** the clack is synthesised by `scripts/generate-clack.mjs` (`npm run assets:audio`), so it is original work released under CC0 1.0 (public domain). No third-party audio is used.

## News posts

Write a post by adding one Markdown file to `content/news/`; no other edit is needed.

```markdown
---
title: My post
date: 2026-10-02
summary: One sentence for the card, the meta description and the feed.
---

Body in Markdown: `##`-`####` headings, paragraphs, lists, quotes, fenced code, rules, **bold**, *italic*, `code` and [links](https://example.com).
```

- The slug is the filename (`my-post.md` becomes `/news/my-post`). `date` is `YYYY-MM-DD`. Add `draft: true` to keep a file out of everything below. A missing field, a bad date or a duplicate slug fails the build and names the file.
- One parser (`src/content/news.ts`, with `markdown.ts`) feeds both the app and the build, so a new file produces all of: a card in the **News** app (newest first, with reading time), a static page at `/news/<slug>` (own title, description, canonical, Open Graph, Article JSON-LD), an `rss.xml` item, a `sitemap.xml` entry with `lastmod`, a section in `llms.txt`, a line in the `/plain` page, and a link in the `<noscript>` block of `index.html`.
- `vite.config.ts` generates the pages and files (`/plain`, `/news/<slug>`, `robots.txt`, `sitemap.xml`, `llms.txt`, `rss.xml`) into `dist/` at build and serves them from middleware in `dev` and `preview`. They are not in `public/`; the templates live in `src/content/` (`newsPages.ts`, `plainPage.ts`, `crawlerFiles.ts`). `sitemap.xml` also lists every photo from the Photos manifest with its caption.
- Vercel serves `dist/` files before anything else (`vercel.json` has `cleanUrls` and content-type headers); there is no SPA rewrite, so `/news/<slug>` is always the static file.

## Adding an app or game

1. Create `src/apps/MyApp.tsx` exporting a component. It receives `{ input, paused, close }`.
2. Add one entry to `src/apps/registry.ts`: `{ id, label, icon, tone, component }`. The home grid, d-pad navigation and terminal command (`id`, plus optional `aliases`) come from that entry. Set `hidden: true` to keep an app off the home screen.

Apps render inside `.app-host`, which is clipped to the screen (the bottom 14% is covered by the Back/Home bar). Optional `onOpen` / `onClose` on the entry run when the app opens and just before it unmounts; clean up timers and animation frames in effect cleanups, and stop them while `paused` is true (page hidden).

### Input

An app that has an inner view (a detail page, a viewer) can claim Back and Escape with `input.setBackHandler(() => boolean)`: return true when the press was used, false to let the app close. Photos uses it to leave the full view.

## The closed lid

While the device sits closed and untouched the lid nudges open about 7° and springs back (silently) after 3 s, again every 6 s, at most 3 times; any pointer or key interaction cancels the nudge and restarts the wait. A visitor who has never opened it gets a silent auto-open at 12 s, which continues into the normal boot or home flow. The `close` terminal command (home screen only) runs the reverse swivel with the clack. Reduced motion has no nudge. Timings are in `SWIVEL.idle` (`swivelConfig.ts`), scheduling in `idleNudge.ts`. Playwright drives these with mocked time (`page.clock`, see the helpers in `tests/swivel.spec.ts`), never real waits.

## First-visit boot

After the swivel opens for a first-time visitor, the screen plays a ~2 s boot (backlight, AsmitOS splash), then holds the Platter card on a 240x160 canvas scaled with nearest-neighbour. The card never advances by itself: the visitor presses the pixel Start button (click or tap), Enter, or the trackball or D-pad centre, and the screen hands off to home through the redraw dim. Other keys and taps elsewhere on the card do nothing; a tap on the App Store line opens the link. Reduced motion shows the same card and Start button with no animation. The `localStorage` key `sidekick:booted` is set when Start is pressed, so a visitor who leaves on the card sees it again; the `reboot` command replays it. `PLATTER_APP_STORE_STATUS` also drives the Platter status line on the Projects page. Timings, copy, palette and the `PLATTER_APPLE_ID` / `PLATTER_APP_STORE_STATUS` ('live' | 'coming_soon') constants are in `src/boot/bootConfig.ts`. Playwright runs every test as a returning visitor (see `playwright.config.ts`) except `tests/boot.spec.ts`, and silently: specs import `test` from `tests/fixtures.ts`, which sets the `sidekick:muted` flag before page scripts run (opt out with `test.use({ muted: false })`), and Chromium launches with `--mute-audio`.

All input goes through one dispatcher (`src/components/device/useHardwareKeyboard.ts`). Physical keys and on-screen keys produce the same events. While an app is open only that app receives them; the home screen and terminal ignore them, and Back/Escape close the app (the app never sees Escape). The D-pad sends arrow keys, trackball centre and D-pad centre send `Enter`.

```tsx
export function Snake({ input, paused }: AppProps) {
  useAppInput(input, (event) => { /* event.type: 'keydown' | 'keyup', event.key, event.repeat */ });
  // or poll held keys each frame: input.isDown('ArrowLeft'), input.held
}
```

Keys the dispatcher consumes get `preventDefault`, so the page does not scroll. If a native `input`/`textarea`/contenteditable has focus, the browser handles typing and only the key lighting reacts (Escape then does not close the app; use Back).
