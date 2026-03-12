import { parseCsv } from './csv-parser.js';

// ── Query param flags ────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const DEMO_MODE = params.get('demo') === 'true';
const DEBUG_MODE = params.get('debug') === 'true';
const SPEED_MODE = params.get('speed') === 'true';

// ── State ────────────────────────────────────────────────────────────────────
let ws = null;
let questions = [];
let currentQuestionIndex = -1;
let sessionCreated = false;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const setupSection = document.getElementById('setupSection');
const controllerSection = document.getElementById('controllerSection');
const uploadArea = document.getElementById('uploadArea');
const csvFile = document.getElementById('csvFile');
const csvErrors = document.getElementById('csvErrors');
const questionPreview = document.getElementById('questionPreview');
const questionPreviewList = document.getElementById('questionPreviewList');
const startSessionBtn = document.getElementById('startSessionBtn');
const sessionIdEl = document.getElementById('sessionId');
const questionQueue = document.getElementById('questionQueue');
const previewBtn = document.getElementById('previewBtn');
const goLiveBtn = document.getElementById('goLiveBtn');
const advanceBtn = document.getElementById('advanceBtn');
const statsPanel = document.getElementById('statsPanel');
const resultPanel = document.getElementById('resultPanel');
const debugPanel = document.getElementById('debugPanel');
const debugJson = document.getElementById('debugJson');

// ── Debug panel ──────────────────────────────────────────────────────────────
if (DEBUG_MODE) {
    debugPanel.classList.remove('hidden');
}

function updateDebug(msg) {
    if (DEBUG_MODE) {
        debugJson.textContent = JSON.stringify(msg, null, 2);
    }
}

// ── CSV handling ─────────────────────────────────────────────────────────────
function applyParsedCsv(result) {
    if (result.errors.length > 0) {
        showCsvErrors(result.errors);
        startSessionBtn.disabled = true;
        return;
    }
    clearCsvErrors();
    questions = result.questions;
    renderPreviewList(questions);
    startSessionBtn.disabled = false;
}

function showCsvErrors(errors) {
    csvErrors.innerHTML = '';
    errors.forEach(e => {
        const li = document.createElement('li');
        li.textContent = e;
        csvErrors.appendChild(li);
    });
    csvErrors.classList.remove('hidden');
    questionPreview.classList.add('hidden');
}

function clearCsvErrors() {
    csvErrors.innerHTML = '';
    csvErrors.classList.add('hidden');
}

function renderPreviewList(qs) {
    questionPreviewList.innerHTML = '';
    qs.forEach(q => {
        const li = document.createElement('li');
        li.textContent = q.question;
        questionPreviewList.appendChild(li);
    });
    questionPreview.classList.remove('hidden');
}

// ── File input ───────────────────────────────────────────────────────────────
csvFile.addEventListener('change', () => {
    const file = csvFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = parseCsv(e.target.result);
        applyParsedCsv(result);
    };
    reader.readAsText(file);
});

// ── Demo mode ────────────────────────────────────────────────────────────────
if (DEMO_MODE) {
    uploadArea.classList.add('hidden');
    fetch('/fixtures/trivia-questions.csv')
        .then(r => r.text())
        .then(csv => {
            const result = parseCsv(csv);
            applyParsedCsv(result);
        })
        .catch(() => {
            showCsvErrors(['Failed to load demo fixture from /fixtures/trivia-questions.csv']);
        });
}

// ── WebSocket connection ─────────────────────────────────────────────────────
function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(protocol + '//' + location.host);

    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        updateDebug(msg);
        handleMessage(msg);
    };

    ws.onclose = () => {
        setTimeout(connect, 2000);
    };
}

// ── Start Session ────────────────────────────────────────────────────────────
startSessionBtn.addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const cmd = { type: 'create_session', gameMode: 'trivia', questions };
    if (SPEED_MODE) cmd.speed = true;
    ws.send(JSON.stringify(cmd));
});

