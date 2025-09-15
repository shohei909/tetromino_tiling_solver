export function getParity<T>(grid: T[][], func: (value: T) => boolean): {
        parity: Parity,
        blockCount: number,
        boundingBox: { minX: number, minY: number, maxX: number, maxY: number }
    } 
{
    
    let rows = grid.length;
    let cols = grid[0]?.length || 0;
    let blockCount = 0;
    let checkerboardParity = 0;
    let verticalParity = 0;
    let horizontalParity = 0;
    let wideCheckerboardParity0 = 0;
    let wideCheckerboardParity1 = 0;
    let wideCheckerboardParity2 = 0;
    let wideCheckerboardParity3 = 0;
    let diagonalParity0 = 0;
    let diagonalParity1 = 0;
    let diagonalParity2 = 0;
    let diagonalParity3 = 0;
    let oParity0 = 0;
    let oParity1 = 0;
    let oParity2 = 0;
    let oParity3 = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (func(grid[y][x])) {
                blockCount++;
                checkerboardParity += ((x + y) % 2) ? 1 : -1;
                verticalParity     += (y % 2) ? 1 : -1;
                horizontalParity   += (x % 2) ? 1 : -1;
                wideCheckerboardParity0 += (Math.floor(x / 2) + y) % 2 ? 1 : -1;
                wideCheckerboardParity1 += (Math.floor((x + 1) / 2) + y) % 2 ? 1 : -1;
                wideCheckerboardParity2 += (Math.floor(y / 2) + x) % 2 ? 1 : -1;
                wideCheckerboardParity3 += (Math.floor((y + 1) / 2) + x) % 2 ? 1 : -1;
                diagonalParity0 += Math.floor((x + y) / 2) % 2 ? 1 : -1;
                diagonalParity1 += Math.floor((x + y + 1) / 2) % 2 ? 1 : -1;
                diagonalParity2 += Math.floor((x - y) / 2) % 2 ? 1 : -1;
                diagonalParity3 += Math.floor((x - y + 1) / 2) % 2 ? 1 : -1;
                oParity0 += ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) ? 1 : -1;
                oParity1 += ((Math.floor((x + 1) / 2) + Math.floor(y / 2)) % 2) ? 1 : -1;
                oParity2 += ((Math.floor(x / 2) + Math.floor((y + 1) / 2)) % 2) ? 1 : -1;
                oParity3 += ((Math.floor((x + 1) / 2) + Math.floor((y + 1) / 2)) % 2) ? 1 : -1;

                if (x > maxX) maxX = x;
                if (x < minX) minX = x;
                if (y > maxY) maxY = y;
                if (y < minY) minY = y;
            }
        }
    }
    checkerboardParity = Math.abs(checkerboardParity / 2);
    verticalParity = Math.abs(verticalParity / 2);
    horizontalParity = Math.abs(horizontalParity / 2);
    wideCheckerboardParity0 = Math.abs(wideCheckerboardParity0 / 2);
    wideCheckerboardParity1 = Math.abs(wideCheckerboardParity1 / 2);
    wideCheckerboardParity2 = Math.abs(wideCheckerboardParity2 / 2);
    wideCheckerboardParity3 = Math.abs(wideCheckerboardParity3 / 2);
    diagonalParity0 = Math.abs(diagonalParity0 / 2);
    diagonalParity1 = Math.abs(diagonalParity1 / 2);
    diagonalParity2 = Math.abs(diagonalParity2 / 2);
    diagonalParity3 = Math.abs(diagonalParity3 / 2);
    oParity0 = Math.abs(oParity0 / 2);
    oParity1 = Math.abs(oParity1 / 2);
    oParity2 = Math.abs(oParity2 / 2);
    oParity3 = Math.abs(oParity3 / 2);

    return {
        parity: {
            checkerboardParity,
            verticalParity,
            horizontalParity,
            diagonalParity0,
            diagonalParity1,
            diagonalParity2,
            diagonalParity3,
            wideCheckerboardParity: Math.max(wideCheckerboardParity0, wideCheckerboardParity1, wideCheckerboardParity2, wideCheckerboardParity3),
            maxDiagonalParity: Math.max(diagonalParity0, diagonalParity1, diagonalParity2, diagonalParity3),
            oParity: Math.max(oParity0, oParity1, oParity2, oParity3),
        },
        blockCount,
        boundingBox: { minX, minY, maxX, maxY }
    };
}
export let parityMessage = [
    "パリティチェック: 問題なし",
    "市松パリティの偏りよりTミノが少ないため、除外されました",
    "市松パリティの偶奇がTミノ数と合わないため除外されました",
    "縦パリティの偏りよりIJLTミノが少ないため、除外されました",
    "Tミノの数が0で、縦パリティの偶奇がLJミノと合わないため除外されました",
    "横パリティの偏りよりIJLTミノが少ないため、除外されました",
    "Tミノの数が0で、横パリティの偶奇がLJミノと合わないため除外されました",
    "長市松パリティの偏りよりSZJLTミノが少ないため、除外されました",
    "Tミノの数が0で、LJミノの数が0で、斜め縞パリティの偶奇がOミノ数と合わないため除外されました",
    "斜め縞パリティの偏りよりOTLJSZミノが少ないため、除外されました",
    "Oパリティの偏りよりOTLJSZミノが少ないため、除外されました",
];
export function checkParity(
    iCount: number, 
    oCount: number,
    tCount: number, 
    ljCount: number,
    szCount: number,    
    parity: Parity
): number
{
    // 市松模様のパリティの偏りに、Tミノ数が足りてない場合、解なし
    if (parity.checkerboardParity > tCount) {
        return 1;
    }
    // Tミノの数が、市松パリティと合わない場合は解なし
    if (tCount % 2 != parity.checkerboardParity % 2) {
        return 2;
    }
    // 縦のパリティの偏りに、Tミノ数が足りてない場合、解なし
    if (parity.verticalParity > tCount + ljCount + iCount * 2) {
        return 3;
    }
    // Tミノの数が0で、縦パリティが合わない場合、解なし
    if (tCount == 0 && parity.verticalParity % 2 != ljCount % 2) {
        return 4;
    }
    // 横のパリティの偏りに、Tミノ数が足りてない場合、解なし
    if (parity.horizontalParity > tCount + ljCount + iCount * 2) {
        return 5;
    }
    // Tミノの数が0で、横パリティが合わない場合、解なし
    if (tCount == 0 && parity.horizontalParity % 2 != ljCount % 2) {
        return 6;
    }
    // 長市松パリティの偏りに、TLJSZミノ数が足りてない場合、解なし
    if (parity.wideCheckerboardParity > tCount + ljCount + szCount) {
        return 7;
    }
    // Tミノの数が0で、LJミノ数が0で、斜め縞パリティの偶奇がOミノ数と合わない場合、解なし
    if (tCount == 0 && ljCount == 0)
    {
        if (parity.diagonalParity0 % 2 != oCount % 2) { return 8; }
        if (parity.diagonalParity1 % 2 != oCount % 2) { return 8; }
        if (parity.diagonalParity2 % 2 != oCount % 2) { return 8; }
        if (parity.diagonalParity3 % 2 != oCount % 2) { return 8; }
    }
    // 斜め縞パリティの偏りに、OTLJSZミノ数が足りてない場合、解なし
    if (parity.maxDiagonalParity > oCount + tCount + ljCount + 2 * szCount) {
        return 9;
    }
    // Oパリティの偏りに、OTLJSZミノ数が足りてない場合、解なし
    if (parity.oParity > oCount * 2 + tCount + ljCount + szCount) {
        return 10;
    }
    return 0;
}

