import { connect, send } from './ws-client.js';

// ── Query params ─────────────────────────────────────────────────────────────
const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === 'true';

// ── DOM refs ─────────────────────────────────────────────────────────────────
const wordCloud       = document.getElementById('wordCloud');
const survivorCloud   = document.getElementById('survivorCloud');
const playerCountLabel = document.getElementById('playerCountLabel');
const questionText    = document.getElementById('questionText');
const countdownNumber = document.getElementById('countdownNumber');
const ringFill        = document.getElementById('ringFill');
const survivorCount   = document.getElementById('survivorCount');
const winnerNames     = document.getElementById('winnerNames');
const winnerLabel     = document.getElementById('winnerLabel');
const debugPanel      = document.getElementById('debugPanel');
const debugJson       = document.getElementById('debugJson');

const barEls  = { A: document.getElementById('barA'),   B: document.getElementById('barB'),   C: document.getElementById('barC'),   D: document.getElementById('barD') };
const countEls = { A: document.getElementById('countA'), B: document.getElementById('countB'), C: document.getElementById('countC'), D: document.getElementById('countD') };

// ── Debug panel ───────────────────────────────────────────────────────────────
if (DEBUG_MODE) debugPanel.style.display = 'block';

function updateDebug(msg) {
    if (DEBUG_MODE) debugJson.textContent = JSON.stringify(msg, null, 2);
}

// ── Phase management ──────────────────────────────────────────────────────────
function setPhase(name) {
    document.body.dataset.phase = name;
}

// ── Player ID → span map ──────────────────────────────────────────────────────
/** @type {Map<string, HTMLElement>} */
const playerSpans = new Map();
let playerCount = 0;

// ── Elimination phase state ───────────────────────────────────────────────────
const ELIMINATION_DURATION_MS = 2000;
let eliminationAnimating = false;
/** @type {object|null} */
let pendingSurvivors = null;

// ── SVG ring setup ────────────────────────────────────────────────────────────
const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
ringFill.style.strokeDashoffset = '0';

let countdownInterval = null;

function startCountdown(timeLimit) {
    let remaining = timeLimit;
    countdownNumber.textContent = remaining;
    ringFill.style.strokeDashoffset = '0';

    countdownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining < 0) remaining = 0;
        countdownNumber.textContent = remaining;
        const offset = RING_CIRCUMFERENCE * (1 - remaining / timeLimit);
        ringFill.style.strokeDashoffset = offset;
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval !== null) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    countdownNumber.textContent = '0';
    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE;
}

// ── Word cloud helpers ────────────────────────────────────────────────────────
function randomEdgePosition(container) {
    const w = container.offsetWidth || 800;
    const h = container.offsetHeight || 400;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0: return { x: Math.random() * w, y: -60 };         // top
        case 1: return { x: Math.random() * w, y: h + 60 };      // bottom
        case 2: return { x: -160, y: Math.random() * h };        // left
        default: return { x: w + 160, y: Math.random() * h };    // right
    }
}

function randomInBoundsPosition(container) {
    const w = container.offsetWidth || 800;
    const h = container.offsetHeight || 400;
    return {
        x: 20 + Math.random() * (w - 160),
        y: 10 + Math.random() * (h - 40),
    };
}

