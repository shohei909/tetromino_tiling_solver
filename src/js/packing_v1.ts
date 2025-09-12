import type { Arith, Bool, Z3HighLevel } from "z3-solver";

let rotationData = {
    'I': [
        [[0,0],[1,0],[2,0],[3,0]], // ━
        [[0,0],[0,1],[0,2],[0,3]], // ❘
    ],
    'O': [
        [[0,0],[1,0],[0,1],[1,1]], // □
    ],
    'S': [
        [[1,0],[2,0],[0,1],[1,1]], // 横
        [[0,0],[0,1],[1,1],[1,2]], // 縦
    ],
    'Z': [
        [[0,0],[1,0],[1,1],[2,1]], // 横
        [[1,0],[0,1],[1,1],[0,2]], // 縦
    ],
    'T': [
        [[1,0],[0,1],[1,1],[2,1]], // ▲
        [[0,1],[1,0],[1,1],[1,2]], // ◀
        [[0,0],[1,0],[2,0],[1,1]], // ▼
        [[0,0],[0,1],[0,2],[1,1]], // ▶
    ],
    'J': [
        [[0,0],[0,1],[1,1],[2,1]], // ▲
        [[0,2],[1,0],[1,1],[1,2]], // ◀
        [[0,0],[1,0],[2,0],[2,1]], // ▼
        [[0,1],[0,0],[0,2],[1,0]], // ▶
    ],
    'L': [
        [[2,0],[0,1],[1,1],[2,1]], // ▲
        [[0,0],[1,0],[1,1],[1,2]], // ◀
        [[1,0],[0,0],[2,0],[0,1]], // ▼
        [[0,0],[0,1],[0,2],[1,2]], // ▶
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
type RotationData = {
    forms:FormData[]
}
type FormData = {
    blocks:{x: number, y: number}[],
    verticalParity: boolean
}
function convertRotationData(rotationData: number[][][]): RotationData {
    let forms: FormData[] = [];
    for (const rotation of rotationData) {
        let blocks: {x: number, y: number}[] = [];
        let verticalParity = 0;
        for (const [x, y] of rotation) {
            verticalParity += x;
            blocks.push({x, y});
        }
        forms.push({blocks, verticalParity: verticalParity % 2 === 1});
    }
    return { forms };
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

    // 地形のパリティを算出
    var checkerboardParity = 0;
    var verticalParity = 0;
    var tCount = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) {
                checkerboardParity += r + c;
                verticalParity += c;
            }
        }
    }
    // ミノのパリティを算出
    for (const [minoId, count] of minos.entries()) {
        if (minoId == 'T')
        {
            tCount += count;
            checkerboardParity += count;
        }
        else if (minoId == 'J' || minoId == 'L')
        {
            verticalParity += count;
        }
    }
    // 市松模様のパリティが合わない場合、解なし
    if (checkerboardParity % 2 !== 0) {
        console.log("市松模様のパリティにより除外されました");
        onFinished();
        return; // 解なし
    }
    // Tミノの数が0で、縦方向のパリティが合わない場合、解なし
    verticalParity %= 2;
    if (tCount == 0 && verticalParity !== 0) {
        console.log("Tミノの数が0で、縦方向のパリティが合わないため除外されました");
        onFinished();
        return; // 解なし
    }

    // Z3 Context, Solverの生成
    const contextName = String(Math.floor(Math.random() * 1e9));
    const context = z3.Context(contextName);
    const solver = new context.Solver();
    
    // 各ブロックの座標の変数を定義
    const blocks: {mino:{x: Arith<any>, y: Arith<any>}[]}[] = [];
    const minoKinds: MinoKind[] = [];
    const verticalParities = [];
    let index = -1;
    for (const [minoId, count] of minos.entries()) {
        let prevMinon = null;
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
                 // Tミノが1個だけで縦パリティが合わない場合はスキップ
                if (tCount == 1 && minoId == 'T' && form.verticalParity != (verticalParity === 1)) { continue; }
                let and = [];
                let verticalParityConst = null;
                if (tCount > 1 && minoId == 'T')
                {
                    verticalParityConst = context.Bool.const(`verticalParity_${index}`);
                }
                for (let i = 1; i < 4; i++)
                {
                    let dx = form.blocks[i].x - form.blocks[0].x;
                    let dy = form.blocks[i].y - form.blocks[0].y;
                    and.push(mino[i].x.eq(mino[0].x.add(dx)));
                    and.push(mino[i].y.eq(mino[0].y.add(dy)));
                    if (verticalParityConst != null)
                    {
                        and.push(verticalParityConst.eq(form.verticalParity));
                        verticalParities.push(verticalParityConst);
                    }
                }
                or.push(context.And(...and));
            }
            solver.add(context.Or(...or));
            blocks.push({ mino });

            // 対象性の排除
            if (prevMinon != null) {
                solver.add(
                    context.Or(
                        mino[0].x.gt(prevMinon[0].x),
                        context.And(
                            mino[0].x.eq(prevMinon[0].x),
                            mino[0].y.gt(prevMinon[0].y)
                        )
                    )
                );
            }
            // 前のミノの位置を保持
            prevMinon = mino;
        }
    }
    if (tCount >= 2)
    {
        let xor = context.Xor(verticalParities[0], verticalParities[1]);
        for (let i = 2; i < verticalParities.length; i++) {
            xor = context.Xor(xor, verticalParities[i]);
        }
        solver.add(xor.eq(verticalParity === 1).not());
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
            const bans = [];
            for (let r = 0; r < rows; r++) {
                solution[r] = [];
                for (let c = 0; c < cols; c++) {
                    solution[r][c] = -1;
                }
            }
            for (const [minoIndex, mino] of blocks.entries()) 
            {
                // 最初の2ブロックを見れば、残りが一致するかがわかる
                let maxBan = Math.min(2, rotationData2[minoKinds[minoIndex]].forms.length);
                for (const [i, block] of mino.mino.entries()) {
                    let x = parseInt(model.eval(block.x).toString(), 10);
                    let y = parseInt(model.eval(block.y).toString(), 10);
                    solution[y][x] = minoIndex;
                    if (i < maxBan)
                    {
                        // 冒頭のブロックを基準に禁止条件を追加
                        bans.push(block.x.eq(x).and(block.y.eq(y)).not());
                    }
                }
            }
            onSolved(minoKinds, solution);
            solver.add(context.Or(...bans)); // 次の解を探すため、禁止条件を追加
        }
        else
        {
            onFinished();
            return;
        }
    }
}
