import { init } from 'z3-solver';
(window as any).global = window;

export async function solvePacking(grid: boolean[][], minos: {id: string, min: number, max: number}[], resultDiv: HTMLElement) {
    resultDiv.textContent = '計算中...';
    // Z3初期化
    
    const z3 = await init();
    const context = z3.Context("main");
    const solver = new context.Solver();

    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const minoIds = ['I','O','T','S','Z','J','L'];
    const minoVars: {[mino: string]: any[][]} = {};

    // 各マスについて「そのマスに各ミノが収まっているか」のBool値を定義
    for (const mino of minoIds) {
        minoVars[mino] = [];
        for (let r = 0; r < rows; r++) {
            minoVars[mino][r] = [];
            for (let c = 0; c < cols; c++) {
                minoVars[mino][r][c] = context.Bool.const(`mino_${mino}_${r}_${c}`);
                // ここで minoVars[mino][r][c] を使って制約を追加可能
            }
        }
    }

    // 黒マス/白マスのbool値をZ3変数として定義
    const cellVars: any[][] = [];
    for (let r = 0; r < rows; r++) {
        cellVars[r] = [];
        for (let c = 0; c < cols; c++) {
            // Z3のBool変数として定義
            cellVars[r][c] = context.Bool.const(`cell_${r}_${c}`);
            // 黒マス(true)なら cellVars[r][c] == true、白マス(false)なら cellVars[r][c] == false
            solver.add(cellVars[r][c].eq(grid[r][c]));

            // 白マス: 7種類のミノのうち1つだけが収まる
            if (!grid[r][c]) {
                // minoVars[mino][r][c] のうち1つだけtrue
                const minoBools = minoIds.map(mino => minoVars[mino][r][c]) as [any, ...any[]];
                const numbers = Array(7).fill(1) as [number, ...number[]];
                solver.add(context.PbEq(minoBools, numbers, 1));
            } else {
                // 黒マス: 7種類のミノがどれも収まらない
                for (const mino of minoIds) {
                    solver.add(minoVars[mino][r][c].not());
                }
            }
        }
    }

    // 各ミノのマス数がminからmaxの4の倍数の範囲に収まる制約
    for (const mino of minoIds) {
        // minoVars[mino][r][c] の合計
        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                cells.push(minoVars[mino][r][c]);
            }
        }
        // min/max値を4の倍数に丸める
        const minObj = minos.find(m => m.id === mino);
        const minCount = Math.floor(minObj?.min ?? 0) * 4;
        const maxCount = Math.floor(minObj?.max ?? 0) * 4;
        
        // minCount <= 合計 <= maxCount
        const numbers = Array(cells.length).fill(1) as [number, ...number[]];
        solver.add(context.PbGe(cells as [any, ...any[]], numbers, minCount));
        solver.add(context.PbLe(cells as [any, ...any[]], numbers, maxCount));
    }
    
    const sat = await solver.check();
    if (sat === 'sat') {
        //const model = solver.model();
        // ここで model から解を取得して resultDiv に表示
        resultDiv.textContent = '解が見つかりました（ダミー）';
    } else {
        resultDiv.textContent = '解なし';
    }
}
