import styles from "./Board.module.css";
import {
  useState,
  useRef,
  useMemo,
  useEffect,
} from "react"
import { appConfig } from "../../configs";
import londonSystem from "../../data/chessbook-london-1400-1600.pgn?raw";
import { chessTypes } from "../../types";
import { 
  chessEngine,
  chessHistory,
 } from "../../utils";
import chessAiWorker from "../../workers/chessAi.worker?worker";
import { messageStore } from "../../stores";

type BoardProps = {
  side: "white" | "black"
}

function Board({ side }: BoardProps) {
  const [board, setBoard] = useState<chessTypes.Piece[][]>(() => chessEngine.generateBoard());
  const [currentTurn, setCurrentTurn] = useState<"white" | "black">("white");
  const [gameStatus, setGameStatus] = useState<"check" | "checkmate" | "stalemate" | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<{row: number, col: number} | null>(null);
  const [selectedLegalMoves, setSelectedLegalMoves] = useState<chessTypes.Move[]>([]);
  const [promotion, setPromotion] = useState<"queen" | "rook" | "bishop" | "knight">("queen");
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const initialBoard = useMemo(() => chessEngine.generateBoard(), []);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [historyBoard, setHistoryBoard] = useState<chessTypes.Piece[][]>(initialBoard);
  const [boardFlip, setBoardFlip] = useState<"white" | "black">(side);
  const [depth, setDepth] = useState<number>(1);
  const enPassantTarget = useRef<[number, number] | null>(null);
  const castlingRights = useRef({
    whiteKingMoved: false,
    blackKingMoved: false,
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  });
  const [history] = useState<chessTypes.HistoryLine[]>(() => {
    const initialEnPassantTarget: [number, number] | null = null;
    const initialCastlingRights = {
      whiteKingMoved: false,
      blackKingMoved: false,
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    }

    const moveSet = chessHistory.PGNParser(londonSystem, initialEnPassantTarget, promotion, { ...initialCastlingRights });
    
    return chessHistory.buildHistory(moveSet, initialBoard, initialEnPassantTarget, promotion, { ...initialCastlingRights });
  });
  const chessAiWorkerRef = useRef<Worker | null>(null);
  const message = messageStore();

  const displayBoard = (board: chessTypes.Piece[][]) => {
    const result = [];
    for (let i = boardFlip === "white" ? 0 : board.length - 1; 
      boardFlip === "white" ? i < board.length : i >= 0;
      boardFlip === "white" ? i++ : i--) {
      const row = board[i]; 
      result.push(<div 
        style={{"display": "inline-flex",
          "width": "30px", 
          "height": "30px",
          "verticalAlign": "middle", 
          "justifyContent": "center",
          "alignItems": "center",
        }}
      >{Math.abs(8 - i)}</div>);
      for (let j = boardFlip === "white" ? 0 : board.length - 1;
        boardFlip === "white" ? j < row.length : j >= 0; 
        boardFlip === "white" ? j++ : j--) {
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
            "border": "1px solid black",
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
    for (let i = boardFlip === "white" ? 0 : board.length - 1; 
      boardFlip === "white" ? i < board.length : i >= 0;
      boardFlip === "white" ? i++ : i--) {
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

  const handleSquareClick = (row: number, col: number) => {
    if (currentTurn !== side){
      return;
    }

    const selectedPiece: chessTypes.Piece = board[row][col];
    
    if (selectedSquare !== null){
      const move = selectedLegalMoves.find((move) => {
        return move.to[0] === row && move.to[1] === col
      });

      if (move !== undefined) {
        executeMove(move);
      }
      else if (selectedPiece.type !== "none" && selectedPiece.color === currentTurn){
        setSelectedSquare({row, col});
        setSelectedLegalMoves(() => chessEngine.getLegalMoves(board, row, col, enPassantTarget.current, promotion, castlingRights.current));
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
      setSelectedLegalMoves(() => chessEngine.getLegalMoves(board, row, col, enPassantTarget.current, promotion, castlingRights.current));
    }
  }

  const executeMove = (move: chessTypes.Move) => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    if (board[fromRow][fromCol].color !== currentTurn || board[fromRow][fromCol].type === "none"){
      return;
    }
    
    const legalMoves = chessEngine.getLegalMoves(board, fromRow, fromCol, enPassantTarget.current, promotion, castlingRights.current);

    const requestedMove = legalMoves.find((m) => {
      return m.from[0] === fromRow && m.from[1] === fromCol && m.to[0] === toRow && m.to[1] === toCol;
    })

    if (requestedMove === undefined) {
      return;
    }

    const { newBoard, newEnPassantTarget } = chessEngine.applyMove(board, requestedMove, enPassantTarget.current, promotion, castlingRights.current);
    const status = chessEngine.getGameStatus(newBoard, currentTurn === "white" ? "black" : "white", newEnPassantTarget, promotion, castlingRights.current);
    
    enPassantTarget.current = newEnPassantTarget;
    setBoard(newBoard);
    setCurrentTurn(currentTurn === "white" ? "black" : "white");
    setGameStatus(status);
    setSelectedSquare(null);
    setSelectedLegalMoves([]);
  }

  const handleRestart = (e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();

    setBoard(chessEngine.generateBoard());
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

  const getHistoryPosition = (history: chessTypes.HistoryLine[], initialBoard: chessTypes.Piece[][], lineIndex: number, positionIndex: number) => {
    let position: chessTypes.Piece[][];

    if (positionIndex === 0) {
      position = initialBoard;
    }
    else {
      position = history[lineIndex].afterBoards[positionIndex - 1];
    }

    return position
  }

  const handleGoPrevious = (e? :React.BaseSyntheticEvent) => {
    e?.preventDefault();

    if (historyIndex > 0) {
      const position = getHistoryPosition(history, initialBoard, activeLineIndex, historyIndex - 1);
      
      setHistoryIndex(curr => curr - 1);

      setHistoryBoard(position);
    }
  }

  const handleGoNext = (e? :React.BaseSyntheticEvent) => {
    e?.preventDefault();

    if (historyIndex < history[activeLineIndex].moves.length) {
      const position = getHistoryPosition(history, initialBoard, activeLineIndex, historyIndex + 1);

      setHistoryIndex(curr => curr + 1);

      setHistoryBoard(position);
    }
  }

  const getAvailableVatiations = (history: chessTypes.HistoryLine[], activeLineIndex: number, historyLineIndex: number): { lineIndex: number, move: chessTypes.Move}[] => {
    const activeLine = history[activeLineIndex];
    const result: { lineIndex: number, move: chessTypes.Move}[] = [];

    if (!activeLine.moves[historyLineIndex]) {
      return result;
    }

    for (let i = 0; i < history.length; i++) {
      const line = history[i];
      let isMovesSame = true;

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

  const handleSelectLine = (history: chessTypes.HistoryLine[], initialBoard: chessTypes.Piece[][] , activeLineIndex: number, selectedLineIndex: number, historyIndex: number) => {
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

  const handleFlipBoard = (e? : React.BaseSyntheticEvent) => {
    e?.preventDefault();

    setBoardFlip(boardFlip === "white" ? "black" : "white");    
  }

  const aiMove = () => {
    if (gameStatus === "checkmate" || gameStatus === "stalemate") {
      return;
    }

    if (currentTurn === side) {
      return;
    }

    const worker = chessAiWorkerRef.current;

    if (worker === null) {
      return;
    }

    worker.onmessage = (event) => {
      if (event.data.bestMove) {
        executeMove(event.data.bestMove);
      }
    }

    worker.onerror = (event) => {
      message.setText(event.message)
    }

    worker.postMessage({
      depth, board, enPassantTarget: enPassantTarget.current, promotion, castlingRights: castlingRights.current, currentTurn
    })
  }

  useEffect(() => {
    chessAiWorkerRef.current = new chessAiWorker();

    return () => {
      if (chessAiWorkerRef.current !== null) {
        chessAiWorkerRef.current.terminate();
        chessAiWorkerRef.current = null;
      }
    }
  }, []);
  
  useEffect(() => {
    if (currentTurn !== side) {
      aiMove();
    }
  }, [currentTurn, gameStatus, side]);

  useEffect(() => {
    const handleKeyDown = (e :KeyboardEvent) => {
      if (e.code === "ArrowLeft") {
        handleGoPrevious();
        return;
      }

      if (e.code === "ArrowRight") {
        handleGoNext();
        return;
      }

      const variations = getAvailableVatiations(history, activeLineIndex, historyIndex);
      const variationIndexes = [
        activeLineIndex,
        ...variations.map(v => {
          return v.lineIndex;
        })
      ]

      variationIndexes.sort((a, b) => {
        return a - b;
      });

      const currentIndex = variationIndexes.indexOf(activeLineIndex);

      if (e.code === "ArrowUp") {
        handleSelectLine(history, initialBoard, activeLineIndex, variationIndexes[currentIndex + 1], historyIndex);
        return;
      }

      if (e.code === "ArrowUp") {
        handleSelectLine(history, initialBoard, activeLineIndex, variationIndexes[currentIndex -1], historyIndex);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleGoPrevious, handleGoNext]);

  return (
    <div className={styles.container}>
      <div>
        <button onClick={handleRestart}>Restart</button>
        <button onClick={handleFlipBoard}>Flip board</button>
        <label>Depth</label>
        <input 
          type="range"
          min={1}
          max={5}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        ></input>
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
        <button onClick={handleGoNext}>Next</button>
        <button onClick={handleGoPrevious}>Previous</button>
        <select
          name="variations"
          value={activeLineIndex}
          onChange={(e) => handleSelectLine(history, initialBoard, activeLineIndex, Number(e.target.value), historyIndex)}>
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
                      ? chessHistory.moveToNotation(currentMove, null, currentPosition, promotion)
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
                        {chessHistory.moveToNotation(variation.move, null, position, promotion)}
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
