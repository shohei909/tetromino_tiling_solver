import { offset } from "@popperjs/core";
import { tetroMinoKinds } from "../constants";

export function stringifyPackingProblem(problem: PackingProblem):PackingProblemKey
{
    return stringifyIdentifier(problem.minos, problem.field.grid) as PackingProblemKey;
}

export function stringifyStateIdentifier(id:StateIdentifier):StateKey
{
    return stringifyIdentifier(id.consumedMinos, id.filledField) as StateKey;
}

export function stringifyMinos(minos:Map<MinoKind, number>): string
{
    return stringifyIdentifier(minos, [[]]);
}

export function stringifyField(field: boolean[][]): string
{
    return stringifyIdentifier(new Map<MinoKind, number>(), field);
}

export function stringifyIdentifier(minos:Map<MinoKind, number>, grid:boolean[][]):string
{
    let length = 8 + Math.ceil((grid.length * grid[0].length) / 8);
    let buffer = new ArrayBuffer(length);
    let dataView = new DataView(buffer);
    let offset = 0;
    for (const mino of tetroMinoKinds)
    {
        dataView.setUint8(offset++, (minos.get(mino) || 0));
    }
    dataView.setUint8(offset++, grid[0].length);
    let byte = 0;
    let bitIndex = 0;
    for (let r = 0; r < grid.length; r++)
    {
        for (let c = 0; c < grid[r].length; c++)
        {
            byte = (byte << 1) | (grid[r][c] ? 1 : 0);
            bitIndex += 1;
            if (bitIndex >= 8)
            {
                dataView.setUint8(offset++, byte);
                byte = 0;
                bitIndex = 0;
            }
        }
    }
    if (bitIndex > 0) {
        dataView.setUint8(offset++, byte);
    }
    return encode(buffer);
}

export function stringifyPackingSolution(solution: PackingSolution):PackingSolutionKey
{
    let length = solution.solution.length * solution.solution[0].length;
    let buffer = new ArrayBuffer(length);
    let dataView = new DataView(buffer);
    let offset = 0;
    for (let r = 0; r < solution.solution.length; r++)
    {
        for (let c = 0; c < solution.solution[r].length; c++)
        {
            let value = tetroMinoKinds.indexOf(solution.minoKinds[solution.solution[r][c]]);
            dataView.setUint8(offset++, value);
        }
    }
    return encode(buffer) as PackingSolutionKey;
}

export function encode(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


export function decode(hash:string): ArrayBuffer {
    hash = hash.replace(/-/g, '+').replace(/_/g, '/');
    while (hash.length % 4) hash += '=';
    const binary = atob(hash);
    const len = binary.length;
    const buffer = new ArrayBuffer(len);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
}