import { connect, send } from './ws-client.js';

// ── Config ────────────────────────────────────────────────────────────────────
const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === 'true';
const FINAL_10_THRESHOLD = 10;
const ANSWER_COLOURS = { A: 'answer-a', B: 'answer-b', C: 'answer-c', D: 'answer-d' };

// ── DOM ───────────────────────────────────────────────────────────────────────
const playerGrid       = document.getElementById('playerGrid');
const playerViz        = document.getElementById('playerViz');
const playerCountBadge = document.getElementById('playerCountBadge');
const headerSub        = document.getElementById('headerSub');
const questionHeader   = document.getElementById('questionHeader');
const questionNum      = document.getElementById('questionNum');
const questionHeaderText = document.getElementById('questionHeaderText');
const countdownWrap    = document.getElementById('countdownWrap');
const countdownNum     = document.getElementById('countdownNum');
const ringFill         = document.getElementById('ringFill');
const correctReveal    = document.getElementById('correctReveal');
const correctLetter    = document.getElementById('correctLetter');
const correctText      = document.getElementById('correctText');
const breakdownBars    = document.getElementById('breakdownBars');
const winnerScreen     = document.getElementById('winnerScreen');
const winnerLabel      = document.getElementById('winnerLabel');
const winnerNames      = document.getElementById('winnerNames');
const winnerSurvivorNote = document.getElementById('winnerSurvivorNote');
const debugPanel       = document.getElementById('debugPanel');
const debugJson        = document.getElementById('debugJson');

const barEls = { A: document.getElementById('barA'), B: document.getElementById('barB'), C: document.getElementById('barC'), D: document.getElementById('barD') };
const cntEls = { A: document.getElementById('cntA'), B: document.getElementById('cntB'), C: document.getElementById('cntC'), D: document.getElementById('cntD') };

if (DEBUG_MODE) debugPanel.style.display = 'block';

// ── SVG ring ──────────────────────────────────────────────────────────────────
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;
ringFill.style.strokeDasharray = RING_C;
ringFill.style.strokeDashoffset = '0';

// ── Player state ──────────────────────────────────────────────────────────────
// Map<playerId, { screenName, el: HTMLElement, state: 'active'|'eliminated' }>
const players = new Map();
let activeCount = 0;
let isFinal10 = false;
let currentQuestionIndex = 0;
let currentQuestionOptions = [];   // [a, b, c, d]
let pendingSurvivorsMsg = null;
let countdownInterval = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function updateCountBadge() {
    playerCountBadge.textContent = `${activeCount} player${activeCount === 1 ? '' : 's'}`;
}

function setSubText(text) {
    headerSub.textContent = text;
    headerSub.style.display = '';
    questionHeader.classList.remove('visible');
}

function showQuestionHeader(index, text) {
    headerSub.style.display = 'none';
    questionNum.textContent = `Question ${index + 1}`;
    questionHeaderText.textContent = text;
    questionHeader.classList.add('visible');
}

function stopCountdown() {
    if (countdownInterval !== null) { clearInterval(countdownInterval); countdownInterval = null; }
}

function startCountdown(timeLimit) {
    stopCountdown();
    let remaining = timeLimit;
    countdownNum.textContent = remaining;
    ringFill.style.strokeDashoffset = '0';
    countdownInterval = setInterval(() => {
        remaining = Math.max(0, remaining - 1);
        countdownNum.textContent = remaining;
        ringFill.style.strokeDashoffset = RING_C * (1 - remaining / timeLimit);
        if (remaining <= 0) stopCountdown();
    }, 1000);
}

// ── Tile creation ─────────────────────────────────────────────────────────────
function createTile(screenName) {
    const el = document.createElement('div');
    el.className = isFinal10 ? 'ptile nametile' : 'ptile';
    if (isFinal10) {
        const label = document.createElement('span');
        label.className = 'name-label';
        label.textContent = screenName;
        el.appendChild(label);
    }
    return el;
}

function rebuildGrid() {
    playerGrid.innerHTML = '';
    if (isFinal10) {
        playerGrid.classList.add('final10');
    } else {
        playerGrid.classList.remove('final10');
    }

    // Active players first, then eliminated
    const sorted = [...players.values()].sort((a, b) => {
        if (a.state === b.state) return 0;
        return a.state === 'active' ? -1 : 1;
    });

    for (const p of sorted) {
        playerGrid.appendChild(p.el);
    }
}

