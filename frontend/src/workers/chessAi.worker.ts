import { chessMinMax } from "../utils";
import { chessTypes } from "../types";

const aiMove = (depth: number, board: chessTypes.Piece[][], enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: chessTypes.CastlingRights, currentTurn: "white" | "black" )=> {
    return chessMinMax.evaluatePossibleMoves(depth, board, enPassantTarget, promotion, castlingRights, currentTurn);
};

self.addEventListener("message", (event) => {
    const data = event.data;

    const result = aiMove(data.depth, data.board, data.enPassantTarget, data.promotion, data.castlingRights, data.currentTurn);
    postMessage(result);
})