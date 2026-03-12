// I. Gerenciador de Estado
const gameState = {
    balance: 100,
    totalLost: 0,         // Acumulado de perdas
    currentBet: 0,
    difficulty: 'easy',
    timeLimit: 225,
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
    isPlaying: false,
    agiotaMode: false     // Flag para modo agiota
};

// Configurações
const config = {
    easy: {
        rows: 9, cols: 9, mines: 8,
        options: [
            { time: 225, mult: 1.15, label: "3:45 (1.15x)" },
            { time: 150, mult: 1.30, label: "2:30 (1.30x)" },
            { time: 60,  mult: 1.50, label: "1:00 (1.50x)" },
            { time: 45,  mult: 1.80, label: "0:45 (1.80x)" }
        ]
    },
    medium: {
        rows: 16, cols: 16, mines: 30,
        options: [
            { time: 225, mult: 1.40, label: "3:45 (1.40x)" },
            { time: 150, mult: 1.55, label: "2:30 (1.55x)" },
            { time: 90,  mult: 1.85, label: "1:30 (1.85x)" },
            { time: 60,  mult: 2.25, label: "1:00 (2.25x)" }
        ]
    },
    hard: {
        rows: 16, cols: 30, mines: 70,
        options: [
            { time: 255, mult: 1.90, label: "4:15 (1.90x)" },
            { time: 180, mult: 2.05, label: "3:00 (2.05x)" },
            { time: 135, mult: 2.55, label: "2:15 (2.55x)" },
            { time: 90,  mult: 3.55, label: "1:30 (3.55x)" }
        ]
    }
};

// Configuração DO AGIOTA — injusta por design 😈
const agiotaConfig = [
    { rows: 9,  cols: 9,  mines: 16, minTime: 20, maxTime: 40  }, // 9x9 com muitas bombas
    { rows: 12, cols: 12, mines: 38, minTime: 25, maxTime: 50  }, // 12x12 lotado de bombas
    { rows: 9,  cols: 9,  mines: 14, minTime: 15, maxTime: 35  }, // 9x9 apertado
];

// Elementos UI
const els = {
    balanceDisplay:      document.getElementById('balanceDisplay'),
    timerDisplay:        document.getElementById('timerDisplay'),
    difficultySelect:    document.getElementById('difficultySelect'),
    timeSelect:          document.getElementById('timeSelect'),
    betInput:            document.getElementById('betInput'),
    startBtn:            document.getElementById('startBtn'),
    boardContainer:      document.getElementById('boardContainer'),
    gameOverlay:         document.getElementById('gameOverlay'),
    resultModal:         document.getElementById('resultModal'),
    modalTitle:          document.getElementById('modalTitle'),
    modalMessage:        document.getElementById('modalMessage'),
    modalBtn:            document.getElementById('modalBtn'),
    gameOverModal:       document.getElementById('gameOverModal'),
    restartBtn:          document.getElementById('restartBtn'),
    controlsPanel:       document.getElementById('controlsPanel'),
    agiotaBanner:        document.getElementById('agiotaBanner'),
    agiotaRecoverAmt:    document.getElementById('agiotaRecoverAmt'),
    agiotaOfferContainer:document.getElementById('agiotaOfferContainer'),
    agiotaOfferBtn:      document.getElementById('agiotaOfferBtn'),
    agiotaConfirmModal:  document.getElementById('agiotaConfirmModal'),
    agiotaConfirmYes:    document.getElementById('agiotaConfirmYes'),
    agiotaConfirmNo:     document.getElementById('agiotaConfirmNo'),
    gameTitle:           document.getElementById('gameTitle'),
    gameBody:            document.getElementById('gameBody')
};

// ─── Utilitários Visuais ───────────────────────────────────────────────────────

function updateBalanceDisplay() {
    els.balanceDisplay.textContent = `💰 ${gameState.balance.toFixed(2)}`;
}

