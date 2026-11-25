import { chessTypes } from "../types";
import { chessEngine } from ".";

const convertColumnToFile = (col: number): string => {
    const abc = "abcdefgh";
    return abc[col];
}

const convertRowToRank = (row: number): number => {
    return Math.abs(row - 8);
}

const moveToNotation = (move: chessTypes.Move, status: string | null, position: chessTypes.Piece[][], promotion: "queen" | "rook" | "bishop" | "knight") => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;
    const currentPiece = position[fromRow][fromCol];
    const capturedSquare = position[toRow][toCol];

    const fromRank = convertRowToRank(fromRow);
    const fromFile = convertColumnToFile(fromCol);
    const toRank = convertRowToRank(toRow);
    const toFile = convertColumnToFile(toCol);
    
    let result: string = "";

    switch (currentPiece.type) {
        case "rook":
            result += "R";
            break;
        
        case "bishop":
            result += "B";
            break;

        case "knight":
            result += "N";
            break;

        case "queen":
            result += "Q";
            break;

        case "king":
            result += "K";
            break;

        default:
            break;
    }

    if (currentPiece.type !== "pawn" && currentPiece.type !== "king") {
        const competingPieces: [number, number][] = [];

        for (let i = 0; i < 8; i++){
            for (let j = 0; j < 8; j++) {
            if (i === fromRow && j === fromCol) {
                continue;
            }

            const candidatePiece = position[i][j];

            if (candidatePiece.type !== currentPiece.type || candidatePiece.color !== currentPiece.color) {
                continue;
            }

            const candidateMoves = chessEngine.getLegalMoves(
                position, 
                i, 
                j, 
                null, 
                promotion, 
                {
                    whiteKingMoved: false,
                    blackKingMoved: false,
                    whiteKingSide: true,
                    whiteQueenSide: true,
                    blackKingSide: true,
                    blackQueenSide: true,
                }
            );
            const canReach = candidateMoves.some(candidateMove => {
                return candidateMove.to[0] === toRow && candidateMove.to[1] === toCol;
            });

            if (canReach) {
                competingPieces.push([i, j])
            }
            }
        }
        if (competingPieces.length > 0) {
            const isSameRank = competingPieces.some(([row]) => {
                return row === fromRow;
            });
            
            const isSameFile = competingPieces.some(([, col]) => {
                return col === fromCol;
            });

            if (isSameFile) {
                result += fromFile;
            }
            else if (!isSameRank) {
                result += fromRank;
            }
            else {
                result += fromFile + fromRank
            }
        }
    }

    if (currentPiece.type === "pawn" && capturedSquare.type !== "none") {
        result += fromFile;      
    }

    if (capturedSquare.type !== "none") {
        result += "x";
    }

    result += toFile;
    result += toRank;

    if (currentPiece.type === "pawn") {
        if (toRank === 8 || toRank === 1){
            let promotionPiece = "Q";
            switch (promotion) {
                case "bishop":
                    promotionPiece = "B";
                    break;

                case "rook":
                    promotionPiece = "R";
                    break;

                case "knight":
                    promotionPiece = "N";
                    break;
            }
            result += `=${promotionPiece}`;
        }
    }

    if (currentPiece.type === "king") {
        if (Math.abs(toCol - fromCol) === 2) {
            result = toCol === 6 ? "O-O" : "O-O-O";
        }
    }

    switch (status) {
        case "check":
            result += "+";
            break;

        case "checkmate":
            result += "#";
            break;
    }

    return result;
}

