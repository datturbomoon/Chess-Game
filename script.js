// Chessboard rendering and basic interaction
const board = document.getElementById("chessboard");
const resetBtn = document.getElementById("resetBtn");
let lastMove = null; // { from: [row, col], to: [row, col] }

const initialBoard = () => [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

let chessState = initialBoard();
let gameOver = false;

const pieceUnicode = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

// Function to find the last move delta
function findMoveDelta(prevBoard, nextBoard) {
  let from = null,
    to = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (prevBoard[r][c] !== nextBoard[r][c]) {
        if (!prevBoard[r][c] && nextBoard[r][c]) {
          to = [r, c];
        } else if (prevBoard[r][c] && !nextBoard[r][c]) {
          from = [r, c];
        }
      }
    }
  }
  return from && to ? { from, to } : null;
}

function renderBoard() {
  board.innerHTML = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isDark = (row + col) % 2 === 1;
      const cell = document.createElement("div");
      // cell.className = `w-16 h-16 flex items-center justify-center text-3xl font-bold border border-gray-700 ${
      //   isDark ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      // }`;
      cell.className = `aspect-square w-full h-full flex items-center justify-center text-xl font-bold border border-gray-700 ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`;

      const isFrom =
        lastMove && lastMove.from[0] === row && lastMove.from[1] === col;
      const isTo = lastMove && lastMove.to[0] === row && lastMove.to[1] === col;

      if (isFrom || isTo) {
        cell.classList.add(
          "ring-4",
          isTo ? "ring-yellow-600" : "ring-yellow-600",
          "ring-inset"
        );
      }

      const piece = chessState[row][col];
      if (piece) cell.textContent = pieceUnicode[piece] || "";
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (
        (turn === "white" && isWhite(piece)) ||
        (turn === "black" && isBlack(piece))
      ) {
        cell.style.cursor = "pointer";
      } else if (piece) {
        cell.style.cursor = "not-allowed";
      } else {
        cell.style.cursor = "";
      }

      cell.addEventListener("click", onCellClick);
      board.appendChild(cell);
    }
  }
}

let selected = null;
let turn = "white"; // 'white' or 'black'

function isWhite(piece) {
  return piece && piece === piece.toUpperCase();
}
function isBlack(piece) {
  return piece && piece === piece.toLowerCase();
}

// Function to check if a move is legal
function isLegalMove(from, to, piece) {
  const [fr, fc] = from;
  const [tr, tc] = to;
  const dr = tr - fr;
  const dc = tc - fc;
  const dest = chessState[tr][tc];
  if (dest && dest.toLowerCase() === "k") return false; // Don't allow capturing king
  // Prevent capturing own piece
  if ((isWhite(piece) && isWhite(dest)) || (isBlack(piece) && isBlack(dest)))
    return false;
  switch (piece.toLowerCase()) {
    case "p": // Pawn
      if (isWhite(piece)) {
        if (fc === tc && dr === -1 && !dest) return true; // move forward
        if (
          fc === tc &&
          fr === 6 &&
          dr === -2 &&
          !dest &&
          !chessState[fr - 1][fc]
        )
          return true; // double move
        if (Math.abs(dc) === 1 && dr === -1 && dest && isBlack(dest))
          return true; // capture
      } else {
        if (fc === tc && dr === 1 && !dest) return true;
        if (
          fc === tc &&
          fr === 1 &&
          dr === 2 &&
          !dest &&
          !chessState[fr + 1][fc]
        )
          return true;
        if (Math.abs(dc) === 1 && dr === 1 && dest && isWhite(dest))
          return true;
      }
      return false;
    case "r": // Rook
      if (dr === 0 && dc !== 0) {
        for (let c = Math.min(fc, tc) + 1; c < Math.max(fc, tc); c++)
          if (chessState[fr][c]) return false;
        return true;
      }
      if (dc === 0 && dr !== 0) {
        for (let r = Math.min(fr, tr) + 1; r < Math.max(fr, tr); r++)
          if (chessState[r][fc]) return false;
        return true;
      }
      return false;
    case "n": // Knight
      return (
        (Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
        (Math.abs(dr) === 1 && Math.abs(dc) === 2)
      );
    case "b": // Bishop
      if (Math.abs(dr) === Math.abs(dc)) {
        for (let i = 1; i < Math.abs(dr); i++) {
          if (chessState[fr + i * Math.sign(dr)][fc + i * Math.sign(dc)])
            return false;
        }
        return true;
      }
      return false;
    case "q": // Queen
      if (dr === 0 || dc === 0)
        return isLegalMove(from, to, isWhite(piece) ? "R" : "r");
      if (Math.abs(dr) === Math.abs(dc))
        return isLegalMove(from, to, isWhite(piece) ? "B" : "b");
      return false;
    case "k": // King
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
    default:
      return false;
  }
}

// Function to check if the king of a given color is in check
function isKingInCheck(board, color) {
  let king = color === "white" ? "K" : "k";
  let kingPos = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) kingPos = [r, c];
    }
  }
  if (!kingPos) return false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (
        piece &&
        ((color === "white" && isBlack(piece)) ||
          (color === "black" && isWhite(piece)))
      ) {
        if (isLegalMove([r, c], kingPos, piece)) return true;
      }
    }
  }
  return false;
}

