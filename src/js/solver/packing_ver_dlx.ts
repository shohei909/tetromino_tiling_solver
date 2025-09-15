import { rotationData2, tetroMinoKinds } from "../constants";
import { usingMarker } from "./solver_root";


// Dancing Linksのノード
class DancingLinkNode
{
    public left : DancingLinkNode | null;
    public right: DancingLinkNode | null;
    public up   : DancingLinkNode | null;
    public down : DancingLinkNode | null;
    public x    : number;
    public y    : number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.left = null;
        this.right = null;
        this.up = null;
        this.down = null;
    }
    
    public unlinkRow(removeNodes: DancingLinkNode[]) {
        {
            let node = this.left;
            while (node != null) {
                let next = node.left;
                node.unlink(removeNodes);
                node = next;
            }
        }
        {
            let node = this.right;
            while (node != null) {
                let next = node.right;
                node.unlink(removeNodes);
                node = next;
            }
        }
        this.unlink(removeNodes);
    }
    public unlinkUpperRows(removeNodes: DancingLinkNode[]) 
    {
        let node = this.up;
        while (node != null) {
            let next = node.up;
            if (node.y === -1) 
            {
                // ヘッダー行は、そのノードだけを削除
                node.unlink(removeNodes);
            }
            else
            {
                node.unlinkRow(removeNodes);
            }
            node = next;
        }
    }
    public unlinkLowerRows(removeNodes: DancingLinkNode[]) 
    {
        let node = this.down;
        while (node != null) {
            let next = node.down;
            node.unlinkRow(removeNodes);
            node = next;
        }
    }
    public unlink(removeNodes: DancingLinkNode[]) {
        if (this.left ) { this.left.right = this.right; }
        if (this.right) { this.right.left = this.left; }
        if (this.up   ) { this.up.down = this.down; }
        if (this.down ) { this.down.up = this.up; }
        removeNodes.push(this);
    }
    public relink() {
        if (this.left ) { this.left.right = this; }
        if (this.right) { this.right.left = this; }
        if (this.up   ) { this.up.down = this; }
        if (this.down ) { this.down.up = this; }
    }
    public addRight(node: DancingLinkNode|null) {
        if (node) { node.left = this; }
        this.right = node;
    }
    public addLeft(node: DancingLinkNode|null) {
        if (node) { node.right = this; }
        this.left = node;
    }
    public addDown(node: DancingLinkNode|null) {
        if (node) { node.up = this; }
        this.down = node;
    }
    public addUp(node: DancingLinkNode|null) {
        if (node) { node.down = this; }
        this.up = node;
    }
}

type RowHeader = {
    minoKind : MinoKind,
    x        : number,
    y        : number,
    form     : MinoFormData,
    node     : DancingLinkNode,
}

