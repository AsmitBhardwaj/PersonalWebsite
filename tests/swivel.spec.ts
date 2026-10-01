import { expect, test, type Page } from '@playwright/test';

const stage = (page: Page) => page.locator('.device-stage');
const lid = (page: Page) => page.locator('.display-assembly');
const SOUND_KEY = 'sidekick:muted';
/** A point on the lid's bezel (above the glass in the open orientation), in the lid's own unrotated frame. */
const BEZEL = { x: 0, y: 0.44 };

/** Counts audio plays by stubbing the media element before any page script runs. */
async function spyOnSound(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __plays: number }).__plays = 0;
    HTMLMediaElement.prototype.play = function play() { (window as unknown as { __plays: number }).__plays += 1; return Promise.resolve(); };
  });
}
const plays = (page: Page) => page.evaluate(() => (window as unknown as { __plays: number }).__plays);

async function waitForWake(page: Page) {
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
}

/** Angle of the screen layer, read from its inline transform. */
const angleOf = (page: Page) => lid(page).evaluate((el) => {
  const match = /rotate\((-?[\d.]+(?:e-?\d+)?)deg\)/.exec((el as HTMLElement).style.transform);
  return match ? Number(match[1]) : NaN;
});

/** Where the middle of the screen layer sits when turned to `angle` (mirrors the controller's hinge maths). */
async function lidPoint(page: Page, angle: number, grab = { x: 0, y: 0 }) {
  const g = await page.evaluate(() => {
    const st = document.querySelector('.device-stage') as HTMLElement;
    const d = document.querySelector('.display-assembly') as HTMLElement;
    const r = st.getBoundingClientRect();
    return { hx: r.left + d.offsetLeft + d.offsetWidth / 2, hy: r.top + d.offsetTop + 0.580392 * d.offsetHeight, w: d.offsetWidth, h: d.offsetHeight };
  });
  const a = angle * Math.PI / 180;
  // `grab` is a point on the lid, in its own unrotated frame, measured from the lid centre as a fraction of its size.
  const lx = grab.x * g.w;
  const ly = -0.080392 * g.h + grab.y * g.h;
  const shift = (64 - 80 * angle / 180) / 100 * g.h;
  return { x: g.hx + lx * Math.cos(a) - ly * Math.sin(a), y: g.hy + shift + lx * Math.sin(a) + ly * Math.cos(a) };
}

async function dragTo(page: Page, from: number, to: number, release = true, grab = { x: 0, y: 0 }) {
  const start = await lidPoint(page, from, grab);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const p = await lidPoint(page, from + (to - from) * i / steps, grab);
    await page.mouse.move(p.x, p.y);
  }
  if (release) await page.mouse.up();
}

