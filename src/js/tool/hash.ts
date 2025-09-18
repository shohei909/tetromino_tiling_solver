import { tetroMinoKinds } from "../constants";
import { decode, encode } from "./identifier";

// グリッドをハッシュ文字列に変換
export function gridToHash(grid: boolean[][], plusMinusMap: Map<MinoKind, { plus: number, minus: number }>): string {
    let buffer = new ArrayBuffer(20 + Math.ceil((grid.length * grid[0].length) / 2));
    let row = grid.length;
    let col = grid[0].length;
    let dataView = new DataView(buffer);
    let offset = 0;
    dataView.setUint8(offset++, 0); // version
    dataView.setUint8(offset++, row);
    dataView.setUint8(offset++, col);
    let byte = 0;
    let bitIndex = 0;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            byte = (byte << 4) | (grid[r][c] ? 1 : 0);
            bitIndex += 4;
            if (bitIndex >= 8) {
                dataView.setUint8(offset++, byte);
                byte = 0;
                bitIndex = 0;
            }
        }
    }
    if (bitIndex > 0) {
        dataView.setUint8(offset++, byte);
    }
    for (let minoKind of tetroMinoKinds) {
        let plusMinus = plusMinusMap.get(minoKind);
        dataView.setUint8(offset++, plusMinus?.plus || 0);
        dataView.setUint8(offset++, plusMinus?.minus || 0);
    }
    return encode(buffer);
}

// ハッシュ文字列からグリッドを復元
export function hashToGrid(hash: string): {
    grid: boolean[][],
    plusMinus: Map<MinoKind, { plus: number, minus: number }>
} | null {
    let buffer = decode(hash);
    let dataView = new DataView(buffer);
    let offset = 0;
    offset++; // version
    const rows = dataView.getUint8(offset++);
    const cols = dataView.getUint8(offset++);
    const grid: boolean[][] = [];
    let count = 4;
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = ((dataView.getUint8(offset) >> count) & 1) !== 0;
            count -= 4;
            if (count < 0) {
                offset++;
                count = 4;
            }
        }
    }
    const plusMinus = new Map();
    for (let minoKind of tetroMinoKinds) {
        plusMinus.set(minoKind, {
            plus: dataView.getUint8(offset++),
            minus: dataView.getUint8(offset++)
        });
    }
    return { grid, plusMinus };
}
