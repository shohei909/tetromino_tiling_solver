"use strict";
let grid = [];
const cellSize = 30;
function createGrid() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    grid = Array.from({ length: rows }, () => Array(cols).fill(false));
    const gridDiv = document.getElementById('grid');
    if (!gridDiv)
        return;
    gridDiv.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    canvas.style.border = '1px solid #888';
    gridDiv.appendChild(canvas);
    drawGrid(canvas, grid);
    let isDrawing = false;
    let drawValue = null;
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
        if (!isDrawing || drawValue === null)
            return;
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
function drawGrid(canvas, grid) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            ctx.fillStyle = grid[r][c] ? 'black' : 'white';
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            ctx.strokeStyle = '#888';
            ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
    }
}
window.addEventListener('DOMContentLoaded', () => {
    createGrid();
    const btn = document.getElementById('grid-generate');
    if (btn)
        btn.onclick = createGrid;
});
//# sourceMappingURL=main.js.map