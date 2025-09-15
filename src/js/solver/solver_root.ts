import { init, type Arith, type Bool, type Z3HighLevel, type Z3LowLevel } from 'z3-solver';
import { clearSolutions, addSolution } from '../solution';
import { startPacking_v1 } from './packing_ver_z3';
import { offset, type State } from '@popperjs/core';
import { tetroMinoKinds } from '../constants';
import { checkParity, getParity, parityMessage, restCheckParity, totalizeParity } from '../tool/parity';
import { stringifyPackingProblem } from '../tool/identifier';
import { extractSubField, splitField } from '../tool/split';
import { startPacking_dlx } from './packing_ver_dlx';

(window as any).global = window;
export let usingMarker:null|{} = null;

// 問題の事前処理や分割をおこなって、複数のソルバーに投げる
export async function launchPacking(grid: boolean[][], minoSources: {id: MinoKind, plus: number, minus: number}[]) {
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
    const subProblems:SubProblemContext[] = [];
    const solving:Set<StateKey> = new Set(); // 同じ問題を複数回解くのを防止
    const packingProblems = new Map<PackingProblemKey, PackingEntry>(); // パッキング問題の記録
    let threads = 0;

    await selectField("" as StateKey, minos, fields, fieldMinoLength);
    
    // 処理対象のフィールドを選択する
    async function selectField(
        stateKey: StateKey, 
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
        stateKey:StateKey, 
        minos: Map<MinoKind, { required: number, additional: number }>, 
        field: SubField, 
        fields: SubFieldNode[],
        wholeRestMino: number // 残りのフィールドすべてに配置するミノ数
    )
    {
        let result = new Map<MinoKind, number>();
        let subRestMino = field.blockCount / 4; // このサブフィールドに配置するミノ数
        let restParity = totalizeParity(fields);

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
            if (minoIndex >= tetroMinoKinds.length)
            {
                let restMinos = subtractMinos(minos, result);
                let restParityResult = restCheckParity(restMinos, restParity);
                if (restParityResult != 0)
                {
                    console.log("残りのパリティ違反", parityMessage[restParityResult]);
                    return;
                }

                // 全てのミノの数が決定した
                let subProblemNode:SubProblemContext = {
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
                };
                addSubProblem(subProblemNode);
                return;
            }

            let prevSubRestMino = subRestMino;
            let prevWholeRestMino = wholeRestMino;
            let prevRestRequiredMino = restRequiredMino;
            let required = minos.get(tetroMinoKinds[minoIndex])!.required;
            let additional = minos.get(tetroMinoKinds[minoIndex])!.additional;

            // ミノの数を決定する
            let max = required + additional;
            if (max > subRestMino) { max = subRestMino; }
            let i = 0;
            if (minoIndex == tetroMinoKinds.length - 1) { i = subRestMino; } // 最後のミノは必ず残りを全て使う

            for (; i <= max; i++)
            {
                // ミノ数を合わせる
                subRestMino      = prevSubRestMino - i;
                wholeRestMino    = prevWholeRestMino - i;
                restRequiredMino = prevRestRequiredMino - Math.min(i, required);

                // 残り必須ミノの数が配置可能なミノ数を超えたら終了
                if (restRequiredMino > wholeRestMino) 
                { 
                    break; 
                } 

                result.set(tetroMinoKinds[minoIndex], i);

                await dfs(minoIndex + 1);
                if (usingMarker != currentMarker) { return; }
            }

            // バックトラック時の戻し処理
            wholeRestMino = prevWholeRestMino;
            restRequiredMino = prevRestRequiredMino;
            subRestMino = prevSubRestMino;
        }
    }
    function addSubProblem(subProblemNode:SubProblemContext)
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
    function launchProblem(context:SubProblemContext, depth = 0)
    {
        if (usingMarker != currentMarker) { return; }
        let stateId = stringifyPackingProblem(context.problem);
        function solved(context:SubProblemContext, solution:PackingSolution):void
        {
            let stateKey = addSolution(
                wholeSize,
                context,
                solution
            );
            // 次の部分問題が存在する
            if (context.rest.subFields.length > 0)
            {
                selectField(
                    stateKey, 
                    context.rest.minos, 
                    context.rest.subFields, 
                    context.rest.fieldMinoLength
                );
            }
        }
        if (packingProblems.has(stateId))
        {
            // 既に同じ問題が解かれている場合は、解答済み分は使いまわす
            let problem = packingProblems.get(stateId)!;
            problem.contexts.push(context);
            for (const solution of problem.solutions) {
                solved(context, solution);
            }
            return;
        }

        // 新しいパッキング問題
        packingProblems.set(stateId, {
            contexts: [context],
            solutions: []
        });

        threads += 1;
        function onFinished()
        {
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
        // ミノのパリティを算出
        let tCount = 0;
        let ljCount = 0;
        let szCount = 0;
        let iCount = 0;
        let oCount = 0;
        for (const [minoId, count] of context.problem.minos.entries()) {
            if (minoId == 'T') {
                tCount += count;
            } else if (minoId == 'J' || minoId == 'L') {
                ljCount += count;
            } else if (minoId == 'I') {
                iCount += count;
            } else if (minoId == 'O') {
                oCount += count;
            } else if (minoId == 'S' || minoId == 'Z') {
                szCount += count;
            }
        }
        let parityResult = checkParity(
            iCount, 
            oCount,
            tCount,
            ljCount, 
            szCount, 
            context.problem.field.parity
        );
        if (parityResult != 0) {
            console.log(parityMessage[parityResult]);
            onFinished();
            return; // 解なし
        }
        console.log("部分問題を開始", context.problem);
        startPacking_dlx(
            currentMarker,
            context.problem,
            (solution) => {
                if (usingMarker != currentMarker) { return; }
                console.log("解が見つかりました", solution);

                let problem = packingProblems.get(stateId)!;
                problem.solutions.push(solution);

                // このパッキングの解が必要な部分問題すべてに解を伝える
                for (const packingContext of problem.contexts)
                {
                    solved(packingContext, solution);
                }
            },
            onFinished
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
    if (usingMarker != null) 
    {
        usingMarker = null;
        let messageDiv = document.getElementById('solve-message')!;
        messageDiv.textContent = '中断しました';

        let abortButton = document.getElementById('abort-button')!;
        abortButton.hidden = true;
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
            notRequiredMap.set(mino, 0);
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
    for (const minoId of tetroMinoKinds) {
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
    for (const minoId of tetroMinoKinds) {
        let usedCount = used.get(minoId) ?? 0;
        let required = minos.get(minoId)?.required ?? 0;
        let additional = minos.get(minoId)?.additional ?? 0;
        let newRequired = required - Math.min(usedCount, required);
        let newAdditional = additional - Math.max(0, usedCount - required);
        result.set(minoId, { required: newRequired, additional: newAdditional });
    }
    return result;
}
