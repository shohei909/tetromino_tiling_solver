// Import our custom CSS
// @ts-ignore
import '../scss/style.scss'

// Import all of Bootstrap's JS
// @ts-ignore
import { abortPacking, launchPacking } from './solver/solver_root';
import { decode, encode } from './tool/identifier';
import { tetroMinoKinds } from './constants';
import { gridToHash, hashToGrid } from './tool/hash';

let grid: boolean[][] = [];
const maxCanvasWidth = 900;
const maxCellSize = 75;
let cellSize = 30;

let isDrawing = false;
let drawValue: boolean | null = null;

function createGrid() {
	if (grid.length == 0) {
		let initial = [
			"0000000000",
			"1111000000",
			"1111001001",
			"1110001111",
			"1110111111",
			"1110011111",
			"1110111111",
			"1111011111",
		];
		const rows = initial.length;
		const cols = initial[0].length;
		(document.getElementById('cols') as HTMLInputElement).value = cols.toString();
		(document.getElementById('rows') as HTMLInputElement).value = rows.toString();
		grid = Array.from({ length: rows }, (_, r) => {
			return Array.from({ length: cols }, (_, c) => {
				return initial[r][c] === '1';
			});
		});
		updateGrid();
	}
	window.addEventListener('mouseup', () => {
		isDrawing = false;
		drawValue = null;
	});
}

function updateGrid() {
	const rows = parseInt((document.getElementById('rows') as HTMLInputElement).value);
	const cols = parseInt((document.getElementById('cols') as HTMLInputElement).value);

	const gridDiv = document.getElementById('grid');
	if (!gridDiv) return;
	gridDiv.innerHTML = '';
	const canvas = document.createElement('canvas');
	gridDiv.appendChild(canvas);

	// 固定幅からセルサイズを計算
	cellSize = Math.floor(maxCanvasWidth / cols);
	cellSize = Math.min(cellSize, maxCellSize);
	canvas.width = cols * cellSize + 1;
	canvas.height = rows * cellSize + 1;
	canvas.style.border = '1px solid #888';
	canvas.style.cursor = 'pointer';

	canvas.addEventListener('mousedown', (e) => {
		isDrawing = true;
		const rect = canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) / cellSize);
		const y = Math.floor((e.clientY - rect.top) / cellSize);
		if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
			drawValue = !grid[y][x];
			grid[y][x] = drawValue;
			saveGridToHash();
			drawGrid(canvas, grid);
		}
	});
	canvas.addEventListener('mousemove', (e) => {
		if (!isDrawing || drawValue === null) return;
		const rect = canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) / cellSize);
		const y = Math.floor((e.clientY - rect.top) / cellSize);
		if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
			if (grid[y][x] !== drawValue) {
				grid[y][x] = drawValue;
				saveGridToHash();
				drawGrid(canvas, grid);
			}
		}
	});
	// タッチ操作に対応
	canvas.addEventListener('touchstart', (e) => {
		e.preventDefault();
		const rect = canvas.getBoundingClientRect();
		const touch = e.touches[0];
		const x = Math.floor((touch.clientX - rect.left) / cellSize);
		const y = Math.floor((touch.clientY - rect.top) / cellSize);
		isDrawing = true;
		drawValue = (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) ? !grid[y][x] : null;
		if (drawValue !== null) {
			grid[y][x] = drawValue;
			saveGridToHash();
			drawGrid(canvas, grid);
		}
	}, { passive: false });
	canvas.addEventListener('touchmove', (e) => {
		e.preventDefault();
		if (!isDrawing || drawValue === null) return;
		const rect = canvas.getBoundingClientRect();
		const touch = e.touches[0];
		const x = Math.floor((touch.clientX - rect.left) / cellSize);
		const y = Math.floor((touch.clientY - rect.top) / cellSize);
		if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
			if (grid[y][x] !== drawValue) {
				grid[y][x] = drawValue;
				saveGridToHash();
				drawGrid(canvas, grid);
			}
		}
	}, { passive: false });
	canvas.addEventListener('touchend', () => {
		isDrawing = false;
		drawValue = null;
	});

	drawGrid(canvas, grid);
}

function drawGrid(canvas: HTMLCanvasElement, grid: boolean[][]) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[r].length; c++) {
			ctx.fillStyle = grid[r][c] ? '#b9b9b9ff' : 'white';
			ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
			ctx.strokeStyle = '#888';
			ctx.strokeRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
		}
	}
}
function resizeGrid() {
	const rows = parseInt((document.getElementById('rows') as HTMLInputElement).value);
	const cols = parseInt((document.getElementById('cols') as HTMLInputElement).value);
	while (grid.length > rows) {
		grid.shift();
	}
	while (grid.length < rows) {
		grid.unshift(Array(cols).fill(false));
	}
	if (grid.length > 0) {
		while (grid[0].length > cols) {
			for (let r = 0; r < grid.length; r++) grid[r].pop();
		}
		while (grid[0].length < cols) {
			for (let r = 0; r < grid.length; r++) grid[r].push(grid[r][grid[r].length - 1]);
		}
	}
	updateGrid();
	saveGridToHash();

	const gridDiv = document.getElementById('grid');
	if (gridDiv && gridDiv.firstChild instanceof HTMLCanvasElement) {
		drawGrid(gridDiv.firstChild, grid);
	}
};

