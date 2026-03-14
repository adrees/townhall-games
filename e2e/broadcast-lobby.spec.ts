import { test, expect } from './fixtures';

const CSV_PATH = '/home/adamgrees/work_area/townhall-games/src/fixtures/trivia-questions.csv';

async function createTriviaSession(adminPage: import('@playwright/test').Page) {
  await adminPage.locator('#csvFile').setInputFiles(CSV_PATH);
  await expect(adminPage.locator('#startSessionBtn')).toBeEnabled({ timeout: 3000 });
  await adminPage.locator('#startSessionBtn').click();
  await expect(adminPage.locator('#controllerSection')).toBeVisible({ timeout: 3000 });
}

test.describe('broadcast lobby — player appears on join', () => {
  test('player name appears in word cloud after joining', async ({ browser, serverUrl }) => {
    const broadcastCtx = await browser.newContext();
    const broadcastPage = await broadcastCtx.newPage();
    await broadcastPage.goto(`${serverUrl}/broadcast/trivia`);
    await expect(broadcastPage.locator('#lobbySection')).toBeVisible();

    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`${serverUrl}/admin/trivia`);
    await createTriviaSession(adminPage);

    const playerCtx = await browser.newContext();
    const playerPage = await playerCtx.newPage();
    await playerPage.goto(`${serverUrl}/play`);
    await playerPage.locator('#screenName').fill('TestPlayer');
    await playerPage.locator('#joinBtn').click();

    await expect(broadcastPage.locator('#wordCloud', { hasText: 'TestPlayer' })).toBeVisible({ timeout: 5000 });
    await expect(broadcastPage.locator('#playerCountLabel')).toHaveText('1 player joined');

    await broadcastCtx.close();
    await adminCtx.close();
    await playerCtx.close();
  });

  test('player count updates when a second player joins', async ({ browser, serverUrl }) => {
    const broadcastCtx = await browser.newContext();
    const broadcastPage = await broadcastCtx.newPage();
    await broadcastPage.goto(`${serverUrl}/broadcast/trivia`);
    await expect(broadcastPage.locator('#lobbySection')).toBeVisible();

    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`${serverUrl}/admin/trivia`);
    await createTriviaSession(adminPage);

    const player1Ctx = await browser.newContext();
    const player1Page = await player1Ctx.newPage();
    await player1Page.goto(`${serverUrl}/play`);
    await player1Page.locator('#screenName').fill('Alice');
    await player1Page.locator('#joinBtn').click();
    await expect(broadcastPage.locator('#playerCountLabel')).toHaveText('1 player joined', { timeout: 5000 });

    const player2Ctx = await browser.newContext();
    const player2Page = await player2Ctx.newPage();
    await player2Page.goto(`${serverUrl}/play`);
    await player2Page.locator('#screenName').fill('Bob');
    await player2Page.locator('#joinBtn').click();

    await expect(broadcastPage.locator('#playerCountLabel')).toHaveText('2 players joined', { timeout: 5000 });
    await expect(broadcastPage.locator('#wordCloud', { hasText: 'Alice' })).toBeVisible();
    await expect(broadcastPage.locator('#wordCloud', { hasText: 'Bob' })).toBeVisible();

    await broadcastCtx.close();
    await adminCtx.close();
    await player1Ctx.close();
    await player2Ctx.close();
  });
});