// ── Message handlers ─────────────────────────────────────────────────────────
function handleMessage(msg) {
    switch (msg.type) {
        case 'session_created':
            onSessionCreated(msg);
            break;
        case 'live_answer_stats':
            onLiveAnswerStats(msg);
            break;
        case 'question_result':
            onQuestionResult(msg);
            break;
        case 'error':
            alert('Server error: ' + msg.message);
            break;
    }
}

function onSessionCreated(msg) {
    sessionCreated = true;
    sessionIdEl.textContent = msg.sessionId;
    setupSection.classList.add('hidden');
    controllerSection.classList.remove('hidden');
    renderQuestionQueue(questions);
    updateControllerButtons();
}

// ── Question queue ───────────────────────────────────────────────────────────
function renderQuestionQueue(qs) {
    questionQueue.innerHTML = '';
    qs.forEach((q, i) => {
        const li = document.createElement('li');
        li.textContent = q.question;
        li.dataset.index = i;
        questionQueue.appendChild(li);
    });
    previewBtn.disabled = false;
}

function highlightCurrentQuestion(index) {
    Array.from(questionQueue.children).forEach(li => li.classList.remove('current'));
    if (index >= 0 && index < questionQueue.children.length) {
        questionQueue.children[index].classList.add('current');
    }
}

// ── Controller button state ──────────────────────────────────────────────────
function updateControllerButtons() {
    // previewBtn is always enabled once session is created
    previewBtn.disabled = !sessionCreated || currentQuestionIndex + 1 >= questions.length;
}

// ── Preview button ───────────────────────────────────────────────────────────
previewBtn.addEventListener('click', () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) return;
    currentQuestionIndex = nextIndex;
    ws.send(JSON.stringify({ type: 'start_trivia_question', questionIndex: currentQuestionIndex }));
    highlightCurrentQuestion(currentQuestionIndex);
    goLiveBtn.disabled = false;
    advanceBtn.disabled = true;
    previewBtn.disabled = true;
    statsPanel.classList.add('hidden');
    resultPanel.classList.add('hidden');
});

// ── Go Live button ───────────────────────────────────────────────────────────
goLiveBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'go_live' }));
    goLiveBtn.disabled = true;
    statsPanel.classList.remove('hidden');
});

// ── Advance button ───────────────────────────────────────────────────────────
advanceBtn.addEventListener('click', () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) return;
    currentQuestionIndex = nextIndex;
    ws.send(JSON.stringify({ type: 'advance_question' }));
    highlightCurrentQuestion(currentQuestionIndex);
    goLiveBtn.disabled = false;
    advanceBtn.disabled = true;
    previewBtn.disabled = true;
    statsPanel.classList.add('hidden');
    resultPanel.classList.add('hidden');
});

// ── Live answer stats ────────────────────────────────────────────────────────
function onLiveAnswerStats(msg) {
    document.getElementById('statA').textContent = msg.counts.A;
    document.getElementById('statB').textContent = msg.counts.B;
    document.getElementById('statC').textContent = msg.counts.C;
    document.getElementById('statD').textContent = msg.counts.D;
    document.getElementById('statAnswered').textContent = msg.answered;
    document.getElementById('statRemaining').textContent = msg.remaining;
}

// ── Question result ──────────────────────────────────────────────────────────
function onQuestionResult(msg) {
    document.getElementById('resultCorrect').textContent = msg.correct;
    document.getElementById('resultEliminated').textContent =
        msg.eliminated.length > 0 ? msg.eliminated.join(', ') : 'none';
    document.getElementById('resultSurvivors').textContent = msg.survivors.length;
    resultPanel.classList.remove('hidden');
    // Enable Advance if there's a next question
    advanceBtn.disabled = currentQuestionIndex + 1 >= questions.length;
}

// ── Start ────────────────────────────────────────────────────────────────────
connect();
