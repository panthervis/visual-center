export interface Coordinate {
    x: number,
    y: number,
}

export enum ToolMode {
    Restore,
    Eraser,
}

export enum Orientation {
    Horizontal,
    Vertical,
}

export enum Page {
    Upload,
    Edit,
}

export interface DrawPos extends Coordinate {
    isNewLine: boolean,
    index: number,
    mode: ToolMode,
    brushSize: number,
    drawn?: boolean,
    undone?: boolean,
    force?: boolean,
}
