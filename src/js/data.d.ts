type MinoKind = 'I'|'O'|'T'|'S'|'Z'|'J'|'L';
type SymmetryLevel = 0 | 1 | 2;
interface Mino {
    id: MinoKind;
    required: boolean;
}
interface SubfieldData {
    grid: boolean[][];
    checkerboardParity: boolean,
    verticalParity    : boolean,
    symmetryLevel     : SymmetryLevel,
}
