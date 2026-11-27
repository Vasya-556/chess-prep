import { chessTypes } from "../types";
import { messageStore } from "../stores";
import { AppError } from "./appError";

const ROOK_DIRECTIONS = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
];

const BISHOP_DIRECTIONS = [
    [-1, -1], [1, 1], [1, -1], [-1, 1],
];

const QUEEN_DIRECTIONS = [
    ...ROOK_DIRECTIONS,
    ...BISHOP_DIRECTIONS,
];

const KNIGHT_OFFSETS = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
];

const KING_OFFESTS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1], [1, 0], [1, 1],
];

const isInsideBoard = (row: number, col: number): boolean => {
    return (row >= 0 && row <= 7) && (col >= 0 && col <= 7);
}

const getPiece = (board: chessTypes.Piece[][], row: number, col: number): chessTypes.Piece | null => {
    if (!isInsideBoard(row, col)){
        return null
    }
    return board[row][col]
}

const slidingMoves = (board: chessTypes.Piece[][], fromRow: number, fromCol: number, piece: chessTypes.Piece, directions: number[][]): chessTypes.Move[] => {
    const moves: chessTypes.Move[] = [];

    for (const [dr, dc] of directions) {
        let row = fromRow + dr;
        let col = fromCol + dc;

        while (isInsideBoard(row, col)){
            const target = board[row][col];

            if (target.type === "none") {
                moves.push({ from: [fromRow, fromCol], to: [row, col]});
            }
            else {
                if (target.color !== piece.color){
                    moves.push({ from: [fromRow, fromCol], to: [row, col]});
                }
                break;
            }
            row += dr;
            col += dc;
        }
    }

    return moves;
}

const stepMoves = (board: chessTypes.Piece[][], row: number, col: number, piece: chessTypes.Piece, offsets: number[][]): chessTypes.Move[] => {
    const moves: chessTypes.Move[] = [];

    for (const [dr, dc] of offsets) {
        const toRow = row + dr;
        const toCol = col + dc;

        if (!isInsideBoard(toRow, toCol)) {
            continue;
        }

        const target = board[toRow][toCol];

        if (target.type === "none" || target.color !== piece.color){
            moves.push({
                from: [row, col],
                to: [toRow, toCol],
            });
        }
    }

    return moves;
}

const pawnMoves = (board: chessTypes.Piece[][], row: number, col: number, piece: chessTypes.Piece, enPassantTarget: [number, number] | null): chessTypes.Move[] => {
    const moves: chessTypes.Move[] = [];
    const direction = piece.color === "white" ? -1: 1;
    const startRow = piece.color === "white" ? 6: 1;
    const oneStepRow = row + direction;

    // forward moves
    if (isInsideBoard(oneStepRow, col) && board[oneStepRow][col].type === "none"){
        moves.push({
            from: [row, col],
            to: [oneStepRow, col],
        });

        const twoStepRow = row + 2 * direction;

        if (row === startRow && board[twoStepRow][col].type === "none"){
            moves.push({
                from: [row, col],
                to: [twoStepRow, col],
            });
        };
    }

    // diagonal captures
    for (const dc of [-1, 1]){
        const targetRow = row + direction;
        const targetCol = col + dc;

        if (!isInsideBoard(targetRow, targetCol)){
            continue;
        }

        const target = board[targetRow][targetCol];

        if (target.type !== "none" && target.color !== piece.color) {
            moves.push({
                from: [row, col],
                to: [targetRow, targetCol],
            });
        }
    }

    // enPassant captures
    if (enPassantTarget !== null) {
        for (const dc of [-1, 1]){
            const targetRow = row + direction;
            const targetCol = col + dc;
            const requiredRow = piece.color === "white" ? 3 : 4;
            
            if (!isInsideBoard(targetRow, targetCol)){
                continue;
            }

            if (enPassantTarget[0] !== targetRow) {
                continue;
            }

            if (enPassantTarget[1] !== targetCol) {
                continue;
            }

            if (row === requiredRow && board[row][targetCol].type === "pawn" && board[row][targetCol].color !== piece.color){
                moves.push({
                from: [row, col],
                to: [targetRow, targetCol]
                })
            }
        }
    }

    return moves;
}