function hasLegalMoves(board, color) {
  for (let fr = 0; fr < 8; fr++) {
    for (let fc = 0; fc < 8; fc++) {
      const piece = board[fr][fc];
      if (
        (color === "white" && isWhite(piece)) ||
        (color === "black" && isBlack(piece))
      ) {
        for (let tr = 0; tr < 8; tr++) {
          for (let tc = 0; tc < 8; tc++) {
            if (
              (fr !== tr || fc !== tc) &&
              isLegalMove([fr, fc], [tr, tc], piece)
            ) {
              // Try the move
              const copy = board.map((row) => [...row]);
              copy[tr][tc] = piece;
              copy[fr][fc] = "";
              if (!isKingInCheck(copy, color)) return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function showMessage(msg) {
  console.log("showMessage called:", msg);

  // Remove any previous overlay
  const prev = document.getElementById("chess-message-overlay");
  if (prev) prev.remove();
  // Create new overlay
  const overlay = document.createElement("div");
  overlay.id = "chess-message-overlay";
  overlay.className =
    "fixed inset-0 w-full h-full flex items-center justify-center z-[999999] pointer-events-auto";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "999999";
  overlay.style.pointerEvents = "auto";
  overlay.style.visibility = "visible";
  overlay.style.opacity = "1";
  overlay.innerHTML = `<div style="background: #fffbe8; opacity: 0.98;" class='text-red-800 text-3xl font-extrabold px-10 py-8 rounded-2xl shadow-2xl border-4 border-yellow-600 animate-bounce drop-shadow-lg'>${msg}</div>`;
  document.body.appendChild(overlay);
  gameOver = true;
  setTimeout(() => {
    // Only hide if this overlay is still present
    if (document.body.contains(overlay)) {
      // overlay.style.display = "none";
      // overlay.style.pointerEvents = "none";
      document.body.removeChild(overlay);
    }
  }, 4000);
}

// function checkEndGame() {
//   const next = turn;
//   if (!hasLegalMoves(chessState, next)) {
//     if (isKingInCheck(chessState, next)) {
//       showMessage(`Checkmate! ${next === "white" ? "Black" : "White"} wins!`);
//     } else {
//       showMessage("Stalemate! Draw.");
//     }
//   }
// }

function checkEndGame() {
  console.log("Checking if", turn === "white" ? "Black" : "White", "is in checkmate.");


  const next = turn;

  // 👑 Check if either king is missing (capture)
  const flatBoard = chessState.flat();
  const whiteKingPresent = flatBoard.includes("K");
  const blackKingPresent = flatBoard.includes("k");

  if (!whiteKingPresent) {
    showMessage("Checkmate! Black wins!");
    gameOver = true;
    return;
  } else if (!blackKingPresent) {
    showMessage("Checkmate! White wins!");
    gameOver = true;
    return;
  }

  // ♟️ Check for legal moves
  if (!hasLegalMoves(chessState, next)) {
    if (isKingInCheck(chessState, next)) {
      showMessage(`Checkmate! ${next === "white" ? "Black" : "White"} wins!`);
    } else {
      showMessage("Stalemate! Draw.");
    }
    gameOver = true;
  }
}


function onCellClick(e) {
  if (gameOver) return;
  const row = +e.currentTarget.dataset.row;
  const col = +e.currentTarget.dataset.col;
  const piece = chessState[row][col];
  if (selected) {
    const from = [selected.row, selected.col];
    const to = [row, col];
    const movingPiece = chessState[selected.row][selected.col];
    // if (
    //   isLegalMove(from, to, movingPiece) &&
    //   ((turn === "white" && isWhite(movingPiece)) ||
    //     (turn === "black" && isBlack(movingPiece)))
    // ) {
    //   chessState[row][col] = movingPiece;
    //   chessState[selected.row][selected.col] = "";

    //   // Update history
    //   history = history.slice(0, currentMoveIndex + 1); // trim future history
    //   history.push({
    //     board: JSON.parse(JSON.stringify(chessState)),
    //     turn: turn === "white" ? "black" : "white",
    //   });
    //   currentMoveIndex++;

    //   // Apply turn switch
    //   turn = history[currentMoveIndex].turn;
    //   selected = null;
    //   renderBoard();
    //   checkEndGame();
    // }

    if (
      isLegalMove(from, to, movingPiece) &&
      ((turn === "white" && isWhite(movingPiece)) ||
        (turn === "black" && isBlack(movingPiece)))
    ) {
      // Make the move
      chessState[row][col] = movingPiece;
      chessState[selected.row][selected.col] = "";

      // ✅ Track last move
      lastMove = {
        from: [selected.row, selected.col],
        to: [row, col],
      };

      // ✅ Update history
      history = history.slice(0, currentMoveIndex + 1); // trim future history
      history.push({
        board: JSON.parse(JSON.stringify(chessState)),
        turn: turn === "white" ? "black" : "white",
      });
      currentMoveIndex++;

      checkEndGame(); // ✅ Checkmate is about the player who just moved

      // ✅ Apply turn switch AFTER checking endgame
      turn = history[currentMoveIndex].turn;
      selected = null;

      renderBoard();

    } else {
      selected = null;
      renderBoard();
    }
  } else if (
    piece &&
    ((turn === "white" && isWhite(piece)) ||
      (turn === "black" && isBlack(piece)))
  ) {
    selected = { row, col };
    e.currentTarget.classList.add("ring-4", "ring-lime-600", "ring-inset");
  }
}

function resetGame() {
  chessState = initialBoard();
  turn = "white";
  gameOver = false;
  lastMove = null;
  history = [
    {
      board: JSON.parse(JSON.stringify(chessState)),
      turn: turn,
    },
  ];
  currentMoveIndex = 0;
  renderBoard();
}

resetBtn.onclick = resetGame;

// Undo functionality
document.getElementById("undoBtn").onclick = () => {
  if (currentMoveIndex > 0) {
    currentMoveIndex--;
    const state = history[currentMoveIndex];
    chessState = JSON.parse(JSON.stringify(state.board));
    turn = state.turn;
    gameOver = false;

    // ✅ Update lastMove to previous move (or null if none)
    if (currentMoveIndex === 0) {
      lastMove = null;
    } else {
      const prev = history[currentMoveIndex - 1];
      const next = history[currentMoveIndex];
      lastMove = findMoveDelta(prev.board, next.board);
    }

    renderBoard();
  }
};

// Redo functionality
document.getElementById("redoBtn").onclick = () => {
  if (currentMoveIndex < history.length - 1) {
    const prev = history[currentMoveIndex];
    currentMoveIndex++;
    const next = history[currentMoveIndex];
    chessState = JSON.parse(JSON.stringify(next.board));
    turn = next.turn;
    gameOver = false;

    lastMove = findMoveDelta(prev.board, next.board);

    renderBoard();
  }
};

let history = [];
let currentMoveIndex = -1;

// Call this after every move and on page load
renderBoard();
