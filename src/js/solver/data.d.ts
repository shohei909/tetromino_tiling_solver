type MinoKind = 'I'|'O'|'T'|'S'|'Z'|'J'|'L';
type SymmetryLevel = 0 | 1 | 2;
interface Mino {
    id: MinoKind;
    required: boolean;
}
interface Problem {
    wholeSize: {rows:number, cols:number}; // 問題全体のサイズ
    minos: Map<MinoKind, {required:number, additional:number}>;
    subFields: SubFieldNode[];
    fieldMinoLength: number; // フィールドを埋めるのに必要なミノの数
}
type SubFieldNode = SubField | SubFieldOr;
interface SubField 
{
    type              : 'field';
    offset            : { x: number, y: number };
    grid              : boolean[][];
    blockCount        : number;
    checkerboardParity: number,
    verticalParity    : number,
    horizontalParity  : number,
    symmetryLevel     : SymmetryLevel,
}
interface SubFieldOr {
    type   : 'or';
    fields : SubFieldNode[][];
}
interface SubProblemNode {
    stateKey: string;
    problem: SubProblem;
    rest: Problem;
}
interface SubProblem {
    minos: Map<MinoKind, number>;
    field: SubField;
}
interface Progress {
    stateKey: string,
    rest: Problem,
}
interface SubSolutionNode
{
    stateIdentifier:StateIdentifier;
    solutions: Map<string, SubSolution[]>; // key: stateKey
    linkedSolutions: Set<StateIdentifier>; // この部分問題を使用しているより大きな解
}
interface SubSolution {
    // ミノの配置情報
    minos: Map<MinoKind, number>;
    minoKinds: MinoKind[];
    solution: number[][];

    // この解に対応する部分問題
    problem: SubProblem;
}
interface StateIdentifier {
    consumedMinos: Map<MinoKind, number>;
    filledField: boolean[][];
}