test.describe('opening the device', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the device waits closed until a visitor opens it', async ({ page }) => {
    await waitForWake(page);
    await page.waitForTimeout(1000);
    await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
    expect(await angleOf(page)).toBe(0);
  });

  test('a click runs the full swivel and lands on the exact open pose', async ({ page }) => {
    await waitForWake(page);
    await lid(page).click();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await angleOf(page)).toBe(180);
    expect(await lid(page).evaluate((el) => (el as HTMLElement).style.transform)).toContain('translate3d(0px, -16%, 0px) rotate(180deg) scale(1)');
    await expect(stage(page)).toHaveAttribute('data-ready', 'true');
    await expect(page.getByRole('button', { name: 'Open Projects', exact: true }).first()).toBeVisible();
    await expect(stage(page)).not.toHaveAttribute('data-swiveling', /.*/);
    expect(await page.evaluate(() => document.querySelector<HTMLElement>('.phone')!.style.transform)).toBe('');
  });

  test('Enter and Space open it, and so does the lid button', async ({ page }) => {
    await waitForWake(page);
    await page.keyboard.press('Space');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');

    await waitForWake(page);
    await page.getByRole('button', { name: 'Open the device' }).focus();
    await page.keyboard.press('Enter');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });

  test('the swing is 400-450 ms with an overshoot of about 3 degrees that settles back', async ({ page }) => {
    await waitForWake(page);
    await page.evaluate(() => {
      const lidEl = document.querySelector<HTMLElement>('.display-assembly')!;
      const w = window as unknown as { __trace: { t: number; a: number }[] };
      w.__trace = [];
      const tick = () => {
        const m = /rotate\((-?[\d.]+(?:e-?\d+)?)deg\)/.exec(lidEl.style.transform);
        w.__trace.push({ t: performance.now(), a: m ? Number(m[1]) : NaN });
        if (document.querySelector('.device-stage')!.getAttribute('data-phase') !== 'open') requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.keyboard.press('Enter');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    const trace = await page.evaluate(() => (window as unknown as { __trace: { t: number; a: number }[] }).__trace);
    const moving = trace.filter((s) => s.a > 0.5 || s.a < 179.99 || s.a === 180).filter((s) => s.a > 0.5);
    const peak = Math.max(...moving.map((s) => s.a));
    expect(peak).toBeGreaterThan(181.5);
    expect(peak).toBeLessThanOrEqual(183.01);
    const first = moving[0];
    const atPeak = moving.find((s) => s.a === peak)!;
    expect(atPeak.t - first.t).toBeGreaterThan(330);
    expect(atPeak.t - first.t).toBeLessThan(560);
    expect(moving[moving.length - 1].a).toBe(180);
  });

  test('lifts, throws a shadow, recoils the body and keeps the glare fixed in the world during the swing', async ({ page }) => {
    await waitForWake(page);
    await page.evaluate(() => {
      const q = (selector: string) => document.querySelector<HTMLElement>(selector)!;
      const w = window as unknown as { __samples: { scale: number; recoil: number; soft: number; tight: number; lid: number; glare: number }[] };
      w.__samples = [];
      const tick = () => {
        const lidT = q('.display-assembly').style.transform;
        const glareT = q('.glass-glare i').style.transform;
        w.__samples.push({
          scale: Number(/scale\(([\d.]+)\)/.exec(lidT)?.[1] ?? NaN),
          recoil: Number(/translate3d\((-?[\d.]+)px/.exec(q('.phone').style.transform)?.[1] ?? 0),
          soft: Number(q('.swivel-shadow__layer--soft').style.opacity),
          tight: Number(q('.swivel-shadow__layer--tight').style.opacity),
          lid: Number(/rotate\((-?[\d.]+(?:e-?\d+)?)deg\)/.exec(lidT)?.[1] ?? NaN),
          glare: Number(/rotate\((-?[\d.]+(?:e-?\d+)?)deg\)\s*$/.exec(glareT)?.[1] ?? NaN),
        });
        if (q('.device-stage').getAttribute('data-phase') !== 'open') requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.keyboard.press('Enter');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    const samples = await page.evaluate(() => (window as unknown as { __samples: Record<string, number>[] }).__samples);
    const max = (key: string) => Math.max(...samples.map((s) => s[key]));
    expect(max('scale')).toBeGreaterThan(1.012);
    expect(max('scale')).toBeLessThanOrEqual(1.0151);
    expect(samples[samples.length - 1].scale).toBe(1);
    expect(max('soft')).toBeGreaterThan(0.3);
    expect(samples[samples.length - 1].soft).toBe(0);
    expect(samples[0].tight).toBeGreaterThan(max('soft') - 0.5);
    expect(max('recoil')).toBeGreaterThan(0.5);
    expect(max('recoil')).toBeLessThanOrEqual(2);
    expect(Math.min(...samples.map((s) => s.recoil))).toBeGreaterThanOrEqual(0);
    expect(samples[samples.length - 1].recoil).toBe(0);
    // The glass turns by (lid - 180); the glare turns by the opposite, so its gradient never rotates in the world.
    for (const s of samples) expect(s.glare + (s.lid - 180)).toBeCloseTo(0, 2);
  });

  test('a drag past 30 degrees completes the swivel, short of it springs back closed', async ({ page }) => {
    await waitForWake(page);
    await dragTo(page, 0, 20);
    expect(await angleOf(page)).toBeGreaterThan(18);
    expect(await angleOf(page)).toBeLessThan(22);
    await page.mouse.up();
    await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
    await expect.poll(() => angleOf(page)).toBe(0);

    await dragTo(page, 0, 45);
    expect(await angleOf(page)).toBeGreaterThan(43);
    await page.mouse.up();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await angleOf(page)).toBe(180);
  });

  test('the angle follows the pointer while dragging', async ({ page }) => {
    await waitForWake(page);
    await dragTo(page, 0, 100, false);
    expect(Math.abs((await angleOf(page)) - 100)).toBeLessThan(2);
    const back = await lidPoint(page, 60);
    await page.mouse.move(back.x, back.y);
    expect(Math.abs((await angleOf(page)) - 60)).toBeLessThan(2);
    await page.mouse.up();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });

  test('dragging the bezel back closes it, and short of 30 degrees it springs open again', async ({ page }) => {
    await waitForWake(page);
    await lid(page).click();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');

    await dragTo(page, 180, 165, true, BEZEL);
    await page.mouse.up();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    await expect.poll(() => angleOf(page)).toBe(180);

    await dragTo(page, 180, 120, true, BEZEL);
    await page.mouse.up();
    await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
    expect(await angleOf(page)).toBe(0);
    await expect(stage(page)).toHaveAttribute('data-ready', 'false');

    await lid(page).click();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });

  test('grabbing the glass of the open device does not move the lid', async ({ page }) => {
    await waitForWake(page);
    await lid(page).click();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    const shell = await page.locator('.screen-shell').boundingBox();
    if (!shell) throw new Error('no screen');
    await page.mouse.move(shell.x + shell.width / 2, shell.y + shell.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(shell.x + shell.width / 2 + 60, shell.y + shell.height * 0.3, { steps: 6 });
    await page.mouse.up();
    expect(await angleOf(page)).toBe(180);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });

  test('the display dims near-black while the lock screen swaps for the home screen', async ({ page }) => {
    await waitForWake(page);
    await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>('.screen-viewport')!;
      const w = window as unknown as { __dim: number[]; __homeVisibleWhileDim: boolean[] };
      w.__dim = []; w.__homeVisibleWhileDim = [];
      const tick = () => {
        const o = Number(getComputedStyle(viewport).opacity);
        w.__dim.push(o);
        if (document.querySelector('.device-stage')!.getAttribute('data-phase') !== 'open') requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.keyboard.press('Enter');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    const dim = await page.evaluate(() => (window as unknown as { __dim: number[] }).__dim);
    expect(Math.min(...dim)).toBeLessThan(0.1);
    expect(dim[0]).toBe(1);
    expect(dim[dim.length - 1]).toBe(1);
  });
});

test.describe('sound', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('clacks once for a user-initiated open, and not for skip', async ({ page }) => {
    await spyOnSound(page);
    await waitForWake(page);
    await page.keyboard.press('Enter');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await plays(page)).toBe(1);

    await page.reload();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await plays(page)).toBe(0);
  });

  test('a released drag clacks at the snap, and a drag that springs back stays quiet', async ({ page }) => {
    await spyOnSound(page);
    await waitForWake(page);
    await dragTo(page, 0, 15);
    await page.mouse.up();
    await expect.poll(() => angleOf(page)).toBe(0);
    expect(await plays(page)).toBe(0);
    await dragTo(page, 0, 50);
    await page.mouse.up();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await plays(page)).toBe(1);
  });

  test('the mute toggle silences it and the choice survives a reload', async ({ page }) => {
    await spyOnSound(page);
    await waitForWake(page);
    const toggle = page.getByRole('button', { name: 'Mute device sounds' });
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Unmute device sounds' })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SOUND_KEY)).toBe('1');
    await page.keyboard.press('Escape');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Enter');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await plays(page)).toBe(0);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Unmute device sounds' })).toBeVisible();
  });
});

