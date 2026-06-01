import { send } from './ws-client.js';
import { show, hide, showNotification } from './ui.js';
import { state } from './state.js';

type Msg = { type: string; [key: string]: unknown };

let countdownInterval: ReturnType<typeof setInterval> | null = null;
let eliminated = false;
let screenName = '';

function showTriviaOnly(sectionId: string): void {
  hide('waitingSection');
  hide('triviaWaiting');
  hide('triviaQuestion');
  hide('triviaBreakdown');
  hide('triviaOutcome');
  show('triviaSection');
  show(sectionId);
}

export const triviaHandlers: Record<string, (msg: Msg) => void> = {
  joined(msg: Msg): void {
    screenName = msg.screenName as string;
    state.playerId = msg.playerId as string;
    hide('joinSection');
    show('waitingSection');
  },

  game_reset(_msg: Msg): void {
    if (countdownInterval !== null) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    hide('joinSection');
    hide('waitingSection');
    hide('triviaSection');
    show('rejoinSection');
    const rejoinBtn = document.getElementById('rejoinBtn') as HTMLButtonElement;
    if (rejoinBtn) rejoinBtn.disabled = true;
    const rejoinMsg = document.getElementById('rejoinMessage');
    if (rejoinMsg) rejoinMsg.textContent = 'Waiting for next game...';
  },

  session_created(_msg: Msg): void {
    if (!screenName) return;
    const rejoinBtn = document.getElementById('rejoinBtn') as HTMLButtonElement;
    if (rejoinBtn) rejoinBtn.disabled = false;
    const rejoinMsg = document.getElementById('rejoinMessage');
    if (rejoinMsg) rejoinMsg.textContent = 'New game ready!';
  },

  question_preview(_msg: Msg): void {
    eliminated = false;
    showTriviaOnly('triviaWaiting');
  },

  question_live(msg: Msg): void {
    if (countdownInterval !== null) {
      clearInterval(countdownInterval);
    }

    (document.getElementById('questionText') as HTMLElement).textContent = msg.text as string;

    const buttons = document.querySelectorAll<HTMLButtonElement>('.answer-btn');
    const labels = ['A', 'B', 'C', 'D'];
    const options = msg.options as string[];
    buttons.forEach((btn, i) => {
      btn.textContent = labels[i] + '. ' + options[i];
      btn.disabled = false;
      btn.classList.remove('selected');
    });

    let remaining = msg.timeLimit as number;
    (document.getElementById('countdown') as HTMLElement).textContent = remaining + 's';

    countdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        clearInterval(countdownInterval!);
        countdownInterval = null;
      }
      (document.getElementById('countdown') as HTMLElement).textContent = remaining + 's';
    }, 1000);

    showTriviaOnly('triviaQuestion');
  },

  timer_expired(_msg: Msg): void {
    if (countdownInterval !== null) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    const countdown = document.getElementById('countdown');
    if (countdown) countdown.textContent = '0s';

    document.querySelectorAll<HTMLButtonElement>('.answer-btn').forEach(btn => {
      btn.disabled = true;
    });

    showTriviaOnly('triviaBreakdown');
  },

  answer_breakdown(_msg: Msg): void {
    show('triviaBreakdown');
  },

  answer_accepted(_msg: Msg): void {
    showNotification('Answer received!', 'success');
  },

  you_are_eliminated(msg: Msg): void {
    eliminated = true;
    (document.getElementById('outcomeText') as HTMLElement).textContent = "You're out!";
    const yourAnswer = msg.yourAnswer !== null ? msg.yourAnswer as string : 'No answer';
    (document.getElementById('correctAnswerText') as HTMLElement).textContent =
      'Correct answer: ' + (msg.correctAnswer as string) + ' · Your answer: ' + yourAnswer;
    (document.getElementById('survivorCountText') as HTMLElement).textContent = '';
    showTriviaOnly('triviaOutcome');
  },

  you_survived(msg: Msg): void {
    const count = msg.survivorCount as number;
    (document.getElementById('outcomeText') as HTMLElement).textContent = "You're through!";
    (document.getElementById('correctAnswerText') as HTMLElement).textContent = '';
    (document.getElementById('survivorCountText') as HTMLElement).textContent =
      count + ' player' + (count === 1 ? '' : 's') + ' remaining';
    showTriviaOnly('triviaOutcome');
  },

  survivors_regrouped(msg: Msg): void {
    const count = msg.survivorCount as number;
    const countEl = document.getElementById('survivorCountText');
    if (countEl) {
      countEl.textContent = count + ' player' + (count === 1 ? '' : 's') + ' remaining';
    }
    if (eliminated) {
      const outcomeEl = document.getElementById('outcomeText');
      if (outcomeEl) outcomeEl.textContent = 'Spectating — ' + count + ' survivors left';
    }
    show('triviaOutcome');
  },

  game_over(msg: Msg): void {
    const winners = msg.winners as string[];
    const text = winners.length > 0 ? winners.join(', ') : 'No survivors';
    (document.getElementById('outcomeText') as HTMLElement).textContent =
      'Game over! Winner' + (winners.length === 1 ? '' : 's') + ': ' + text;
    (document.getElementById('correctAnswerText') as HTMLElement).textContent = '';
    (document.getElementById('survivorCountText') as HTMLElement).textContent = '';
    showTriviaOnly('triviaOutcome');
  },
};

// Register rejoin button click handler
export function initRejoinButton(): void {
  const rejoinBtn = document.getElementById('rejoinBtn');
  if (!rejoinBtn) return;
  rejoinBtn.addEventListener('click', () => {
    if (!screenName) return;
    window.location.href = '/play?name=' + encodeURIComponent(screenName);
  });
}

// Register answer button click handler
export function initAnswerButtons(): void {
  const container = document.getElementById('answerButtons');
  if (!container) return;
  container.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.answer-btn');
    if (!btn || btn.disabled) return;
    const answer = btn.dataset.answer!;
    send({ type: 'submit_answer', answer });
    document.querySelectorAll<HTMLButtonElement>('.answer-btn').forEach(b => { b.disabled = true; });
    btn.classList.add('selected');
  });
}
