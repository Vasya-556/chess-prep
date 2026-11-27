import { chessTypes } from "../types"
import { chessEngine } from ".";

const generateTable = () => {
    // 12 piece types, 64 possible squares, 16 enpassant targets, 6 castling rights + 1 for turn
    const array = new BigUint64Array(12 * 64 + 16 + 6 + 1);
    self.crypto.getRandomValues(array);

    return array;
}

const hashTable = generateTable();

const lookUpTable: Record<"white" | "black", Record<"pawn" | "knight" | "bishop" | "rook" | "queen" | "king", number>> = {
    white: {
        pawn: 0,
        knight: 1,
        bishop: 2,
        rook: 3,
        queen: 4,
        king: 5,
    },
    black: {
        pawn: 6,
        knight: 7,
        bishop: 8,
        rook: 9,
        queen: 10,
        king: 11,
    }
}

const pieceSquareTable = {
    pawn: [
         0,   0,   0,   0,   0,   0,  0,  0,
         5,  10,  10, -50, -50,  10, 10,  5,
         5,  -5, -10,   0,   0, -10, -5,  5,
         0,   0,   0,  20,  20,   0,  0,  0,
         5,   5,  10,  25,  25,  10,  5,  5,
        10,  10,  20,  30,  30,  20, 10, 10,
        50,  50,  50,  50,  50,  50, 50, 50,
         0,   0,   0,   0,   0,   0,  0,  0
    ],
    knight: [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20,   0,   0,   0,   0, -20, -40,
        -30,   5,  10,  15,  15,  10,   5, -30,
        -30,   0,  15,  20,  20,  15,   0, -30,
        -30,   0,  10,  15,  15,  10,   0, -30,
        -30,   5,  15,  20,  20,  15,   5, -30,
        -40, -20,   0,   5,   5,   0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
    ],
    bishop: [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10,   5,   0,   0,   0,   0,   5, -10,
        -10,  10,  10,  10,  10,  10,  10, -10,
        -10,   0,  10,  10,  10,  10,   0, -10,
        -10,   5,   5,  10,  10,   5,   5, -10,
        -10,   0,   5,  10,  10,   5,   0, -10,
        -10,   0,   0,   0,   0,   0,   0, -10,
        -20, -10, -10, -10, -10, -10, -10, -20
    ],
    rook: [
         0,  0,  0,  5,  5,  0,  0,  0,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         5, 10, 10, 10, 10, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    ],
    queen: [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10,   0,   5,  0,  0,   0,   0, -10,
        -10,   5,   5,  5,  5,   5,   0, -10,
          0,   0,   5,  5,  5,   5,   0,  -5,
         -5,   0,   5,  5,  5,   5,   0,  -5,
        -10,   0,   5,  5,  5,   5,   0, -10,
        -10,   0,   0,  0,  0,   0,   0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20
    ],
    king: [
         20,  30,  10,   0,   0,  10,  30,  20,
         20,  20,   0,   0,   0,   0,  20,  20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
    ]
}

const positionCache: Map<bigint, { 
    depth: number,
    score: number,
    bestMove: chessTypes.Move | null,
    resultType: "exact" | "lower" | "higher"
    }> = new Map();

const evaluateBoardMaterial = (board: chessTypes.Piece[][]) => {
    let value: number = 0;
    for (let i = 0; i < board.length; i++) {
        const row = board[i];
        for (let j = 0; j < row.length; j++) {
            const piece = board[i][j];

            switch (piece.type) {
                case "bishop":
                    value += piece.color === "white" ? 320 : -320;
                    break;

                case "knight":
                    value += piece.color === "white" ? 300 : -300;
                    break;

                case "rook":
                    value += piece.color === "white" ? 500 : -500;
                    break;

                case "queen":
                    value += piece.color === "white" ? 900 : -900;
                    break;

                case "pawn":
                    value += piece.color === "white" ? 100 : -100;
                    break;

                default:
                    break;
            }
        }
    }

    return value;
}

