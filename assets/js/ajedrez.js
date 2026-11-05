"use strict";

/* =====================================================================
   ajedrez.js: el tablero y los botones de ajedrez.html.
   Las reglas y la computadora están en ajedrez-motor.js, que se carga antes.

     1. Datos: niveles y problemas
     2. Estado de la partida
     3. Dibujar el tablero
     4. Jugar: clics, teclado y coronación
     5. La computadora
     6. Problemas de mate en uno
     7. Probar las reglas con perft
     8. La leyenda del trigo
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Datos. Para agregar un problema, escribe su posición en FEN y comprueba
   que exista un mate en una jugada.
   --------------------------------------------------------------------- */
const CHESS_LEVELS = {
    aprendiz: { depth: 1, timeMs: 300, noise: 240 },
    estudiante: { depth: 2, timeMs: 800, noise: 50 },
    maestra: { depth: 5, timeMs: 1500, noise: 0 }
};

const MATE_PUZZLES = [
    { fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", hint: "El rey negro está encerrado por sus propios peones. ¿Quién puede llegar a la última fila?" },
    { fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", hint: "Mira la casilla f7: solo la defiende el rey, y ya la atacan dos piezas blancas." },
    { fen: "7k/8/5K2/6Q1/8/8/8/8 w - - 0 1", hint: "Tu rey puede proteger a tu dama. Acércala al rey negro." },
    { fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", hint: "El rey no tiene a dónde ir porque sus piezas le estorban. El caballo salta por encima." },
    { fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2", hint: "Juegas con negras. Las blancas abrieron la diagonal que llega a su rey." }
];

const PIECE_LABELS = {
    K: "Rey", Q: "Dama", R: "Torre", B: "Alfil", N: "Caballo", P: "Peón"
};
const FEMININE = new Set(["Q", "R"]);

function pieceLabel(piece) {
    const type = piece.toUpperCase();
    const isFeminine = FEMININE.has(type);
    const color = piece === type ? (isFeminine ? "blanca" : "blanco") : (isFeminine ? "negra" : "negro");
    return `${PIECE_LABELS[type]} ${color}`;
}

const COLOR_NAMES = { w: "blancas", b: "negras" };
const DRAW_REASONS = {
    ahogado: "Tablas por ahogado: el rey no está en jaque, pero no hay jugadas legales.",
    material: "Tablas: no queda material suficiente para dar mate.",
    cincuenta: "Tablas por la regla de las 50 jugadas sin capturas ni movimientos de peón.",
    repeticion: "Tablas: la misma posición se repitió tres veces."
};


/* ---------------------------------------------------------------------
   2. Estado de la partida
   --------------------------------------------------------------------- */
const boardElement = document.querySelector("#chess-board");
const statusElement = document.querySelector("#chess-status");
const movesElement = document.querySelector("#chess-moves");
const thinkElement = document.querySelector("#chess-think");
const balanceFill = document.querySelector("#balance-fill");
const balanceLabel = document.querySelector("#balance-label");
const modeSelect = document.querySelector("#chess-mode");
const colorSelect = document.querySelector("#chess-color");
const levelSelect = document.querySelector("#chess-level");
const promotionDialog = document.querySelector("#promotion-dialog");

const game = {
    state: parseFen(CHESS_START),
    log: [],             // jugadas hechas: { move, san, key }
    counts: new Map(),   // cuántas veces ocurrió cada posición, para detectar repeticiones
    status: { over: false, reason: "", winner: "" },
    selected: -1,
    targets: [],
    hint: null,
    flipped: false,
    humanColor: "w",
    thinking: false,
    puzzleIndex: -1
};
let focusedSquare = squareFromName("e2");
let pendingTimer = 0;

function countPosition(delta) {
    const key = positionKey(game.state);
    game.counts.set(key, (game.counts.get(key) ?? 0) + delta);
    return game.counts.get(key);
}

function resetGame(fen) {
    window.clearTimeout(pendingTimer); // una espera vieja no debe actuar sobre la partida nueva
    game.state = parseFen(fen);
    game.log = [];
    game.counts = new Map();
    game.selected = -1;
    game.targets = [];
    game.hint = null;
    game.thinking = false;
    game.status = gameStatus(game.state, countPosition(1));
}

function isHumanTurn() {
    if (game.puzzleIndex >= 0 || modeSelect.value === "two") {
        return true;
    }
    return game.state.turn === game.humanColor;
}


/* ---------------------------------------------------------------------
   3. Dibujar el tablero
   Cada casilla es un <button>, así que funciona con teclado y lector de pantalla.
   Las piezas son imágenes de fondo definidas en style.css.
   --------------------------------------------------------------------- */
const squareButtons = [];

for (let index = 0; index < 64; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chess-square";
    button.addEventListener("click", () => handleSquare(Number(button.dataset.square)));
    squareButtons.push(button);
    boardElement.append(button);
}

function renderBoard() {
    const { board } = game.state;
    const last = game.log.at(-1)?.move;
    const checkedKing = inCheck(game.state) ? game.state.kings[game.state.turn] : -1;

    squareButtons.forEach((button, index) => {
        const square = game.flipped ? 63 - index : index;
        const piece = board[square];
        const classes = ["chess-square", ((square >> 3) + (square & 7)) % 2 ? "is-dark" : "is-light"];
        if (piece) {
            classes.push(`pieza-${piece}`);
        }
        if (square === game.selected) {
            classes.push("is-selected");
        }
        if (game.targets.some((move) => move.to === square)) {
            classes.push(piece ? "is-capture" : "is-target");
        }
        if (last && (last.from === square || last.to === square)) {
            classes.push("is-last");
        }
        if (game.hint && (game.hint.from === square || game.hint.to === square)) {
            classes.push("is-hint");
        }
        if (square === checkedKing) {
            classes.push("is-check");
        }
        button.className = classes.join(" ");
        button.dataset.square = String(square);
        button.tabIndex = square === focusedSquare ? 0 : -1;
        button.setAttribute("aria-label", `${squareName(square)}: ${piece ? pieceLabel(piece) : "vacía"}`);
        // Coordenadas en el borde del tablero
        const isBottom = index >= 56;
        const isLeft = index % 8 === 0;
        button.dataset.file = isBottom ? squareName(square)[0] : "";
        button.dataset.rank = isLeft ? squareName(square)[1] : "";
    });
}

function renderMoves() {
    const lines = [];
    for (let index = 0; index < game.log.length; index += 2) {
        const white = game.log[index].san;
        const black = game.log[index + 1]?.san ?? "";
        lines.push(`${String(index / 2 + 1).padStart(3)}. ${white.padEnd(9)}${black}`);
    }
    movesElement.textContent = lines.join("\n") || "Aún no hay jugadas.";
    movesElement.scrollTop = movesElement.scrollHeight;
}

function renderStatus(message) {
    if (message) {
        statusElement.textContent = message;
    } else if (game.status.reason === "mate") {
        statusElement.textContent = `¡Jaque mate! Ganan las ${COLOR_NAMES[game.status.winner]}.`;
    } else if (game.status.over) {
        statusElement.textContent = DRAW_REASONS[game.status.reason];
    } else if (game.thinking) {
        statusElement.textContent = "La computadora está pensando...";
    } else {
        const check = inCheck(game.state) ? "¡Jaque! " : "";
        statusElement.textContent = `${check}Turno de las ${COLOR_NAMES[game.state.turn]}.`;
    }
}

/* Barra de ventaja: la misma cuenta de puntos que usa la computadora. */
function renderBalance() {
    const pawns = evaluateForWhite(game.state.board) / 100;
    const percent = Math.max(4, Math.min(96, 50 + pawns * 5));
    balanceFill.style.width = `${percent}%`;
    const side = pawns > 0 ? "blancas" : "negras";
    balanceLabel.textContent = Math.abs(pawns) < 0.1 ? "Posición pareja" : `Ventaja de ${side}: ${Math.abs(pawns).toFixed(1)} peones`;
}

function render(message) {
    renderBoard();
    renderMoves();
    renderBalance();
    renderStatus(message);
}


/* ---------------------------------------------------------------------
   4. Jugar: clics, teclado y coronación
   --------------------------------------------------------------------- */
function clearSelection() {
    game.selected = -1;
    game.targets = [];
}

function handleSquare(square) {
    focusedSquare = square;
    if (game.thinking || game.status.over || !isHumanTurn()) {
        return;
    }
    game.hint = null;

    const candidates = game.targets.filter((move) => move.to === square);
    if (candidates.length > 0) {
        if (candidates[0].promotion) {
            askPromotion(candidates);
        } else {
            playMove(candidates[0]);
        }
        return;
    }

    const piece = game.state.board[square];
    if (piece && colorOf(piece) === game.state.turn && square !== game.selected) {
        game.selected = square;
        game.targets = legalMoves(game.state).filter((move) => move.from === square);
        const count = game.targets.length;
        render(count === 0
            ? `${pieceLabel(piece)} en ${squareName(square)}: no tiene jugadas legales.`
            : `${pieceLabel(piece)} en ${squareName(square)}: ${count} ${count === 1 ? "jugada posible" : "jugadas posibles"}.`);
    } else {
        clearSelection();
        render();
    }
    squareButtons[game.flipped ? 63 - square : square].focus();
}

/* Flechas del teclado: mover el foco entre casillas sin pasar por las 64 con Tab. */
boardElement.addEventListener("keydown", (event) => {
    const steps = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const step = steps[event.key];
    if (!step) {
        return;
    }
    event.preventDefault();
    const shownIndex = game.flipped ? 63 - focusedSquare : focusedSquare;
    const row = Math.max(0, Math.min(7, (shownIndex >> 3) + step[0]));
    const col = Math.max(0, Math.min(7, (shownIndex & 7) + step[1]));
    const nextIndex = row * 8 + col;
    focusedSquare = game.flipped ? 63 - nextIndex : nextIndex;
    renderBoard();
    squareButtons[nextIndex].focus();
});

function askPromotion(candidates) {
    promotionDialog.querySelectorAll("button").forEach((button) => {
        const letter = button.value;
        const promotion = game.state.turn === "w" ? letter : letter.toLowerCase();
        button.className = `retro-button promotion-choice pieza-${promotion}`;
        button.onclick = () => {
            promotionDialog.close();
            playMove(candidates.find((move) => move.promotion === promotion));
        };
    });
    promotionDialog.showModal();
}

function playMove(move) {
    const san = moveToSan(game.state, move);
    makeMove(game.state, move);
    game.log.push({ move, san });
    clearSelection();
    game.status = gameStatus(game.state, countPosition(1));

    if (game.puzzleIndex >= 0) {
        checkPuzzle();
        return;
    }
    render();
    if (game.status.winner === game.humanColor && modeSelect.value === "computer") {
        earnStamp("vencer-compu");
    }
    if (!game.status.over && modeSelect.value === "computer" && game.state.turn !== game.humanColor) {
        requestComputerMove();
    }
}

function takeBack() {
    countPosition(-1);
    undoMove(game.state);
    game.log.pop();
}

document.querySelector("#chess-new").addEventListener("click", startNewGame);
modeSelect.addEventListener("change", startNewGame);
colorSelect.addEventListener("change", startNewGame);

function startNewGame() {
    game.puzzleIndex = -1;
    game.humanColor = colorSelect.value;
    game.flipped = modeSelect.value === "computer" && game.humanColor === "b";
    thinkElement.textContent = "Aquí verás qué calculó la computadora en su última jugada.";
    resetGame(CHESS_START);
    render();
    if (modeSelect.value === "computer" && game.humanColor === "b") {
        requestComputerMove();
    }
}

document.querySelector("#chess-undo").addEventListener("click", () => {
    if (game.thinking || game.puzzleIndex >= 0 || game.log.length === 0) {
        return;
    }
    // Contra la computadora se deshacen dos: su respuesta y tu jugada.
    const plies = modeSelect.value === "computer" && game.state.turn === game.humanColor ? 2 : 1;
    for (let count = 0; count < plies && game.log.length > 0; count += 1) {
        takeBack();
    }
    clearSelection();
    game.hint = null;
    game.status = gameStatus(game.state, game.counts.get(positionKey(game.state)) ?? 1);
    render("Jugada deshecha. Prueba otra idea.");
});

document.querySelector("#chess-flip").addEventListener("click", () => {
    game.flipped = !game.flipped;
    render();
});

document.querySelector("#chess-hint").addEventListener("click", () => {
    if (game.thinking || game.status.over || !isHumanTurn()) {
        return;
    }
    const answer = chooseMove(game.state, { depth: 3, timeMs: 800, noise: 0 });
    game.hint = answer.move;
    render(`Pista: la computadora consideraría ${moveToSan(game.state, answer.move)}. Tú decides.`);
});


/* ---------------------------------------------------------------------
   5. La computadora
   setTimeout deja que el navegador pinte tu jugada antes de empezar a calcular.
   ponytail: calcula en el hilo principal y la página se congela hasta 1.5 s.
   Un Web Worker lo evitaría, pero Chrome no permite usarlos al abrir el sitio
   con doble clic (file://), y el sitio debe funcionar así.
   --------------------------------------------------------------------- */
function describeScore(score, mover) {
    if (Math.abs(score) >= MATE_SCORE - 100) {
        return score > 0 ? "ya ve un mate forzado a su favor" : "ve que recibirá mate";
    }
    const forWhite = (mover === "w" ? score : -score) / 100;
    if (Math.abs(forWhite) < 0.1) {
        return "calcula que la posición está pareja";
    }
    const side = forWhite > 0 ? "blancas" : "negras";
    return `calcula ${Math.abs(forWhite).toFixed(1)} peones de ventaja para ${side}`;
}

function requestComputerMove() {
    game.thinking = true;
    render();
    pendingTimer = window.setTimeout(() => {
        const mover = game.state.turn;
        const answer = chooseMove(game.state, CHESS_LEVELS[levelSelect.value]);
        game.thinking = false;
        const san = moveToSan(game.state, answer.move);
        thinkElement.textContent = `Revisó ${answer.nodes.toLocaleString("es-MX")} posiciones en ${answer.ms} ms, `
            + `mirando ${answer.depth} ${answer.depth === 1 ? "jugada" : "jugadas"} adelante. `
            + `Eligió ${san} y ${describeScore(answer.score, mover)}.`;
        playMove(answer.move);
    }, 60);
}


/* ---------------------------------------------------------------------
   6. Problemas de mate en uno
   --------------------------------------------------------------------- */
const puzzleStatus = document.querySelector("#puzzle-status");
const puzzleButtons = document.querySelector("#puzzle-buttons");
const solvedPuzzles = new Set();

MATE_PUZZLES.forEach((puzzle, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "retro-button";
    button.textContent = `PROBLEMA ${index + 1}`;
    button.addEventListener("click", () => loadPuzzle(index));
    puzzleButtons.append(button);
});

function loadPuzzle(index) {
    const puzzle = MATE_PUZZLES[index];
    game.puzzleIndex = index;
    resetGame(puzzle.fen);
    game.flipped = game.state.turn === "b";
    const side = COLOR_NAMES[game.state.turn];
    render(`Problema ${index + 1}: juegan las ${side}. Da mate en una jugada.`);
    puzzleStatus.textContent = `Pista: ${puzzle.hint}`;
    boardElement.scrollIntoView({ block: "center" });
}

function checkPuzzle() {
    if (game.status.reason === "mate") {
        solvedPuzzles.add(game.puzzleIndex);
        earnStamp("mate");
        render(`¡Jaque mate con ${game.log.at(-1).san}!`);
        game.status.over = true;
        puzzleStatus.textContent = solvedPuzzles.size === MATE_PUZZLES.length
            ? "¡Resolviste todos los problemas! Ya reconoces varios patrones de mate."
            : `Llevas ${solvedPuzzles.size} de ${MATE_PUZZLES.length}. Prueba otro problema.`;
        puzzleButtons.children[game.puzzleIndex].textContent = `PROBLEMA ${game.puzzleIndex + 1} ✓`;
        return;
    }
    render(`${game.log.at(-1).san} no da mate. Observa a dónde puede escapar el rey.`);
    game.thinking = true; // bloquea el tablero mientras se ve la jugada equivocada
    pendingTimer = window.setTimeout(() => {
        takeBack();
        game.thinking = false;
        game.status = gameStatus(game.state, 1);
        render("Vuelve a intentarlo. Revisa las casillas a las que puede huir el rey.");
    }, 1400);
}


/* ---------------------------------------------------------------------
   7. Probar las reglas con perft: cuenta posiciones y compara con los valores
   conocidos. Si algo se descompone en el motor, aquí se nota.
   --------------------------------------------------------------------- */
const PERFT_EXPECTED = [20, 400, 8902, 197281];
const perftBody = document.querySelector("#perft-body");
const perftRun = document.querySelector("#perft-run");

perftRun.addEventListener("click", () => {
    perftBody.replaceChildren();
    perftRun.disabled = true;
    const position = parseFen(CHESS_START);

    function runDepth(depth) {
        const started = performance.now();
        const total = perft(position, depth);
        const ms = Math.round(performance.now() - started);
        const expected = PERFT_EXPECTED[depth - 1];
        const row = document.createElement("tr");
        [depth, total.toLocaleString("es-MX"), expected.toLocaleString("es-MX"), total === expected ? "COINCIDE" : "¡ERROR!", `${ms} ms`].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.append(cell);
        });
        perftBody.append(row);
        if (depth < PERFT_EXPECTED.length) {
            window.setTimeout(() => runDepth(depth + 1), 30); // deja pintar cada fila
        } else {
            perftRun.disabled = false;
        }
    }
    runDepth(1);
});


/* ---------------------------------------------------------------------
   8. La leyenda del trigo: un grano en la primera casilla y el doble en cada
   una de las siguientes. Los números no caben en un Number normal de JavaScript
   sin perder exactitud, por eso usamos BigInt.
   --------------------------------------------------------------------- */
const GRAMS_PER_GRAIN = 0.04;         // un grano de trigo pesa unos 40 miligramos
const WORLD_HARVEST_TONNES = 800e6;   // cosecha mundial anual: unos 800 millones de toneladas

const wheatSlider = document.querySelector("#wheat-square");
const wheatBoard = document.querySelector("#wheat-board");
const wheatCells = [];

for (let index = 0; index < 64; index += 1) {
    const cell = document.createElement("span");
    wheatCells.push(cell);
    wheatBoard.append(cell);
}

function compareWheat(tonnes) {
    if (tonnes < 0.001) {
        return `Pesa ${(tonnes * 1e6).toFixed(tonnes < 0.00001 ? 2 : 0)} gramos.`;
    }
    if (tonnes < 1) {
        return `Pesa ${(tonnes * 1000).toFixed(1)} kilos.`;
    }
    if (tonnes < 1e6) {
        return `Pesa ${Math.round(tonnes).toLocaleString("es-MX")} toneladas. Un tráiler carga unas 25: harían falta ${Math.ceil(tonnes / 25).toLocaleString("es-MX")}.`;
    }
    return `Pesa ${Math.round(tonnes / 1e6).toLocaleString("es-MX")} millones de toneladas: ${(tonnes / WORLD_HARVEST_TONNES).toLocaleString("es-MX", { maximumFractionDigits: 2 })} veces la cosecha mundial de un año.`;
}

function updateWheat() {
    const square = Number(wheatSlider.value);
    const grains = 2n ** BigInt(square - 1);
    const total = 2n ** BigInt(square) - 1n;
    const tonnes = Number(total) * GRAMS_PER_GRAIN / 1e6;
    document.querySelector("#wheat-label").textContent = String(square);
    document.querySelector("#wheat-grains").textContent = grains.toLocaleString("es-MX");
    document.querySelector("#wheat-total").textContent = total.toLocaleString("es-MX");
    document.querySelector("#wheat-compare").textContent = compareWheat(tonnes);
    wheatCells.forEach((cell, index) => {
        cell.className = index < square ? "is-filled" : "";
    });
}

wheatSlider.addEventListener("input", updateWheat);
updateWheat();

startNewGame();
