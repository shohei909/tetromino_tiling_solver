import { init, type Arith, type Bool, type Z3HighLevel, type Z3LowLevel } from 'z3-solver';
import { clearSolutions, addSolution } from './export';
import { startPacking_v1 } from './packing_v1';
import { offset } from '@popperjs/core';
import { minoKinds } from './constants';

(window as any).global = window;
let usingMarker:null|{} = null;

// Z3初期化
let z3:Z3HighLevel & Z3LowLevel;

// 問題の事前処理や分割をおこなって、複数のソルバーに投げる
export async function launchPacking(grid: boolean[][], minoSources: {id: MinoKind, plus: number, minus: number}[]) {
    if (z3 == null) { z3 = await init(); }
    z3.em.PThread.terminateAllThreads(); // PThreadにアクセス可能か確認
    
    // 処理の中断用マーカー
    let currentMarker = {}
    usingMarker = currentMarker;
    clearSolutions();

    let messageDiv = document.getElementById('solve-message')!;
    messageDiv.textContent = '計算中...';
    let errorDiv  = document.getElementById('solve-error')!;
    errorDiv.hidden = true;
    errorDiv.textContent = '';

    // 配置対象マスの数を数える
    let info = extractSubField(0, 0, grid, v => v);
    
    // 事前チェック
    errorDiv.hidden = true;
    errorDiv.textContent = '';
    let failed = false;
    if (info.blockCount === 0) {
        errorDiv.innerHTML += '<div>配置対象（灰色）マスが1つもありません</div>';
        failed = true;
    }
    if (info.blockCount % 4 !== 0) {
        errorDiv.innerHTML += '<div>配置対象（灰色）マスの数(' + info.blockCount + ')が4の倍数ではありません</div>';
        failed = true;
    }
    if (failed) { 
        messageDiv.textContent = "";
        errorDiv.hidden = false;
        return; 
    }

    let fieldMinoLength = info.blockCount / 4;
    let wholeSize = { rows: grid.length, cols: grid[0]?.length || 0 };
    let fields = splitField(0, 0, info);
    let minos = countMino(minoSources, fieldMinoLength);

    // 中断ボタンを表示
    let abortButton = document.getElementById('abort-button')!;
    abortButton.hidden = false;
    const subProblems:SubProblemNode[] = [];
    const solving:Set<string> = new Set(); // 同じ問題を複数回解くのを防止
    let threads = 0;

    await selectField("", minos, fields, fieldMinoLength);
    
    // 処理対象のフィールドを選択する
    async function selectField(
        stateKey: string, 
        minos: Map<MinoKind, { required: number, additional: number }>, 
        fields: SubFieldNode[],
        fieldMinoLength: number
    )
    {
        if (solving.has(stateKey)) { 
            console.log("同じ部分問題が検出されたので、スキップ");
            return; 
        } // 同じ問題を複数回解くのを防止
        solving.add(stateKey);

        let first = fields[0];
        let rest = fields.slice(1);
        if (first.type == 'field')
        {
            await selectMinos(stateKey, minos, first, rest, fieldMinoLength);
        }
        else
        {
            for (const subFields of first.fields) {
                await selectField(stateKey, minos, subFields.concat(rest), fieldMinoLength);
            }
        }
    }
    // 処理対象のミノを選択をする
    async function selectMinos(
        stateKey:string, 
        minos: Map<MinoKind, { required: number, additional: number }>, 
        field: SubField, 
        fields: SubFieldNode[],
        wholeRestMino: number // 残りのフィールドすべてに配置するミノ数
    )
    {
        let result = new Map<MinoKind, number>();
        let subRestMino = field.blockCount / 4; // このサブフィールドに配置するミノ数

        // 残りの必須ミノ数
        let restRequiredMino = 0;
        for (const [_, count] of minos) { restRequiredMino += count.required; }
        let repeat = 0;
        await dfs(0);
        async function dfs(minoIndex:number)
        {
            if (++repeat % 100000 === 0)
            {
                // フリーズ防止
                await new Promise<void>(resolve => {setTimeout(resolve, 1);});
                if (usingMarker != currentMarker) { return; }
            }
            if (minoIndex >= minoKinds.length)
            {
                let restMinos = subtractMinos(minos, result);

                // 全てのミノの数が決定した
                let subProblemNode:SubProblemNode = {
                    stateKey,
                    problem: {
                        minos: new Map(result),
                        field
                    },
                    rest: {
                        minos: restMinos,
                        subFields: fields,
                        wholeSize,
                        fieldMinoLength:wholeRestMino,
                    }
                }
                addSubProblem(subProblemNode);
                return;
            }

            let prevSubRestMino = subRestMino;
            let prevWholeRestMino = wholeRestMino;
            let prevRestRequiredMino = restRequiredMino;
            let required = minos.get(minoKinds[minoIndex])!.required;
            let additional = minos.get(minoKinds[minoIndex])!.additional;

            // ミノの数を決定する
            let max = required + additional;
            if (max > wholeRestMino) { max = subRestMino; }
            let i = 0;
            if (minoIndex == minoKinds.length - 1) { i = subRestMino; } // 最後のミノは必ず残りを全て使う

            for (; i <= max; i++)
            {
                // ミノ数を合わせる
                subRestMino      = prevSubRestMino - i;
                wholeRestMino    = prevWholeRestMino - i;
                restRequiredMino = prevRestRequiredMino - Math.max(i, required);

                if (restRequiredMino > wholeRestMino) { break; } // 残り必須ミノの数が配置可能なミノ数を超えた

                result.set(minoKinds[minoIndex], i);

                await dfs(minoIndex + 1);
                if (usingMarker != currentMarker) { return; }
            }

            // バックトラック時の戻し処理
            wholeRestMino = prevWholeRestMino;
            restRequiredMino = prevRestRequiredMino;
            subRestMino = prevSubRestMino;
        }
    }
    function addSubProblem(subProblemNode:SubProblemNode)
    {
        if (usingMarker != currentMarker) { return; }
        if (threads >= 8) 
        { 
            subProblems.push(subProblemNode); // スレッド数が上限に達している場合は待機
        }
        else
        {
            launchProblem(subProblemNode);
        }
    }
    function launchProblem(subProblemNode:SubProblemNode, depth = 0)
    {
        if (usingMarker != currentMarker) { return; }
        threads += 1;
        console.log("部分問題を開始", subProblemNode.problem);
        startPacking_v1(
            z3,
            subProblemNode.problem,
            (minoKinds, solution) => {
                if (usingMarker != currentMarker) { return; }
                console.log("解が見つかりました", solution);
                let stateKey = addSolution(
                    subProblemNode, 
                    minoKinds, 
                    solution
                );
                // 次の部分問題が存在する
                if (subProblemNode.rest.subFields.length > 0)
                {
                    selectField(
                        stateKey, 
                        subProblemNode.rest.minos, 
                        subProblemNode.rest.subFields, 
                        subProblemNode.rest.fieldMinoLength
                    );
                }
            },
            () => {
                if (usingMarker != currentMarker) { return; }
                if (
                    depth < 10 && 
                    subProblems.length > 0
                ) // スタックが深くなりすぎるのを防止
                {
                    launchProblem(subProblems.pop()!, depth + 1);
                }
                threads -= 1;
            }
        );
    }

    if (usingMarker != currentMarker) { return; }

    let counter = 0;
    let time = window.performance.now();
    // 無限に待つ
    while (threads > 0 || subProblems.length > 0)
    {
        await new Promise<void>(resolve => {setTimeout(resolve, 10);});
        if (usingMarker != currentMarker) { return; }
        while (subProblems.length > 0 && threads < 8)
        {
            launchProblem(subProblems.pop()!);
        }
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

// 領域を分割する
function splitField(offsetX:number, offsetY:number, field: SubField): SubFieldNode[]
{
    let grid = field.grid;
    let rows = grid.length;
    let cols = grid[0]?.length || 0;
    let groups: number[][] = [];
    for (let y = 0; y < rows; y++) {
        groups.push([]);
        for (let x = 0; x < cols; x++) {
            if (grid[y][x]) {
                groups[y][x] = 0;
            }
            else {
                groups[y][x] = -1;
            }
        }
    }
    let currentId = 1;
    function fill(x:number = 0, y:number = 0)
    {
        if (x < 0 || x >= cols || y < 0 || y >= rows || groups[y][x] != 0) { return; }
        groups[y][x] = currentId;
        fill(x + 1, y);
        fill(x - 1, y);
        fill(x, y + 1);
        fill(x, y - 1); 
    }
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (groups[y][x] === 0) {
                fill(x, y);
                currentId += 1;
            }
        }
    }
    let results: SubFieldNode[] = [];
    for (let id = 1; id < currentId; id++)
    {
        results.push(extractSubField(offsetX, offsetY, groups, (value) => value === id));
    }
    // TODO: 領域が小さい順にソートする
    // TODO: 関節点による分割を行う
    return results;
}