function colourTilesForLobby() {
    for (const p of players.values()) {
        if (p.state === 'active') {
            p.el.className = isFinal10 ? 'ptile nametile' : 'ptile';
        }
    }
}

function colourTilesForAnswers(playerAnswers) {
    for (const [pid, p] of players) {
        if (p.state !== 'active') continue;
        const ans = playerAnswers[pid];
        const base = isFinal10 ? 'ptile nametile' : 'ptile';
        if (ans && ANSWER_COLOURS[ans]) {
            p.el.className = `${base} ${ANSWER_COLOURS[ans]}`;
        } else {
            p.el.className = `${base} no-answer`;
        }
    }
}

// ── Phase: Lobby ──────────────────────────────────────────────────────────────
function setLobbyPhase() {
    playerViz.classList.remove('hidden');
    breakdownBars.classList.remove('visible');
    countdownWrap.classList.remove('visible');
    correctReveal.classList.remove('visible');
    questionHeader.classList.remove('visible');
    headerSub.style.display = '';
    winnerScreen.classList.remove('visible');
    setSubText('Waiting for players');
    colourTilesForLobby();
}

// ── Phase: Question ───────────────────────────────────────────────────────────
function setQuestionPhase(index, text, options, timeLimit) {
    currentQuestionOptions = options;
    playerViz.classList.add('hidden');
    breakdownBars.classList.remove('visible');
    correctReveal.classList.remove('visible');
    showQuestionHeader(index, text);
    countdownWrap.classList.add('visible');
    startCountdown(timeLimit);
}

// ── Phase: Breakdown ─────────────────────────────────────────────────────────
function setBreakdownPhase(counts, totalAnswered, playerAnswers) {
    stopCountdown();
    playerViz.classList.remove('hidden');
    countdownWrap.classList.remove('visible');
    correctReveal.classList.remove('visible');
    questionHeader.classList.remove('visible');
    headerSub.style.display = '';
    setSubText('Answers in');

    // colour tiles
    colourTilesForAnswers(playerAnswers);

    // update bars
    const total = Math.max(totalAnswered, 1);
    for (const opt of ['A', 'B', 'C', 'D']) {
        const n = counts[opt] ?? 0;
        barEls[opt].style.width = ((n / total) * 100) + '%';
        cntEls[opt].textContent = n;
    }
    breakdownBars.classList.add('visible');
}

// ── Phase: Survivor sequence ──────────────────────────────────────────────────
function runSurvivorSequence(eliminated, survivors, correct, options) {
    // T+3s: animate eliminated tiles out (same for both normal and final-10 mode)
    setTimeout(() => {
        for (const pid of eliminated) {
            const p = players.get(pid);
            if (!p) continue;
            p.state = 'eliminated';
            if (isFinal10) {
                p.el.classList.add('dropping');
            } else {
                p.el.classList.add('vanishing');
            }
        }
        // T+3.45s: remove from DOM, grid reflows automatically
        setTimeout(() => {
            for (const pid of eliminated) {
                const p = players.get(pid);
                if (p) { p.el.remove(); players.delete(pid); }
            }
        }, 450);
    }, 3000);

    // T+6s: show correct answer
    setTimeout(() => {
        const idx = ['A', 'B', 'C', 'D'].indexOf(correct);
        const answerText = idx >= 0 ? options[idx] : '';

        correctLetter.textContent = correct;
        correctLetter.style.color = `var(--answer-${correct.toLowerCase()})`;
        correctText.textContent = answerText;
        correctReveal.classList.add('visible');
        breakdownBars.classList.remove('visible');
        setSubText(`${survivors.length} survivor${survivors.length === 1 ? '' : 's'}`);

        if (pendingSurvivorsMsg) {
            applyRegrouped(pendingSurvivorsMsg);
            pendingSurvivorsMsg = null;
        }
    }, 6000);
}

function applyRegrouped(msg) {
    activeCount = msg.survivorCount;
    updateCountBadge();
    // Check if we should switch to final 10 mode
    if (!isFinal10 && msg.survivorCount <= FINAL_10_THRESHOLD && msg.survivorCount > 0) {
        isFinal10 = true;
        switchToFinal10();
    }
}

