import { test, expect } from './fixtures';

const CSV_PATH = '/home/adamgrees/work_area/townhall-games/src/fixtures/trivia-questions.csv';

async function createTriviaSession(adminPage: import('@playwright/test').Page) {
  await adminPage.locator('#csvFile').setInputFiles(CSV_PATH);
  await expect(adminPage.locator('#startSessionBtn')).toBeEnabled({ timeout: 3000 });
  await adminPage.locator('#startSessionBtn').click();
  await expect(adminPage.locator('#controllerSection')).toBeVisible({ timeout: 3000 });
}

test.describe('trivia player flow', () => {
  test('player joins and sees waiting state', async ({ browser, serverUrl }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`${serverUrl}/admin/trivia`);
    await createTriviaSession(adminPage);

    const playerCtx = await browser.newContext();
    const playerPage = await playerCtx.newPage();
    await playerPage.goto(`${serverUrl}/play`);

    await playerPage.locator('#screenName').fill('Alice');
    await playerPage.locator('#joinBtn').click();

    // Join form should hide; waiting section should appear
    await expect(playerPage.locator('#joinSection')).toBeHidden({ timeout: 3000 });
    await expect(playerPage.locator('#waitingSection')).toBeVisible({ timeout: 3000 });

    await adminCtx.close();
    await playerCtx.close();
  });

  test('player sees question when admin goes live', async ({ browser, serverUrl }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`${serverUrl}/admin/trivia`);
    await createTriviaSession(adminPage);

    const playerCtx = await browser.newContext();
    const playerPage = await playerCtx.newPage();
    await playerPage.goto(`${serverUrl}/play`);
    await playerPage.locator('#screenName').fill('Alice');
    await playerPage.locator('#joinBtn').click();
    await expect(playerPage.locator('#waitingSection')).toBeVisible({ timeout: 3000 });

    // Admin previews then goes live on first question
    await adminPage.locator('#previewBtn').click();
    await expect(adminPage.locator('#goLiveBtn')).toBeEnabled({ timeout: 3000 });
    await adminPage.locator('#goLiveBtn').click();

    // Player should see the live question with answer buttons
    await expect(playerPage.locator('#triviaQuestion')).toBeVisible({ timeout: 5000 });
    await expect(playerPage.locator('#questionText')).not.toBeEmpty();
    await expect(playerPage.locator('.answer-btn')).toHaveCount(4);
    await expect(playerPage.locator('#countdown')).toBeVisible();

    await adminCtx.close();
    await playerCtx.close();
  });

  test('player submits answer and sees outcome', async ({ browser, serverUrl }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    // speed=true reduces timer from 10s to 3s
    await adminPage.goto(`${serverUrl}/admin/trivia?speed=true`);
    await createTriviaSession(adminPage);

    const playerCtx = await browser.newContext();
    const playerPage = await playerCtx.newPage();
    await playerPage.goto(`${serverUrl}/play`);
    await playerPage.locator('#screenName').fill('Alice');
    await playerPage.locator('#joinBtn').click();
    await expect(playerPage.locator('#waitingSection')).toBeVisible({ timeout: 3000 });

    // Admin starts the question
    await adminPage.locator('#previewBtn').click();
    await expect(adminPage.locator('#goLiveBtn')).toBeEnabled({ timeout: 3000 });
    await adminPage.locator('#goLiveBtn').click();
    await expect(playerPage.locator('#triviaQuestion')).toBeVisible({ timeout: 5000 });

    // Player submits an answer
    await playerPage.locator('.answer-btn[data-answer="A"]').click();

    // After timer (3s) + reveal delay (2.5s), player sees outcome
    // triviaQuestion hides; triviaBreakdown then triviaOutcome appear
    await expect(playerPage.locator('#triviaOutcome')).toBeVisible({ timeout: 10000 });
    await expect(playerPage.locator('#outcomeText')).not.toBeEmpty();

    await adminCtx.close();
    await playerCtx.close();
  });
});
