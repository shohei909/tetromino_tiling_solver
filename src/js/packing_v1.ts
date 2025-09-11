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
let rotationData2 = {
    'I': convertRotationData(rotationData['I']),
    'O': convertRotationData(rotationData['O']),
    'T': convertRotationData(rotationData['T']),
    'S': convertRotationData(rotationData['S']),
    'Z': convertRotationData(rotationData['Z']),
    'J': convertRotationData(rotationData['J']),
    'L': convertRotationData(rotationData['L']),
}
function convertRotationData(rotationData: number[][][]): {x: number, y: number}[][] {
    let result: {x: number, y: number}[][] = [];
    for (const rotation of rotationData) {
        let blocks: {x: number, y: number}[] = [];
        for (let y = 0; y < rotation.length; y++) {
            for (let x = 0; x < rotation[y].length; x++) {
                if (rotation[y][x] === 1) {
                    blocks.push({x, y});
                }
            }
        }
        result.push(blocks);
    }
    return result;
}
export async function startPacking_v1(
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

    // 各マスにどのブロックが入るかを表すInt型変数を定義
    const cellArray = context.Array.const(`cellArray`, context.Int.sort(), context.Int.sort());
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            console.log(r, c, grid[r][c]);
            if (!grid[r][c]) {
                // 白マスは -1
                let cellValue = context.Select(cellArray, r * cols + c);
                solver.add(cellValue.eq(-1));
            } else {
                // 灰色マスは minos のいずれか
                let cellValue = context.Select(cellArray, r * cols + c);
                solver.add(context.And(
                    cellValue.ge(0),
                    cellValue.le(minoCount * 4 - 1)
                ));
            }
        }
    }

    // 各ブロックの座標の変数を定義
    const blocks: {x: Arith<any>, y: Arith<any>}[][] = [];
    const minoKinds: MinoKind[] = [];
    let index = -1;
    for (const [minoId, count] of minos.entries()) {
        for (let repeat = 0; repeat < count; repeat++) {
            minoKinds.push(minoId);

            const mino: {x: Arith<any>, y: Arith<any>}[] = [];
            for (let block = 0; block < 4; block++)
            {
                index += 1;
                let x = context.Int.const(`minoX_${index}`);
                let y = context.Int.const(`minoY_${index}`);
                solver.add(x.ge(0));
                solver.add(x.le(cols - 1));
                solver.add(y.ge(0));
                solver.add(y.le(rows - 1));
                
                // マス目との対応付け
                solver.add(context.Select(cellArray, x.add(y.mul(cols))).eq(index));

                mino.push({x, y});
            }
            
            let or = [];
            for (const form of rotationData2[minoId]) {
                let and = [];
                for (let i = 1; i < 4; i++)
                {
                    let dx = form[i].x - form[0].x;
                    let dy = form[i].y - form[0].y;
                    and.push(mino[i].x.eq(mino[0].x.add(dx)));
                    and.push(mino[i].y.eq(mino[0].y.add(dy)));
                }
                console.log(form);
                or.push(context.And(...and));
            }
            solver.add(context.Or(...or));
            blocks.push(mino);
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
                    let cellValue = model.eval(context.Select(cellArray, r * cols + c));
                    solution[r][c] = Math.floor(parseInt(cellValue.toString(), 10) / 4);
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
