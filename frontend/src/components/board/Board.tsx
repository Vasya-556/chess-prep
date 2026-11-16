import styles from "./Board.module.css";

type Piece = {
  type: "rook" | "knight" | "king" | "bishop" | "queen" | "pawn" | "none",
  color: "white" | "black",
}

function Board() {
  const generateBoard = () => {
    let board: Piece[][] = [];

    for (let i = 0; i < 8; i++) {
      let row = [];
      for (let j = 0; j < 8; j++) {
        const piece: Piece = {
          type: "none",
          color: "white"
        }
        row.push(piece);
      }
      board.push(row);
    }

    const whiteRook: Piece = {
      type: "rook",
      color: "white",
    }

    const whiteBishop: Piece = {
      type: "bishop",
      color: "white"
    }
    
    const whitePawn: Piece = {
      type: "pawn",
      color: "white"
    }
    
    const whiteKnight: Piece = {
      type: "knight",
      color: "white"
    }
    
    const whiteKing: Piece = {
      type: "king",
      color: "white"
    }
    
    const whiteQueen: Piece = {
      type: "queen",
      color: "white"
    }

    const blackRook: Piece = {
      type: "rook",
      color: "black"
    }

    const blackBishop: Piece = {
      type: "bishop",
      color: "black"
    }
    
    const blackPawn: Piece = {
      type: "pawn",
      color: "black"
    }
    
    const blackKnight: Piece = {
      type: "knight",
      color: "black"
    }
    
    const blackKing: Piece = {
      type: "king",
      color: "black"
    }
    
    const blackQueen: Piece = {
      type: "queen",
      color: "black"
    }

    board[0][0] = blackRook;
    board[0][7] = blackRook;

    board[0][1] = blackKnight;
    board[0][6] = blackKnight;

    board[0][2] = blackBishop;
    board[0][5] = blackBishop;

    board[0][3] = blackQueen;
    board[0][4] = blackKing;

    board[7][0] = whiteRook;
    board[7][7] = whiteRook;

    board[7][1] = whiteKnight;
    board[7][6] = whiteKnight;

    board[7][2] = whiteBishop;
    board[7][5] = whiteBishop;

    board[7][3] = whiteQueen;
    board[7][4] = whiteKing;

    for (let i = 0; i < 8; i++) {
      board[1][i] = blackPawn;
      board[6][i] = whitePawn;
    }
    
    return board;
  }

  const displayBoard = (board: Piece[][]) => {
    let result = [];
    for (let i = 0; i < board.length; i++) {
      let row = board[i]; 
      for (let j = 0; j < row.length; j++) {
        result.push(<div
          style={{"display": "inline-block", "verticalAlign": "middle", "backgroundColor": ((i+j)%2 === 0 ? "red" : "green"), "width": "50px", "height": "50px"}}>{
          board[i][j].type === "none"
            ? ""
            : <img
              src={"chess-prep/assets/" + board[i][j].color + "_" + board[i][j].type + ".svg"}
              width="30px"
              height="30px"
            />
        }</div>);
      }
      result.push(<br/>);
    }
    return result;
  }

  return (
    <div className={styles.container}>
      {(() => {
        // let result = [];
        // for (let i = 0; i < 8; i++) {
        //   for (let j = 0; j < 8; j++) {
        //     result.push(<div style={{"display": "inline-block", "backgroundColor": ((i+j)%2 === 0 ? "red" : "green"), "width": "50px", "height": "50px"}}></div>)
        //   }
        //   result.push(<br/>)
        // }
        
        // return result;
      })()}
      {(() => {
        const board = generateBoard();

        return displayBoard(board);
      })()}
    </div>
  )
}

export default Board
