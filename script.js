// I. Gerenciador de Estado
const gameState = {
    balance: 100,
    currentBet: 0,
    difficulty: 'easy',
    timeLimit: 150,
    multiplier: 1.15,
    timer: 0,
    timerInterval: null,
    board: [],
    mines: [],
    rows: 9,
    cols: 9,
    minesCount: 8,
    cellsRevealed: 0,
    safeCells: 0,
    isPlaying: false
};

// Configurações
const config = {
    easy: {
        rows: 9, cols: 9, mines: 8,
        options: [
            { time: 150, mult: 1.25, label: "2:30 (1.25x)" },
            { time: 60, mult: 1.45, label: "1:00 (1.45x)" },
            { time: 45, mult: 1.75, label: "0:45 (1.75x)" }
        ]
    },
    medium: {
        rows: 16, cols: 16, mines: 30,
        options: [
            { time: 150, mult: 1.50, label: "2:30 (1.50x)" },
            { time: 90, mult: 1.80, label: "1:30 (1.80x)" },
            { time: 60, mult: 2.20, label: "1:00 (2.20x)" }
        ]
    },
    hard: {
        rows: 16, cols: 30, mines: 70,
        options: [
            { time: 180, mult: 2.00, label: "3:00 (2.00x)" },
            { time: 135, mult: 2.50, label: "2:15 (2.50x)" },
            { time: 90, mult: 3.50, label: "1:30 (3.50x)" }
        ]
    }
};

// Elementos UI
const els = {
    balanceDisplay: document.getElementById('balanceDisplay'),
    timerDisplay: document.getElementById('timerDisplay'),
    difficultySelect: document.getElementById('difficultySelect'),
    timeSelect: document.getElementById('timeSelect'),
    betInput: document.getElementById('betInput'),
    startBtn: document.getElementById('startBtn'),
    boardContainer: document.getElementById('boardContainer'),
    gameOverlay: document.getElementById('gameOverlay'),
    resultModal: document.getElementById('resultModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    modalBtn: document.getElementById('modalBtn'),
    gameOverModal: document.getElementById('gameOverModal'),
    restartBtn: document.getElementById('restartBtn')
};

// Utilitários de Atualização Visual
function updateBalanceDisplay() {
    els.balanceDisplay.textContent = `$${gameState.balance.toFixed(2)}`;
}

function checkBankruptcy() {
    // Checa Game Over Real: apenas se não estiver jogando e o saldo for zero
    if (gameState.balance <= 0 && !gameState.isPlaying) {
        els.gameOverModal.classList.add('active');
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(gameState.timer / 60).toString().padStart(2, '0');
    const secs = (gameState.timer % 60).toString().padStart(2, '0');
    els.timerDisplay.textContent = `${mins}:${secs}`;
    if (gameState.timer <= 10 && gameState.timer > 0) {
        els.timerDisplay.style.color = '#ef4444';
    } else {
        els.timerDisplay.style.color = '';
    }
}

function populateTimeSelect() {
    const diffInfo = config[els.difficultySelect.value];
    els.timeSelect.innerHTML = '';
    diffInfo.options.forEach((opt, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = opt.label;
        els.timeSelect.appendChild(option);
    });
}

// Lógica de Temporizador
function startTimer() {
    clearInterval(gameState.timerInterval);
    updateTimerDisplay();
    gameState.timerInterval = setInterval(() => {
        gameState.timer--;
        updateTimerDisplay();

        if (gameState.timer <= 0) {
            endGame(false, "O tempo esgotou!");
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(gameState.timerInterval);
}

// II. Lógica do Campo Minado
function startNewGame() {
    const betVal = parseFloat(els.betInput.value);

    // Validações
    if (isNaN(betVal) || betVal <= 0) {
        alert("Aposta inválida!");
        return;
    }
    if (betVal > gameState.balance) {
        alert("Saldo insuficiente!");
        return;
    }

    // Deduz Saldo
    gameState.balance -= betVal;
    gameState.isPlaying = true; // Set playing to true BEFORE updating UI to avoid state confusion
    updateBalanceDisplay();

    gameState.currentBet = betVal;
    gameState.difficulty = els.difficultySelect.value;

    const diffConfig = config[gameState.difficulty];
    const timeOptIndex = parseInt(els.timeSelect.value);
    const selectedOption = diffConfig.options[timeOptIndex];

    gameState.timeLimit = selectedOption.time;
    gameState.multiplier = selectedOption.mult;
    gameState.rows = diffConfig.rows;
    gameState.cols = diffConfig.cols;
    gameState.minesCount = diffConfig.mines;

    gameState.timer = gameState.timeLimit;
    gameState.cellsRevealed = 0;
    gameState.safeCells = (gameState.rows * gameState.cols) - gameState.minesCount;

    // UI Updates
    els.gameOverlay.classList.remove('active');
    els.resultModal.classList.remove('active');

    setupBoard();
    startTimer();
}

function setupBoard() {
    gameState.board = [];
    gameState.mines = [];
    els.boardContainer.innerHTML = '';
    els.boardContainer.style.gridTemplateColumns = `repeat(${gameState.cols}, 32px)`;
    els.boardContainer.style.gridTemplateRows = `repeat(${gameState.rows}, 32px)`;

    for (let r = 0; r < gameState.rows; r++) {
        const row = [];
        for (let c = 0; c < gameState.cols; c++) {
            row.push({
                r, c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0,
                element: null
            });
        }
        gameState.board.push(row);
    }

    // Place mines (middle square and its neighbors are always safe to guarantee it's empty)
    let minesPlaced = 0;
    const midR = Math.floor(gameState.rows / 2);
    const midC = Math.floor(gameState.cols / 2);

    while (minesPlaced < gameState.minesCount) {
        const r = Math.floor(Math.random() * gameState.rows);
        const c = Math.floor(Math.random() * gameState.cols);

        // Skip if r,c is in the 3x3 area around the middle square
        if (Math.abs(r - midR) <= 1 && Math.abs(c - midC) <= 1) continue;

        if (!gameState.board[r][c].isMine) {
            gameState.board[r][c].isMine = true;
            gameState.mines.push({ r, c });
            minesPlaced++;
        }
    }

    // Calculate adjacent
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            if (!gameState.board[r][c].isMine) {
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const nr = r + i, nc = c + j;
                        if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                            if (gameState.board[nr][nc].isMine) count++;
                        }
                    }
                }
                gameState.board[r][c].adjacentMines = count;
            }
        }
    }

    // Render
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');

            cellEl.addEventListener('click', () => revealCell(r, c));
            cellEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(r, c);
            });

            gameState.board[r][c].element = cellEl;
            els.boardContainer.appendChild(cellEl);
        }
    }
}

