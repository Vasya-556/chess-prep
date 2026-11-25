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

export type {
    Piece,
    Move,
    HistoryLine,
}