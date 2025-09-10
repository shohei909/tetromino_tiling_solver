    
import { init, type Arith, type Bool } from 'z3-solver';
import { renderSolutionCanvas } from './export';

(window as any).global = window;

let currentSolver = null;
let rotationData = {
    'I': [
        [
            [1,1,1,1],
            [0,0,0,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 0度
        [
            [1,0,0,0],
            [1,0,0,0],
            [1,0,0,0], 
            [1,0,0,0],
        ], // 90度
    ],
    'O': [
        [
            [1,1,0,0],
            [1,1,0,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 0度
    ],
    'T': [
        [
            [0,1,0,0],
            [1,1,1,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 0度
        [
            [1,0,0,0],
            [1,1,0,0],
            [1,0,0,0],
            [0,0,0,0],
        ], // 90度
        [
            [1,1,1,0],
            [0,1,0,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 180度
        [
            [0,1,0,0],
            [1,1,0,0],
            [0,1,0,0],
            [0,0,0,0],
        ], // 270度
    ],
    'S': [
        [
            [0,1,1,0],
            [1,1,0,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 0度
        [
            [1,0,0,0],
            [1,1,0,0],
            [0,1,0,0],
            [0,0,0,0],
        ], // 90度
    ],
    'Z': [
        [
            [1,1,0,0],
            [0,1,1,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 0度
        [
            [0,1,0,0],
            [1,1,0,0],
            [1,0,0,0],
            [0,0,0,0],
        ], // 90度
    ],
    'J': [
        [
            [1,0,0,0],
            [1,1,1,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 0度
        [
            [1,1,0,0],
            [1,0,0,0],
            [1,0,0,0],
            [0,0,0,0],
        ], // 90度
        [
            [1,1,1,0],
            [0,0,1,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 180度
        [
            [0,1,0,0],
            [0,1,0,0],
            [1,1,0,0],
            [0,0,0,0],
        ], // 270度
    ],
    'L': [
        [
            [0,0,1,0],
            [1,1,1,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 0度
        [
            [1,0,0,0],
            [1,0,0,0],
            [1,1,0,0],
            [0,0,0,0],
        ], // 90度
        [
            [1,1,1,0],
            [1,0,0,0],
            [0,0,0,0],
            [0,0,0,0],
        ], // 180度
        [
            [1,1,0,0],
            [0,1,0,0],
            [0,1,0,0],
            [0,0,0,0],
        ], // 270度
    ],
};

export async function solvePacking(grid: boolean[][], minos: {id: MinoKind, min: number, max: number}[]) {
    let resultDiv = document.getElementById('result')!;
    let errorDiv  = document.getElementById('solve-error')!;
    errorDiv.hidden = true;
    errorDiv.textContent = '';

    // Z3初期化
    const z3 = await init();

    // ランダムな整数から文字列生成
    const contextName = String(Math.floor(Math.random() * 1e9));
    const context = z3.Context(contextName);
    const solver = new context.Solver();
    currentSolver = solver;

    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    // 白マスの数を数える
    let emptyCount = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) {
                emptyCount++;
            }
        }
    }
    let minMino = 0;
    let maxMino = 0;
    let minoInfos: Mino[] = [];

    // 各ミノごとに配置フラグ・座標・回転数の変数を定義
    for (const mino of minos) {
        minMino += mino.min;
        maxMino += mino.max;
        for (let i = 0; i < mino.max; i++) {
            minoInfos.push({
                id: mino.id,
                required: i < mino.min
            });
        }
    }

    // 事前チェック
    let failed = false;
    if (emptyCount % 4 !== 0) {
        errorDiv.innerHTML += '<div>白マスの数(' + emptyCount + ')が4の倍数ではありません</div>';
        failed = true;
    }
    if (emptyCount < minMino * 4) {
        errorDiv.innerHTML += '<div>白マスの数(' + emptyCount + ')がミノの最小数(' + minMino + ')×4未満です</div>';
        failed = true;
    }
    if (emptyCount > maxMino * 4) {
        errorDiv.innerHTML += '<div>白マスの数(' + emptyCount + ')がミノの最大数(' + maxMino + ')×4を超えてます</div>';
        failed = true;
    }
    if (failed) { 
        resultDiv.textContent = "";
        errorDiv.hidden = false;
        return; 
    }
    
    // 各マスにどのIndex値のミノが入るかを表すInt型変数を定義
    const cellArray = context.Array.const(`cellArray`, context.Int.sort(), context.Int.sort());
    for (let r = 0; r < rows + 3; r++) {
        for (let c = 0; c < cols + 3; c++) {
            if (
                r >= rows || c >= cols ||
                grid[r][c]
            ) {
                // 黒マスは -1
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                solver.add(cellValue.eq(-1));
            } else {
                // 白マスは minoInfos のいずれか
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                solver.add(context.And(
                    cellValue.ge(0),
                    cellValue.le(minoInfos.length - 1)
                ));
            }
        }
    }

    // 各ミノの制約
    const minoX: Arith<any>[] = [];
    const minoY: Arith<any>[] = [];
    const minoRot: Arith<any>[] = [];
    const minoPlaced: Bool<any>[] = [];
    for (const [i, mino] of minoInfos.entries()) {
        const cells: any[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                cells.push(cellValue.eq(i));
            }
        }
        // そのミノの使われているマス数が4つだけ
        if (mino.required)
        {
            solver.add(context.PbEq(cells as [any, ...any[]], Array(cells.length).fill(1) as [number, ...number[]], 4));
        }
        else
        {
            solver.add(
                context.Or(
                    context.PbEq(cells as [any, ...any[]], Array(cells.length).fill(1) as [number, ...number[]], 0),
                    context.PbEq(cells as [any, ...any[]], Array(cells.length).fill(1) as [number, ...number[]], 4)
                )
            );
        }

        // 座標（Int）
        let x = context.Int.const(`minoX_${mino.id}_${i}`)
        let y = context.Int.const(`minoY_${mino.id}_${i}`)
        minoX.push(x);
        minoY.push(y);
        if (mino.id === 'I') {
            solver.add(context.And(x.ge(0), x.le(Math.max(rows - 1, 0))));
            solver.add(context.And(y.ge(0), y.le(Math.max(cols - 1, 0))));
        }
        else 
        {
            solver.add(context.And(x.ge(0), x.le(Math.max(rows - 2, 0))));
            solver.add(context.And(y.ge(0), y.le(Math.max(cols - 2, 0))));
        }

        // 配置フラグまたは回転数（Int）
        let rot = context.Int.const(`minoRot_${mino.id}_${i}`)
        minoRot.push(rot);
        
        let min = mino.required ? 0 : -1;
        let max = rotationData[mino.id].length - 1;
        solver.add(context.And(rot.ge(min), rot.le(max)));

        // ミノの形状に合わせたマスの制約
        let conditions:(Bool<any> | boolean)[] = [];
        for (let [rotIndex, rotationTable] of rotationData[mino.id].entries())
        {
            for (let offsetX = 0; offsetX < rotationTable.length; offsetX++)
            {
                let rotationRow = rotationTable[offsetX];
                for (let offsetY = 0; offsetY < rotationRow.length; offsetY++)
                {
                    let rotationValue = rotationRow[offsetY];
                    let cellValue = context.Select(cellArray, x.add(offsetX).mul(cols + 3).add(y.add(offsetY)));
                    if (rotationValue == 1)
                    {
                        solver.add(
                            context.Or(
                                context.Eq(rot, rotIndex).not(),
                                context.Eq(cellValue, i)
                            )
                        );
                    }
                    else
                    {
                        solver.add(
                            context.Or(
                                context.Eq(rot, rotIndex).not(),
                                context.Eq(cellValue, i).not()
                            )
                        );
                    }
                }
            }
        }
        minoPlaced.push(rot.ge(0));
        
        if (i >= 1 && mino.id === minoInfos[i - 1].id)
        {
            // 同じミノが連続している場合、Indexが小さい方を優先する（対称性の排除）
            let prev_rot = minoRot[i - 1];
            solver.add(context.Or(
                rot.ge(0),
                context.And(
                    rot.eq(-1),
                    prev_rot.eq(-1)
                )
            ));
            // 同じミノが連続している場合、Indexが小さい方を先に置く（対称性の排除）
            let prev_x = minoX[i - 1];
            let prev_y = minoY[i - 1];
            solver.add(context.GT(
                x.mul(cols + 3).add(y),
                prev_x.mul(cols + 3).add(prev_y)
            ));
        }
    }
    solver.add(context.PbGe(minoPlaced as [any, ...any[]], Array(minoPlaced.length).fill(1) as [number, ...number[]], Math.round(emptyCount / 4)));

    // 必須ではない高速化用の制約
    // 隣接マス1つから3つまでが必ずつながっている必要がある
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) {
                // 白マスは minoInfos のいずれか
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                let neighbors = [];
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]])
                {
                    if (
                        r + dr >= 0 && r + dr < rows &&
                        c + dc >= 0 && c + dc < cols &&
                        !grid[r + dr][c + dc]) 
                    {
                        neighbors.push(context.Select(cellArray, (r + dr) * (cols + 3) + (c + dc)));
                    }
                }
                if (neighbors.length == 0)
                {
                    resultDiv.textContent = "";
                    errorDiv.hidden = false;
                    errorDiv.innerHTML += '<div>孤立しているマスがあります</div>';
                    failed = true;
                    return;
                }
                // 自分と同じ値の隣接マスが1つ以上必要
                solver.add(context.Or(...neighbors.map(n => n.eq(cellValue))));
                // 自分と同じ値の隣接マスが4つ以上あることはない
                if (neighbors.length >= 4)
                {
                    solver.add(context.And(...neighbors.map(n => n.eq(cellValue))).not());
                }
            }
        }
    }
    // 4マス以上離れた同じミノは置けない
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) continue;
            for (let r2 = 0; r2 < rows; r2++) {
                for (let c2 = 0; c2 < cols; c2++) {
                    if (grid[r2][c2]) continue;
                    let distance = Math.abs(r - r2) + Math.abs(c - c2);
                    if (distance === 4) {
                        let cellValue1 = context.Select(cellArray, r * (cols + 3) + c);
                        let cellValue2 = context.Select(cellArray, r2 * (cols + 3) + c2);
                        solver.add(cellValue1.eq(cellValue2).not());
                    }
                }
            }
        }
    }

    resultDiv.textContent = '計算中...';
    solver.set('timeout', 20000);
    if (solver != currentSolver) { return; }
    const sat = await solver.check();
    if (sat === 'sat') {
        const model = solver.model();
        // 各マスごとにどのミノが入っているか判定
        const solution: number[][] = [];
        for (let r = 0; r < rows; r++) {
            solution[r] = [];
            for (let c = 0; c < cols; c++) {
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                solution[r][c] = parseInt(model.eval(cellValue).toString());
            }
        }
        for (const [i, mino] of minoInfos.entries()) {
            console.log(`Mino ${i} (${mino.id}): x=${model.eval(minoX[i])}, y=${model.eval(minoY[i])}, rot=${model.eval(minoRot[i])}`);
        }
        renderSolutionCanvas(grid, solution, minoInfos);
    } else if (sat == 'unsat') {
        resultDiv.textContent = '解なし';
    } else {
        resultDiv.textContent = 'タイムアウトしました';
    }
}