const notationToMove = (notation: string, color: "white" | "black", board: chessTypes.Piece[][], enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: { whiteKingMoved: boolean; blackKingMoved: boolean; whiteKingSide: boolean; whiteQueenSide: boolean; blackKingSide: boolean; blackQueenSide: boolean }): { move: chessTypes.Move, board: chessTypes.Piece[][]} => {
    const isWhiteTurn = color === "white";

    const notation1 = notation.replace("+", "");
    const notation2 = notation1.replace("#", ""); 

    const isCastleKingSide = notation2 === "O-O";
    const isCastleQueenSide = notation2 === "O-O-O";
    const isPromotion = notation2.includes("=");
    let promotionType: chessTypes.Piece["type"] = "none";
    
    const notation3 = isPromotion ? notation2.slice(0, notation2.indexOf("=")) : notation2;

    const rank = "abcdefgh";
    const pieces = "KNBRQ";

    let move: chessTypes.Move | null = null;

    if (isCastleQueenSide) {
        move = {
            from: [isWhiteTurn ? 7 : 0, 4],
            to: [isWhiteTurn ? 7 : 0, 2],
        }
    }
    else if (isCastleKingSide) {
        move = {
            from: [isWhiteTurn ? 7 : 0, 4],
            to: [isWhiteTurn ? 7 : 0, 6],
        }
    }

    if (isPromotion) {
        const promotionLetter = notation2[notation2.indexOf("=") + 1];

        switch (promotionLetter) {
            case "Q":
                promotionType = "queen";
                break;

            case "R":
                promotionType = "rook";
                break;

            case "B":
                promotionType = "bishop";
                break;

            case "N":
                promotionType = "knight";
                break;

            default:
                throw new Error(`invalid promotion ${notation}`);
        }
    }

    if (move === null) {
        const destination = notation3.slice(-2);
        const toFile = rank.indexOf(destination[0]);
        const toRank = Math.abs(8 - Number(destination[1]));

        let prefix = notation3.slice(0, -2);  
        let pieceType: chessTypes.Piece["type"] = "pawn";

        if (pieces.includes(prefix[0])) {
            switch (prefix[0]) {
                case "K": 
                    pieceType = "king";
                    break;

                case "R": 
                    pieceType = "rook";
                    break;

                case "B": 
                    pieceType = "bishop";
                    break;

                case "Q": 
                    pieceType = "queen";
                    break;

                case "N": 
                    pieceType = "knight";
                    break;  
            }
            prefix = prefix.slice(1);
        }

        prefix = prefix.replace("x", "");

        let originalCol = -1;
        let originalRow = -1;

        for (let i = 0; i < prefix.length; i++) {
            if (rank.includes(prefix[i])){
                originalCol = rank.indexOf(prefix[i]);
            }
            else if ("12345678".includes(prefix[i])) {
                originalRow = Math.abs(8 - Number(prefix[i]));
            }
        }

        const matchingMoves: chessTypes.Move[] = [];

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];

                if (piece.type !== pieceType) {
                    continue;
                }

                if (piece.color !== color) {
                    continue;
                }

                if (originalCol !== -1 && j !== originalCol) {
                    continue;
                }

                if (originalRow !== -1 && i !== originalRow) {
                    continue;
                }

                const candidateMoves = chessEngine.getLegalMoves(board, i, j, enPassantTarget, promotion, castlingRights);

                const matchedMove = candidateMoves.find(move => {
                    return move.to[0] === toRank && move.to[1] === toFile;
                })

                if (matchedMove) {
                    matchingMoves.push(matchedMove);
                }
            }
        }
        
        if (matchingMoves.length !== 1) {
            throw new Error(`Could not uniquely identify ${notation}`);
        }

        move = matchingMoves[0];
    }
    
    if (move === null) {
        throw new Error(`Could not uniquely identify ${notation}`);
    }

    const result = chessEngine.applyMove(board, move, enPassantTarget, promotion, castlingRights);

    if (promotionType !== "none") {
        const [toRow, toCol] = move.to;
        result.newBoard[toRow][toCol].type = promotionType;
    }

    return {
        move,
        board: result.newBoard
    }
}