const evaluatePieceActivity = (board: chessTypes.Piece[][]) => {
    let value: number = 0;
    for (let i = 0; i < board.length; i++) {
        const row = board[i];
        for (let j = 0; j < row.length; j++) {
            const piece = board[i][j];

            switch (piece.type) {
                case "bishop":
                    value += piece.color === "white" ? pieceSquareTable.bishop[(7-i) * 8 + j] : - pieceSquareTable.bishop[(i * 8) + j]
                    break;

                case "knight":
                    value += piece.color === "white" ? pieceSquareTable.knight[(7-i) * 8 + j] : - pieceSquareTable.knight[(i * 8) + j]
                    break;

                case "rook":
                    value += piece.color === "white" ? pieceSquareTable.rook[(7-i) * 8 + j] : - pieceSquareTable.rook[(i * 8) + j]
                    break;

                case "queen":
                    value += piece.color === "white" ? pieceSquareTable.queen[(7-i) * 8 + j] : - pieceSquareTable.queen[(i * 8) + j]
                    break;

                case "pawn":
                    value += piece.color === "white" ? pieceSquareTable.pawn[(7-i) * 8 + j] : - pieceSquareTable.pawn[(i * 8) + j]
                    break;

                case "king":
                    value += piece.color === "white" ? pieceSquareTable.king[(7-i) * 8 + j] : - pieceSquareTable.king[(i * 8) + j]
                    break;

                default:
                    break;
            }
        }
    }

    return value;
}

const scanTheBoard = (board: chessTypes.Piece[][]) => {
    const whitePieces: { piece: chessTypes.Piece, row: number, col: number }[] = [];
    const blackPieces: { piece: chessTypes.Piece, row: number, col: number }[] = [];

    for (let i = 0; i < board.length; i++) {
        const row = board[i];
        for (let j = 0; j < row.length; j++) {
            const piece = board[i][j];

            if (piece.type === "none") {
                continue;
            }

            if (piece.color === "white") {
                whitePieces.push({
                    piece,
                    row: i,
                    col: j,
                })
            }
            else {
                blackPieces.push({
                    piece,
                    row: i,
                    col: j,
                })
            }
        }
    }

    return {
        whitePieces,
        blackPieces,
    }
}

const zobristHash = (board: chessTypes.Piece[][], enPassantTarget: [number, number] | null, castlingRights: chessTypes.CastlingRights, 
    turn: "white" | "black"): bigint => {
    
    let result: bigint = 0n;

    for (let i = 0; i < board.length; i++) {
        const row = board[i];
        for (let j = 0; j < row.length; j++) {
            result ^= piece(i, j, board[i][j]);
        }
    }

    if (enPassantTarget !== null){
        if (enPassantTarget[0] === 3) {
            result ^= hashTable[768 + enPassantTarget[1]]
        }
        else {
            result ^= hashTable[776 + enPassantTarget[1]]
        }
    }

    if (castlingRights.whiteKingMoved) {
        result ^= hashTable[784];
    }

    if (castlingRights.whiteKingSide) {
        result ^= hashTable[785];
    }

    if (castlingRights.whiteQueenSide) {
        result ^= hashTable[786];
    }

    if (castlingRights.blackKingMoved) {
        result ^= hashTable[787];
    }

    if (castlingRights.blackKingSide) {
        result ^= hashTable[788];
    }

    if (castlingRights.blackQueenSide) {
        result ^= hashTable[789];
    }

    if (turn === "black"){
        result ^= hashTable[790];
    }

    return result;
}

const piece = (row: number, col: number, piece: chessTypes.Piece): bigint => {
    let result: bigint = 0n;

    if (piece.type === "none"){
        return result;
    }

    const squareNumber = (row * 8 + col);
    const pieceNumber = lookUpTable[piece.color][piece.type];

    result = hashTable[squareNumber + pieceNumber * 64];
    return result;
}

const moveOrdering = (board: chessTypes.Piece[][], moves: chessTypes.Move[]): chessTypes.Move[] => {
    const result = [...moves];

    result.sort((a: chessTypes.Move, b: chessTypes.Move) => {
        const mta = board[a.to[0]][a.to[1]];
        const mtb = board[b.to[0]][b.to[1]];

        if (mta.type !== "none" && mtb.type === "none") {
            return -1;
        }
        
        if (mta.type === "none" && mtb.type !== "none") {
            return 1;
        }

        return 0;
    })

    return result;
}

