import styles from "./Board.module.css";
import {
  useState,
  useRef,
  useMemo,
} from "react"
import { appConfig } from "../../configs";
import londonSystem from "../../data/chessbook-london-1400-1600.pgn?raw";

type Piece = {
  type: "rook" | "knight" | "king" | "bishop" | "queen" | "pawn" | "none",
  color: "white" | "black",
}

type Move = {
  from: [number, number],
  to: [number, number],
}

function Board() {
  const generateBoard = () => {
    let board: Piece[][] = [];

    const backRank: Piece["type"][] = [
      "rook", "knight", "bishop", "queen", 
      "king", "bishop", "knight", "rook", 
    ]

    for (let i = 0; i < 8; i++) {
      let row: Piece[] = [];
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

  const [board, setBoard] = useState<Piece[][]>(() => generateBoard());
  const [currentTurn, setCurrentTurn] = useState<"white" | "black">("white");
  const enPassantTarget = useRef<[number, number] | null>(null);
  const [gameStatus, setGameStatus] = useState<"check" | "checkmate" | "stalemate" | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<{row: number, col: number} | null>(null);
  const [selectedLegalMoves, setSelectedLegalMoves] = useState<Move[]>([]);
  const [promotion, setPromotion] = useState<"queen" | "rook" | "bishop" | "knight">("queen");
  const castlingRights = useRef({
    whiteKingMoved: false,
    blackKingMoved: false,
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  });

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

  const displayBoard = (board: Piece[][]) => {
    let result = [];
    for (let i = 0; i < board.length; i++) {
      let row = board[i]; 
      result.push(<div 
        style={{"display": "inline-flex",
          "width": "30px", 
          "height": "30px",
          "verticalAlign": "middle", 
          "justifyContent": "center",
          "alignItems": "center",
        }}
      >{Math.abs(8 - i)}</div>);
      for (let j = 0; j < row.length; j++) {
        const isSelected = selectedSquare?.row === i && selectedSquare?.col === j;
        const isLegalDestination = selectedLegalMoves.some((move) => {
          return move.to[0] === i && move.to[1] === j;
        })

        result.push(<div
          key={`${i}-${j}`}
          onClick={() => handleSquareClick(i, j)}
          style={{"display": "inline-flex", 
            "verticalAlign": "middle", 
            "backgroundColor": isSelected ? "yellow" : isLegalDestination ? "blue" : ((i+j)%2 === 0 ? "red" : "green"), 
            "width": "50px", 
            "height": "50px",
            "justifyContent": "center",
            "alignItems": "center",
          }}>{
          board[i][j].type === "none"
            ? ""
            : <img
              src={`${appConfig.isProd ? "" : "chess-prep/"}assets/${board[i][j].color}_${board[i][j].type}.svg`}
              // src={"chess-prep/assets/" + board[i][j].color + "_" + board[i][j].type + ".svg"}
              width="30px"
              height="30px"
            />
        }</div>);
      }
      result.push(<br key={`row-${i}`}/>);
    }
    result.push(<div
      style={{"display": "inline-flex",
        "width": "30px", 
        "height": "30px",
        "verticalAlign": "middle", 
        "justifyContent": "center",
        "alignItems": "center",
      }}
    ></div>);
    for (let i = 0; i <= 7; i++) {
      const abc = "abcdefgh";
      result.push(<div
        style={{"display": "inline-flex",
          "width": "50px", 
          "height": "30px",
          "verticalAlign": "middle", 
          "justifyContent": "center",
          "alignItems": "center",
        }}
      >{abc[i]}</div>)
    }
    return result;
  }

  const isInsideBoard = (row: number, col: number): boolean => {
    return (row >= 0 && row <= 7) && (col >= 0 && col <= 7);
  }

  const getPiece = (board: Piece[][], row: number, col: number): Piece | null => {
    if (!isInsideBoard(row, col)){
      return null
    }
    return board[row][col]
  }

  const slidingMoves = (board: Piece[][], fromRow: number, fromCol: number, piece: Piece, directions: number[][]): Move[] => {
    const moves: Move[] = [];

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

  const stepMoves = (board: Piece[][], row: number, col: number, piece: Piece, offsets: number[][]): Move[] => {
    const moves: Move[] = [];

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

  const pawnMoves = (board: Piece[][], row: number, col: number, piece: Piece): Move[] => {
    const moves: Move[] = [];
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
    if (enPassantTarget.current !== null) {
      for (const dc of [-1, 1]){
        const targetRow = row + direction;
        const targetCol = col + dc;
        const requiredRow = piece.color === "white" ? 3 : 4;
        
        if (!isInsideBoard(targetRow, targetCol)){
          continue;
        }

        if (enPassantTarget.current[0] !== targetRow) {
          continue;
        }

        if (enPassantTarget.current[1] !== targetCol) {
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

  const findKing = (board: Piece[][], color: "white" | "black") => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (piece.type && piece.type === "king" && piece.color === color){
          return [row, col];
        }
      }
    }

    throw new Error(color + "King not found");
  }

  const isSquareAttacked = (board: Piece[][], row: number, col: number, byColor: "white" | "black"): boolean => {
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
    const checkDirections = (directions: number[][], attackers: Piece["type"][]): boolean => {
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

  const getLegalMoves = (board: Piece[][], row: number, col: number) => {
    const piece = board[row][col];

    if (piece.type === "none") {
      return [];
    }

    let pseudoLegalMoves: Move[] = [];

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
          ...getCastlingMoves(board, piece.color),
        ]
        // pseudoLegalMoves = stepMoves(board, row, col, piece, KING_OFFESTS);
        break;

      case "pawn":
        pseudoLegalMoves = pawnMoves(board, row, col, piece);
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
        && enPassantTarget.current !== null
        && enPassantTarget.current[0] === toRow
        && enPassantTarget.current[1] === toCol;

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

  const isInCheck = (board: Piece[][], color: "white" | "black"): boolean => {
    const [kingRow, kingCol] = findKing(board, color);

    return isSquareAttacked(board, kingRow, kingCol, color === "white" ? "black" : "white");
  }

  const hasLegalMoves = (board: Piece[][], color: "white" | "black"): boolean => {
    let moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (piece.type !== "none" && piece.color === color){
          moves.push(getLegalMoves(board, row, col));
        }
      }
    }

    if(moves.some(move => move.length > 0)){
      return true;
    }

    return false;
  }

  const getGameStatus = (board: Piece[][], color: "white" | "black"): "check" | "checkmate" | "stalemate" | null => {
    let state: "check" | "checkmate" | "stalemate" | null = null;
    if (isInCheck(board, color)){
      if (hasLegalMoves(board, color)){
        state = "check";
      }
      else {
        state = "checkmate"
      }
    }
    else {
      if (hasLegalMoves(board, color)){
        state = null;
      }
      else {
        state = "stalemate"
      }
    }

    return state;
  }

  const applyMove = (board: Piece[][], move: Move) => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    const piece = board[fromRow][fromCol];

    const capturedPiece = board[toRow][toCol];
    updateCastlingMoves(move, piece, capturedPiece);

    const newBoard = board.map(row => row.map(piece => ({ ...piece })));

    // enPassant
    const isEnPassant = piece.type === "pawn" 
      && fromCol !== toCol
      && board[toRow][toCol].type === "none"
      && enPassantTarget.current !== null
      && enPassantTarget.current[0] === toRow
      && enPassantTarget.current[1] === toCol
      && board[fromRow][toCol].type === "pawn"
      && board[fromRow][toCol].color !== piece.color;
    
    if (isEnPassant) {
      newBoard[fromRow][toCol] = {
        type: "none",
        color: "black",
      };
    };

    enPassantTarget.current = null;

    if (piece.type === "pawn" && Math.abs(fromRow - toRow) === 2) {
      enPassantTarget.current = [(fromRow + toRow) / 2, fromCol];
    }
    
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

    return newBoard;
  }

  const canCastle = (board: Piece[][], color: "white" | "black", side: "queen" | "king"): boolean => {
    const row = color === "white" ? 7 : 0;
    const opponent = color === "white" ? "black" : "white";

    const king = board[row][4];
    const rookCol = side === "king" ? 7 : 0;
    const rook = board[row][rookCol];

    if (color === "white") {
      if (castlingRights.current.whiteKingMoved){
        return false;
      }

      if (side === "king" && !castlingRights.current.whiteKingSide) {
        return false;
      }

      if (side === "queen" && !castlingRights.current.whiteQueenSide) {
        return false;
      }
    }
    else {
      if (castlingRights.current.blackKingMoved){
        return false;
      }

      if (side === "king" && !castlingRights.current.blackKingSide) {
        return false;
      }

      if (side === "queen" && !castlingRights.current.blackQueenSide) {
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

  const getCastlingMoves = (board: Piece[][], color: "white" | "black"): Move[] => {
    const row = color === "white" ? 7 : 0;
    const moves: Move[] = [];

    for (const side of ["king", "queen"] as const) {
      if (canCastle(board, color, side)){
        moves.push({
          from: [row, 4],
          to: [row, side === "king" ? 6 : 2],
        })
      }
    }

    return moves;
  }

  const updateCastlingMoves = (move: Move, movingPiece: Piece, capturedPiece: Piece) => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    if (movingPiece.type === "king") {
      if (movingPiece.color === "white") {
        castlingRights.current.whiteKingMoved = true;
        castlingRights.current.whiteKingSide = false;
        castlingRights.current.whiteQueenSide = false;
      }
      else {
        castlingRights.current.blackKingMoved = true;
        castlingRights.current.blackKingSide = false;
        castlingRights.current.blackQueenSide = false;
      }      
    }

    if (movingPiece.type === "rook") {
      if (fromRow === 7 && fromCol === 0){
        castlingRights.current.whiteQueenSide = false;
      }

      if (fromRow === 7 && fromCol === 7){
        castlingRights.current.whiteKingSide = false;
      }

      if (fromRow === 0 && fromCol === 0){
        castlingRights.current.blackQueenSide = false;
      }

      if (fromRow === 0 && fromCol === 7){
        castlingRights.current.blackKingSide = false;
      }
    }

    if (capturedPiece.type === "rook") {
      if (capturedPiece.color === "white") {
        if (toRow === 7 && toCol === 0) {
          castlingRights.current.whiteQueenSide = false;
        }
        if (toRow === 7 && toCol === 7) {
          castlingRights.current.whiteKingSide = false;
        }
      }
      else {
        if (toRow === 0 && toCol === 0) {
          castlingRights.current.blackQueenSide = false;
        }
        if (toRow === 0 && toCol === 7) {
          castlingRights.current.blackKingSide = false;
        }
      }
    }
  }

  const handleSquareClick = (row: number, col: number) => {
    const selectedPiece: Piece = board[row][col];
    
    if (selectedSquare !== null){
      const move = selectedLegalMoves.find((move) => {
        return move.to[0] === row && move.to[1] === col
      });

      if (move !== undefined) {
        executeMove(move);
      }
      else if (selectedPiece.type !== "none" && selectedPiece.color === currentTurn){
        setSelectedSquare({row, col});
        setSelectedLegalMoves(() => getLegalMoves(board, row, col));
      }
      else {
        setSelectedSquare(null);
        setSelectedLegalMoves([]);
      }
    }
    else {
      if (selectedPiece.type === "none") {
        return;
      }
  
      if (selectedPiece.color !== currentTurn){
        return;
      }
  
      setSelectedSquare({row, col});
      setSelectedLegalMoves(() => getLegalMoves(board, row, col));
    }
  }

  const executeMove = (move: Move) => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    if (board[fromRow][fromCol].color !== currentTurn || board[fromRow][fromCol].type === "none"){
      return;
    }
    
    const legalMoves = getLegalMoves(board, fromRow, fromCol);

    const requestedMove = legalMoves.find((m) => {
      return m.from[0] === fromRow && m.from[1] === fromCol && m.to[0] === toRow && m.to[1] === toCol;
    })

    if (requestedMove === undefined) {
      return;
    }

    const newBoard = applyMove(board, requestedMove);
    const status = getGameStatus(newBoard, currentTurn === "white" ? "black" : "white");
    
    setBoard(newBoard);
    setCurrentTurn(currentTurn === "white" ? "black" : "white");
    setGameStatus(status);
    setSelectedSquare(null);
    setSelectedLegalMoves([]);
  }

  const handleRestart = (e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();

    setBoard(generateBoard());
    setCurrentTurn("white");
    setGameStatus(null);
    setSelectedSquare(null);
    setSelectedLegalMoves([]);
    setPromotion("queen");

    enPassantTarget.current = null;

    castlingRights.current = {
      whiteKingMoved: false,
      blackKingMoved: false,
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    }
  }

  const convertColumnToFile = (col: number): string => {
    const abc = "abcdefgh";
    return abc[col];
  }

  const convertRowToRank = (row: number): number => {
    return Math.abs(row - 8);
  }

  const moveToNotation = (move: Move, status: string | null, position: Piece[][]) => {
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

          const candidateMoves = getLegalMoves(position, i, j);
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

  const notationToMove = (notation: string, color: "white" | "black", board: Piece[][]): { move: Move, board: Piece[][] } => {
    const isWhiteTurn = color === "white";

    const notation1 = notation.replace("+", "");
    const notation2 = notation1.replace("#", ""); 

    const isCastleKingSide = notation2 === "O-O";
    const isCastleQueenSide = notation2 === "O-O-O";
    const isPromotion = notation2.includes("=");
    let promotionType: Piece["type"] = "none";
    
    const notation3 = isPromotion ? notation2.slice(0, notation2.indexOf("=")) : notation2;

    const rank = "abcdefgh";
    const pieces = "KNBRQ";

    let move: Move | null = null;

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
      let pieceType: Piece["type"] = "pawn";
  
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
  
      const matchingMoves: Move[] = [];
  
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
  
          const candidateMoves = getLegalMoves(board, i, j);
  
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

    const newBoard = applyMove(board, move);

    if (promotionType !== "none") {
      const [toRow, toCol] = move.to;
      newBoard[toRow][toCol].type = promotionType;
    }

    return {
      move,
      board: newBoard
    }
  }

  const PGNParser = (notation: string): Move[][] => {
    // replace tags, comments, score, result
    notation = notation.replaceAll(/\{[\s\S]*?\}/g, "");
    notation = notation.replaceAll(/\[[\s\S]*?\]/g, "");
    notation = notation.replaceAll(/\d-\d/g, "");
    notation = notation.replaceAll(/\d\/\d-\d\/\d/g, "");
    notation = notation.replaceAll("*", "");
    notation = notation.replaceAll("#", "");
    notation = notation.replaceAll("+", "");

    const hasVariations: boolean = notation.includes("(");
    let board = generateBoard();
    let result: Move[][] = [[]];

    if (hasVariations) {
      let turn: "white" | "black" = "white";
      let currentLine = result[0];
      let boardsBefore: Piece[][][] = [];

      const variationStack: [
        Move[],
        Piece[][][],
        Piece[][],
        "white" | "black"
      ][] = [];

      const cloneBoard = (board: Piece[][]): Piece[][] =>
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

        const { move, board: newBoard } = notationToMove(token, turn, board);

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

          const { move, board: newBoard } = notationToMove(san, turn, board);

          board = newBoard;
          result[0].push(move);
          turn = turn === "white" ? "black" : "white";
        }
      }
    }

    return result;
  };

  const buildHistory = (moveSet: Move[][], initialBoard: Piece[][]) => {
    let historyLines: HistoryLine[] = [];
    const initEnPassantTarget = enPassantTarget.current;
    const initCastlingRgihts = { ...castlingRights.current };
    
    for (const moves of moveSet) {
      let newBoard = JSON.parse(JSON.stringify(initialBoard));
      let afterBoards: Piece[][][] = [];

      enPassantTarget.current = initEnPassantTarget;
      castlingRights.current = initCastlingRgihts;

      for (const move of moves) {
        newBoard = applyMove(newBoard, move);
        
        afterBoards.push(JSON.parse(JSON.stringify(newBoard)));
      }
      const history: HistoryLine = { moves, afterBoards };
      historyLines.push(history);
    }

    enPassantTarget.current = initEnPassantTarget;

    return historyLines;
  }

  type HistoryLine = {
    moves: Move[];
    afterBoards: Piece[][][];
  };

  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const initialBoard = useMemo(() => generateBoard(), []);
  const [history] = useState<HistoryLine[]>(() => buildHistory(PGNParser(londonSystem), initialBoard));
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [historyBoard, setHistoryBoard] = useState<Piece[][]>(initialBoard);

  const getHistoryPosition = (history: HistoryLine[], initialBoard: Piece[][], lineIndex: number, positionIndex: number) => {
    let position: Piece[][];

    if (positionIndex === 0) {
      position = initialBoard;
    }
    else {
      position = history[lineIndex].afterBoards[positionIndex - 1];
    }

    return position
  }

  const goPrevious = (e? :React.BaseSyntheticEvent) => {
    e?.preventDefault();

    if (historyIndex > 0) {
      const position = getHistoryPosition(history, initialBoard, activeLineIndex, historyIndex - 1);
      
      setHistoryIndex(curr => curr - 1);

      setHistoryBoard(position);
    }
  }

  const goNext = (e? :React.BaseSyntheticEvent) => {
    e?.preventDefault();
    
    if (historyIndex < history[activeLineIndex].moves.length) {
      const position = getHistoryPosition(history, initialBoard, activeLineIndex, historyIndex + 1);

      setHistoryIndex(curr => curr + 1);

      setHistoryBoard(position);
    }
  }

  const getAvailableVatiations = (history: HistoryLine[], activeLineIndex: number, historyLineIndex: number): { lineIndex: number, move: Move}[] => {
    const activeLine = history[activeLineIndex];
    let isMovesSame = true;
    let result: { lineIndex: number, move: Move}[] = [];

    if (!activeLine.moves[historyLineIndex]) {
      return result;
    }

    for (let i = 0; i < history.length; i++) {
      const line = history[i];
      isMovesSame = true;

      if (line === activeLine) {
        continue;
      }

      if (!line.moves[historyLineIndex]) {
        continue;
      }

      for (let j = 0; j < historyLineIndex; j++) {
        const move = line.moves[j];

        if (move.from[0] !== activeLine.moves[j].from[0]
          || move.from[1] !== activeLine.moves[j].from[1]
          || move.to[0] !== activeLine.moves[j].to[0]
          || move.to[1] !== activeLine.moves[j].to[1]
        ){
          isMovesSame = false;
          break;
        }
      }

      if (!isMovesSame) {
        continue;
      }

      if (line.moves[historyLineIndex].from[0] !== activeLine.moves[historyLineIndex].from[0]
        || line.moves[historyLineIndex].from[1] !== activeLine.moves[historyLineIndex].from[1]
        || line.moves[historyLineIndex].to[0] !== activeLine.moves[historyLineIndex].to[0]
        || line.moves[historyLineIndex].to[1] !== activeLine.moves[historyLineIndex].to[1]
      ) {
        const variationMove = line.moves[historyLineIndex];

        const alreadyAdded = result.some(({ move }) => {
          return move.from[0] === variationMove.from[0]
          && move.from[1] === variationMove.from[1]
          && move.to[0] === variationMove.to[0]
          && move.to[1] === variationMove.to[1]
        })
        
        if (!alreadyAdded) {
          result.push({ lineIndex: i, move: line.moves[historyLineIndex]});
        }
      }
    }

    return result;
  }

  const selectLine = (history: HistoryLine[], initialBoard: Piece[][] , activeLineIndex: number, selectedLineIndex: number, historyIndex: number) => {
    if (selectedLineIndex === activeLineIndex){
      return
    }

    const selectedLine = history[selectedLineIndex];
    const activeLine = history[activeLineIndex];

    const firstDifferenceIndex = activeLine.moves.slice(0, historyIndex + 1).findIndex((move, index) => {
        return move.from[0] !== selectedLine.moves[index]?.from[0]
        || move.from[1] !== selectedLine.moves[index]?.from[1]
        || move.to[0] !== selectedLine.moves[index]?.to[0]
        || move.to[1] !== selectedLine.moves[index]?.to[1]
      }
    )

    if (firstDifferenceIndex === - 1) {
      return;
    }

    setActiveLineIndex(selectedLineIndex);
    setHistoryIndex(firstDifferenceIndex);

    const position = getHistoryPosition(history, initialBoard, selectedLineIndex, firstDifferenceIndex);

    setHistoryBoard(position);
  }

  return (
    <div className={styles.container}>
      <div>
        <button onClick={handleRestart}>Restart</button>
      </div>
      <div>
        <p>Turn: {currentTurn}</p>
        <p>Game status: {gameStatus === null ? "Game" : gameStatus}</p>
      </div>
      <div className={styles.board}>
        {displayBoard(board)}
      </div>
      <div>
        <h2>Choose a promotion pawn</h2>
        <label htmlFor="promotion-queen">Queen</label>
        <input 
          type="radio"
          id="promotion-queen"
          name="promotion"
          defaultChecked={true}
          onChange={() => setPromotion("queen")}
        />
        <br/>
        <label htmlFor="promotion-rook">Rook</label>
        <input 
          type="radio"
          id="promotion-rook"
          name="promotion"
          onChange={() => setPromotion("rook")}
        />
        <br/>
        <label htmlFor="promotion-bishop">Bishop</label>
        <input 
          type="radio"
          id="promotion-bishop"
          name="promotion"
          onChange={() => setPromotion("bishop")}
        />
        <br/>
        <label htmlFor="promotion-knight">Knight</label>
        <input 
          type="radio"
          id="promotion-knight"
          name="promotion"
          onChange={() => setPromotion("knight")}
        />
      </div>
      <div>
        <button onClick={goNext}>Next</button>
        <button onClick={goPrevious}>Previous</button>
        <select
          name="variations"
          value={activeLineIndex}
          onChange={(e) => selectLine(history, initialBoard, activeLineIndex, Number(e.target.value), historyIndex)}>
          {(() => {
            const currentMove = history[activeLineIndex].moves[historyIndex];

            const currentPosition = historyIndex === 0
              ? initialBoard
              : history[activeLineIndex].afterBoards[historyIndex - 1]
            
            const variations = getAvailableVatiations(history, activeLineIndex, historyIndex);

            return (
              <>
                <option value={activeLineIndex}>
                  {
                    currentMove
                      ? moveToNotation(currentMove, null, currentPosition)
                      : "End of line"
                  }
                </option>
                {
                  variations.map(variation => {
                    const position = historyIndex === 0
                      ? initialBoard
                      : history[variation.lineIndex].afterBoards[historyIndex-1];
                    
                    return (
                      <option key={variation.lineIndex} value={variation.lineIndex}>
                        {moveToNotation(variation.move, null, position)}
                      </option>
                    );
                  })
                }
              </>
            )
          })()}

        </select>
      </div>
      <div className={styles.board}>
        {displayBoard(historyBoard)}
      </div>
    </div>
  )
}

export default Board