function checkBankruptcy() {
    if (gameState.balance <= 0 && !gameState.isPlaying && !gameState.agiotaMode) {
        els.gameOverModal.classList.add('active');
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(gameState.timer / 60).toString().padStart(2, '0');
    const secs = (gameState.timer % 60).toString().padStart(2, '0');
    els.timerDisplay.textContent = `⏳ ${mins}:${secs}`;
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

// ─── Tema Agiota ──────────────────────────────────────────────────────────────

function applyAgiotaTheme() {
    els.gameBody.classList.add('agiota-theme');
    els.gameTitle.innerHTML = 'CAMPO MINADO <span class="highlight-agiota">DO AGIOTA</span> 🦈';
    els.controlsPanel.style.display = 'none';
    els.agiotaBanner.style.display = 'block';
}

function removeAgiotaTheme() {
    els.gameBody.classList.remove('agiota-theme');
    els.gameTitle.innerHTML = 'CAMPO MINADO <span class="highlight">BET</span> 💸';
    els.controlsPanel.style.display = '';
    els.agiotaBanner.style.display = 'none';
}

// ─── Timer ────────────────────────────────────────────────────────────────────

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

// ─── Jogo Normal ──────────────────────────────────────────────────────────────

function startNewGame() {
    const betVal = parseFloat(els.betInput.value);

    if (isNaN(betVal) || betVal <= 0) { alert("Aposta inválida!"); return; }
    if (betVal > gameState.balance)   { alert("Saldo insuficiente!"); return; }

    gameState.balance -= betVal;
    gameState.isPlaying = true;
    updateBalanceDisplay();
    els.balanceDisplay.classList.add('highlight');
    setTimeout(() => els.balanceDisplay.classList.remove('highlight'), 300);

    gameState.currentBet = betVal;
    gameState.difficulty  = els.difficultySelect.value;

    const diffConfig     = config[gameState.difficulty];
    const timeOptIndex   = parseInt(els.timeSelect.value);
    const selectedOption = diffConfig.options[timeOptIndex];

    gameState.timeLimit  = selectedOption.time;
    gameState.multiplier = selectedOption.mult;
    gameState.rows       = diffConfig.rows;
    gameState.cols       = diffConfig.cols;
    gameState.minesCount = diffConfig.mines;

    gameState.timer        = gameState.timeLimit;
    gameState.cellsRevealed= 0;
    gameState.safeCells    = (gameState.rows * gameState.cols) - gameState.minesCount;

    els.gameOverlay.classList.remove('active');
    els.resultModal.classList.remove('active');

    setupBoard();
    startTimer();
}

// ─── Modo Agiota ──────────────────────────────────────────────────────────────

function startAgiotaGame() {
    gameState.agiotaMode = true;
    applyAgiotaTheme();

    // Escolhe aleatoriamente uma das configs injustas do agiota
    const chosen = agiotaConfig[Math.floor(Math.random() * agiotaConfig.length)];
    const randomTime = Math.floor(Math.random() * (chosen.maxTime - chosen.minTime + 1)) + chosen.minTime;

    gameState.currentBet   = 0;
    gameState.difficulty   = 'easy'; // não importa no modo agiota
    gameState.timeLimit    = randomTime;
    gameState.multiplier   = 1;
    gameState.rows         = chosen.rows;
    gameState.cols         = chosen.cols;
    gameState.minesCount   = chosen.mines;
    gameState.timer        = randomTime;
    gameState.cellsRevealed= 0;
    gameState.safeCells    = (chosen.rows * chosen.cols) - chosen.mines;
    gameState.isPlaying    = true;

    // Atualiza banner com valor que pode recuperar
    const recoveryAmt = (gameState.balance * 0.75).toFixed(2);
    els.agiotaRecoverAmt.textContent = `R$ ${recoveryAmt}`;

    els.gameOverlay.classList.remove('active');
    els.resultModal.classList.remove('active');

    setupBoard();
    startTimer();
}

// ─── Board Setup & Reveal ─────────────────────────────────────────────────────

function setupBoard() {
    gameState.board = [];
    gameState.mines = [];
    els.boardContainer.innerHTML = '';
    els.boardContainer.style.gridTemplateColumns = `repeat(${gameState.cols}, 32px)`;
    els.boardContainer.style.gridTemplateRows    = `repeat(${gameState.rows}, 32px)`;

    for (let r = 0; r < gameState.rows; r++) {
        const row = [];
        for (let c = 0; c < gameState.cols; c++) {
            row.push({ r, c, isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0, element: null });
        }
        gameState.board.push(row);
    }

    let minesPlaced = 0;
    const midR = Math.floor(gameState.rows / 2);
    const midC = Math.floor(gameState.cols / 2);

    while (minesPlaced < gameState.minesCount) {
        const r = Math.floor(Math.random() * gameState.rows);
        const c = Math.floor(Math.random() * gameState.cols);
        if (Math.abs(r - midR) <= 1 && Math.abs(c - midC) <= 1) continue;
        if (!gameState.board[r][c].isMine) {
            gameState.board[r][c].isMine = true;
            gameState.mines.push({ r, c });
            minesPlaced++;
        }
    }

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

    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');
            cellEl.addEventListener('click', () => revealCell(r, c));
            cellEl.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleFlag(r, c); });
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
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const nr = r + i, nc = c + j;
                if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                    if (!gameState.board[nr][nc].isRevealed) revealCell(nr, nc);
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
    cell.element.textContent = cell.isFlagged ? '🚩' : '';
    cell.isFlagged ? cell.element.classList.add('flag') : cell.element.classList.remove('flag');
}

// ─── Fim de Jogo ──────────────────────────────────────────────────────────────