function revealCell(r, c) {
    if (!gameState.isPlaying) return;

    const cell = gameState.board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    cell.element.classList.add('revealed');

    if (cell.isMine) {
        cell.element.classList.add('mine');
        cell.element.textContent = '💣';
        endGame(false, "Você clicou em uma mina!");
        return;
    }

    gameState.cellsRevealed++;

    if (cell.adjacentMines > 0) {
        cell.element.textContent = cell.adjacentMines;
        cell.element.dataset.adjacent = cell.adjacentMines;
    } else {
        // Flood fill
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const nr = r + i, nc = c + j;
                if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                    if (!gameState.board[nr][nc].isRevealed) {
                        revealCell(nr, nc);
                    }
                }
            }
        }
    }

    if (gameState.cellsRevealed === gameState.safeCells) {
        endGame(true, "Você limpou o campo!");
    }
}

function toggleFlag(r, c) {
    if (!gameState.isPlaying) return;
    const cell = gameState.board[r][c];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    if (cell.isFlagged) {
        cell.element.textContent = '🚩';
        cell.element.classList.add('flag');
    } else {
        cell.element.textContent = '';
        cell.element.classList.remove('flag');
    }
}

// III. Lógica de Fim de Jogo e Recompensas
function endGame(win, reason) {
    gameState.isPlaying = false;
    stopTimer();

    // Revelar todas minas
    gameState.mines.forEach(m => {
        const cell = gameState.board[m.r][m.c];
        if (!cell.isFlagged) {
            cell.element.classList.add('revealed', 'mine');
            cell.element.textContent = '💣';
        }
    });

    els.gameOverlay.classList.add('active');
    els.gameOverlay.innerHTML = '<p>Fim de jogo!</p>'; // Atualiza sem o botão apostar dnv

    if (win) {
        // Vitória = Aposta + (Aposta * Multiplicador) -> como o jogador já teve saldo deduzido, a recompensa bruta adicionada deve ser Aposta * (1 + Multiplicador), ou seguindo a formula exata: Lucro = Aposta * Multiplicador, logo ele recebe Aposta de volta + Lucro.
        // A prompt diz: "$Lucro = Aposta \times Multiplicador$". Recebe: Aposta + Lucro.
        const winAmount = gameState.currentBet + (gameState.currentBet * gameState.multiplier);
        gameState.balance += winAmount;

        els.modalTitle.textContent = "VITÓRIA!";
        els.modalTitle.style.color = "var(--accent)";
        els.modalMessage.textContent = `${reason} Você ganhou $${winAmount.toFixed(2)}!`;
    } else {
        els.modalTitle.textContent = "DERROTA!";
        els.modalTitle.style.color = "var(--danger)";
        els.modalMessage.textContent = `${reason} Você perdeu sua aposta de $${gameState.currentBet.toFixed(2)}.`;
    }

    updateBalanceDisplay();
    checkBankruptcy();
    els.resultModal.classList.add('active');
}

// Listeners
els.difficultySelect.addEventListener('change', populateTimeSelect);

els.startBtn.addEventListener('click', () => {
    if (gameState.isPlaying) return;
    startNewGame();
});

els.modalBtn.addEventListener('click', () => {
    els.resultModal.classList.remove('active');
    els.gameOverlay.innerHTML = '<p>Faça sua aposta para começar!</p>';
});

els.restartBtn.addEventListener('click', () => {
    gameState.balance = 100;
    els.gameOverModal.classList.remove('active');
    updateBalanceDisplay();
});

// Init
populateTimeSelect();
updateBalanceDisplay();
checkBankruptcy();
updateTimerDisplay();