function createNameSpan(screenName, container, fontSize = 18) {
    const span = document.createElement('span');
    span.className = 'player-name';
    span.textContent = screenName;
    span.style.fontSize = fontSize + 'px';

    const start = randomEdgePosition(container);
    span.style.left = start.x + 'px';
    span.style.top  = start.y + 'px';

    container.appendChild(span);

    // Trigger transition to in-bounds position
    requestAnimationFrame(() => {
        const dest = randomInBoundsPosition(container);
        span.style.transform = `translate(${dest.x - start.x}px, ${dest.y - start.y}px)`;
    });

    return span;
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onPlayerJoined(msg) {
    playerCount++;
    playerCountLabel.textContent = `${playerCount} player${playerCount === 1 ? '' : 's'} joined`;

    const span = createNameSpan(msg.screenName, wordCloud);
    playerSpans.set(msg.playerId, span);
}

function onPlayerLeft(msg) {
    playerCount = Math.max(0, playerCount - 1);
    playerCountLabel.textContent = `${playerCount} player${playerCount === 1 ? '' : 's'} joined`;

    const span = playerSpans.get(msg.playerId);
    if (span) {
        span.remove();
        playerSpans.delete(msg.playerId);
    }
}

function onQuestionLive(msg) {
    setPhase('question');
    document.getElementById('questionText').textContent = msg.text;
    // Answer labels are static A/B/C/D letters already in HTML
    startCountdown(msg.timeLimit);
}

function onTimerExpired(_msg) {
    stopCountdown();
    setPhase('breakdown');
}

function onAnswerBreakdown(msg) {
    const total = msg.totalAnswered || 1;
    for (const opt of ['A', 'B', 'C', 'D']) {
        const count = msg.counts[opt] ?? 0;
        const pct = (count / total) * 100;
        barEls[opt].style.width = pct + '%';
        barEls[opt].classList.remove('correct');
        countEls[opt].textContent = count;
    }
}

function onAnswerRevealed(msg) {
    // Highlight correct bar (still visible in breakdown section behind word cloud)
    barEls[msg.correct].classList.add('correct');

    // Switch to elimination phase so word cloud is visible
    setPhase('elimination');
    eliminationAnimating = true;

    // Animate eliminated names off screen
    for (const playerId of msg.eliminated) {
        const span = playerSpans.get(playerId);
        if (span) span.classList.add('eliminated');
    }

    // After animation window: clean up and flush buffered survivors
    setTimeout(() => {
        for (const playerId of msg.eliminated) {
            const span = playerSpans.get(playerId);
            if (span) span.remove();
            playerSpans.delete(playerId);
        }
        eliminationAnimating = false;
        if (pendingSurvivors !== null) {
            const buffered = pendingSurvivors;
            pendingSurvivors = null;
            onSurvivorsRegrouped(buffered);
        }
    }, ELIMINATION_DURATION_MS);
}

function onSurvivorsRegrouped(msg) {
    if (eliminationAnimating) {
        pendingSurvivors = msg;
        return;
    }

    const count = msg.survivorCount;
    survivorCount.textContent = `${count} survivor${count === 1 ? '' : 's'}`;

    // Move surviving names from lobby cloud into survivor cloud
    survivorCloud.innerHTML = '';
    const fontSize = Math.min(48, 14 + (200 / Math.max(count, 1)));

    for (const [playerId, oldSpan] of playerSpans) {
        // Re-create span in survivorCloud
        const newSpan = createNameSpan(oldSpan.textContent, survivorCloud, fontSize);
        playerSpans.set(playerId, newSpan);
    }

    setPhase('survivor');
}

function onGameOver(msg) {
    setPhase('winner');
    if (msg.winners.length === 0) {
        winnerLabel.textContent = '';
        winnerNames.textContent = 'No survivors';
    } else {
        winnerLabel.textContent = msg.winners.length === 1 ? 'Winner' : 'Winners';
        winnerNames.textContent = msg.winners.join(' & ');
        // Re-trigger animation
        winnerNames.style.animation = 'none';
        void winnerNames.offsetWidth; // reflow
        winnerNames.style.animation = '';
    }
}

// ── Message router ────────────────────────────────────────────────────────────
function handleMessage(msg) {
    updateDebug(msg);
    switch (msg.type) {
        case 'player_joined':        onPlayerJoined(msg);        break;
        case 'player_left':          onPlayerLeft(msg);          break;
        case 'question_live':        onQuestionLive(msg);        break;
        case 'timer_expired':        onTimerExpired(msg);        break;
        case 'answer_breakdown':     onAnswerBreakdown(msg);     break;
        case 'answer_revealed':      onAnswerRevealed(msg);      break;
        case 'survivors_regrouped':  onSurvivorsRegrouped(msg);  break;
        case 'game_over':            onGameOver(msg);            break;
    }
}

// ── Start ─────────────────────────────────────────────────────────────────────
setPhase('lobby');
connect(handleMessage, () => send({ type: 'register_spectator' }));