function endGame(win, reason) {
    gameState.isPlaying = false;
    stopTimer();

    gameState.mines.forEach(m => {
        const cell = gameState.board[m.r][m.c];
        if (!cell.isFlagged) {
            cell.element.classList.add('revealed', 'mine');
            cell.element.textContent = '💣';
        }
    });

    // Reseta display do timer para 00:00
    els.timerDisplay.textContent = '⏳ 00:00';
    els.timerDisplay.style.color = '';

    els.gameOverlay.classList.add('active');
    els.gameOverlay.innerHTML = '<p>💸 Fim de jogo! 💸</p>';

    const resultModalContent = document.getElementById('resultModalContent');
    resultModalContent.className = 'modal-content glass-panel';

    // Esconde a oferta do agiota por padrão
    els.agiotaOfferContainer.style.display = 'none';

    if (gameState.agiotaMode) {
        // ── Resultado no Modo Agiota ──
        if (win) {
            const recoveredBalance = gameState.balance * 0.75;
            gameState.balance = recoveredBalance;
            removeAgiotaTheme();
            gameState.agiotaMode = false;

            resultModalContent.classList.add('win');
            els.modalTitle.textContent = "SOBREVIVEU! 🦈✅";
            els.modalTitle.style.color = "var(--warn)";
            els.modalMessage.textContent = `${reason} O agiota honrou o acordo! Você voltou com 💰 ${recoveredBalance.toFixed(2)}.`;
            triggerMoneyRain();
        } else {
            gameState.balance = 0;
            removeAgiotaTheme();
            gameState.agiotaMode = false;

            els.modalTitle.textContent = "O AGIOTA COBROU! 🦈💀";
            els.modalTitle.style.color = "var(--danger)";
            els.modalMessage.textContent = `${reason} O agiota não te perdoou. Você perdeu tudo.`;
        }
    } else {
        // ── Resultado no Jogo Normal ──
        if (win) {
            const winAmount = gameState.currentBet * gameState.multiplier;
            gameState.balance += winAmount;

            resultModalContent.classList.add('win');
            els.modalTitle.textContent = "VITÓRIA! 🎉";
            els.modalTitle.style.color = "var(--warn)";
            els.modalMessage.textContent = `${reason} Você ganhou 💰 ${winAmount.toFixed(2)} (Lucro de 💰 ${(winAmount - gameState.currentBet).toFixed(2)})!`;
            triggerMoneyRain();
        } else {
            // Acumula perda
            gameState.totalLost += gameState.currentBet;

            els.modalTitle.textContent = "DERROTA! 💸";
            els.modalTitle.style.color = "var(--danger)";
            els.modalMessage.textContent = `${reason} Você perdeu sua aposta de 💰 ${gameState.currentBet.toFixed(2)}.`;

            // Mostra proposta do agiota se perdeu mais de R$110 no total E tem algum saldo
            if (gameState.totalLost > 110 && gameState.balance >= 0) {
                els.agiotaOfferContainer.style.display = 'block';
            }
        }
    }

    updateBalanceDisplay();
    checkBankruptcy();
    els.resultModal.classList.add('active');
}

// ─── Listeners ────────────────────────────────────────────────────────────────

els.difficultySelect.addEventListener('change', populateTimeSelect);

els.startBtn.addEventListener('click', () => {
    if (gameState.isPlaying) return;
    startNewGame();
});

els.modalBtn.addEventListener('click', () => {
    els.resultModal.classList.remove('active');
    els.agiotaOfferContainer.style.display = 'none';
    document.getElementById('moneyContainer').innerHTML = '';
    if (!gameState.agiotaMode) {
        els.gameOverlay.innerHTML = '<p>💸 Faça sua aposta para começar! 💸</p>';
    }
    checkBankruptcy();
});

els.restartBtn.addEventListener('click', () => {
    gameState.balance   = 100;
    gameState.totalLost = 0;
    els.gameOverModal.classList.remove('active');
    updateBalanceDisplay();
});

// Botão oferta agiota (no modal de derrota)
els.agiotaOfferBtn.addEventListener('click', () => {
    els.resultModal.classList.remove('active');
    els.agiotaConfirmModal.classList.add('active');
});

// Confirmação agiota — SIM
els.agiotaConfirmYes.addEventListener('click', () => {
    els.agiotaConfirmModal.classList.remove('active');
    startAgiotaGame();
});

// Confirmação agiota — NÃO
els.agiotaConfirmNo.addEventListener('click', () => {
    els.agiotaConfirmModal.classList.remove('active');
    els.resultModal.classList.add('active');
});

// ─── Efeitos Visuais ──────────────────────────────────────────────────────────

function triggerMoneyRain() {
    const container = document.getElementById('moneyContainer');
    const emojies   = ['💸', '💰', '🤑', '💵'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const bill = document.createElement('div');
            bill.classList.add('money-bill');
            bill.textContent = emojies[Math.floor(Math.random() * emojies.length)];
            bill.style.left              = `${Math.random() * 100}vw`;
            bill.style.animationDuration = `${Math.random() * 2 + 2}s`;
            container.appendChild(bill);
            setTimeout(() => bill.remove(), 4000);
        }, i * 100);
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
populateTimeSelect();
updateBalanceDisplay();
checkBankruptcy();
updateTimerDisplay();
