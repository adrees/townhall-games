import { send } from './ws-client.js';
import { show, hide, showNotification } from './ui.js';

let countdownInterval = null;
let eliminated = false;

function showTriviaOnly(sectionId) {
    hide('waitingSection');
    hide('playingSection');
    hide('leaderboardSection');
    hide('winBanner');
    hide('triviaWaiting');
    hide('triviaQuestion');
    hide('triviaBreakdown');
    hide('triviaOutcome');
    show('triviaSection');
    show(sectionId);
}

export const triviaHandlers = {
    question_preview(_msg) {
        eliminated = false;
        showTriviaOnly('triviaWaiting');
    },

    question_live(msg) {
        if (countdownInterval !== null) {
            clearInterval(countdownInterval);
        }
        document.getElementById('questionText').textContent = msg.text;
        const buttons = document.querySelectorAll('.answer-btn');
        const labels = ['A', 'B', 'C', 'D'];
        buttons.forEach((btn, i) => {
            btn.textContent = labels[i] + '. ' + msg.options[i];
            btn.disabled = false;
            btn.classList.remove('selected');
        });
        let remaining = msg.timeLimit;
        document.getElementById('countdown').textContent = remaining + 's';
        countdownInterval = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                remaining = 0;
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            document.getElementById('countdown').textContent = remaining + 's';
        }, 1000);
        showTriviaOnly('triviaQuestion');
    },

    timer_expired(_msg) {
        if (countdownInterval !== null) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        const countdown = document.getElementById('countdown');
        if (countdown)
            countdown.textContent = '0s';
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
        });
        showTriviaOnly('triviaBreakdown');
    },

    answer_breakdown(_msg) {
        show('triviaBreakdown');
    },

    answer_accepted(_msg) {
        showNotification('Answer received!', 'success');
    },

    you_are_eliminated(msg) {
        eliminated = true;
        document.getElementById('outcomeText').textContent = "You're out!";
        const yourAnswer = msg.yourAnswer !== null ? msg.yourAnswer : 'No answer';
        document.getElementById('correctAnswerText').textContent =
            'Correct answer: ' + msg.correctAnswer + ' · Your answer: ' + yourAnswer;
        document.getElementById('survivorCountText').textContent = '';
        showTriviaOnly('triviaOutcome');
    },

    you_survived(msg) {
        const count = msg.survivorCount;
        document.getElementById('outcomeText').textContent = "You're through!";
        document.getElementById('correctAnswerText').textContent = '';
        document.getElementById('survivorCountText').textContent =
            count + ' player' + (count === 1 ? '' : 's') + ' remaining';
        showTriviaOnly('triviaOutcome');
    },

    survivors_regrouped(msg) {
        const count = msg.survivorCount;
        const countEl = document.getElementById('survivorCountText');
        if (countEl) {
            countEl.textContent = count + ' player' + (count === 1 ? '' : 's') + ' remaining';
        }
        if (eliminated) {
            const outcomeEl = document.getElementById('outcomeText');
            if (outcomeEl)
                outcomeEl.textContent = 'Spectating — ' + count + ' survivors left';
        }
        show('triviaOutcome');
    },

    game_over(msg) {
        const winners = msg.winners;
        const text = winners.length > 0 ? winners.join(', ') : 'No survivors';
        document.getElementById('outcomeText').textContent =
            'Game over! Winner' + (winners.length === 1 ? '' : 's') + ': ' + text;
        document.getElementById('correctAnswerText').textContent = '';
        document.getElementById('survivorCountText').textContent = '';
        showTriviaOnly('triviaOutcome');
    },
};

export function initAnswerButtons() {
    const container = document.getElementById('answerButtons');
    if (!container)
        return;
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.answer-btn');
        if (!btn || btn.disabled)
            return;
        const answer = btn.dataset.answer;
        send({ type: 'submit_answer', answer });
        document.querySelectorAll('.answer-btn').forEach(b => { b.disabled = true; });
        btn.classList.add('selected');
    });
}
