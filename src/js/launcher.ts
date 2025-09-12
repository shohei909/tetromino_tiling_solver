import { init, type Arith, type Bool, type Z3HighLevel, type Z3LowLevel } from 'z3-solver';
import { renderSolutionCanvas } from './export';
import { startPacking_v1 } from './packing_v1';

(window as any).global = window;
let usingMarker:null|{} = null;

// Z3初期化
let z3:Z3HighLevel & Z3LowLevel;

// 問題の事前処理や分割をおこなって、複数のソルバーに投げる
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

    let rows = grid.length;
    let cols = grid[0]?.length || 0;

    // 配置対象マスの数を数える
    let checkerboardParity = 0;
    let verticalParity = 0;
    let blockCount = 0;
    let maxX = 0;
    let maxY = 0;
    let minX = cols - 1;
    let minY = rows - 1;
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (grid[y][x]) {
                blockCount++;
                checkerboardParity += (x + y) % 2;
                verticalParity += y % 2;
                if (x > maxX) maxX = x;
                if (x < minX) minX = x;
                if (y > maxY) maxY = y;
                if (y < minY) minY = y;
            }
        }
    }
    
    // 事前チェック
    errorDiv.hidden = true;
    errorDiv.textContent = '';
    let failed = false;
    if (blockCount === 0) {
        errorDiv.innerHTML += '<div>配置対象（灰色）マスが1つもありません</div>';
        failed = true;
    }
    if (blockCount % 4 !== 0) {
        errorDiv.innerHTML += '<div>配置対象（灰色）マスの数(' + blockCount + ')が4の倍数ではありません</div>';
        failed = true;
    }
    if (failed) { 
        messageDiv.textContent = "";
        errorDiv.hidden = false;
        return; 
    }
    
    // トリミング
    let newGrid: boolean[][] = [];
    for (let y = 0; y <= maxY - minY; y++) {
        let row: boolean[] = [];
        for (let x = 0; x <= maxX - minX; x++) {
            row.push(grid[y + minY][x + minX]);
        }
        newGrid.push(row);
    }
    grid = newGrid;
    rows = grid.length;
    cols = grid[0]?.length || 0;
    let symmetry90 = true;
    let symmetry180 = true;
    function getAt(x:number, y:number): boolean {
        if (x < 0 || x >= cols || y < 0 || y >= rows) { return false; }
        return grid[y][x];
    }
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (getAt(x, y) != getAt(cols - x - 1, rows - y - 1))
            {
                symmetry180 = false;
                symmetry90  = false;
            }
            if (getAt(x, y) != getAt(y, x))
            {
                symmetry90  = false;
            }
            if (getAt(y, x) != getAt(cols - x - 1, rows - y - 1))
            {
                symmetry90  = false;
            }
        }
    }
    console.log("対称性", symmetry90, symmetry180);

    messageDiv.textContent = '計算中...';
    let fieldMinoLength = blockCount / 4;
    let field:SubfieldData = {
        grid,
        checkerboardParity: checkerboardParity % 2 === 1,
        verticalParity: verticalParity % 2 === 1,
        symmetryLevel: symmetry90 ? 2 : symmetry180 ? 1 : 0,
    }

    let count = 0;
    let plus = minoSources.reduce((a,b) => a + b.plus, 0);
    let requiredMap: Map<MinoKind, number> = new Map();
    let notRequiredList: MinoKind[] = [];
    
    // 各ミノの情報を整理
    while (count <= fieldMinoLength)
    {
        for (const mino of notRequiredList) {
            requiredMap.set(mino, (requiredMap.get(mino) || 0) + 1);
        }
        notRequiredList.length = 0;
        console.log(count, fieldMinoLength);
        if (count === fieldMinoLength) { break; }
        
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
    let rest = fieldMinoLength - Array.from(requiredMap.values()).reduce((a,b) => a + b, 0);

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
            field,
            problem,
            (minoKinds, solution) => {
                if (usingMarker != currentMarker) { return; }
                console.log("解が見つかりました", solution);
                renderSolutionCanvas(field.grid, minoKinds, solution);
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
