
export const tetroMinoKinds:MinoKind[] = ['J','L','T','S','Z','I','O'];
export let rotationData = {
    'I': [
        [[0,0],[1,0],[2,0],[3,0]], // ━
        [[0,0],[0,1],[0,2],[0,3]], // ❘
    ],
    'O': [
        [[0,0],[1,0],[0,1],[1,1]], // □
    ],
    'S': [
        [[1,0],[2,0],[0,1],[1,1]], // 横
        [[0,0],[0,1],[1,1],[1,2]], // 縦
    ],
    'Z': [
        [[0,0],[1,0],[1,1],[2,1]], // 横
        [[1,0],[0,1],[1,1],[0,2]], // 縦
    ],
    'T': [
        [[1,0],[0,1],[1,1],[2,1]], // ▲
        [[0,1],[1,0],[1,1],[1,2]], // ◀
        [[0,0],[1,0],[2,0],[1,1]], // ▼
        [[0,0],[0,1],[0,2],[1,1]], // ▶
    ],
    'J': [
        [[0,0],[0,1],[1,1],[2,1]], // ▲
        [[0,2],[1,0],[1,1],[1,2]], // ◀
        [[0,0],[1,0],[2,0],[2,1]], // ▼
        [[0,1],[0,0],[0,2],[1,0]], // ▶
    ],
    'L': [
        [[2,0],[0,1],[1,1],[2,1]], // ▲
        [[0,0],[1,0],[1,1],[1,2]], // ◀
        [[1,0],[0,0],[2,0],[0,1]], // ▼
        [[0,0],[0,1],[0,2],[1,2]], // ▶
    ],
};
export let rotationData2 = {
    'I': convertRotationData(rotationData['I']),
    'O': convertRotationData(rotationData['O']),
    'T': convertRotationData(rotationData['T']),
    'S': convertRotationData(rotationData['S']),
    'Z': convertRotationData(rotationData['Z']),
    'J': convertRotationData(rotationData['J']),
    'L': convertRotationData(rotationData['L']),
}

function convertRotationData(rotationData: number[][][]): RotationData {
    let forms: MinoFormData[] = [];
    for (const rotation of rotationData) {
        let blocks: {x: number, y: number}[] = [];
        let verticalParity = 0;
        for (const [x, y] of rotation) {
            verticalParity += x;
            blocks.push({x, y});
        }
        forms.push({blocks, verticalParity: verticalParity % 2 === 1});
    }
    return { forms };
}
