
// 結果Canvasの生成・描画処理
export function renderSolutionCanvas(grid: boolean[][], minoKinds: MinoKind[], solution: number[][]) {
    let resultDiv = document.getElementById('solve-result')!;

    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const cellSize = 20;

    const div = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    div.appendChild(canvas);
    div.className = "result-canvas col-auto";
    resultDiv.appendChild(div);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillStyle = '#e0e0ff';
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            ctx.strokeStyle = '#b7b7b7ff';
            ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
            
            const minoIndex = solution[r][c];
            ctx.fillStyle = getMinoColor(minoIndex == -1 || isNaN(minoIndex) ? "#474747" : minoKinds[minoIndex]);
            ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
        }
    }
}

function getMinoColor(minoId: string): string {
    switch (minoId) {
        case 'I': return "#00BCD4";
        case 'O': return "#ffe53b";
        case 'T': return "#9C27B0";
        case 'S': return "#4CAF50";
        case 'Z': return "#F44336";
        case 'J': return "#3F51B5";
        case 'L': return "#ff9100";
        default: return '#e0e0ff';
    }
}