const findKing = (board: chessTypes.Piece[][], color: "white" | "black") => {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];

            if (piece.type && piece.type === "king" && piece.color === color){
                return [row, col];
            }
        }
    }

    messageStore.getState().setText(color + "king not found")
    throw new AppError(color + "King not found");
}

const isSquareAttacked = (board: chessTypes.Piece[][], row: number, col: number, byColor: "white" | "black"): boolean => {
    // pawn
    const pawnDirection = byColor === "white" ? 1 : -1;
    for (const dc of [-1, 1]) {
        const pawn = getPiece(board, row + pawnDirection, col + dc);

        if (pawn?.type === "pawn" && pawn.color === byColor) {
            return true;
        }
    }

    // knight
    for (const [dr, dc] of KNIGHT_OFFSETS) {
        const piece = getPiece(board, row + dr, col + dc);

        if (piece?.type === "knight" && piece.color === byColor){
            return true;
        }
    }

    // king
    for (const [dr, dc] of KING_OFFESTS) {
        const piece = getPiece(board, row + dr, col + dc); 

        if (piece?.type === "king" && piece.color === byColor) {
            return true;
        }
    }

    // rook, bishop, queen
    const checkDirections = (directions: number[][], attackers: chessTypes.Piece["type"][]): boolean => {
        for (const [dr, dc] of directions) {
            let toRow = row + dr;
            let toCol = col + dc;

            while (isInsideBoard(toRow, toCol)) {
                const piece = board[toRow][toCol];

                if (piece.type !== "none"){
                if (piece.color === byColor && attackers.includes(piece.type)){
                    return true;
                }

                break;
                }

                toRow += dr;
                toCol += dc;
            }
        }

        return false;
    }

    if (checkDirections(ROOK_DIRECTIONS, ["rook", "queen"])) {
        return true;
    }

    if (checkDirections(BISHOP_DIRECTIONS, ["bishop", "queen"])) {
        return true;
    }

    return false;
}

const getLegalMoves = (board: chessTypes.Piece[][], row: number, col: number, enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: chessTypes.CastlingRights) => {
    const piece = board[row][col];

    if (piece.type === "none") {
        return [];
    }

    let pseudoLegalMoves: chessTypes.Move[] = [];

    switch (piece.type) {
        case "rook":
            pseudoLegalMoves = slidingMoves(board, row, col, piece, ROOK_DIRECTIONS);
            break;

        case "bishop":
            pseudoLegalMoves = slidingMoves(board, row, col, piece, BISHOP_DIRECTIONS);
            break;

        case "queen":
            pseudoLegalMoves = slidingMoves(board, row, col, piece, QUEEN_DIRECTIONS);
            break;

        case "knight":
            pseudoLegalMoves = stepMoves(board, row, col, piece, KNIGHT_OFFSETS);
            break;

        case "king":
            pseudoLegalMoves = [
                ...stepMoves(board, row, col, piece, KING_OFFESTS),
                ...getCastlingMoves(board, piece.color, castlingRights),
            ]
            break;

        case "pawn":
            pseudoLegalMoves = pawnMoves(board, row, col, piece, enPassantTarget);
            break;
    }

    const opponentColor = piece.color === "white" ? "black" : "white";

    return pseudoLegalMoves.filter(move => {
        const newBoard = board.map(r => r.map(p => ({ ...p })));

        const [fromRow, fromCol] = move.from;
        const [toRow, toCol] = move.to;

        const isEnPassant = piece.type === "pawn" 
            && fromCol !== toCol
            && board[toRow][toCol].type === "none"
            && enPassantTarget !== null
            && enPassantTarget[0] === toRow
            && enPassantTarget[1] === toCol;

        const isPromotion = piece.type === "pawn" && toRow === (piece.color === "white" ? 0 : 7);

        newBoard[toRow][toCol] = {
            type: isPromotion ? promotion : piece.type,
            color: piece.color,
        };
        newBoard[fromRow][fromCol] = {
            type: "none",
            color: "black",
        };

        if (isEnPassant) {
            newBoard[fromRow][toCol] = {
                type: "none",
                color: "black",
            };
        };

        if (piece.type === "king" && Math.abs(toCol - fromCol) === 2) {
            const rookFromCol = toCol > fromCol ? 7 : 0;
            const rookToCol = toCol > fromCol ? 5 : 3;

            newBoard[fromRow][rookToCol] = newBoard[fromRow][rookFromCol];

            newBoard[fromRow][rookFromCol] = {
                type: "none",
                color: "black",
            };
        }

        const [kingRow, kingCol] = findKing(newBoard, piece.color);

        return !isSquareAttacked(newBoard, kingRow, kingCol, opponentColor);
    })
}

