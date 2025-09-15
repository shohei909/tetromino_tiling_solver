import { init } from "z3-solver";
import { getParity } from "./parity";

// 領域を分割する
export function splitField(offsetX:number, offsetY:number, field: SubField): SubFieldNode[]
{
    let grid = field.grid;
    let rows = grid.length;
    let cols = grid[0]?.length || 0;
    let groups: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
    resetByGrid(groups, grid);
    let maxNumber = fillGroups(groups);

    let results: SubFieldNode[] = [];
    for (let id = 1; id <= maxNumber; id++)
    {
        let subField = extractSubField(offsetX, offsetY, groups, (value) => value === id);
        let fields = cutField(subField.offset.x, subField.offset.y, subField);
        results.push(...fields);
    }

    // 小さい方から処理する
    results.sort(compareSubFieldNodes);

    return results;
}

// 関節点でフィールドを分割する
function cutField(offsetX:number, offsetY:number, field: SubField): SubFieldNode[]
{
    let grid = field.grid;
    
    // Lowlinkh法で関節点を求める
    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    // Lowlink法 で関節点を求める
    const ord: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const low: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
    // 関節点
    const articulation: {x:number, y:number}[] = [];
    let timer = 0;

    // (x, y)を根としたDFSで、ord, low, articulationを計算する
    function dfs(x: number, y: number, px: number, py: number) {
        ord[y][x] = low[y][x] = timer++;
        let children = 0;
        const dx = [1, -1, 0, 0];
        const dy = [0, 0, 1, -1];
        for (let dir = 0; dir < 4; dir++) {
            const nx = x + dx[dir];
            const ny = y + dy[dir];
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            if (!grid[ny][nx]) continue;
            if (nx === px && ny === py) continue;
            if (ord[ny][nx] !== -1) {
                low[y][x] = Math.min(low[y][x], ord[ny][nx]);
            } else {
                dfs(nx, ny, x, y);
                low[y][x] = Math.min(low[y][x], low[ny][nx]);
                if (low[ny][nx] >= ord[y][x] && (px !== -1 || py !== -1)) {
                    articulation.push({x, y});
                }
                children++;
            }
        }
        if (px === -1 && py === -1 && children > 1) {
            articulation.push({x, y});
        }
    }

    // 最初の1つだけでよい
    outer: for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x]) {
                dfs(x, y, -1, -1);
                break outer;
            }
        }
    }
    if (articulation.length > 0) {
        let groups: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
        for (const {x:ax, y:ay} of articulation) {
            resetByGrid(groups, grid);
            groups[ay][ax] = -2; // 関節点を除外
            let maxNumber = fillGroups(groups); // ぬりわけを試みる

            for (let id = 1; id <= maxNumber; id++) 
            {
                let count = 0;
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        if (groups[y][x] == id) { count++; }
                    }
                }
                if (count % 4 == 0)
                {
                    let results = [];
                    {
                        let subField = extractSubField(offsetX, offsetY, groups, (value) => value === id);
                        results.push(...splitField(subField.offset.x, subField.offset.y, subField));
                    }
                    {
                        let subField = extractSubField(offsetX, offsetY, groups, (value) => value !== id && value !== -1);
                        results.push(...splitField(subField.offset.x, subField.offset.y, subField));
                    }
                    return results;
                }
            }
        }
    }
    return [field];
}

function resetByGrid(groups: number[][], grid: boolean[][])
{
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x]) {
                groups[y][x] = 0;
            } else {
                groups[y][x] = -1;
            }
        }
    }
}
function fillGroups(groups: number[][])
{
    const rows = groups.length;
    const cols = groups[0]?.length || 0;
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
    return currentId - 1; // グループ数
}
export function compareSubFieldNodes(a:SubFieldNode, b:SubFieldNode):number
{
    if (a.type === 'field' && b.type === 'field') {
        return a.blockCount - b.blockCount; // 小さい順
    }
    if (a.type === 'field') return -1; // fieldが先
    if (b.type === 'field') return  1; // fieldが先
    return 0;
}

export function extractSubField<T>(
    offsetX: number,
    offsetY: number,
    grid: T[][],
    func: (value: T) => boolean
): SubField
{
    let info = getParity(grid, func);
    let newGrid = grid.slice(info.boundingBox.minY, info.boundingBox.maxY + 1).map(r => r.slice(info.boundingBox.minX, info.boundingBox.maxX + 1).map(func));
    let rows = newGrid.length;
    let cols = newGrid[0]?.length || 0;
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
            if (getAt(x, y) != getAt(rows - y - 1, x))
            {
                symmetry90  = false;
            }
            if (getAt(x, y) != getAt(y, cols - x - 1))
            {
                symmetry90  = false;
            }
        }
    }
    return {
        type: 'field',
        offset: { x: offsetX + info.boundingBox.minX, y: offsetY + info.boundingBox.minY },
        grid: newGrid,
        blockCount: info.blockCount,
        parity: info.parity,
        symmetryLevel: symmetry90 ? 2 : symmetry180 ? 1 : 0,
    }
}
