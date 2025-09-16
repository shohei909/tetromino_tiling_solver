import { stringifyField, stringifyMinoKinds, stringifyPackingProblem as stringifyPackingProblem, stringifyPackingSolution, stringifyStateIdentifier } from "./tool/identifier";

// ミノとフィールドから
interface PackingProblemData
{
    problem: PackingProblem,
    solutions: Set<PackingSolutionKey>,
    mainSolutions: Set<MainSolutionKey>, // この部分問題を使用している全体の解
}
interface SubSolutionData
{
    offset             :{ x: number, y: number },
    prevStateKey       : StateKey; // この問題に遷移する直前の状態のキー
    packingProblemKey  : PackingProblemKey; // この部分のパッキング問題
}
// 同じ状態に遷移する部分解のグループ
interface SubSolutionGroup
{
    stateIdentifier: StateIdentifier; // この問題の解いた直後の状態
    subSolutions   : SubSolutionData[];
    nextSolutions  : Set<StateIdentifier>; // この部分問題を使用しているより大きな解
}
// 全体の解の情報
interface MainSolutionData
{
    packings: PackingProblemReference[], // この解を構成する部分問題のキー文字列の配列
    minoKinds: MinoKind[], // この解で使用しているミノの種類
    locked: boolean, // 解が多すぎて省略されている場合は true
}
type PackingProblemReference = {
    offset:{ x: number, y: number }, 
    packingProblemKey: PackingProblemKey
}
let packingProblems :Map<PackingProblemKey , PackingProblemData> = new Map();
let packingSolutions:Map<PackingSolutionKey, PackingSolution>    = new Map();
let subSolutions    :Map<StateKey          , SubSolutionGroup>   = new Map();
let mainSolutions   :Map<MainSolutionKey   , MainSolutionData>   = new Map();

export function clearSolutions() {
    packingProblems .clear();
    packingSolutions.clear();
    subSolutions    .clear();
    mainSolutions   .clear();
    
    let resultDiv  = document.getElementById('solve-result')!;
    resultDiv.innerHTML = '';
}