function extractSubField<T>(
    offsetX: number,
    offsetY: number,
    grid: T[][],
    func: (value: T) => boolean
): SubField
{
    let rows = grid.length;
    let cols = grid[0]?.length || 0;
    let checkerboardParity = 0;
    let verticalParity = 0;
    let horizontalParity = 0;
    let blockCount = 0;
    let maxX = 0;
    let maxY = 0;
    let minX = cols - 1;
    let minY = rows - 1;
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (func(grid[y][x])) {
                blockCount++;
                checkerboardParity += ((x + y) % 2) ? 1 : -1;
                verticalParity     += (y % 2) ? 1 : -1;
                horizontalParity   += (x % 2) ? 1 : -1;
                if (x > maxX) maxX = x;
                if (x < minX) minX = x;
                if (y > maxY) maxY = y;
                if (y < minY) minY = y;
            }
        }
    }
    let newGrid = grid.slice(minY, maxY + 1).map(r => r.slice(minX, maxX + 1).map(func));
    rows = newGrid.length;
    cols = newGrid[0]?.length || 0;
    let symmetry90 = true;
    let symmetry180 = true;
    function getAt(x:number, y:number): boolean {
        if (x < 0 || x >= cols || y < 0 || y >= rows) { return false; }
        return newGrid[y][x];
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
    return {
        type: 'field',
        offset: { x: offsetX + minX, y: offsetY + minY },
        grid: newGrid,
        blockCount,
        checkerboardParity: Math.abs(checkerboardParity / 2),
        verticalParity: Math.abs(verticalParity / 2),
        horizontalParity: Math.abs(horizontalParity / 2),
        symmetryLevel: symmetry90 ? 2 : symmetry180 ? 1 : 0,
    }
}

