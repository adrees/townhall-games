/**
 * @jest-environment jsdom
 */

jest.mock('../ui.js', () => ({
  show: jest.fn(),
  hide: jest.fn(),
  showNotification: jest.fn(),
  buildGrid: jest.fn(),
  patchGrid: jest.fn(),
  setStatusBar: jest.fn(),
  setRoundIndicator: jest.fn(),
  showWinBanner: jest.fn(),
  updateLeaderboard: jest.fn(),
}));

jest.mock('../ws-client.js', () => ({
  connect: jest.fn(),
  send: jest.fn(),
}));

import { triviaHandlers, initAnswerButtons } from '../trivia-handlers.js';
import * as ui from '../ui.js';
import * as wsClient from '../ws-client.js';

const mockUi = ui as jest.Mocked<typeof ui>;
const mockWs = wsClient as jest.Mocked<typeof wsClient>;

// Build the minimal DOM structure needed by trivia-handlers
function buildDom(): void {
  document.body.innerHTML = `
    <div id="triviaSection" class="hidden"></div>
    <div id="triviaWaiting" class="hidden"></div>
    <div id="triviaQuestion" class="hidden">
      <div id="countdown"></div>
      <p id="questionText"></p>
      <div id="answerButtons">
        <button class="answer-btn" data-answer="A">A</button>
        <button class="answer-btn" data-answer="B">B</button>
        <button class="answer-btn" data-answer="C">C</button>
        <button class="answer-btn" data-answer="D">D</button>
      </div>
    </div>
    <div id="triviaBreakdown" class="hidden"></div>
    <div id="triviaOutcome" class="hidden">
      <p id="outcomeText"></p>
      <p id="correctAnswerText"></p>
      <p id="survivorCountText"></p>
    </div>
  `;
}