function switchToFinal10() {
    playerGrid.classList.add('final10');
    playerGrid.innerHTML = '';
    for (const [, p] of players) {
        const label = document.createElement('span');
        label.className = 'name-label';
        label.textContent = p.screenName;
        p.el = document.createElement('div');
        p.el.className = 'ptile nametile';
        p.el.appendChild(label);
        playerGrid.appendChild(p.el);
    }
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onPlayerJoined(msg) {
    activeCount++;
    updateCountBadge();
    const el = createTile(msg.screenName);
    players.set(msg.playerId, { screenName: msg.screenName, el, state: 'active' });
    playerGrid.appendChild(el);
}

function onPlayerLeft(msg) {
    const p = players.get(msg.playerId);
    if (p) { p.el.remove(); players.delete(msg.playerId); }
    activeCount = Math.max(0, activeCount - 1);
    updateCountBadge();
}

function onQuestionPreview(msg) {
    currentQuestionIndex = msg.questionIndex;
    correctReveal.classList.remove('visible');
    // Return to lobby-style colouring while question is previewing
    colourTilesForLobby();
    breakdownBars.classList.remove('visible');
    playerViz.classList.remove('hidden');
    setSubText(`Question ${msg.questionIndex + 1} coming up…`);
}

function onQuestionLive(msg) {
    currentQuestionOptions = msg.options;
    setQuestionPhase(currentQuestionIndex, msg.text, msg.options, msg.timeLimit);
}

function onAnswerBreakdown(msg) {
    setBreakdownPhase(msg.counts, msg.totalAnswered, msg.playerAnswers || {});
}

function onAnswerRevealed(msg) {
    // kick off the timed survivor animation sequence
    const survivingSet = new Set(msg.survivors);
    // mark survivors explicitly (eliminated = everyone NOT in survivors who is still active)
    for (const [pid, p] of players) {
        if (p.state === 'active' && !survivingSet.has(pid)) {
            // will be eliminated by the animation, but mark now for sorting
        }
    }
    runSurvivorSequence(msg.eliminated, msg.survivors, msg.correct, currentQuestionOptions);
}

function onSurvivorsRegrouped(msg) {
    // Buffer — applied at T+6s when reflow completes
    pendingSurvivorsMsg = msg;
}

function onGameOver(msg) {
    winnerScreen.classList.add('visible');
    const n = msg.winners.length;
    winnerLabel.textContent = n === 1 ? 'Winner' : 'Winners';
    winnerNames.textContent = msg.winners.join(' & ') || '—';
    winnerNames.style.animation = 'none';
    void winnerNames.offsetWidth;
    winnerNames.style.animation = '';
    winnerSurvivorNote.textContent = n === 0 ? 'No survivors' : '';
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetToLobby() {
    stopCountdown();
    for (const p of players.values()) p.el.remove();
    players.clear();
    activeCount = 0;
    isFinal10 = false;
    currentQuestionIndex = 0;
    currentQuestionOptions = [];
    pendingSurvivorsMsg = null;
    playerGrid.classList.remove('final10');
    playerGrid.innerHTML = '';
    updateCountBadge();
    winnerScreen.classList.remove('visible');
    breakdownBars.classList.remove('visible');
    correctReveal.classList.remove('visible');
    countdownWrap.classList.remove('visible');
    questionHeader.classList.remove('visible');
    headerSub.style.display = '';
    playerViz.classList.remove('hidden');
    setSubText('Waiting for players');
}

// ── Router ────────────────────────────────────────────────────────────────────
function handleMessage(msg) {
    if (DEBUG_MODE) debugJson.textContent = JSON.stringify(msg, null, 2);
    switch (msg.type) {
        case 'game_reset':          resetToLobby();                                          break;
        case 'session_created':     resetToLobby();                                          break;
        case 'player_joined':       onPlayerJoined(msg);                                     break;
        case 'player_left':         onPlayerLeft(msg);                                       break;
        case 'question_preview':    onQuestionPreview(msg);                                  break;
        case 'question_live':       onQuestionLive(msg);                                     break;
        case 'timer_expired':       /* breakdown event carries all data we need */           break;
        case 'answer_breakdown':    onAnswerBreakdown(msg);                                  break;
        case 'answer_revealed':     onAnswerRevealed(msg);                                   break;
        case 'survivors_regrouped': onSurvivorsRegrouped(msg);                               break;
        case 'game_over':           onGameOver(msg);                                         break;
    }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
resetToLobby();
connect(handleMessage, () => send({ type: 'register_spectator' }));
