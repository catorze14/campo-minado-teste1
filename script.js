/**
 * Minesweeper Premium Logic
 * Vanilla JavaScript (ES6+)
 */

const CONFIG = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

class Minesweeper {
    constructor() {
        this.board = []; // 2D Array: -1 for mine, 0-8 for numbers
        this.revealed = []; // Boolean 2D Array
        this.flags = []; // Boolean 2D Array
        this.rows = 0;
        this.cols = 0;
        this.mineCount = 0;
        this.flagsUsed = 0;
        this.gameOver = false;
        this.firstClick = true;
        this.timer = null;
        this.seconds = 0;

        // DOM Elements
        this.boardElement = document.getElementById('game-board');
        this.mineDisplay = document.querySelector('#mine-count .value');
        this.timerDisplay = document.querySelector('#timer .value');
        this.diffSelect = document.getElementById('difficulty-select');
        this.resetBtn = document.getElementById('reset-btn');
        this.modal = document.getElementById('game-modal');
        this.modalBtn = document.getElementById('modal-btn');

        this.init();
    }

    init() {
        this.resetBtn.addEventListener('click', () => this.startGame());
        this.modalBtn.addEventListener('click', () => {
            this.modal.classList.add('hidden');
            this.startGame();
        });
        this.diffSelect.addEventListener('change', () => this.startGame());
        
        this.startGame();
    }

    startGame() {
        const difficulty = this.diffSelect.value;
        this.rows = CONFIG[difficulty].rows;
        this.cols = CONFIG[difficulty].cols;
        this.mineCount = CONFIG[difficulty].mines;
        
        this.board = [];
        this.revealed = [];
        this.flags = [];
        this.flagsUsed = 0;
        this.gameOver = false;
        this.firstClick = true;
        this.seconds = 0;
        this.stopTimer();

        this.updateStats();
        this.createBoard();
        this.render();
    }

    createBoard() {
        for (let r = 0; r < this.rows; r++) {
            this.board[r] = new Array(this.cols).fill(0);
            this.revealed[r] = new Array(this.cols).fill(false);
            this.flags[r] = new Array(this.cols).fill(false);
        }
    }

    placeMines(startR, startC) {
        let placed = 0;
        while (placed < this.mineCount) {
            let r = Math.floor(Math.random() * this.rows);
            let c = Math.floor(Math.random() * this.cols);

            // Evita colocar mina no primeiro clique e onde já tem mina
            if (this.board[r][c] !== -1 && (Math.abs(r - startR) > 1 || Math.abs(c - startC) > 1)) {
                this.board[r][c] = -1;
                placed++;
            }
        }

        // Calcula números
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === -1) continue;
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        let nr = r + i;
                        let nc = c + j;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === -1) {
                            count++;
                        }
                    }
                }
                this.board[r][c] = count;
            }
        }
    }

    render() {
        this.boardElement.style.gridTemplateColumns = `repeat(${this.cols}, 32px)`;
        this.boardElement.innerHTML = '';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                // Eventos
                cell.addEventListener('click', (e) => this.handleLeftClick(r, c));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleRightClick(r, c);
                });

                this.boardElement.appendChild(cell);
            }
        }
    }

    handleLeftClick(r, c) {
        if (this.gameOver || this.revealed[r][c] || this.flags[r][c]) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(r, c);
            this.startTimer();
        }

        if (this.board[r][c] === -1) {
            this.loseGame(r, c);
            return;
        }

        this.revealCell(r, c);
        this.checkWin();
    }

    handleRightClick(r, c) {
        if (this.gameOver || this.revealed[r][c]) return;

        this.flags[r][c] = !this.flags[r][c];
        this.flagsUsed += this.flags[r][c] ? 1 : -1;
        
        const cell = this.getCellElement(r, c);
        cell.classList.toggle('flag');
        cell.textContent = this.flags[r][c] ? '🚩' : '';
        
        this.updateStats();
    }

    revealCell(r, c) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || this.revealed[r][c] || this.flags[r][c]) return;

        this.revealed[r][c] = true;
        const cellElement = this.getCellElement(r, c);
        cellElement.classList.add('revealed');
        
        const value = this.board[r][c];
        if (value > 0) {
            cellElement.textContent = value;
            cellElement.classList.add(`num-${value}`);
        } else if (value === 0) {
            // Revela vizinhos recursivamente
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    this.revealCell(r + i, c + j);
                }
            }
        }
    }

    getCellElement(r, c) {
        return this.boardElement.children[r * this.cols + c];
    }

    updateStats() {
        this.mineDisplay.textContent = this.mineCount - this.flagsUsed;
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.seconds++;
            let mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
            let secs = (this.seconds % 60).toString().padStart(2, '0');
            this.timerDisplay.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timer);
        this.timerDisplay.textContent = '00:00';
    }

    loseGame(hitR, hitC) {
        this.gameOver = true;
        this.stopTimer();

        // Mostra todas as minas
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === -1) {
                    const cell = this.getCellElement(r, c);
                    cell.classList.add('revealed', 'mine');
                    cell.textContent = '💣';
                }
            }
        }

        this.showModal('Fim de Jogo', 'BOOM! Você atingiu uma mina.');
    }

    checkWin() {
        let unrevealedCount = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.revealed[r][c]) unrevealedCount++;
            }
        }

        if (unrevealedCount === this.mineCount) {
            this.gameOver = true;
            this.stopTimer();
            this.showModal('Vitória!', `Parabéns! Você limpou o campo em ${this.seconds} segundos.`);
        }
    }

    showModal(title, text) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-text').textContent = text;
        this.modal.classList.remove('hidden');
    }
}

// Inicia o jogo quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});
