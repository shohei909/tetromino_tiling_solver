    
import { init, type Arith, type Bool } from 'z3-solver';
import { renderSolutionCanvas } from './export';

(window as any).global = window;

let currentSolver = null;

    let rotationData = {
        'I': [
            [[0,0], [0,1], [0,2], [0,3]], // 0度
            [[0,0], [1,0], [2,0], [3,0]]  // 90度
        ],
        'O': [
            [[0,0], [0,1], [1,0], [1,1]]  // 0度（回転なし）
        ],
        'T': [
            [[0,0], [0,1], [0,2], [1,1]], // 0度
            [[0,1], [1,0], [1,1], [2,1]], // 90度
            [[1,0], [1,1], [1,2], [0,1]], // 180度
            [[0,0], [1,0], [1,1], [2,0]]  // 270度
        ],
        'S': [
            [[0,1], [0,2], [1,0], [1,1]], // 0度
            [[0,0], [1,0], [1,1], [2,1]]  // 90度
        ],
        'Z': [
            [[0,0], [0,1], [1,1], [1,2]], // 0度
            [[0,1], [1,0], [1,1], [2,0]]  // 90度
        ],
        'J': [
            [[0,0],[1,0],[1,1],[1,2]], // 0度
            [[0,0],[0,1],[1,0],[2,0]], // 90度
            [[0,0],[0,1],[0,2],[1,2]], // 180度
            [[0,1],[1,1],[2,0],[2,1]]  // 270度
        ],
        'L': [
            [[0,0],[0,1],[0,2],[1,0]], // 0度
            [[0,0],[1,0],[2,0],[2,1]], // 90度
            [[0,2],[1,0],[1,1],[1,2]], // 180度
            [[0,0],[0,1],[1,1],[2,1]]  // 270度
        ],   
    }
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
    const minoIndex: Arith<any>[][] = [];
    for (let r = 0; r < rows + 3; r++) {
        minoIndex[r] = [];
        for (let c = 0; c < cols + 3; c++) {
            minoIndex[r][c] = context.Int.const(`minoIndex_${r}_${c}`);
            if (
                r >= rows || c >= cols ||
                grid[r][c]
            ) {
                // 黒マスは -1
                solver.add(minoIndex[r][c].eq(-1));
            } else {
                // 白マスは minoInfos のいずれか
                solver.add(context.And(
                    minoIndex[r][c].ge(0),
                    minoIndex[r][c].le(minoInfos.length - 1)
                ));
            }
        }
    }

    // Z3上で座標(r,c)のminoIndex値を返す関数を定義
    // Z3のFunction型（Int, Int → Int）
    const minoIndexFunc = context.Function.declare('getMinoIndex', context.Int.sort(), context.Int.sort(), context.Int.sort());
    for (let r = 0; r < rows + 3; r++) {
        for (let c = 0; c < cols + 3; c++) {
            solver.add(context.Eq(minoIndexFunc.call(r, c), minoIndex[r][c]));
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
                cells.push(context.Eq(minoIndex[r][c], i));
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
        conditions.push(context.Eq(rot, -1)); // 未使用時は制約なし
        for (let id = 0; id < rotationData[mino.id].length; id++)
        {
            let rotConditions = [context.Eq(rot, id)];
            for (const [offsetX, offsetY] of rotationData[mino.id][id]) {
                rotConditions.push(
                    context.Eq(
                        minoIndexFunc.call(x.add(offsetX), y.add(offsetY)),
                        i
                    )
                );
            }
            conditions.push(context.And(...rotConditions));
        }
        solver.add(context.Or(...conditions));
        minoPlaced.push(rot.ge(0));
    }
    solver.add(context.PbGe(minoPlaced as [any, ...any[]], Array(minoPlaced.length).fill(1) as [number, ...number[]], Math.round(emptyCount / 4)));

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
                solution[r][c] = parseInt(model.eval(minoIndex[r][c]).toString());
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