export function restCheckParity(
    restMinos: Map<MinoKind, {required:number, additional:number}>,
    parity: Parity
): number
{
    let tMinCount = restMinos.get('T')?.required || 0;
    let ljMinCount = (restMinos.get('L')?.required || 0) + (restMinos.get('J')?.required || 0);
    let szMinCount = (restMinos.get('S')?.required || 0) + (restMinos.get('Z')?.required || 0);
    let oMinCount = restMinos.get('O')?.required || 0;
    let iMinCount = restMinos.get('I')?.required || 0;
    let tMaxCount = tMinCount + (restMinos.get('T')?.additional || 0);
    let ljMaxCount = ljMinCount + (restMinos.get('L')?.additional || 0) + (restMinos.get('J')?.additional || 0);
    let szMaxCount = szMinCount + (restMinos.get('S')?.additional || 0) + (restMinos.get('Z')?.additional || 0);
    let oMaxCount = oMinCount + (restMinos.get('O')?.additional || 0);
    let iMaxCount = iMinCount + (restMinos.get('I')?.additional || 0);
    
    // 市松模様のパリティの偏りに、Tミノ数が足りてない場合、解なし
    if (parity.checkerboardParity > tMaxCount) {
        return 1;
    }
    // Tミノの数が、市松パリティと合わない場合は解なし
    if (tMaxCount == tMinCount && tMaxCount % 2 != parity.checkerboardParity % 2) {
        return 2;
    }
    // 縦のパリティの偏りに、Tミノ数が足りてない場合、解なし
    if (parity.verticalParity > tMaxCount + ljMaxCount + iMaxCount * 2) {
        return 3;
    }
    // Tミノの数が0で、縦パリティが合わない場合、解なし
    if (tMaxCount == 0 && ljMaxCount == ljMinCount && parity.verticalParity % 2 != ljMaxCount % 2) {
        return 4;
    }
    // 横のパリティの偏りに、Tミノ数が足りてない場合、解なし
    if (parity.horizontalParity > tMaxCount + ljMaxCount + iMaxCount * 2) {
        return 5;
    }
    // Tミノの数が0で、横パリティが合わない場合、解なし
    if (tMaxCount == 0 && ljMaxCount == ljMinCount && parity.horizontalParity % 2 != ljMaxCount % 2) {
        return 6;
    }
    // 長市松パリティの偏りに、TLJSZミノ数が足りてない場合、解なし
    if (parity.wideCheckerboardParity > tMaxCount + ljMaxCount + szMaxCount) {
        return 7;
    }
    // Tミノの数が0で、LJミノ数が0で、斜め縞パリティの偶奇がOミノ数と合わない場合、解なし
    if (tMaxCount == 0 && ljMaxCount == 0 && oMaxCount == oMinCount)
    {
        if (parity.diagonalParity0 % 2 != oMaxCount % 2) { return 8; }
        if (parity.diagonalParity1 % 2 != oMaxCount % 2) { return 8; }
        if (parity.diagonalParity2 % 2 != oMaxCount % 2) { return 8; }
        if (parity.diagonalParity3 % 2 != oMaxCount % 2) { return 8; }
    }
    // 斜め縞パリティの偏りに、OTLJSZミノ数が足りてない場合、解なし
    if (parity.maxDiagonalParity > oMaxCount + tMaxCount + ljMaxCount + 2 * szMaxCount) {
        return 9;
    }
    // Oパリティの偏りに、OTLJSZミノ数が足りてない場合、解なし
    if (parity.oParity > oMaxCount * 2 + tMaxCount + ljMaxCount + szMaxCount) {
        return 10;
    }
    return 0;
}