// 結果 Canvas の生成・描画処理
export function addSolution(wholeSize:{rows:number, cols:number}, problem: SubProblemContext, solution: PackingSolution):StateKey
{
    let isLast = problem.rest.subFields.length == 0;
    let isDivided = !isLast || problem.stateKey != "";
    let packingProblemKey = addPackingProblem(wholeSize,problem.problem, solution, isDivided);
    let stateKey = addSubSolution(problem, solution, packingProblemKey);
    if (isLast)
    {
        addMainSolution(wholeSize, problem, packingProblemKey);
    }
    return stateKey;
}
export function addMainSolution(
    wholeSize:{rows:number, cols:number}, 
    problem: SubProblemContext, 
    packingProblemKey: PackingProblemKey
):void
{
    console.log(`Found a solution! stateKey=${problem.stateKey}, offset=(${problem.problem.field.offset.x},${problem.problem.field.offset.y}), packingProblemKey=${packingProblemKey}`);
    function getPackingsList(stateKey: StateKey, offset: { x: number, y: number }, packingProblemKey: PackingProblemKey): PackingProblemReference[][]
    {
        let prevState = subSolutions.get(stateKey);
        if (prevState == null) {
            return [[{ offset, packingProblemKey }]];
        }
        let results: PackingProblemReference[][] = [];
        for (const subSolution of prevState?.subSolutions) 
        {
            for (const list of getPackingsList(subSolution.prevStateKey, subSolution.offset, subSolution.packingProblemKey))
            {
                results.push(list.concat([{ offset, packingProblemKey }]));
            }
        }
        return results;
    }
    // 新たに見つかった全体解をすべて登録
    for (const packings of getPackingsList(problem.stateKey, problem.problem.field.offset, packingProblemKey))
    {
        let key = packings.map(packing => `${packing.packingProblemKey}`).join('_') as MainSolutionKey; // 連結した文字列をキーにする
        let minoKinds:MinoKind[] = [];
        for (const packing of packings)
        {
            let packingProblem = packingProblems.get(packing.packingProblemKey)!;
            packingProblem.mainSolutions.add(key);
            let firstPacking = packingProblem?.solutions?.values()?.next()?.value;
            if (!firstPacking) continue;
            let solution = packingSolutions.get(firstPacking);
            if (!solution) continue;
            for (const minoKind of solution.minoKinds) {
                minoKinds.push(minoKind);
            }
        }
        let exists = mainSolutions.has(key);
        if (!exists)
        {
            mainSolutions.set(key, { packings, minoKinds, locked: false });
            let mainDiv = document.getElementById('solve-main-result');
            if (mainDiv == null) {
                let resultDiv  = document.getElementById('solve-result')!;
                mainDiv = document.createElement('div');
                mainDiv.id = 'solve-main-result';
                mainDiv.innerHTML = `<h2>結果</h2>`;
                resultDiv.prepend(mainDiv);
            }
            let minoGroupKey = stringifyMinoKinds(minoKinds);
            let minoGroupDiv = document.getElementById('solve-mino-' + minoGroupKey);
            if (minoGroupDiv == null) 
            {
                minoGroupDiv = document.createElement('div');
                minoGroupDiv.id = 'solve-mino-' + minoGroupKey;
                let images = '';
                for (const minoKind of minoKinds) {
                    images += `<img src="img/${minoKind}.png" alt="${minoKind}" class="mino-icon">`;
                }
                minoGroupDiv.innerHTML = `<div>${images}</div><div></div>`;
                mainDiv.appendChild(minoGroupDiv);
            }
            let id = 'mainfield-outer-' + key;
            let fieldElement = document.getElementById(id);
            if (fieldElement == null)
            {
                fieldElement = document.createElement('div');
                fieldElement.id = id;
                fieldElement.className = "row g-2 mb-3";
                mainDiv.appendChild(fieldElement);
                
                if (packings.length > 1)
                {
                    for (const packing of packings)
                    {
                        let packingProblemKey = packing.packingProblemKey;
                        let div = appendPackingDiv(fieldElement, packingProblemKey);
                        for (const solutionKey of packingProblems.get(packingProblemKey)!.solutions)
                        {
                            let solution = packingSolutions.get(solutionKey)!;
                            appendPackingSolutionCanvas(div, solution);
                        }
                        let mark = document.createElement('div');
                        mark.className = 'col-auto d-flex align-items-center';
                        if (packing == packings[packings.length - 1]) 
                        {
                            mark.innerHTML = '=>';
                        }
                        else
                        {
                            mark.innerHTML = '+';
                        }
                        fieldElement.appendChild(mark);
                    }
                }

                let innerId = 'mainfield-' + key;
                let innerElement = document.createElement('div');
                innerElement.id = innerId;
                innerElement.className = "row g-2 mb-3 col-auto d-flex align-items-center";
                fieldElement.appendChild(innerElement);
            }
        }
        refreshMainSolution(wholeSize, key);
    }
}