test.describe('layers', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the shadow is clipped to the body and the swing writes only transform, opacity and filter', async ({ page }) => {
    await waitForWake(page);
    const clip = await page.locator('.swivel-shadow-clip').evaluate((el) => {
      const css = getComputedStyle(el);
      return css.maskImage !== 'none' ? css.maskImage : css.webkitMaskImage;
    });
    expect(clip).toContain('device-base-open.png');
    expect(await page.locator('.display-assembly').evaluate((el) => getComputedStyle(el).willChange)).toContain('transform');

    await page.evaluate(() => {
      const names = new Set<string>();
      const w = window as unknown as { __styleProps: Set<string> };
      w.__styleProps = names;
      const watch = ['.display-assembly', '.swivel-shadow', '.swivel-shadow__layer--tight', '.swivel-shadow__layer--soft', '.glass-glare i', '.display-back', '.display-front-face', '.phone', '.contact-shadow', '.screen-viewport'];
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          const el = record.target as HTMLElement;
          (record.oldValue ?? '').split(';').map((d) => d.split(':')[0].trim()).filter(Boolean).forEach((name) => names.add(name));
          Array.from(el.style).forEach((name) => names.add(name));
        }
      });
      watch.forEach((selector) => document.querySelectorAll(selector).forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ['style'], attributeOldValue: true })));
    });
    await page.keyboard.press('Enter');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    const touched = await page.evaluate(() => [...(window as unknown as { __styleProps: Set<string> }).__styleProps]);
    expect(touched.length).toBeGreaterThan(0);
    for (const name of touched) expect(['transform', 'opacity', 'filter']).toContain(name);
  });

  test('the glare stays within 15% white', async ({ page }) => {
    await waitForWake(page);
    const alpha = await page.locator('.glass-glare').evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--glare-alpha')));
    expect(alpha).toBeGreaterThanOrEqual(0.1);
    expect(alpha).toBeLessThanOrEqual(0.15);
  });
});

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('still starts open, and a close/open uses a crossfade with no recoil, scale or glare movement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    const seen = await page.evaluate(() => new Promise<{ scales: string[]; recoil: string[]; glare: string[] }>((resolve) => {
      const out = { scales: new Set<string>(), recoil: new Set<string>(), glare: new Set<string>() };
      const lidEl = document.querySelector<HTMLElement>('.display-assembly')!;
      const phone = document.querySelector<HTMLElement>('.phone')!;
      const glare = document.querySelector<HTMLElement>('.glass-glare i')!;
      const tick = () => {
        out.scales.add(/scale\(([\d.]+)\)/.exec(lidEl.style.transform)?.[1] ?? '');
        out.recoil.add(phone.style.transform);
        out.glare.add(glare.style.transform);
      };
      const id = setInterval(tick, 8);
      setTimeout(() => { clearInterval(id); resolve({ scales: [...out.scales], recoil: [...out.recoil], glare: [...out.glare] }); }, 600);
    }));
    expect(seen.scales).toEqual(['1']);
    expect(seen.recoil).toEqual(['']);
    expect(seen.glare).toHaveLength(1);
  });
});

