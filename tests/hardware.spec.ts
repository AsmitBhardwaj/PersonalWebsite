import { expect, test, type Page } from '@playwright/test';
import { DEVICE_REFERENCE, hardwareControlById } from '../src/components/device/hardwareControlMap';

async function clickHardware(page: Page, id: string) {
  const control = hardwareControlById.get(id);
  if (!control) throw new Error(`Unknown hardware control: ${id}`);
  const stage = await page.locator('.device-stage').boundingBox();
  if (!stage) throw new Error('Device stage is not visible');
  await page.mouse.click(
    stage.x + (control.x + control.width / 2) / DEVICE_REFERENCE.width * stage.width,
    stage.y + (control.y + control.height / 2) / DEVICE_REFERENCE.height * stage.height,
  );
}

async function hardwarePoint(page: Page, id: string) {
  const control = hardwareControlById.get(id);
  const stage = await page.locator('.device-stage').boundingBox();
  if (!control || !stage) throw new Error(`Cannot resolve ${id}`);
  return {
    x: stage.x + (control.x + control.width / 2) / DEVICE_REFERENCE.width * stage.width,
    y: stage.y + (control.y + control.height / 2) / DEVICE_REFERENCE.height * stage.height,
  };
}

async function openPhone(page: Page, path = '/') {
  await page.goto(path);
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.device-stage')).toHaveAttribute('data-ready', 'true');
}

test('coordinate clicks type, edit, shift, and execute a command', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await clickHardware(page, 'key-a');
  await expect(page.getByTestId('command-buffer')).toHaveCount(0);
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'mid-swivel', { timeout: 3000 });
  await expect(page.locator('.hardware-control:enabled')).toHaveCount(0);
  await page.getByRole('button', { name: 'Skip intro' }).click();

  await clickHardware(page, 'key-a');
  await clickHardware(page, 'key-b');
  await clickHardware(page, 'key-c');
  await expect(page.getByTestId('command-buffer')).toHaveText('abc');
  await clickHardware(page, 'key-space');
  await clickHardware(page, 'key-a');
  await expect(page.getByTestId('command-buffer')).toHaveText('abc a');
  await clickHardware(page, 'key-backspace');
  await expect(page.getByTestId('command-buffer')).toHaveText('abc ');
  await clickHardware(page, 'key-shift');
  await clickHardware(page, 'key-a');
  await expect(page.getByTestId('command-buffer')).toHaveText('abc A');

  await page.keyboard.press('Escape');
  await page.keyboard.type('projects');
  await clickHardware(page, 'key-enter');
  await expect(page.getByText('Signal Garden')).toBeVisible();
});

test('commands, aliases, unknown input, and physical keyboard share behavior', async ({ page }) => {
  await openPhone(page);
  await page.keyboard.type('about');
  await page.keyboard.press('Enter');
  await expect(page.getByText('A little about me')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.type('help');
  await page.keyboard.press('Enter');
  await expect(page.locator('.hardware-terminal__feedback')).toContainText('projects');
  await page.keyboard.type('nope');
  await page.keyboard.press('Enter');
  await expect(page.locator('.hardware-terminal__feedback')).toHaveText('Command not found. Type help.');
  await page.keyboard.type('proj');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Signal Garden')).toBeVisible();
});

test('D-pad, trackball, call, and back controls route the existing screen', async ({ page }) => {
  await openPhone(page);
  await clickHardware(page, 'dpad-right');
  await expect(page.getByRole('button', { name: 'Open Projects' })).toHaveAttribute('aria-current', 'true');
  await clickHardware(page, 'dpad-right');
  await expect(page.getByRole('button', { name: 'Open Experience' })).toHaveAttribute('aria-current', 'true');
  await clickHardware(page, 'dpad-center');
  await expect(page.getByText('Selected path')).toBeVisible();
  await clickHardware(page, 'control-back');
  await expect(page.getByRole('button', { name: 'Open Projects' })).toBeVisible();
  await clickHardware(page, 'control-call');
  await expect(page.getByText('Open channel')).toBeVisible();
  await clickHardware(page, 'control-back');
  await clickHardware(page, 'control-trackball');
  await expect(page.getByText('Selected path')).toBeVisible();
});

test('hardware controls enable after reduced-motion open state and remain inside the stage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.device-stage')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.hardware-control:enabled')).toHaveCount(55);
  const outside = await page.locator('.device-stage').evaluate((stage) => {
    const bounds = stage.getBoundingClientRect();
    return [...stage.querySelectorAll<HTMLElement>('.hardware-control')].filter((control) => {
      const box = control.getBoundingClientRect();
      return box.left < bounds.left || box.top < bounds.top || box.right > bounds.right || box.bottom > bounds.bottom;
    }).length;
  });
  expect(outside).toBe(0);
  await page.keyboard.type('abc');
  await expect(page.getByTestId('command-buffer')).toHaveText('abc');
});

