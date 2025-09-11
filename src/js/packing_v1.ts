import type { Arith, Bool, Z3HighLevel } from "z3-solver";
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
    'I': convertRotationData(rotationData['I'], false),
    'O': convertRotationData(rotationData['O'], false),
    'T': convertRotationData(rotationData['T'], true ),
    'S': convertRotationData(rotationData['S'], false),
    'Z': convertRotationData(rotationData['Z'], false),
    'J': convertRotationData(rotationData['J'], false),
    'L': convertRotationData(rotationData['L'], false),
}
type RotationData = {
    forms:FormData[],
    checkerboardParity: boolean
}
type FormData = {
    blocks:{x: number, y: number}[],
    
}
function convertRotationData(rotationData: number[][][], checkerboardParity:boolean): RotationData {
    let forms: FormData[] = [];
    for (const rotation of rotationData) {
        let blocks: {x: number, y: number}[] = [];
        for (let y = 0; y < rotation.length; y++) {
            for (let x = 0; x < rotation[y].length; x++) {
                if (rotation[y][x] === 1) {
                    blocks.push({x, y});
                }
            }
        }
        forms.push({blocks});
    }
    return {forms, checkerboardParity };
}
export async function startPacking_v1(
    z3:Z3HighLevel, 
    grid :boolean[][], 
    minos:Map<MinoKind, number>, 
    onSolved:(minoKinds:MinoKind[], solution:number[][])=>void,
    onFinished:()=>void
)
{
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    let minoCount = 0;
    minos.forEach(v => minoCount += v);

    // パリティを算出
    var checkerboardParity = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) {
                checkerboardParity += r + c;
            }
        }
    }
    // ミノと市松パリティが一致するか
    for (const [minoId, count] of minos.entries()) {
        if (rotationData2[minoId].checkerboardParity)
        {
            checkerboardParity += count;
        }
    }
    if (checkerboardParity % 2 !== 0) {
        onFinished();
        return; // 解なし
    }

    // Z3 Context, Solverの生成
    const contextName = String(Math.floor(Math.random() * 1e9));
    const context = z3.Context(contextName);
    const solver = new context.Solver();
    
    // 各ブロックの座標の変数を定義
    const checkerboardParities:Bool<any>[] = [];
    const blocks: {mino:{x: Arith<any>, y: Arith<any>}[]}[] = [];
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
                mino.push({x, y});
            }
            let or = [];
            for (const form of rotationData2[minoId].forms) {
                let and = [];
                for (let i = 1; i < 4; i++)
                {
                    let dx = form.blocks[i].x - form.blocks[0].x;
                    let dy = form.blocks[i].y - form.blocks[0].y;
                    and.push(mino[i].x.eq(mino[0].x.add(dx)));
                    and.push(mino[i].y.eq(mino[0].y.add(dy)));
                }
                or.push(context.And(...and));
            }
            solver.add(context.Or(...or));
            blocks.push({ mino });
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) {
                for (const mino of blocks) {
                    for (const block of mino.mino) {
                        solver.add(
                            context.Or(
                                block.x.eq(c).not(),
                                block.y.eq(r).not()
                            )
                        );
                    }
                }
            } else {
                let matches = []
                for (const mino of blocks) {
                    for (const block of mino.mino) {
                        matches.push(context.And(
                            block.x.eq(c),
                            block.y.eq(r)
                        ));
                    }
                }
                // 灰色マスは minos のいずれかと一致する
                solver.add(context.PbEq(matches as [any, ...any[]], Array(matches.length).fill(1) as [number, ...number[]], 1));
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
                    solution[r][c] = -1;
                }
            }
            for (const [minoIndex, mino] of blocks.entries()) {
                for (const block of mino.mino) {
                    let x = parseInt(model.eval(block.x).toString(), 10);
                    let y = parseInt(model.eval(block.y).toString(), 10);
                    solution[y][x] = minoIndex;
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
