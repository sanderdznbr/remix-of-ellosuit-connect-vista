import { test, expect } from '@playwright/test';

/**
 * Regression test for the /carousel/:id flash-and-redirect-to-home bug.
 *
 * The bug: opening /carousel/:id (or clicking "Editar" on a saved post)
 * would briefly flash and then redirect the user back to "/" before the
 * carousel had a chance to load.
 *
 * The fix (useCarouselRouteSync) guarantees:
 *   - while a routeCarouselId is present in the URL, we NEVER navigate('/')
 *   - the URL stays at /carousel/:id throughout the load
 *
 * This test enforces both rules at the browser level.
 */

const CAROUSEL_ID = 'e2e-test-id-123';
const TARGET_PATH = `/carousel/${CAROUSEL_ID}`;

test.describe('/carousel/:id routing', () => {
  test('direct navigation does not redirect to / and does not flash', async ({ page }) => {
    const pathHistory: string[] = [];

    // Capture every committed navigation in the SPA.
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        pathHistory.push(new URL(frame.url()).pathname);
      }
    });

    await page.goto(TARGET_PATH, { waitUntil: 'domcontentloaded' });

    // Give React Router + the hook a moment to do anything they would do.
    await page.waitForTimeout(2000);

    // URL must still be /carousel/:id — no redirect to "/".
    expect(new URL(page.url()).pathname).toBe(TARGET_PATH);

    // No flash: at no point did the SPA visit "/" after our target navigation.
    const visitedRoot = pathHistory.filter((p) => p === '/').length > 0;
    expect(
      visitedRoot,
      `Unexpected redirect to "/" during /carousel/:id load. History: ${JSON.stringify(pathHistory)}`,
    ).toBe(false);
  });

  test('clicking an Editar link to /carousel/:id keeps the route stable', async ({ page }) => {
    // Synthesize a minimal "Editar" link on the home page to exercise the
    // exact user gesture from the bug report. We inject it into the live app
    // so the click triggers React Router's client-side navigation.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate((href) => {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.setAttribute('data-testid', 'e2e-editar-link');
      a.textContent = 'Editar';
      a.style.cssText =
        'position:fixed;top:8px;left:8px;z-index:99999;background:#8B5CF6;color:#fff;padding:8px 12px;border-radius:6px;';
      document.body.appendChild(a);
    }, TARGET_PATH);

    const pathHistory: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        pathHistory.push(new URL(frame.url()).pathname);
      }
    });

    await page.click('[data-testid="e2e-editar-link"]');
    await page.waitForTimeout(2000);

    expect(new URL(page.url()).pathname).toBe(TARGET_PATH);

    // After the click landed on /carousel/:id, we should not have bounced to "/".
    const idxTarget = pathHistory.indexOf(TARGET_PATH);
    const bouncedHome =
      idxTarget !== -1 && pathHistory.slice(idxTarget + 1).some((p) => p === '/');
    expect(
      bouncedHome,
      `Bounced back to "/" after reaching /carousel/:id. History: ${JSON.stringify(pathHistory)}`,
    ).toBe(false);
  });
});
