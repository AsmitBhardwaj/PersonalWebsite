import { expect, test } from './fixtures';

test.describe('plain version, JavaScript off', () => {
  // No storageState: seeding localStorage needs a script, and Firefox hangs creating a JS-off context that has any.
  test.use({ javaScriptEnabled: false, storageState: { cookies: [], origins: [] } });

  test('/plain renders every section as plain HTML', async ({ page }) => {
    await page.goto('/plain');
    await expect(page).toHaveTitle(/Asmit Bhardwaj/);
    await expect(page.getByRole('heading', { level: 1, name: 'Asmit Bhardwaj' })).toBeVisible();
    for (const name of ['About', 'Skills', 'Experience', 'Projects', 'Now', 'Contact']) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    }
    await expect(page.locator('main article')).toHaveCount(5); // 3 roles + 2 projects
    await expect(page.getByRole('heading', { name: 'Platter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The Professor' })).toBeVisible();
    await expect(page.getByText('Languages')).toBeVisible();
    await expect(page.getByText('Tech Mahindra Americas').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /bharas01@gettysburg\.edu/ })).toHaveAttribute('href', 'mailto:bharas01@gettysburg.edu');
    await expect(page.getByRole('link', { name: /linkedin\.com\/in\/asmitbhardwaj/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /github\.com\/AsmitBhardwaj/ })).toBeVisible();
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://asmitbhardwaj.dev/plain');
    await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /Gettysburg/);
    expect(await page.locator('script').evaluateAll((s) => s.map((el) => el.getAttribute('type')))).toEqual(['application/ld+json']);
    await expect(page.getByRole('link', { name: /Back to the interactive site/ }).first()).toHaveAttribute('href', '/');
  });

  test('the main page offers /plain in a noscript block and carries SEO tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Read the plain version' })).toHaveAttribute('href', '/plain');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://asmitbhardwaj.dev/');
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(ld).toMatchObject({ '@type': 'Person', name: 'Asmit Bhardwaj', url: 'https://asmitbhardwaj.dev/', jobTitle: 'Software Engineer' });
  });
});

test.describe('plain version entry points', () => {
  test('the "Plain version" link sits next to the mute toggle and opens /plain', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('.device-controls').getByRole('link', { name: 'Plain version' });
    await expect(link).toHaveAttribute('href', '/plain');
    await expect(page.locator('.device-controls .sound-toggle')).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/plain$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Asmit Bhardwaj');
  });

  test('robots.txt and sitemap.xml list both pages', async ({ request }) => {
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://asmitbhardwaj.dev/sitemap.xml');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>https://asmitbhardwaj.dev/</loc>');
    expect(sitemap).toContain('<loc>https://asmitbhardwaj.dev/plain</loc>');
  });
});
