import type { Arith, Z3HighLevel } from "z3-solver";
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

export async function startPacking_v0(
    z3:Z3HighLevel, 
    grid :boolean[][], 
    minos:Map<MinoKind, number>, 
    onSolved:(minoKinds:MinoKind[], solution:number[][])=>void,
    onFinished:()=>void
)
{
    const contextName = String(Math.floor(Math.random() * 1e9));
    const context = z3.Context(contextName);
    const solver = new context.Solver();
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    let minoCount = 0;
    minos.forEach(v => minoCount += v);

    // 各マスにどのIndex値のミノが入るかを表すInt型変数を定義
    let emptyCount = 0;
    const cellArray = context.Array.const(`cellArray`, context.Int.sort(), context.Int.sort());
    for (let r = 0; r < rows + 3; r++) {
        for (let c = 0; c < cols + 3; c++) {
            if (r >= rows || c >= cols || !grid[r][c]) {
                // 白マスは -1
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                solver.add(cellValue.eq(-1));
            } else {
                // 灰色マスは minos のいずれか
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                solver.add(context.And(
                    cellValue.ge(0),
                    cellValue.le(minoCount - 1)
                ));
                emptyCount++;
            }
        }
    }

    // 各ミノの制約
    const minoX  : Arith<any>[] = [];
    const minoY  : Arith<any>[] = [];
    const minoRot: Arith<any>[] = [];
    const minoKinds: MinoKind[] = [];
    let index = -1;
    for (const [minoId, count] of minos.entries()) {
        for (let repeat = 0; repeat < count; repeat++) {
            index += 1;
            minoKinds.push(minoId);
            
            // ミノの配置マス数を取得
            const cells: any[] = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                    cells.push(cellValue.eq(index));
                }
            }
            // そのミノの使われているマス数が4つだけ
            solver.add(context.PbEq(cells as [any, ...any[]], Array(cells.length).fill(1) as [number, ...number[]], 4));

            // 座標（Int）
            let x = context.Int.const(`minoX_${minoId}_${index}`)
            let y = context.Int.const(`minoY_${minoId}_${index}`)
            minoX.push(x);
            minoY.push(y);
            if (minoId === 'I') {
                solver.add(context.And(x.ge(0), x.le(Math.max(rows - 1, 0))));
                solver.add(context.And(y.ge(0), y.le(Math.max(cols - 1, 0))));
            }
            else {
                solver.add(context.And(x.ge(0), x.le(Math.max(rows - 2, 0))));
                solver.add(context.And(y.ge(0), y.le(Math.max(cols - 2, 0))));
            }

            // 配置フラグまたは回転数（Int）
            let rot = context.Int.const(`minoRot_${minoId}_${index}`)
            minoRot.push(rot);

            let max = rotationData[minoId].length - 1;
            solver.add(context.And(rot.ge(0), rot.le(max)));

            // ミノの形状に合わせたマスの制約
            for (let [rotIndex, rotationTable] of rotationData[minoId].entries()) {
                for (let offsetX = 0; offsetX < rotationTable.length; offsetX++) {
                    let rotationRow = rotationTable[offsetX];
                    for (let offsetY = 0; offsetY < rotationRow.length; offsetY++) {
                        let rotationValue = rotationRow[offsetY];
                        let cellValue = context.Select(cellArray, x.add(offsetX).mul(cols + 3).add(y.add(offsetY)));
                        if (rotationValue == 1) {
                            solver.add(
                                context.Or(
                                    context.Eq(rot, rotIndex).not(),
                                    context.Eq(cellValue, index)
                                )
                            );
                        }
                        else {
                            solver.add(
                                context.Or(
                                    context.Eq(rot, rotIndex).not(),
                                    context.Eq(cellValue, index).not()
                                )
                            );
                        }
                    }
                }
            }
            // 同じミノが連続
            if (repeat >= 1) {
                // 同じミノが連続している場合、Indexが小さい方を先に置く（対称性の排除）
                let prev_x = minoX[index - 1];
                let prev_y = minoY[index - 1];
                solver.add(context.GT(
                    x.mul(cols + 3).add(y),
                    prev_x.mul(cols + 3).add(prev_y)
                ));
            }
        }
    }

    // 必須ではない高速化用の制約
    // 隣接マス1つから3つまでが必ずつながっている必要がある
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                // 灰色マスは minoInfos のいずれか
                let cellValue = context.Select(cellArray, r * (cols + 3) + c);
                let neighbors = [];
                for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    if (
                        r + dr >= 0 && r + dr < rows &&
                        c + dc >= 0 && c + dc < cols &&
                        grid[r + dr][c + dc]) 
                    {
                        neighbors.push(context.Select(cellArray, (r + dr) * (cols + 3) + (c + dc)));
                    }
                }
                // 自分と同じ値の隣接マスが1つ以上必要
                solver.add(context.Or(...neighbors.map(n => n.eq(cellValue))));
                // 自分と同じ値の隣接マスが4つ以上あることはない
                if (neighbors.length >= 4) {
                    solver.add(context.And(...neighbors.map(n => n.eq(cellValue))).not());
                }
            }
        }
    }
    // 4マス以上離れた同じミノは置けない
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) continue;
            for (let r2 = 0; r2 < rows; r2++) {
                for (let c2 = 0; c2 < cols; c2++) {
                    if (!grid[r2][c2]) continue;
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

    for (let i = 0; i < 5000; i++) 
    {
        const sat = await solver.check();
        let solution: number[][] = [];
        if (sat === 'sat') {
            const model = solver.model();
            for (let r = 0; r < rows; r++) {
                solution[r] = [];
                for (let c = 0; c < cols; c++) {
                    let cellValue = model.eval(context.Select(cellArray, r * (cols + 3) + c));
                    solution[r][c] = parseInt(cellValue.toString(), 10);
                }
            }
            onSolved(minoKinds, solution);

            // FIXME: この解を除外する制約を追加して、再度解を探す
            onFinished();
            return; 
        }
        else
        {
            onFinished();
            return;
        }
    }
}