// Algorithm X + Dancing Linksによるテトリミノの敷き詰め実装
export async function startPacking_dlx(
    currentMarker:null|{},
    problem:PackingProblem,
    onSolved:(solution:PackingSolution)=>void,
    onFinished:()=>void
)
{
    if (usingMarker != currentMarker) { return; }
    await new Promise(resolve => setTimeout(resolve, 20));

    // グリッドのマスに番号を振る
    let gridNumber = 0;
    let gridIndexes:number[][] = [];
    let rows = problem.field.grid.length;
    let cols = problem.field.grid[0]?.length || 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (problem.field.grid[r][c]) {
                if (gridIndexes[r] == null) { gridIndexes[r] = []; }
                gridIndexes[r][c] = gridNumber;
                gridNumber += 1;
            }
        }
    }

    // ヘッダー行の生成
    let header = new DancingLinkNode(-1, -1); // ヘッダー
    let node = header;
    let bottomRows:DancingLinkNode[] = [];
    for (let i = 0; i < gridNumber; i++)
    {
        let nextNode = new DancingLinkNode(i, -1);
        bottomRows[i] = nextNode;
        node.addRight(nextNode);
        node = nextNode;
    }

    // ミノの置き方ごとを追加
    let rowIndex = 0;
    let rowHeaders: RowHeader[] = [];
    for (const minoKind of tetroMinoKinds) 
    {
        if (!problem.minos.get(minoKind)) { continue; }

        let rowHeaderNode:DancingLinkNode|null = null;

        // Dancing Linksの列を追加
        function addRow(r:number, c:number, form:MinoFormData)
        {
            let nextRowHeaderNode = new DancingLinkNode(-1, rowIndex);
            let node:DancingLinkNode|null = nextRowHeaderNode;
            for (const block of form.blocks)
            {
                let gridIndex = gridIndexes[r + block.y][c + block.x];
                let nextNode = new DancingLinkNode(gridIndex, rowIndex);
                node.addRight(nextNode);
                bottomRows[gridIndex].addDown(nextNode);
                bottomRows[gridIndex] = nextNode;
                node = nextNode;
            }
            rowIndex += 1;
            nextRowHeaderNode.addUp(rowHeaderNode);
            rowHeaderNode = nextRowHeaderNode;
            rowHeaders.push({minoKind: minoKind, x: c, y: r, form: form, node: rowHeaderNode});
        }
        // すべての向き・位置でミノを置くパターンを列挙
        for (const form of rotationData2[minoKind].forms) {
            for (let r = 0; r < rows - form.height + 1; r++) {
                column: for (let c = 0; c < cols - form.width + 1; c++) {
                    for (const block of form.blocks) {
                        if (!problem.field.grid[r + block.y][c + block.x]) {
                            // 置けない
                            continue column;
                        }
                    }
                    // 置ける
                    addRow(r, c, form);
                }
            }
        }
    }

    search(
        currentMarker,
        problem,
        header,
        rowHeaders,
        onSolved,
        onFinished
    );
}

async function search(
    currentMarker: null | {},
    problem:PackingProblem,
    header: DancingLinkNode,
    rowHeaders: RowHeader[],
    onSolved:(solution:PackingSolution)=>void,
    onFinished:()=>void
) 
{
    if (usingMarker != currentMarker) { return; }

    let minos = new Map(problem.minos);
    let solutions: RowHeader[] = [];
    async function dfs() {
        if (usingMarker != currentMarker) { return; }
        // 解が見つかった場合
        if (!header.right) {
            // solutionRows に格納された行インデックスから PackingSolution を生成して onSolved を呼び出す
            notifySolution(problem, solutions, onSolved);
            return;
        }

        // 最小の列を選択
        let col = header.right;

        for (let row = col.down; row; row = row.down) {
            let rowHeader = rowHeaders[row.y];
            let rest = (minos.get(rowHeader.minoKind) || 0) - 1;
            minos.set(rowHeader.minoKind, rest);
            solutions.push(rowHeader);
            let removeNodes: DancingLinkNode[] = [];

            { // このミノと重なる選択肢をすべて削除
                let node = rowHeader.node.right;
                while (node != null) {
                    let next = node.right;
                    node.unlinkUpperRows(removeNodes);
                    node.unlinkLowerRows(removeNodes);
                    node.unlink(removeNodes);
                    node = next;
                }
            }
            // 対称性の削除（おなじミノを使用する若い行を削除）
            rowHeader.node.unlinkUpperRows(removeNodes);
            // ミノを使い切った場合、同じミノを使う行をすべて削除
            if (rest <= 0) 
            {
                rowHeader.node.unlinkLowerRows(removeNodes);
            }
            // 行ヘッダーを削除
            rowHeader.node.unlink(removeNodes);

            // 行に含まれる他の列もカバー
            await dfs();

            // バックトラック
            solutions.pop();
            for (let node of removeNodes) { node.relink(); }
            minos.set(rowHeader.minoKind, rest + 1);
        }
    }

    await dfs();
    onFinished();
}
// 解の通知
function notifySolution(
    problem:PackingProblem,
    solutions: RowHeader[], 
    onSolved: (solution: PackingSolution) => void
) 
{
    let rows = problem.field.grid.length;
    let cols = problem.field.grid[0]?.length || 0;
    let grid:number[][] = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = -1;
        }
    }
    for (const [i, v] of solutions.entries())
    {
        for (const b of v.form.blocks) {
            grid[v.y + b.y][v.x + b.x] = i;
        }
    }
    onSolved({
        minoKinds: solutions.map(v => v.minoKind),
        solution: grid,
    });
}

export async function abort_dlx()
{
    // TODO: 並列化した場合に中断用の処理を入れる
}