const isInCheck = (board: chessTypes.Piece[][], color: "white" | "black"): boolean => {
    const [kingRow, kingCol] = findKing(board, color);

    return isSquareAttacked(board, kingRow, kingCol, color === "white" ? "black" : "white");
}

const hasLegalMoves = (board: chessTypes.Piece[][], color: "white" | "black", enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: chessTypes.CastlingRights): boolean => {
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];

            if (piece.type !== "none" && piece.color === color){
                moves.push(getLegalMoves(board, row, col, enPassantTarget, promotion, castlingRights));
            }
        }
    }

    if(moves.some(move => move.length > 0)){
        return true;
    }

    return false;
}

const getGameStatus = (board: chessTypes.Piece[][], color: "white" | "black", enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: chessTypes.CastlingRights): "check" | "checkmate" | "stalemate" | null => {
    let state: "check" | "checkmate" | "stalemate" | null;

    if (isInCheck(board, color)){
        if (hasLegalMoves(board, color, enPassantTarget, promotion, castlingRights)){
            state = "check";
        }
        else {
            state = "checkmate"
        }
    }
    else {
        if (hasLegalMoves(board, color, enPassantTarget, promotion, castlingRights)){
            state = null;
        }
        else {
            state = "stalemate"
        }
    }

    return state;
}

const applyMove = (board: chessTypes.Piece[][], move: chessTypes.Move, enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: chessTypes.CastlingRights) => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    const piece = board[fromRow][fromCol];

    const capturedPiece = board[toRow][toCol];
    updateCastlingMoves(move, piece, capturedPiece, castlingRights);

    const newBoard = board.map(row => row.map(piece => ({ ...piece })));

    // enPassant
    const isEnPassant = piece.type === "pawn" 
        && fromCol !== toCol
        && board[toRow][toCol].type === "none"
        && enPassantTarget !== null
        && enPassantTarget[0] === toRow
        && enPassantTarget[1] === toCol
        && board[fromRow][toCol].type === "pawn"
        && board[fromRow][toCol].color !== piece.color;

    if (isEnPassant) {
        newBoard[fromRow][toCol] = {
            type: "none",
            color: "black",
        };
    };

    const newEnPassantTarget: [number, number] | null = 
        piece.type === "pawn" && Math.abs(fromRow - toRow) === 2
            ? [(fromRow + toRow) / 2, fromCol]
            : null;

    const isPromotion = piece.type === "pawn" && toRow === (piece.color === "white" ? 0 : 7);

    newBoard[toRow][toCol] = {
        type: isPromotion ? promotion : piece.type,
        color: piece.color,
    }

    newBoard[fromRow][fromCol] = {
        type: "none",
        color: "black",
    }

    if (piece.type === "king" && Math.abs(toCol - fromCol) === 2) {
        const rookFromCol = toCol > fromCol ? 7 : 0;
        const rookToCol = toCol > fromCol ? 5 : 3;

        newBoard[fromRow][rookToCol] = newBoard[fromRow][rookFromCol];

        newBoard[fromRow][rookFromCol] = {
            type: "none",
            color: "black",
        };
    };

    return {
        newBoard,
        newEnPassantTarget,
    };
}