const evaluatePossibleMoves = (depth: number, board: chessTypes.Piece[][], enPassantTarget: [number, number] | null, 
    promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: chessTypes.CastlingRights, 
    turn: "white" | "black", alpha: number = -Infinity, beta: number = Infinity): 
    { score: number, bestMove: chessTypes.Move | null} => {
    
    const positionHash = zobristHash(board, enPassantTarget, castlingRights, turn);
    const originalAlpa = alpha;
    const originalBeta = beta;

    if (positionCache.has(positionHash)) {
        const pos = positionCache.get(positionHash);

        if (pos && pos.depth >= depth){
            if (pos?.resultType === "exact") {
                return {
                    score: pos.score,
                    bestMove: pos.bestMove,
                }
            }

            if (pos?.resultType === "lower") {
                alpha = Math.max(alpha, pos.score);
            }

            if (pos?.resultType === "higher") {
                beta = Math.min(beta, pos.score);
            }

            if (alpha >= beta) {
                return {
                    score: pos.score,
                    bestMove: pos.bestMove
                }
            }
        }
    }

    const { whitePieces, blackPieces } = scanTheBoard(board);
    const legalMoves = [];
    let score: number = turn === "white" ? -Infinity : Infinity;
    let bestMove: chessTypes.Move | null = null;

    if (turn === "white"){
        for (let i = 0; i < whitePieces.length; i++) {
            const moves = chessEngine.getLegalMoves(board, whitePieces[i].row, whitePieces[i].col, enPassantTarget, promotion, castlingRights);
            legalMoves.push(moves);
        }
    }
    else {
        for (let i = 0; i < blackPieces.length; i++) {
            const moves = chessEngine.getLegalMoves(board, blackPieces[i].row, blackPieces[i].col, enPassantTarget, promotion, castlingRights);
            legalMoves.push(moves);
        }
    }

    const parsedLegalMoves = legalMoves.flat();
    
    if (parsedLegalMoves.length <= 0) {
        const status = chessEngine.getGameStatus(board, turn, enPassantTarget, promotion, castlingRights);

        if (status === "stalemate") {
            return {
                score: 0,
                bestMove: bestMove,
            }
        }

        if (status === "checkmate") {
            return {
                score: turn === "white" ? -Infinity : Infinity,
                bestMove: bestMove,
            }
        }
    }

    if (depth <= 0) {
        return {
            score: evaluateBoardMaterial(board) + evaluatePieceActivity(board),
            bestMove: bestMove,
        }
    }

    const sortedMoves = moveOrdering(board, parsedLegalMoves);

    for (let i = 0; i < sortedMoves.length; i++) {
        const castlingRightsCopy = { ...castlingRights };

        const { newBoard, newEnPassantTarget } = chessEngine.applyMove(board, sortedMoves[i], enPassantTarget, promotion, castlingRightsCopy);
        let evaluatedBoard = evaluatePossibleMoves(depth - 1, newBoard, newEnPassantTarget, promotion, castlingRightsCopy, turn === "white" ? "black" : "white", alpha, beta);
        
        if (evaluatedBoard.score > score && turn === "white") {
            bestMove = sortedMoves[i];
            score = evaluatedBoard.score;
            alpha = Math.max(alpha, score);
        }

        if (evaluatedBoard.score < score && turn === "black") {
            bestMove = sortedMoves[i];
            score = evaluatedBoard.score;
            beta = Math.min(beta, score);
        }

        if (alpha >= beta) {
            break;
        }
    }

    let resultType;

    if (score <= originalAlpa){
        resultType = "higher" as const;
    }
    else if (score >= originalBeta) {
        resultType = "lower" as const;
    }
    else {
        resultType = "exact" as const;
    }

    positionCache.set(positionHash, { depth, score, bestMove, resultType });

    return {
        score: score,
        bestMove: bestMove
    };
}

export {
    evaluateBoardMaterial,
    scanTheBoard,
    evaluatePossibleMoves,
}