export function totalizeParity(fields:SubFieldNode[]):Parity
{
    let totalParity: Parity = {
        checkerboardParity     : 0,
        verticalParity         : 0,
        horizontalParity       : 0,
        wideCheckerboardParity : 0,
        diagonalParity0        : 0,
        diagonalParity1        : 0,
        diagonalParity2        : 0,
        diagonalParity3        : 0,
        maxDiagonalParity      : 0,
        oParity                : 0,
    };
    for (const field of fields)
    {
        let fieldParity;
        if (field.type == 'field')
        {
            fieldParity = field.parity;
        }
        else
        {
            let parityList = [];
            for (let i = 0; i < field.fields.length; i++)
            {
                parityList.push(totalizeParity(field.fields[i]));
            }
            fieldParity = getMinParity(parityList);
        }
        totalParity.checkerboardParity     += fieldParity.checkerboardParity;
        totalParity.verticalParity         += fieldParity.verticalParity;
        totalParity.horizontalParity       += fieldParity.horizontalParity;
        totalParity.wideCheckerboardParity += fieldParity.wideCheckerboardParity;
        totalParity.diagonalParity0        += fieldParity.diagonalParity0;
        totalParity.diagonalParity1        += fieldParity.diagonalParity1;
        totalParity.diagonalParity2        += fieldParity.diagonalParity2;
        totalParity.diagonalParity3        += fieldParity.diagonalParity3;
        totalParity.maxDiagonalParity      += fieldParity.maxDiagonalParity;
        totalParity.oParity                += fieldParity.oParity;
    }    
    return totalParity;
}
function getMinParity(parityList: Parity[]): Parity
{
    let totalParity: Parity = {
        checkerboardParity     : 0,
        verticalParity         : 0,
        horizontalParity       : 0,
        wideCheckerboardParity : 0,
        diagonalParity0        : 0,
        diagonalParity1        : 0,
        diagonalParity2        : 0,
        diagonalParity3        : 0,
        maxDiagonalParity      : 0,
        oParity                : 0,
    };
    for (const parity of parityList)
    {
        totalParity.checkerboardParity     = Math.min(totalParity.checkerboardParity    , parity.checkerboardParity    );
        totalParity.verticalParity         = Math.min(totalParity.verticalParity        , parity.verticalParity        );
        totalParity.horizontalParity       = Math.min(totalParity.horizontalParity      , parity.horizontalParity      );
        totalParity.wideCheckerboardParity = Math.min(totalParity.wideCheckerboardParity, parity.wideCheckerboardParity);
        totalParity.diagonalParity0        = Math.min(totalParity.diagonalParity0       , parity.diagonalParity0       );
        totalParity.diagonalParity1        = Math.min(totalParity.diagonalParity1       , parity.diagonalParity1       );
        totalParity.diagonalParity2        = Math.min(totalParity.diagonalParity2       , parity.diagonalParity2       );
        totalParity.diagonalParity3        = Math.min(totalParity.diagonalParity3       , parity.diagonalParity3       );
        totalParity.maxDiagonalParity      = Math.min(totalParity.maxDiagonalParity     , parity.maxDiagonalParity     );
        totalParity.oParity                = Math.min(totalParity.oParity               , parity.oParity               );
    }
    return totalParity;
}