for (const viewport of [
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`coordinate hitboxes stay aligned at ${viewport.name} size`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openPhone(page);
    await clickHardware(page, 'key-1');
    await clickHardware(page, 'key-p');
    await clickHardware(page, 'key-a');
    await clickHardware(page, 'key-shift');
    await clickHardware(page, 'key-z');
    await clickHardware(page, 'key-space');
    await expect(page.getByTestId('command-buffer')).toHaveText('1paZ ');
    await clickHardware(page, 'key-backspace');
    await expect(page.getByTestId('command-buffer')).toHaveText('1paZ');
    await clickHardware(page, 'dpad-right');
    await expect(page.getByRole('button', { name: 'Open Projects' })).toHaveAttribute('aria-current', 'true');
    await clickHardware(page, 'control-call');
    await expect(page.getByText('Open channel')).toBeVisible();
    await clickHardware(page, 'control-back');
    await expect(page.getByRole('button', { name: 'Open Projects' })).toBeVisible();
  });
}

test('touch activation remains visually transparent', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await openPhone(page);
  const point = await hardwarePoint(page, 'key-c');
  await page.touchscreen.tap(point.x, point.y);
  await expect(page.getByTestId('command-buffer')).toHaveText('c');
  const style = await page.locator('[data-control-id="key-c"]').evaluate((element) => {
    const computed = getComputedStyle(element);
    return { background: computed.backgroundColor, border: computed.borderTopWidth, shadow: computed.boxShadow };
  });
  expect(style).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px', shadow: 'none' });
  await context.close();
});

test('captures key map, invisible pointer feedback, command input, result, and mobile interaction', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPhone(page, '/?showKeyMap=1');
  await page.mouse.move(720, 700);
  await page.screenshot({ path: 'test-results/hardware-keymap-1440x900.png' });

  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  const point = await hardwarePoint(page, 'key-c');
  const cKey = page.locator('[data-control-id="key-c"]');
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await expect(cKey).toHaveAttribute('data-pressed', 'true');
  const pressedStyle = await cKey.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      border: style.borderTopWidth,
      shadow: style.boxShadow,
      outline: style.outlineStyle,
    };
  });
  expect(pressedStyle).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px', shadow: 'none', outline: 'none' });
  await page.screenshot({ path: 'test-results/hardware-key-pressed-1440x900.png' });
  await page.mouse.up();
  await page.mouse.move(1, 1);
  await expect(cKey).not.toBeFocused();
  await page.screenshot({ path: 'test-results/hardware-after-c-1440x900.png' });

  await cKey.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const keyboardOutline = await cKey.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(keyboardOutline).not.toBe('none');
  await cKey.evaluate((element) => element.blur());

  await page.keyboard.press('Escape');
  await page.keyboard.type('projects');
  await page.mouse.move(1, 1);
  await page.screenshot({ path: 'test-results/hardware-command-projects-1440x900.png' });
  await page.keyboard.press('Enter');
  await page.mouse.move(1, 1);
  await page.screenshot({ path: 'test-results/hardware-projects-open-1440x900.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Escape');
  await page.keyboard.type('help');
  await page.mouse.move(1, 1);
  await page.screenshot({ path: 'test-results/hardware-mobile-390x844.png', fullPage: true });
});

test('while an app is open the terminal stays closed and back/Escape close the app', async ({ page }) => {
  await openPhone(page);
  await clickHardware(page, 'dpad-right');
  await clickHardware(page, 'dpad-center');
  await expect(page.getByText('Sample project 1 / 3')).toBeVisible();
  await page.keyboard.type('abc');
  await page.keyboard.press('Alt+KeyA');
  await clickHardware(page, 'key-alt');
  await clickHardware(page, 'key-function');
  await expect(page.getByTestId('command-buffer')).toHaveCount(0);
  await expect(page.locator('.hardware-terminal')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open Projects' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Notes' }).click();
  await clickHardware(page, 'control-back');
  await expect(page.getByRole('button', { name: 'Open Notes' })).toBeVisible();
  await expect(page.getByText('Placeholder Track')).toHaveCount(0);
});
