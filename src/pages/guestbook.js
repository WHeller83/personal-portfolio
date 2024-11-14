import React, { useEffect } from "react";
import { useState } from "react";
import { Section, Page, Seo } from "gatsby-theme-portfolio-minimal";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { FixedSizeList as List } from "react-window";
import { Profanity } from "@2toad/profanity";
import io from "socket.io-client";
import "./styles.css";

let socket = null;

let profanityFilter = new Profanity({
  languages: ['en', 'es'],
  wholeWord: true,
});

profanityFilter.addWords(['suck', 'hell']);
profanityFilter.removeWords(['butt', 'butts']);


function Loading() {
  return <p>Now connecting...</p>;
}

export default function IndexPage() {
  const [game, setGame] = useState(new Chess());
  const [turn, setTurn] = useState(game.turn());
  const [movestr, setMovestr] = useState("");
  const [allowMoves, setAllowMoves] = useState(true);
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [guestbook, setGuestbook] = useState([]);
  const [optionSquares, setOptionSquares] = useState({});
  const [connected, setConnected] = useState(false);
  const [gameID, setGameID] = useState(false);

  useEffect(() => {
    // Socket IO Setup
    // TODO: Add these as ENV variables
    // socket = io("localhost:5000");
    socket = io("https://chess.willheller.dev");

    socket.on("current_game", ({ currentFen, currentTurn, history, game_id }) => {
      console.log(currentFen);
      setGame(new Chess(currentFen));
      setMovestr("");
      setMoveFrom("");
      setMoveTo("");
      setOptionSquares({});
      setTurn(currentTurn);
      setGuestbook(history);
      setGameID(game_id);
      setAllowMoves(true);
    });

    socket.on("connect", () => {
      setConnected(true);
    });
    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, []);

  const Row = ({ index, style }) => {
    // Get a list of moves with the most recent first
    const gameHistory = [...guestbook].reverse()[index];

    return (
      <div
        className={
          `${gameHistory.move.color === "w"
            ? "HistoryItemWhite"
            : "HistoryItemBlack"}`
        }
        style={style}
      >
        {gameHistory.name} from {gameHistory.move.from} to {gameHistory.move.to}
      </div>
    );
  };

  // TODO: Try modifying game rather than using GameCopy
  function makeAMove(move) {
    setGame((oldGame) => {
      const gameCopy = new Chess();
      gameCopy.loadPgn(oldGame.pgn());
      try {
        gameCopy.move(move);
        setMovestr(`${move.from} to ${move.to}`);
        setMoveFrom(null);
        setMoveTo(null);
        setOptionSquares({});

        // setCurrentMove({...move, color: turn});
        setAllowMoves(false);
      } catch (e) {
        //illegal move
        console.log(e);
      }
      return gameCopy;
    });
  }

  function onDrop(sourceSquare, targetSquare, piece) {
    makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
    return true;
  }

  function submitMove(e) {
    e.preventDefault();

    if (allowMoves) return;

    // Read the form data
    const form = e.target;
    const formData = new FormData(form);

    // Work with it as a plain object:
    const formJson = Object.fromEntries(formData.entries());

    const move = game.history({ verbose: true })[game.history().length - 1];

    var gbCopy = [...guestbook];
    const enteredName = formJson["guest-name"]
      ? formJson["guest-name"]
      : "anonymous";

    if (profanityFilter.exists(enteredName)){
      form.reset();
      return;
    }

    gbCopy.push({
      name: enteredName,
      move: move,
      fen: game.fen()
    });
    setGuestbook(gbCopy);

    setAllowMoves(true);
    setMovestr("");
    setTurn(game.turn());
    form.reset();

    socket.emit("submit_move", { name: enteredName, move: move });
  }

  function getMoveOptions(square) {
    const moves = game.moves({
      square,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }
    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to).color !== game.get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(square) {
    if (!allowMoves) return;

    // from square
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    // to square
    if (!moveTo) {
      // check if valid move before showing dialog
      const moves = game.moves({
        moveFrom,
        verbose: true,
      });
      const foundMove = moves.find(
        (m) => m.from === moveFrom && m.to === square
      );
      // not a valid move
      if (!foundMove) {
        // check if clicked on new piece
        const hasMoveOptions = getMoveOptions(square);
        // if new piece, setMoveFrom, otherwise clear moveFrom
        setMoveFrom(hasMoveOptions ? square : "");
        return;
      }

      // valid move
      setMoveTo(square);

      // is normal move
      makeAMove({
        from: moveFrom,
        to: square,
        promotion: "q",
      });
      return;
    }
  }

  function onUndo(e) {
    // call undo and check if successful
    if (allowMoves || !game.undo()) {
      // console.log("undo unsuccessful!");
      return;
    }

    setMovestr("");

    setMoveFrom(null);
    setMoveTo(null);
    setOptionSquares({});
    setAllowMoves(true);
  }

  return (
    <>
      <Seo title="William Heller" />
      <Page>
        <Section>
          <h1>Sign the Guest(chess)Book!</h1>
          <p>Make a move and sign your name (or stay anonymous 🥸)!</p>

          {!connected && <Loading />}
          {connected && (
            <table style={{ width: "100%", height: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ width: "40%", verticalAlign: "top" }}>
                    <h2>
                      <u>Game {gameID}</u>
                    </h2>
                    <h3>
                      It is currently{" "}
                      <u>{turn === "w" ? "White" : "Black"}'s</u> turn!
                    </h3>
                    <p>History:</p>
                    <List
                      className="History"
                      itemCount={guestbook.length}
                      itemSize={30}
                      height={200}
                      width={250}
                      onScroll={(_) => {}}
                    >
                      {Row}
                    </List>
                    <form onSubmit={submitMove}>
                      {allowMoves && (
                        <p>
                          Drag or click a piece on the chess board to move it!
                        </p>
                      )}
                      {!allowMoves && (
                        <>
                          <input name="guest-name" placeholder="Name"></input>
                          <button type="submit">Submit</button>
                          <p>Click to submit your move and name!</p>
                        </>
                      )}
                    </form>
                  </td>
                  <td style={{ width: "60%" }}>
                    <Chessboard
                      position={game.fen()}
                      onPieceDrop={onDrop}
                      onSquareClick={onSquareClick}
                      arePiecesDraggable={allowMoves}
                      customBoardStyle={{
                        borderRadius: "4px",
                      }}
                      customSquareStyles={{
                        ...optionSquares,
                      }}
                    />
                    <button onClick={onUndo} hidden={allowMoves}>
                      Cancel
                    </button>
                    {movestr && <h4>Your move: {movestr}</h4>}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Section>
      </Page>
    </>
  );
}
