// Import our custom CSS
// @ts-ignore
import '../scss/style.scss'

// Import all of Bootstrap's JS
// @ts-ignore
import * as bootstrap from 'bootstrap'
import { abortPacking, launchPacking } from './solver/solver_root';

let grid: boolean[][] = [];
const maxCanvasWidth = 900;
const maxCellSize = 60;
let cellSize = 30;

let isDrawing = false;
let drawValue: boolean | null = null;

function createGrid() {
	let initial = [
		"1100000000",
		"1110000100",
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
function resizeGrid() 
{
	const rows = parseInt((document.getElementById('rows') as HTMLInputElement).value);
	const cols = parseInt((document.getElementById('cols') as HTMLInputElement).value);
	while (grid.length > rows)
	{
		grid.shift();
	}
	while (grid.length < rows)
	{
		grid.unshift(Array(cols).fill(false));
	}
	if (grid.length > 0) 
	{
		while (grid[0].length > cols)
		{
			for (let r = 0; r < grid.length; r++) grid[r].pop();
		}
		while (grid[0].length < cols)
		{
			for (let r = 0; r < grid.length; r++) grid[r].push(grid[r][grid[r].length - 1]);
		}
	}
	updateGrid();
	const gridDiv = document.getElementById('grid');
	if (gridDiv && gridDiv.firstChild instanceof HTMLCanvasElement) {
		drawGrid(gridDiv.firstChild, grid);
	}
};

window.addEventListener('DOMContentLoaded', () => {	
	createGrid();
	const rows = document.getElementById('rows');
	if (rows) rows.onchange = resizeGrid;
	const cols = document.getElementById('cols');
	if (cols) cols.onchange = resizeGrid;

	// grid-solve ボタンの処理
	const solveBtn = document.getElementById('grid-solve');
	if (solveBtn) solveBtn.onclick = async () => {
		const minoIds = ['I','O','T','S','Z','J','L'];
		const minos = minoIds.map(id => ({
			id: id as MinoKind,
			plus : Number((document.getElementById('plus-' + id) as HTMLInputElement)?.value || 0),
			minus: Number((document.getElementById('minus-' + id) as HTMLInputElement)?.value || 0)
		}));
		await launchPacking(grid, minos);
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
	};
	const minoIds = ['I','O','T','S','Z','J','L'];
	// 下限数ボタン
	const minusZeroBtn = document.getElementById('minus-zero');
	if (minusZeroBtn) minusZeroBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('minus-' + id) as HTMLInputElement;
			if (input) input.value = '0';
		}
	};
	const plusZeroBtn = document.getElementById('plus-zero');
	if (plusZeroBtn) plusZeroBtn.onclick = () => {
		for (const id of minoIds) {
			const input = document.getElementById('plus-' + id) as HTMLInputElement;
			if (input) input.value = '0';
		}
	};
});