const canCastle = (board: chessTypes.Piece[][], color: "white" | "black", side: "queen" | "king", castlingRights: chessTypes.CastlingRights): boolean => {
    const row = color === "white" ? 7 : 0;
    const opponent = color === "white" ? "black" : "white";

    const king = board[row][4];
    const rookCol = side === "king" ? 7 : 0;
    const rook = board[row][rookCol];

    if (color === "white") {
        if (castlingRights.whiteKingMoved){
            return false;
        }

        if (side === "king" && !castlingRights.whiteKingSide) {
            return false;
        }

        if (side === "queen" && !castlingRights.whiteQueenSide) {
            return false;
        }
    }
    else {
        if (castlingRights.blackKingMoved){
            return false;
        }

        if (side === "king" && !castlingRights.blackKingSide) {
            return false;
        }

        if (side === "queen" && !castlingRights.blackQueenSide) {
            return false;
        }
    }

    if (king.type !== "king" || king.color !== color) {
        return false;
    }

    if (rook.type !== "rook" || rook.color !== color) {
        return false;
    }

    const emptyCols = side === "king"? [5, 6] : [1, 2, 3];

    for (const col of emptyCols) {
        if (board[row][col].type !== "none"){
            return false;
        }
    }

    const newRookCol = side === "king" ? 5 : 3;
    const newKingCol = side === "king" ? 6 : 2;

    if (isSquareAttacked(board, row, 4, opponent)){
        return false;
    }

    if (isSquareAttacked(board, row, newRookCol, opponent)){
        return false;
    }

    if (isSquareAttacked(board, row, newKingCol, opponent)){
        return false;
    }

    return true;
}

const getCastlingMoves = (board: chessTypes.Piece[][], color: "white" | "black", castlingRights: chessTypes.CastlingRights): chessTypes.Move[] => {
    const row = color === "white" ? 7 : 0;
    const moves: chessTypes.Move[] = [];

    for (const side of ["king", "queen"] as const) {
        if (canCastle(board, color, side, castlingRights)){
            moves.push({
                from: [row, 4],
                to: [row, side === "king" ? 6 : 2],
            })
        }
    }

    return moves;
}

const updateCastlingMoves = (move: chessTypes.Move, movingPiece: chessTypes.Piece, capturedPiece: chessTypes.Piece, castlingRights: chessTypes.CastlingRights) => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    if (movingPiece.type === "king") {
        if (movingPiece.color === "white") {
            castlingRights.whiteKingMoved = true;
            castlingRights.whiteKingSide = false;
            castlingRights.whiteQueenSide = false;
        }
        else {
            castlingRights.blackKingMoved = true;
            castlingRights.blackKingSide = false;
            castlingRights.blackQueenSide = false;
        }      
    }

    if (movingPiece.type === "rook") {
        if (fromRow === 7 && fromCol === 0){
            castlingRights.whiteQueenSide = false;
        }

        if (fromRow === 7 && fromCol === 7){
            castlingRights.whiteKingSide = false;
        }

        if (fromRow === 0 && fromCol === 0){
            castlingRights.blackQueenSide = false;
        }

        if (fromRow === 0 && fromCol === 7){
            castlingRights.blackKingSide = false;
        }
    }

    if (capturedPiece.type === "rook") {
        if (capturedPiece.color === "white") {
            if (toRow === 7 && toCol === 0) {
                castlingRights.whiteQueenSide = false;
            }
            if (toRow === 7 && toCol === 7) {
                castlingRights.whiteKingSide = false;
            }
        }
        else {
            if (toRow === 0 && toCol === 0) {
                castlingRights.blackQueenSide = false;
            }
            if (toRow === 0 && toCol === 7) {
                castlingRights.blackKingSide = false;
            }
        }
    }
}

const generateBoard = () => {
    const board: chessTypes.Piece[][] = [];

    const backRank: chessTypes.Piece["type"][] = [
        "rook", "knight", "bishop", "queen", 
        "king", "bishop", "knight", "rook", 
    ]

    for (let i = 0; i < 8; i++) {
        const row: chessTypes.Piece[] = [];
        board.push(row);
    }

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            board[i].push({
                type: "none",
                color: "black",
            })
        }
    }
    
    for (let i = 0; i < 8; i++) {
        board[0][i] = {
            type: backRank[i],
            color: "black"
        }

        board[1][i] = {
            type: "pawn",
            color: "black"
        }

        board[6][i] = {
            type: "pawn",
            color: "white"
        }

        board[7][i] = {
            type: backRank[i],
            color: "white"
        }
    }
    
    return board;
}

export {
    isInsideBoard,
    getPiece,
    slidingMoves,
    stepMoves,
    pawnMoves,
    findKing,
    isSquareAttacked,
    getLegalMoves,
    isInCheck,
    hasLegalMoves,
    getGameStatus,
    applyMove,
    canCastle,
    getCastlingMoves,
    updateCastlingMoves,
    generateBoard,
}