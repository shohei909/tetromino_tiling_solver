import { init, type Arith, type Bool, type Z3HighLevel, type Z3LowLevel } from 'z3-solver';
import { renderSolutionCanvas } from './export';
import { startPacking_v0 } from './packing_v0';
import { startPacking_v1 } from './packing_v1';

(window as any).global = window;
let usingMarker:null|{} = null;

// Z3初期化
let z3:Z3HighLevel & Z3LowLevel;

// 問題を分割して、複数のソルバーに投げる
export async function launchPacking(grid: boolean[][], minoSources: {id: MinoKind, plus: number, minus: number}[]) {
    if (z3 == null) { z3 = await init(); }
    z3.em.PThread.terminateAllThreads();; // PThreadにアクセス可能か確認
    
    // 処理の中断用マーカー
    let currentMarker = {}
    usingMarker = currentMarker;

    let messageDiv = document.getElementById('solve-message')!;
    messageDiv.textContent = "";
    let errorDiv  = document.getElementById('solve-error')!;
    errorDiv.hidden = true;
    errorDiv.textContent = '';
    let resultDiv  = document.getElementById('solve-result')!;
    resultDiv.textContent = '';

    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    // 配置対象マスの数を数える
    let emptyCount = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                emptyCount++;
            }
        }
    }

    // 事前チェック
    errorDiv.hidden = true;
    errorDiv.textContent = '';
    let failed = false;
    if (emptyCount % 4 !== 0) {
        errorDiv.innerHTML += '<div>配置対象（灰色）マスの数(' + emptyCount + ')が4の倍数ではありません</div>';
        failed = true;
    }
    if (failed) { 
        messageDiv.textContent = "";
        errorDiv.hidden = false;
        return; 
    }
    messageDiv.textContent = '計算中...';

    let emptySize = emptyCount / 4;
    let count = 0;
    let plus = minoSources.reduce((a,b) => a + b.plus, 0);
    let requiredMap: Map<MinoKind, number> = new Map();
    let notRequiredList: MinoKind[] = [];
    
    // 各ミノの情報を整理
    while (count <= emptySize)
    {
        for (const mino of notRequiredList) {
            requiredMap.set(mino, (requiredMap.get(mino) || 0) + 1);
        }
        notRequiredList.length = 0;
        if (count === emptySize) { break; }
        
        // 余剰ミノの消費
        if (plus > 0)
        {
            for (const mino of minoSources) {
                if (mino.plus > 0) {
                    notRequiredList.push(mino.id);
                    mino.plus--;
                    plus--;
                    count++;
                }
            }
        }
        else
        {
            for (const mino of minoSources) {
                if (mino.minus > 0) {
                    mino.minus--;
                }
                else {
                    notRequiredList.push(mino.id);
                    count++;
                }
            }
        }
    }

    // 問題の分割
    if (currentMarker != usingMarker) { return; }
    let problems:Map<MinoKind, number>[] = [];
    let rest = emptySize - Array.from(requiredMap.values()).reduce((a,b) => a + b, 0);

    // rest個のnotRequiredListからの組み合わせを全列挙
    for (const combo of combinations(notRequiredList, rest)) {
        let problem = new Map(requiredMap);
        for (const mino of combo) {
            problem.set(mino, (problem.get(mino) || 0) + 1);
        }
        problems.push(problem);    
    }
    function* combinations(arr: MinoKind[], k: number): Generator<MinoKind[]> {
        const n = arr.length;
        if (k === 0) {
            yield [];
            return;
        }
        if (k > n) return;
        for (let i = 0; i < n; i++) {
            for (const tail of combinations(arr.slice(i + 1), k - 1)) {
                yield [arr[i], ...tail];
            }
        }
    }

    // 中断ボタンを表示
    let abortButton = document.getElementById('abort-button')!;
    abortButton.hidden = false;

    // 最大8並列で問題を解く
    let threads = 0;
    for (let i = 0; i < 8; i++)
    {
        launchSolver();
    }
    function launchSolver()
    {
        if (problems.length === 0) { return; }
        if (usingMarker != currentMarker) { return; }
        threads += 1;
        let problem = problems.pop()!
        startPacking_v1(
            z3, 
            grid,
            problem,
            (minoKinds, solution) => {
                if (usingMarker != currentMarker) { return; }
                console.log("解が見つかりました", solution);
                renderSolutionCanvas(grid, minoKinds, solution);
            },
            () => {
                if (usingMarker != currentMarker) { return; }
                console.log("スレッドが完了", problem);
                // 完了したら次の問題を解く
                launchSolver();
                threads -= 1;
            }
        );
    }

    // 無限に待つ
    let counter = 0;
    let time = window.performance.now();
    while (threads > 0)
    {
        await new Promise<void>(resolve => {setTimeout(resolve, 100);});
        if (usingMarker != currentMarker) { return; }
        const elapsed = ((window.performance.now() - time) / 1000).toFixed(2); // 0.1秒単位
        messageDiv.innerHTML = '計算中' + '.'.repeat(Math.floor(counter / 5) % 4) + "<br/>" + elapsed + '秒';
        counter++;
    }
    messageDiv.textContent = '完了しました(' + ((window.performance.now() - time) / 1000).toFixed(2) + '秒)';
    usingMarker = null;
    abortButton.hidden = true;
}

export function abortPacking()
{
    if (z3) { z3.em.PThread.terminateAllThreads(); }
    if (usingMarker != null) 
    {
        usingMarker = null;
        let messageDiv = document.getElementById('solve-message')!;
        messageDiv.textContent = '中断しました';

        let abortButton = document.getElementById('abort-button')!;
        abortButton.hidden = true;
    }
}