const PGNParser = (notation: string, enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: { whiteKingMoved: boolean; blackKingMoved: boolean; whiteKingSide: boolean; whiteQueenSide: boolean; blackKingSide: boolean; blackQueenSide: boolean }): chessTypes.Move[][] => {
    // replace tags, comments, score, result
    notation = notation.replaceAll(/\{[\s\S]*?\}/g, "");
    notation = notation.replaceAll(/\[[\s\S]*?\]/g, "");
    notation = notation.replaceAll(/\d-\d/g, "");
    notation = notation.replaceAll(/\d\/\d-\d\/\d/g, "");
    notation = notation.replaceAll("*", "");
    notation = notation.replaceAll("#", "");
    notation = notation.replaceAll("+", "");

    const hasVariations: boolean = notation.includes("(");
    let board = chessEngine.generateBoard();
    const result: chessTypes.Move[][] = [[]];

    if (hasVariations) {
        let turn: "white" | "black" = "white";
        let currentLine = result[0];
        let boardsBefore: chessTypes.Piece[][][] = [];

        const variationStack: [
            chessTypes.Move[],
            chessTypes.Piece[][][],
            chessTypes.Piece[][],
            "white" | "black"
        ][] = [];

        const cloneBoard = (board: chessTypes.Piece[][]): chessTypes.Piece[][] =>
            board.map(row => row.map(piece => ({ ...piece })));

        const tokens = notation
            .replaceAll("(", " ( ")
            .replaceAll(")", " ) ")
            .replace(/(\d+\.(?:\.\.)?)/g, " $1 ")
            .trim()
            .split(/\s+/);

        for (const token of tokens) {
            if (token === "(") {
                const moveIndex = currentLine.length - 1;

                if (moveIndex < 0) {
                    continue;
                }

                const variationBoard = cloneBoard(boardsBefore[moveIndex]);
                const variationTurn: "white" | "black" = turn === "white" ? "black" : "white";

                variationStack.push([
                    currentLine,
                    boardsBefore,
                    cloneBoard(board),
                    turn
                ]);

                currentLine = currentLine.slice(0, moveIndex);
                boardsBefore = boardsBefore.slice(0, moveIndex);

                result.push(currentLine);

                board = variationBoard;
                turn = variationTurn;

                continue;
            }

            if (token === ")") {
                const context = variationStack.pop();

                if (!context) {
                    continue;
                }

                [currentLine, boardsBefore, board, turn] = context;

                continue;
            }

            if (/^\d+\.(?:\.\.)?$/.test(token)) {
                turn = token.endsWith("...") ? "black" : "white";
                continue;
            }

            const boardBefore = cloneBoard(board);

            const { move, board: newBoard } = notationToMove(token, turn, board, enPassantTarget, promotion, castlingRights);

            currentLine.push(move);
            boardsBefore.push(boardBefore);

            board = newBoard;
            turn = turn === "white" ? "black" : "white";
        }
    }
    else {
        const moves: string[] = notation.split(/\d+\.(?:\.\.)?/);

        let turn: "white" | "black" = "white";

        for (const m of moves) {
            const sanMoves = m.trim().split(/\s+/);

            for (const san of sanMoves) {
                if (san === "") {
                    continue;
                }

                const { move, board: newBoard } = notationToMove(san, turn, board, enPassantTarget, promotion, castlingRights);

                board = newBoard;
                result[0].push(move);
                turn = turn === "white" ? "black" : "white";
            }
        }
    }

    return result;
};

const buildHistory = (moveSet: chessTypes.Move[][], initialBoard: chessTypes.Piece[][], enPassantTarget: [number, number] | null, promotion: "queen" | "rook" | "bishop" | "knight", castlingRights: { whiteKingMoved: boolean; blackKingMoved: boolean; whiteKingSide: boolean; whiteQueenSide: boolean; blackKingSide: boolean; blackQueenSide: boolean }) => {
    const historyLines: chessTypes.HistoryLine[] = [];
    const initEnPassantTarget = enPassantTarget;
    const initCastlingRgihts = { ...castlingRights };
    
    for (const moves of moveSet) {
        let newBoard = JSON.parse(JSON.stringify(initialBoard));
        const afterBoards: chessTypes.Piece[][][] = [];

        enPassantTarget = initEnPassantTarget;
        castlingRights = initCastlingRgihts;

        for (const move of moves) {
            const result = chessEngine.applyMove(newBoard, move, enPassantTarget, promotion, castlingRights);
            newBoard = result.newBoard;
            enPassantTarget = result.newEnPassantTarget;
            
            afterBoards.push(JSON.parse(JSON.stringify(newBoard)));
        }
        const history: chessTypes.HistoryLine = { moves, afterBoards };
        historyLines.push(history);
    }

    return historyLines;
}

export {
    convertColumnToFile,
    convertRowToRank,
    moveToNotation,
    notationToMove,
    PGNParser,
    buildHistory,
}