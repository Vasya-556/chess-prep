type Piece = {
    type: "rook" | "knight" | "king" | "bishop" | "queen" | "pawn" | "none",
    color: "white" | "black",
};

type Move = {
    from: [number, number],
    to: [number, number],
};

type HistoryLine = {
    moves: Move[];
    afterBoards: Piece[][][];
};

type CastlingRights = {
    whiteKingMoved: boolean; 
    blackKingMoved: boolean; 
    whiteKingSide: boolean; 
    whiteQueenSide: boolean; 
    blackKingSide: boolean; 
    blackQueenSide: boolean;
}

export type {
    Piece,
    Move,
    HistoryLine,
    CastlingRights,
}