import Board from "../../components/board/Board";
import styles from "./Home.module.css";
import { useState } from "react";
import { messageStore } from "../../stores";

function Home() {
  const [side, setSide] = useState<"white" | "black">("white");
  const message = messageStore();

  return (
    <div className={styles.container}>
      <div>
        {
          message.text !== ""
          ? <div>
            <p>{message.text}</p>
          </div>
          : <></>
        }
      </div>
      <div>
        <h2>Choose a side</h2>
        <label htmlFor="white-side">White</label>
        <input 
          type="radio"
          id="white-side"
          name="side"
          defaultChecked={true}
          onChange={() => setSide("white")}
        />
        <label htmlFor="black-side">Black</label>
        <input 
          type="radio"
          id="black-side"
          name="side"
          onChange={() => setSide("black")}
        />
      </div>
      <div>
        <h2>Choose an opening</h2>
        {
          side === "white"
            ?
            <select name="opening">
              <option value="London system">London system</option>
              <option value="Ruy Lopez">Ruy Lopez</option>
              <option value="Italian Game">Italian Game</option>
            </select>
            :
            <select name="opening">
              <option value="Caro-Kann defense">Caro-Kann defense</option>
              <option value="Sicilian defense">Sicilian defense</option>
              <option value="King indian">King indian</option>
            </select> 
        }
      </div>
      <div>
        <Board
          key={side}
          side={side}
        />
      </div>
    </div>
  )
}

export default Home;