function refreshMainSolution(wholeSize:{cols: number, rows: number}, key: MainSolutionKey):void
{   
    let id = 'mainfield-' + key;
    let fieldElement = document.getElementById(id)!;
    fieldElement.innerHTML = '';
    let cols = wholeSize.cols;
    let rows = wholeSize.rows;
    let cellSize = 15;

    let mainSolution = mainSolutions.get(key)!; 
    if (mainSolution.locked) { return; } // すでに多すぎて省略されている場合は処理しない
    let packings = mainSolution.packings;
    let solutionTable:PackingSolutionKey[][] = [];
    for (let packing of packings)
    {
        let problems = packingProblems.get(packing.packingProblemKey)!;
        solutionTable.push(Array.from(problems.solutions));
    }

    let solutions:PackingSolutionKey[] = [];
    function addSolution()
    {
        let mergedSolution = Array.from({ length: rows }, () => Array(cols).fill(-1));
        let num = 0;
        let minoKinds = [];
        for (const [i, solutionKey] of solutions.entries())
        {
            let solution = packingSolutions.get(solutionKey)!;
            let packing = packings[i];
            for (let r = 0; r < solution.solution.length; r++) {
                for (let c = 0; c < solution.solution[r].length; c++) {
                    if (solution.solution[r][c] != -1) {
                        mergedSolution[r + packing.offset.y][c + packing.offset.x] = solution.solution[r][c] + num;
                    }
                }
            }
            num += solution.minoKinds.length;
            minoKinds.push(...solution.minoKinds);
        }

        const canvas = document.createElement('canvas');
        canvas.width = cols * cellSize + 1;
        canvas.height = rows * cellSize + 1;
        fieldElement.appendChild(canvas);
        canvas.className = "result-canvas col-auto";
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                ctx.fillStyle = 'rgba(253, 253, 253, 1)';
                ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
                ctx.strokeStyle = '#b7b7b7ff';
                ctx.strokeRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
                
                const minoIndex = mergedSolution[r][c];
                ctx.fillStyle = getMinoColor(minoIndex == -1 || isNaN(minoIndex) ? "#474747" : minoKinds[minoIndex]);
                ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 1, cellSize - 1);
            }
        }
    }
    let stack = [-1];
    let count = 0;
    while (true)
    {
        if (stack.length == 0) break;
        if (solutions.length == packings.length)
        {
            count++;

            // 多すぎて表示できない場合は省略
            if (count > 100)
            {
                const div = document.createElement('div');
                div.className = "col-auto d-flex align-items-center";
                div.textContent = "…など";
                fieldElement.appendChild(div);
                mainSolution.locked = true;
                break;
            }

            // 解を追加した後、戻る
            addSolution();
            stack.pop();
            solutions.pop();
            continue;
        }
        
        let depth = stack.length - 1;
        let index = stack[depth] += 1;
        if (index < solutionTable[depth].length)
        {
            solutions.push(solutionTable[depth][index]);
            stack.push(-1);
        }
        else
        {
            solutions.pop();
            stack.pop();
        }
    }
}
export function addSubSolution(problem: SubProblemContext, solution: PackingSolution, packingProblemKey:PackingProblemKey):StateKey
{
    let prevStateKey    = problem.stateKey;
    let prevState       = subSolutions.get(prevStateKey);
    let stateIdentifier = resolveStateIdentifier(prevState?.stateIdentifier, problem);
    let stateKey = stringifyStateIdentifier(stateIdentifier);
    if (!subSolutions.has(stateKey))
    {
        subSolutions.set(stateKey, {
            stateIdentifier: stateIdentifier,
            subSolutions: [],
            nextSolutions: new Set<StateIdentifier>(),
        });
    }
    subSolutions.get(stateKey)!.subSolutions.push({
        prevStateKey,
        offset: problem.problem.field.offset,
        packingProblemKey,
    });

    // この解の直前の部分解にも、この解で使用していることを記録
    if (prevState) {
        prevState.nextSolutions.add(stateIdentifier);
    }
    return stateKey;
}

