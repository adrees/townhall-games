function el(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element #${id} not found in DOM`);
    return element;
}
export function show(id) {
    el(id).classList.remove('hidden');
}
export function hide(id) {
    el(id).classList.add('hidden');
}
export function showNotification(message, type = 'error') {
    const area = el('notificationArea');
    area.textContent = message;
    area.className = 'notification-area ' + type;
    setTimeout(() => area.classList.add('hidden'), 4000);
}
export function setStatusBar(text) {
    el('statusBar').textContent = text;
}
export function setRoundIndicator(round) {
    el('roundIndicator').textContent = 'Round ' + round;
}
export function showWinBanner(text) {
    const banner = el('winBanner');
    banner.textContent = text;
    banner.classList.remove('hidden');
}
// Build the 5×5 grid of empty cell divs once per card deal.
// Call patchGrid() afterwards to fill content and classes.
export function buildGrid() {
    const container = el('bingoGrid');
    container.innerHTML = '';
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(r);
            cell.dataset.col = String(c);
            container.appendChild(cell);
        }
    }
}
// Update cell text and CSS classes without rebuilding the DOM structure.
export function patchGrid(grid, marked) {
    document.querySelectorAll('#bingoGrid .cell').forEach(cell => {
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        const word = grid[r][c];
        cell.textContent = word;
        cell.className = 'cell';
        if (word === 'FREE') {
            cell.classList.add('free');
        }
        else if (marked[r][c]) {
            cell.classList.add('marked');
        }
    });
}
export function updateLeaderboard(entries) {
    const tbody = el('leaderboardBody');
    tbody.innerHTML = '';
    entries.forEach((entry, i) => {
        const tr = document.createElement('tr');
        const rank = document.createElement('td');
        rank.textContent = String(i + 1);
        const name = document.createElement('td');
        name.textContent = entry.screenName; // textContent is XSS-safe
        const points = document.createElement('td');
        points.textContent = String(entry.totalPoints);
        const won = document.createElement('td');
        won.textContent = String(entry.roundsWon);
        tr.append(rank, name, points, won);
        tbody.appendChild(tr);
    });
}
