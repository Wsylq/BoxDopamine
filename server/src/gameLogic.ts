// ═══════════════════════════════════════════════════════════
// Minesweeper Game Logic
// ═══════════════════════════════════════════════════════════

import { MinesweeperState, CellState } from './types.js';

export function createMinesweeperGame(gridSize: number, mineCount: number): MinesweeperState {
  const grid: CellState[][] = [];
  const revealed: boolean[][] = [];

  // Initialize empty grid
  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    revealed[i] = [];
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = { isMine: false, adjacentMines: 0 };
      revealed[i][j] = false;
    }
  }

  // Place mines randomly
  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    const row = Math.floor(Math.random() * gridSize);
    const col = Math.floor(Math.random() * gridSize);
    if (!grid[row][col].isMine) {
      grid[row][col].isMine = true;
      minesPlaced++;
    }
  }

  // Calculate adjacent mines
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (!grid[i][j].isMine) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize && grid[ni][nj].isMine) {
              count++;
            }
          }
        }
        grid[i][j].adjacentMines = count;
      }
    }
  }

  return {
    gridSize,
    mineCount,
    grid,
    revealed,
    currentTurn: 0,
    turnHistory: [],
    multiplier: 1.0,
    gameOver: false,
    winner: false,
  };
}

export function revealCell(state: MinesweeperState, row: number, col: number): {
  success: boolean;
  hitMine: boolean;
  newMultiplier: number;
  autoRevealed?: { row: number; col: number }[];
} {
  if (state.revealed[row][col]) {
    return { success: false, hitMine: false, newMultiplier: state.multiplier };
  }

  state.revealed[row][col] = true;
  const cell = state.grid[row][col];

  if (cell.isMine) {
    return { success: true, hitMine: true, newMultiplier: 0 };
  }

  // Calculate new multiplier based on revealed safe cells
  const totalCells = state.gridSize * state.gridSize;
  const safeCells = totalCells - state.mineCount;
  const revealedCount = state.revealed.flat().filter(Boolean).length;
  const newMultiplier = 1 + (revealedCount / safeCells) * 2; // Up to 3x multiplier

  // Auto-reveal adjacent cells if this cell has 0 adjacent mines
  const autoRevealed: { row: number; col: number }[] = [];
  if (cell.adjacentMines === 0) {
    const queue: [number, number][] = [[row, col]];
    const visited = new Set<string>();
    visited.add(`${row},${col}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const nr = r + di;
          const nc = c + dj;
          const key = `${nr},${nc}`;
          if (
            nr >= 0 &&
            nr < state.gridSize &&
            nc >= 0 &&
            nc < state.gridSize &&
            !visited.has(key) &&
            !state.revealed[nr][nc]
          ) {
            visited.add(key);
            state.revealed[nr][nc] = true;
            autoRevealed.push({ row: nr, col: nc });
            if (state.grid[nr][nc].adjacentMines === 0) {
              queue.push([nr, nc]);
            }
          }
        }
      }
    }
  }

  return { success: true, hitMine: false, newMultiplier, autoRevealed };
}

export function checkWinCondition(state: MinesweeperState): boolean {
  const totalCells = state.gridSize * state.gridSize;
  const revealedCount = state.revealed.flat().filter(Boolean).length;
  return revealedCount === totalCells - state.mineCount;
}

export function calculatePayout(bet: number, multiplier: number): number {
  return Math.floor(bet * multiplier);
}
