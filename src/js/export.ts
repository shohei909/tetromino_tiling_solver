import type { State } from "@popperjs/core";
import { minoKinds } from "./constants";

let solutions:Map<string, SubSolutionNode> = new Map();

export function clearSolutions() {
    solutions.clear();
    
    let resultDiv  = document.getElementById('solve-result')!;
    resultDiv.textContent = '';
}

// 結果Canvasの生成・描画処理
export function addSolution(
    problem: SubProblemNode, 
    minoKinds: MinoKind[], 
    solution: number[][]
) {
    let resultDiv = document.getElementById('solve-result')!;
    let grid = problem.problem.field.grid;
    let prevStateKey = problem.stateKey;
    let prevState = solutions.get(prevStateKey);
    let stateIdentifier = resolveStateIdentifier(prevState?.stateIdentifier, problem);
    let stateKey = stringifyIdentifier(stateIdentifier);
    if (!solutions.has(stateKey))
    {
        solutions.set(stateKey, {
            stateIdentifier,
            solutions: new Map<string, SubSolution[]>(),
            linkedSolutions: new Set<StateIdentifier>(),
        });
    }
    // 解を保存
    let stateSolution = solutions.get(stateKey)!;
    if (!stateSolution.solutions.has(prevStateKey))
    {
        stateSolution.solutions.set(prevStateKey, []);
    }
    stateSolution.solutions.get(prevStateKey)!.push({
        minos: problem.problem.minos,
        minoKinds,
        solution,
        problem: problem.problem
    });

    // この解の直前の部分解にも、この解で使用していることを記録
    if (prevState) {
        prevState.linkedSolutions.add(stateIdentifier);
    }

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

// キー文字列生成用の状態を作成
function resolveStateIdentifier(prevState:StateIdentifier | undefined, problem: SubProblemNode):StateIdentifier
{   
    let consumedMinos = new Map<MinoKind, number>(problem.problem.minos);
    let filledField;
    if (prevState) 
    {
        for (const [mino, count] of prevState.consumedMinos) {
            consumedMinos.set(mino, (consumedMinos.get(mino) || 0) + count);
        }
        filledField = prevState.filledField.map(row => row.slice());
    }
    else
    {
        filledField = [];
        for (let r = 0; r < problem.rest.wholeSize.rows; r++) {
            filledField.push(Array(problem.rest.wholeSize.cols).fill(false));
        }
        for (let r = 0; r < problem.problem.field.grid.length; r++) {
            for (let c = 0; c < problem.problem.field.grid[r].length; c++) {
                if (problem.problem.field.grid[r][c]) {
                    filledField[r + problem.problem.field.offset.y][c + problem.problem.field.offset.x] = true;
                }
            }
        }
    }
    return {
        consumedMinos: consumedMinos,
        filledField: filledField
    };
}

function stringifyIdentifier(id:StateIdentifier):string
{
    let length = 7 + Math.ceil((id.filledField.length * id.filledField[0].length) / 8);
    let buffer = new ArrayBuffer(length);
    let dataView = new DataView(buffer);
    let offset = 0;
    for (const mino of minoKinds)
    {
        dataView.setUint8(offset++, (id.consumedMinos.get(mino) || 0));
    }
    let byte = 0;
    let bitIndex = 0;
    for (let r = 0; r < id.filledField.length; r++)
    {
        for (let c = 0; c < id.filledField[r].length; c++)
        {
            byte = (byte << 1) | (id.filledField[r][c] ? 1 : 0);
            bitIndex += 1;
            if (bitIndex > 8)
            {
                dataView.setUint8(offset++, byte);
                byte = 0;
                bitIndex = 0;
            }
        }
    }
    if (bitIndex > 0) {
        dataView.setUint8(offset++, byte);
    }
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
