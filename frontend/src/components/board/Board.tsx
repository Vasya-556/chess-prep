import styles from "./Board.module.css";

type Piece = {
  type: "rook" | "knight" | "king" | "bishop" | "queen" | "pawn" | "none",
  color: "white" | "black",
}

function Board() {
  const generateBoard = () => {
    let board: Piece[][] = [];

    const backRank: Piece["type"][] = [
      "rook", "knight", "bishop", "queen", 
      "king", "bishop", "knight", "rook", 
    ]
    
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
        const board = generateBoard();

        return displayBoard(board);
      })()}
    </div>
  )
}

export default Board
