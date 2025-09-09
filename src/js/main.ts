// Import our custom CSS
// @ts-ignore
import '../scss/style.scss'

// Import all of Bootstrap's JS
// @ts-ignore
import * as bootstrap from 'bootstrap'

let grid: boolean[][] = [];
const maxCanvasWidth = 900;
const maxCellSize = 60;
let cellSize = 30;

function createGrid() {
	const rows = parseInt((document.getElementById('rows') as HTMLInputElement).value);
	const cols = parseInt((document.getElementById('cols') as HTMLInputElement).value);
	grid = Array.from({ length: rows }, () => Array(cols).fill(false));
	const gridDiv = document.getElementById('grid');
	if (!gridDiv) return;
	gridDiv.innerHTML = '';
	// 固定幅からセルサイズを計算
	cellSize = Math.floor(maxCanvasWidth / cols);
	cellSize = Math.min(cellSize, maxCellSize);
	const canvas = document.createElement('canvas');
	canvas.width = cols * cellSize;
	canvas.height = rows * cellSize;
	canvas.style.border = '1px solid #888';
	canvas.style.cursor = 'pointer';
	gridDiv.appendChild(canvas);
	drawGrid(canvas, grid);

	let isDrawing = false;
	let drawValue: boolean | null = null;

	canvas.addEventListener('mousedown', (e) => {
		isDrawing = true;
		const rect = canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) / cellSize);
		const y = Math.floor((e.clientY - rect.top) / cellSize);
		if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
			drawValue = !grid[y][x];
			grid[y][x] = drawValue;
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
				drawGrid(canvas, grid);
			}
		}
	});
	window.addEventListener('mouseup', () => {
		isDrawing = false;
		drawValue = null;
	});
}

function drawGrid(canvas: HTMLCanvasElement, grid: boolean[][]) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[r].length; c++) {
			ctx.fillStyle = grid[r][c] ? '#474747ff' : 'white';
			ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
			ctx.strokeStyle = '#888';
			ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
		}
	}
}

window.addEventListener('DOMContentLoaded', () => {
	createGrid();
	const btn = document.getElementById('grid-generate');
	if (btn) btn.onclick = createGrid;

	const fillBlackBtn = document.getElementById('fill-black');
	if (fillBlackBtn) fillBlackBtn.onclick = () => {
		for (let r = 0; r < grid.length; r++) {
			for (let c = 0; c < grid[r].length; c++) {
				grid[r][c] = true;
			}
		}
		const gridDiv = document.getElementById('grid');
		if (gridDiv && gridDiv.firstChild instanceof HTMLCanvasElement) {
			drawGrid(gridDiv.firstChild, grid);
		}
	};
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
	};
	const minoIds = ['I','O','T','S','Z','J','L'];
	// 下限数ボタン
	const minZeroBtn = document.getElementById('min-zero');
	if (minZeroBtn) minZeroBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('min-' + id) as HTMLInputElement;
			if (input) input.value = '0';
		}
	};
	const minPlusBtn = document.getElementById('min-plus');
	if (minPlusBtn) minPlusBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('min-' + id) as HTMLInputElement;
			if (input) input.value = String(Number(input.value) + 1);
		}
	};
	const minMinusBtn = document.getElementById('min-minus');
	if (minMinusBtn) minMinusBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('min-' + id) as HTMLInputElement;
			if (input) input.value = String(Math.max(0, Number(input.value) - 1));
		}
	};
	const maxZeroBtn = document.getElementById('max-zero');
	if (maxZeroBtn) maxZeroBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('max-' + id) as HTMLInputElement;
			if (input) input.value = '0';
		}
	};
	const maxPlusBtn = document.getElementById('max-plus');
	if (maxPlusBtn) maxPlusBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('max-' + id) as HTMLInputElement;
			if (input) input.value = String(Number(input.value) + 1);
		}
	};
	const maxMinusBtn = document.getElementById('max-minus');
	if (maxMinusBtn) maxMinusBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('max-' + id) as HTMLInputElement;
			if (input) input.value = String(Math.max(0, Number(input.value) - 1));
		}
	};
});