function countMino(
    minoSources: {id: MinoKind, plus: number, minus: number}[], 
    fieldMinoLength: number
): Map<MinoKind, {required:number, additional:number}>
{
    let count = 0;
    let plus = minoSources.reduce((a,b) => a + b.plus, 0);
    let requiredMap: Map<MinoKind, number> = new Map();
    let notRequiredMap: Map<MinoKind, number> = new Map();
    
    // 各ミノの情報を整理
    while (count <= fieldMinoLength)
    {
        for (const [mino, count] of notRequiredMap) {
            requiredMap.set(mino, (requiredMap.get(mino) || 0) + count);
        }
        if (count === fieldMinoLength) { break; }
        
        // 余剰ミノの消費
        if (plus > 0)
        {
            for (const mino of minoSources) {
                if (mino.plus > 0) {
                    notRequiredMap.set(mino.id, (notRequiredMap.get(mino.id) || 0) + 1);
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
                    notRequiredMap.set(mino.id, (notRequiredMap.get(mino.id) || 0) + 1);
                    count++;
                }
            }
        }
    }
    let result: Map<MinoKind, {required:number, additional:number}> = new Map();
    for (const minoId of minoKinds) {
        result.set(
            minoId, 
            { 
                required: requiredMap.get(minoId) || 0, 
                additional: notRequiredMap.get(minoId) || 0, 
            }
        );
    }
    return result;
}

function subtractMinos(minos: Map<MinoKind, {required:number, additional:number}>, used: Map<MinoKind, number>): Map<MinoKind, {required:number, additional:number}>
{
    let result: Map<MinoKind, {required:number, additional:number}> = new Map();
    for (const minoId of minoKinds) {
        let usedCount = used.get(minoId) ?? 0;
        let required = minos.get(minoId)?.required ?? 0;
        let additional = minos.get(minoId)?.additional ?? 0;
        let newRequired = required - Math.min(usedCount, required);
        let newAdditional = additional - Math.max(0, usedCount - required);
        result.set(minoId, { required: newRequired, additional: newAdditional });
    }
    return result;
}