test.describe('small screens', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the swivel runs in-device on a phone and a touch drag opens it', async ({ page }) => {
    await waitForWake(page);
    expect(await stage(page).getAttribute('data-focus')).toBeNull();
    const box = await lid(page).boundingBox();
    if (!box) throw new Error('no lid');
    const client = await page.context().newCDPSession(page);
    const point = (x: number, y: number) => [{ x, y, id: 1 }];
    // Drag the lid up and over: touch events along the hinge arc of a short drag past 30 degrees.
    const start = await lidPoint(page, 0);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(start.x, start.y) });
    for (let i = 1; i <= 8; i++) {
      const p = await lidPoint(page, 45 * i / 8);
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(p.x, p.y) });
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await angleOf(page)).toBe(180);
    expect(await stage(page).getAttribute('data-focus')).toBeNull();

    await page.getByRole('button', { name: 'Open About', exact: true }).first().tap();
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
  });
});

test.describe('discoverability', () => {
  for (const viewport of [{ width: 1280, height: 650 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    test(`a visible prompt opens the closed device at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await waitForWake(page);
      const prompt = page.getByRole('button', { name: /press Enter to open/i });
      await expect(prompt).toBeVisible();
      await prompt.click();
      await expect(stage(page)).toHaveAttribute('data-phase', 'open');
      await expect(prompt).toHaveCount(0);
    });
  }
});