window.addEventListener('hashchange', () => {
	loadGridFromHash();
});
// URLハッシュからグリッドを復元
function loadGridFromHash() {
	if (location.hash.length > 1) {
		const hash = decodeURIComponent(location.hash.slice(1));
		try {
			const loaded = hashToGrid(hash);
			if (loaded) {
				grid = loaded.grid;
				(document.getElementById('rows') as HTMLInputElement).value = grid.length.toString();
				(document.getElementById('cols') as HTMLInputElement).value = grid[0].length.toString();
				let plusMinus = loaded.plusMinus;
				for (const id of tetroMinoKinds) {
					(document.getElementById('plus-' + id) as HTMLInputElement).value = (plusMinus.get(id)?.plus || 0).toString();
					(document.getElementById('minus-' + id) as HTMLInputElement).value = (plusMinus.get(id)?.minus || 0).toString();
				}
				updateGrid();
			}
		} catch (e) {
			console.error('Failed to load grid from hash:', e);
		}
	}
}

// グリッド変更時にURLハッシュを更新
function saveGridToHash() {
	const hash = gridToHash(grid, getPlusMinus());
	location.hash = encodeURIComponent(hash);
}

function getPlusMinus(): Map<MinoKind, { plus: number, minus: number }> {
	return tetroMinoKinds.reduce((acc, id) => {
		acc.set(id, {
			plus: Number((document.getElementById('plus-' + id) as HTMLInputElement)?.value || 0),
			minus: Number((document.getElementById('minus-' + id) as HTMLInputElement)?.value || 0)
		});
		return acc;
	}, new Map<MinoKind, { plus: number, minus: number }>());
}
window.addEventListener('DOMContentLoaded', () => {
	loadGridFromHash();
	createGrid();
	const rows = document.getElementById('rows');
	if (rows) rows.onchange = resizeGrid;
	const cols = document.getElementById('cols');
	if (cols) cols.onchange = resizeGrid;

	// grid-solve ボタンの処理
	const solveBtn = document.getElementById('grid-solve');
	if (solveBtn) solveBtn.onclick = async () => {
		await launchPacking(grid, getPlusMinus());
	};
	const abortBtn = document.getElementById('abort-button');
	if (abortBtn) abortBtn.onclick = () => { abortPacking(); };

	const fillWhiteBtn = document.getElementById('fill-white');
	if (fillWhiteBtn) fillWhiteBtn.onclick = () => {
		for (let r = 0; r < grid.length; r++) {
			for (let c = 0; c < grid[r].length; c++) {
				grid[r][c] = false;
			}
		}
		const gridDiv = document.getElementById('grid');
		if (gridDiv && gridDiv.firstChild instanceof HTMLCanvasElement) {
			drawGrid(gridDiv.firstChild, grid);
		}
		saveGridToHash();
	};
	const fillGrayBtn = document.getElementById('fill-gray');
	if (fillGrayBtn) fillGrayBtn.onclick = () => {
		for (let r = 0; r < grid.length; r++) {
			for (let c = 0; c < grid[r].length; c++) {
				grid[r][c] = true;
			}
		}
		const gridDiv = document.getElementById('grid');
		if (gridDiv && gridDiv.firstChild instanceof HTMLCanvasElement) {
			drawGrid(gridDiv.firstChild, grid);
		}
		saveGridToHash();
	};
	const minoIds = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
	// 下限数ボタン
	const minusZeroBtn = document.getElementById('minus-zero');
	if (minusZeroBtn) minusZeroBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('minus-' + id) as HTMLInputElement;
			if (input) input.value = '0';
			saveGridToHash();
		}
	};
	const plusZeroBtn = document.getElementById('plus-zero');
	if (plusZeroBtn) plusZeroBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('plus-' + id) as HTMLInputElement;
			if (input) input.value = '0';
			saveGridToHash();
		}
	};
	for (const numberInput of document.querySelectorAll('input[name="number-input"]')) {
		(numberInput as HTMLInputElement).onchange = saveGridToHash;
	}

	document.getElementById('move-up')?.addEventListener('click', () => moveGrid(0, -1));
	document.getElementById('move-down')?.addEventListener('click', () => moveGrid(0, 1));
	document.getElementById('move-left')?.addEventListener('click', () => moveGrid(-1, 0));
	document.getElementById('move-right')?.addEventListener('click', () => moveGrid(1, 0));

	const copyBtn = document.getElementById('copy-link');
	if (copyBtn) {
		copyBtn.addEventListener('click', function () {
			navigator.clipboard.writeText(window.location.href).then(function () {
				copyBtn.textContent = 'コピーしました!';
				setTimeout(() => { copyBtn.textContent = 'リンクをコピー'; }, 1500);
			});
		});
	}
});

// --- グリッド移動機能 ---
function moveGrid(dx: number, dy: number) {
	const rows = grid.length;
	const cols = grid[0]?.length || 0;
	const newGrid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const nr = r - dy;
			// 横方向はトーラス状（あふれた分は反対側へ）
			let nc = (c - dx) % cols;
			if (nc < 0) nc += cols;
			if (nr >= 0 && nr < rows) {
				newGrid[r][c] = grid[nr][nc];
			}
		}
	}
	for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = newGrid[r][c];
	updateGrid();
	saveGridToHash();
}