function addPackingProblem(wholeSize:{rows:number, cols:number}, problem: PackingProblem, solution: PackingSolution, isDivided:boolean):PackingProblemKey
{
    let fieldKey = stringifyField(problem.field.grid);
    let packingSolutionKey = stringifyPackingSolution(solution);
    packingSolutions.set(packingSolutionKey, solution);
    
    let packingProblemKey = stringifyPackingProblem(problem);
    if (!packingProblems.has(packingProblemKey))
    {
        packingProblems.set(packingProblemKey, {
            problem,
            solutions: new Set<PackingSolutionKey>(),
            mainSolutions: new Set<MainSolutionKey>(),
        });
    }
    let solutionKey = stringifyPackingSolution(solution);
    let packingProblem = packingProblems.get(packingProblemKey)!;
    let solutions = packingProblem.solutions;
    if (solutions.has(solutionKey))
    {
        // すでに登録済み
        return packingProblemKey;
    }

    solutions.add(solutionKey);

    if (isDivided) {
        let packingDiv = document.getElementById('solve-packing-result');
        if (packingDiv == null) {
            let resultDiv  = document.getElementById('solve-result')!;
            packingDiv = document.createElement('div');
            packingDiv.id = 'solve-packing-result';
            packingDiv.innerHTML = `<h3>途中経過</h3>`;
            resultDiv.appendChild(packingDiv);
        }
        let id = 'subfield-' + fieldKey;
        let fieldElement = document.getElementById(id);
        if (fieldElement == null) 
        {
            fieldElement = document.createElement('div');
            fieldElement.id = id;
            fieldElement.className = "row g-2 mb-3";
            packingDiv?.appendChild(fieldElement);
        }
        let className = 'packing-' + packingProblemKey;
        let elements = fieldElement.getElementsByClassName(className);
        if (elements == null || elements.length == 0) 
        {
            appendPackingDiv(fieldElement, packingProblemKey);
        }
        for (let div of document.getElementsByClassName(className)) {
            appendPackingSolutionCanvas(div, solution);
        }
        for (let mainSolutionKey of packingProblem.mainSolutions)
        {
            refreshMainSolution(wholeSize, mainSolutionKey);
        }
    }
    return packingProblemKey;
}
function appendPackingDiv(parent:HTMLElement, packingProblemKey:string):HTMLElement
{
    let element = document.createElement('div');
    element.className = 'packing-' + packingProblemKey + " packing col-auto d-flex align-items-center";
    parent.appendChild(element);
    return element;
}
function appendPackingSolutionCanvas(parent:Element, solution:PackingSolution):void
{
    const rows = solution.solution.length;
    const cols = solution.solution[0]?.length || 0;
    const cellSize = 10;
    const canvas = document.createElement('canvas');
    canvas.width  = cols * cellSize + 1;
    canvas.height = rows * cellSize + 1;
    parent.appendChild(canvas);
    canvas.className = "result-canvas col-auto";
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillStyle = 'rgba(253, 253, 253, 1)';
            ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
            ctx.strokeStyle = '#b7b7b7ff';
            ctx.strokeRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
            
            const minoIndex = solution.solution[r][c];
            ctx.fillStyle = getMinoColor(minoIndex == -1 || isNaN(minoIndex) ? "#474747" : solution.minoKinds[minoIndex]);
            ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 1, cellSize - 1);
        }
    }
}

function getMinoColor(minoId: string): string {
    switch (minoId) {
        case 'I': return "#00BCD4";
        case 'O': return "#ffe53b";
        case 'T': return "#9C27B0";
        case 'S': return "#27c52c";
        case 'Z': return "#F44336";
        case 'J': return "#3F51B5";
        case 'L': return "#ff9100";
        default: return '#e9e9e9ff';
    }
}

// キー文字列生成用の状態を作成
function resolveStateIdentifier(prevState:StateIdentifier | undefined, problem: SubProblemContext):StateIdentifier
{   
    let consumedMinos = new Map<MinoKind, number>(problem.problem.minos);
    let filledField;
    if (prevState) 
    {
        for (const [mino, count] of prevState.consumedMinos) {
            consumedMinos.set(mino, (consumedMinos.get(mino) || 0) + count);
        }
        filledField = prevState.filledField.map(row => row.slice());
    }
    else
    {
        filledField = [];
        for (let r = 0; r < problem.rest.wholeSize.rows; r++) {
            filledField.push(Array(problem.rest.wholeSize.cols).fill(false));
        }
        for (let r = 0; r < problem.problem.field.grid.length; r++) {
            for (let c = 0; c < problem.problem.field.grid[r].length; c++) {
                if (problem.problem.field.grid[r][c]) {
                    filledField[r + problem.problem.field.offset.y][c + problem.problem.field.offset.x] = true;
                }
            }
        }
    }
    return {
        consumedMinos: consumedMinos,
        filledField: filledField
    };
}
