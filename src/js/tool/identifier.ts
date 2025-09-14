import { minoKinds } from "../constants";

export function stringifyProblemIdentifier(problem: PackingProblem): string
{
    return stringifyIdentifier(problem.minos, problem.field.grid);
}

export function stringifyStateIdentifier(id:StateIdentifier):string
{
    return stringifyIdentifier(id.consumedMinos, id.filledField);
}

function stringifyIdentifier(minos:Map<MinoKind, number>, grid:boolean[][]):string
{
    let length = 8 + Math.ceil((grid.length * grid[0].length) / 8);
    let buffer = new ArrayBuffer(length);
    let dataView = new DataView(buffer);
    let offset = 0;
    for (const mino of minoKinds)
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
            if (bitIndex > 8)
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
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
