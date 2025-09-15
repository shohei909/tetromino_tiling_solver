type MinoKind = 'I'|'O'|'T'|'S'|'Z'|'J'|'L';
type SymmetryLevel = 0 | 1 | 2;
interface Mino {
    id: MinoKind;
    required: boolean;
}
// 問題全体・またはある部分問題を解いた後の残りの問題
interface Problem {
    wholeSize: {rows:number, cols:number}; // 問題全体のサイズ
    minos: Map<MinoKind, {required:number, additional:number}>;
    subFields: SubFieldNode[];
    fieldMinoLength: number; // フィールドを埋めるのに必要なミノの数
}
// 部分問題が解くべき分割済みの領域
type SubFieldNode = SubField | SubFieldOr;
// 領域1つ分の情報
interface SubField 
{
    type              : 'field';
    offset            : { x: number, y: number };
    grid              : boolean[][];
    blockCount        : number;
    parity            : Parity;
    symmetryLevel     : SymmetryLevel,
}
interface Parity
{
    checkerboardParity     : number,
    verticalParity         : number,
    horizontalParity       : number,
    wideCheckerboardParity : number,
    diagonalParity0        : number,
    diagonalParity1        : number,
    diagonalParity2        : number,
    diagonalParity3        : number,
    maxDiagonalParity      : number,
    oParity                : number,
}
// 領域に対して分割の仕方が複数あった場合、それらのいずれか1つずつを試して解く
interface SubFieldOr {
    type   : 'or';
    fields : SubFieldNode[][];
}
// 部分問題の途中経過情報
interface SubProblemContext {
    stateKey: StateKey; // すでに解いた部分問題の状態を表すキー文字列
    problem: PackingProblem; // 現在取り組む部分問題
    rest: Problem; // 現在の部分問題を解いた後に残る問題
}
// 指定したミノでフィールドを埋める部分問題
interface PackingProblem {
    minos: Map<MinoKind, number>;
    field: SubField;
}
interface SubSolution {
    // ミノの配置情報
    minos: Map<MinoKind, number>;

    // 解の情報
    solution: PackingSolution,

    // この解に対応する部分問題
    problem: PackingProblem;
}
interface StateIdentifier {
    consumedMinos: Map<MinoKind, number>;
    filledField: boolean[][];
}
interface PackingEntry {
    contexts: SubProblemContext[],
    solutions: PackingSolution[],
}
interface PackingSolution
{
    minoKinds:MinoKind[], 
    solution:number[][]
}

// newtypeのテンプレート
type Key<string, Tag> = string & { [Unique]: Tag };

type StateKey           = Key<string, 'StateKey'>;
type PackingProblemKey  = Key<string, 'PackingProblemKey'>;
type PackingSolutionKey = Key<string, 'PackingSolutionKey'>;
type MainSolutionKey    = Key<string, 'MainSolutionKey'>;


type RotationData = {
    forms:MinoFormData[]
}
type MinoFormData = {
    blocks:{x: number, y: number}[],
    width : number,
    height: number,
    verticalParity: boolean
}