beforeEach(() => {
  buildDom();
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
describe('question_live', () => {
  it('sets question text and shows triviaQuestion section', () => {
    triviaHandlers.question_live({
      type: 'question_live',
      text: 'What year was the company founded?',
      options: ['2017', '2018', '2019', '2020'],
      timeLimit: 10,
    });

    expect(document.getElementById('questionText')!.textContent).toBe('What year was the company founded?');
    expect(mockUi.show).toHaveBeenCalledWith('triviaQuestion');
  });

  it('labels buttons with letter and option text', () => {
    triviaHandlers.question_live({
      type: 'question_live',
      text: 'Q?',
      options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
      timeLimit: 10,
    });

    const buttons = document.querySelectorAll<HTMLButtonElement>('.answer-btn');
    expect(buttons[0].textContent).toBe('A. Opt A');
    expect(buttons[1].textContent).toBe('B. Opt B');
    expect(buttons[2].textContent).toBe('C. Opt C');
    expect(buttons[3].textContent).toBe('D. Opt D');
  });

  it('starts countdown from timeLimit', () => {
    triviaHandlers.question_live({
      type: 'question_live',
      text: 'Q?',
      options: ['a', 'b', 'c', 'd'],
      timeLimit: 10,
    });

    expect(document.getElementById('countdown')!.textContent).toBe('10s');

    jest.advanceTimersByTime(3000);
    expect(document.getElementById('countdown')!.textContent).toBe('7s');
  });
});

// ---------------------------------------------------------------------------
describe('answer button click', () => {
  it('sends submit_answer with correct letter and disables all buttons', () => {
    initAnswerButtons();

    triviaHandlers.question_live({
      type: 'question_live',
      text: 'Q?',
      options: ['a', 'b', 'c', 'd'],
      timeLimit: 10,
    });

    const buttonB = document.querySelector<HTMLButtonElement>('[data-answer="B"]')!;
    buttonB.click();

    expect(mockWs.send).toHaveBeenCalledWith({ type: 'submit_answer', answer: 'B' });

    const buttons = document.querySelectorAll<HTMLButtonElement>('.answer-btn');
    buttons.forEach(btn => expect(btn.disabled).toBe(true));
  });

  it('marks selected button with "selected" class', () => {
    initAnswerButtons();

    triviaHandlers.question_live({
      type: 'question_live',
      text: 'Q?',
      options: ['a', 'b', 'c', 'd'],
      timeLimit: 10,
    });

    const buttonC = document.querySelector<HTMLButtonElement>('[data-answer="C"]')!;
    buttonC.click();

    expect(buttonC.classList.contains('selected')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('timer_expired', () => {
  it('clears the countdown interval and freezes display at 0s', () => {
    triviaHandlers.question_live({
      type: 'question_live',
      text: 'Q?',
      options: ['a', 'b', 'c', 'd'],
      timeLimit: 10,
    });

    jest.advanceTimersByTime(3000);
    triviaHandlers.timer_expired({ type: 'timer_expired' });

    // Countdown frozen — advancing time should not change it
    jest.advanceTimersByTime(5000);
    expect(document.getElementById('countdown')!.textContent).toBe('0s');
  });

  it('disables all answer buttons', () => {
    triviaHandlers.question_live({
      type: 'question_live',
      text: 'Q?',
      options: ['a', 'b', 'c', 'd'],
      timeLimit: 10,
    });

    triviaHandlers.timer_expired({ type: 'timer_expired' });

    document.querySelectorAll<HTMLButtonElement>('.answer-btn').forEach(btn => {
      expect(btn.disabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
describe('you_are_eliminated', () => {
  it('shows elimination screen with correct and submitted answer', () => {
    triviaHandlers.you_are_eliminated({
      type: 'you_are_eliminated',
      correctAnswer: 'B',
      yourAnswer: 'A',
    });

    expect(document.getElementById('outcomeText')!.textContent).toBe("You're out!");
    expect(document.getElementById('correctAnswerText')!.textContent).toContain('Correct answer: B');
    expect(document.getElementById('correctAnswerText')!.textContent).toContain('Your answer: A');
    expect(mockUi.show).toHaveBeenCalledWith('triviaOutcome');
  });

  it('shows "No answer" when yourAnswer is null', () => {
    triviaHandlers.you_are_eliminated({
      type: 'you_are_eliminated',
      correctAnswer: 'C',
      yourAnswer: null,
    });

    expect(document.getElementById('correctAnswerText')!.textContent).toContain('No answer');
  });
});

// ---------------------------------------------------------------------------
describe('you_survived', () => {
  it('shows survivor screen with count', () => {
    triviaHandlers.you_survived({ type: 'you_survived', survivorCount: 7 });

    expect(document.getElementById('outcomeText')!.textContent).toBe("You're through!");
    expect(document.getElementById('survivorCountText')!.textContent).toBe('7 players remaining');
    expect(mockUi.show).toHaveBeenCalledWith('triviaOutcome');
  });

  it('uses singular "player" when count is 1', () => {
    triviaHandlers.you_survived({ type: 'you_survived', survivorCount: 1 });
    expect(document.getElementById('survivorCountText')!.textContent).toBe('1 player remaining');
  });
});

// ---------------------------------------------------------------------------
describe('game_over', () => {
  it('shows winner names for a surviving player', () => {
    triviaHandlers.game_over({ type: 'game_over', winners: ['Alice', 'Bob'] });

    expect(document.getElementById('outcomeText')!.textContent).toContain('Alice, Bob');
    expect(mockUi.show).toHaveBeenCalledWith('triviaOutcome');
  });

  it('shows winner name for a single winner', () => {
    triviaHandlers.game_over({ type: 'game_over', winners: ['Carol'] });
    expect(document.getElementById('outcomeText')!.textContent).toContain('Winner: Carol');
  });

  it('shows game_over for an eliminated spectator (no winners)', () => {
    // First eliminate the player
    triviaHandlers.you_are_eliminated({
      type: 'you_are_eliminated',
      correctAnswer: 'A',
      yourAnswer: null,
    });

    triviaHandlers.game_over({ type: 'game_over', winners: [] });

    expect(document.getElementById('outcomeText')!.textContent).toContain('No survivors');
  });
});
