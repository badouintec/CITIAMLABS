"use strict";

/* =====================================================================
   ajedrez-motor.js: las reglas del ajedrez y la computadora.
   Este archivo no toca la página: solo piensa. La parte visual (tablero,
   botones y mensajes) está en ajedrez.js.

     1. Cómo se guarda una posición
     2. Generar jugadas
     3. Hacer y deshacer jugadas
     4. Fin de partida y notación
     5. Cómo piensa la computadora: evaluar y buscar (minimax)
     6. Perft: la prueba que confirma que las reglas están bien
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Cómo se guarda una posición
   El tablero es una lista de 64 casillas: la 0 es a8 y la 63 es h1.
   Cada casilla guarda "" si está vacía o una letra en inglés, como en la
   notación FEN: P peón, N caballo, B alfil, R torre, Q dama, K rey.
   Mayúscula = blancas; minúscula = negras.
   --------------------------------------------------------------------- */
const CHESS_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const colorOf = (piece) => (piece === "" ? "" : piece < "a" ? "w" : "b");
const opposite = (color) => (color === "w" ? "b" : "w");
const squareName = (square) => "abcdefgh"[square & 7] + (8 - (square >> 3));
const squareFromName = (name) => (8 - Number(name[1])) * 8 + "abcdefgh".indexOf(name[0]);

// Permisos de enroque como bits. Una jugada que toca una de estas casillas
// borra permisos: mover el rey o una torre, o capturar una torre.
const CASTLE = { K: 1, Q: 2, k: 4, q: 8 };
const CASTLE_KEEP = new Array(64).fill(15);
CASTLE_KEEP[squareFromName("a1")] = 15 - CASTLE.Q;
CASTLE_KEEP[squareFromName("h1")] = 15 - CASTLE.K;
CASTLE_KEEP[squareFromName("e1")] = 15 - CASTLE.K - CASTLE.Q;
CASTLE_KEEP[squareFromName("a8")] = 15 - CASTLE.q;
CASTLE_KEEP[squareFromName("h8")] = 15 - CASTLE.k;
CASTLE_KEEP[squareFromName("e8")] = 15 - CASTLE.k - CASTLE.q;

function parseFen(fen) {
    const [placement, turn, castling, enPassant, halfmove, fullmove] = fen.split(" ");
    const board = [];
    placement.replaceAll("/", "").split("").forEach((symbol) => {
        if (symbol >= "1" && symbol <= "8") {
            board.push(...new Array(Number(symbol)).fill(""));
        } else {
            board.push(symbol);
        }
    });
    let rights = 0;
    for (const letter of castling) {
        rights |= CASTLE[letter] ?? 0;
    }
    return {
        board,
        turn,
        castling: rights,
        enPassant: enPassant === "-" ? -1 : squareFromName(enPassant),
        halfmove: Number(halfmove ?? 0),
        fullmove: Number(fullmove ?? 1),
        kings: { w: board.indexOf("K"), b: board.indexOf("k") },
        undoStack: []
    };
}

/* Identifica una posición para detectar repeticiones. */
function positionKey(state) {
    return `${state.board.map((piece) => piece || "-").join("")} ${state.turn} ${state.castling} ${state.enPassant}`;
}


/* ---------------------------------------------------------------------
   2. Generar jugadas
   Primero se generan las jugadas según cómo se mueve cada pieza. Después,
   legalMoves descarta las que dejan al propio rey en jaque.
   --------------------------------------------------------------------- */
const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const BISHOP_STEPS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_STEPS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const QUEEN_STEPS = [...BISHOP_STEPS, ...ROOK_STEPS];

/* ¿Puede alguna pieza del color "by" capturar en esta casilla? */
function isAttacked(board, square, by) {
    const row = square >> 3;
    const col = square & 7;
    const isWhite = by === "w";
    const piece = (letter) => (isWhite ? letter : letter.toLowerCase());

    // Una pieza blanca ataca hacia arriba: un peón que ataca esta casilla está una fila abajo.
    const pawnRow = row + (isWhite ? 1 : -1);
    if (pawnRow >= 0 && pawnRow <= 7) {
        if (col > 0 && board[pawnRow * 8 + col - 1] === piece("P")) {
            return true;
        }
        if (col < 7 && board[pawnRow * 8 + col + 1] === piece("P")) {
            return true;
        }
    }
    for (const [dr, dc] of KNIGHT_STEPS) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r <= 7 && c >= 0 && c <= 7 && board[r * 8 + c] === piece("N")) {
            return true;
        }
    }
    for (const [dr, dc] of QUEEN_STEPS) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r <= 7 && c >= 0 && c <= 7 && board[r * 8 + c] === piece("K")) {
            return true;
        }
    }
    const sliders = (steps, slider) => {
        for (const [dr, dc] of steps) {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const found = board[r * 8 + c];
                if (found !== "") {
                    if (found === piece(slider) || found === piece("Q")) {
                        return true;
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        return false;
    };
    return sliders(ROOK_STEPS, "R") || sliders(BISHOP_STEPS, "B");
}

function inCheck(state, color = state.turn) {
    return isAttacked(state.board, state.kings[color], opposite(color));
}

function pseudoMoves(state) {
    const { board, turn, enPassant } = state;
    const moves = [];
    const add = (from, to, kind = "", promotion = "") => {
        moves.push({ from, to, piece: board[from], captured: board[to], kind, promotion });
    };
    const walk = (from, steps, far) => {
        const row = from >> 3;
        const col = from & 7;
        for (const [dr, dc] of steps) {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const to = r * 8 + c;
                const color = colorOf(board[to]);
                if (color === turn) {
                    break;
                }
                add(from, to);
                if (color !== "" || !far) {
                    break;
                }
                r += dr;
                c += dc;
            }
        }
    };
    const addPawnMove = (from, to, kind = "") => {
        const row = to >> 3;
        if (row === 0 || row === 7) {
            const promotions = turn === "w" ? ["Q", "R", "B", "N"] : ["q", "r", "b", "n"];
            promotions.forEach((promotion) => add(from, to, kind, promotion));
        } else {
            add(from, to, kind);
        }
    };

    for (let from = 0; from < 64; from += 1) {
        const piece = board[from];
        if (colorOf(piece) !== turn) {
            continue;
        }
        const type = piece.toUpperCase();
        if (type === "P") {
            const forward = turn === "w" ? -8 : 8;
            const startRow = turn === "w" ? 6 : 1;
            const col = from & 7;
            if (board[from + forward] === "") {
                addPawnMove(from, from + forward);
                if ((from >> 3) === startRow && board[from + forward * 2] === "") {
                    add(from, from + forward * 2, "double");
                }
            }
            for (const side of [-1, 1]) {
                const newCol = col + side;
                if (newCol < 0 || newCol > 7) {
                    continue;
                }
                const to = from + forward + side;
                if (board[to] !== "" && colorOf(board[to]) !== turn) {
                    addPawnMove(from, to);
                } else if (to === enPassant) {
                    add(from, to, "enpassant");
                }
            }
        } else if (type === "N") {
            walk(from, KNIGHT_STEPS, false);
        } else if (type === "B") {
            walk(from, BISHOP_STEPS, true);
        } else if (type === "R") {
            walk(from, ROOK_STEPS, true);
        } else if (type === "Q") {
            walk(from, QUEEN_STEPS, true);
        } else {
            walk(from, QUEEN_STEPS, false);
            addCastlingMoves(state, from, add);
        }
    }
    return moves;
}

/* Para enrocar: no haber movido rey ni torre, casillas libres, y que el rey no
   esté en jaque ni pase o llegue a una casilla atacada. */
function addCastlingMoves(state, from, add) {
    const { board, turn, castling } = state;
    const enemy = opposite(turn);
    const kingSide = turn === "w" ? CASTLE.K : CASTLE.k;
    const queenSide = turn === "w" ? CASTLE.Q : CASTLE.q;
    if (!(castling & (kingSide | queenSide)) || isAttacked(board, from, enemy)) {
        return;
    }
    if ((castling & kingSide) && board[from + 1] === "" && board[from + 2] === ""
        && !isAttacked(board, from + 1, enemy) && !isAttacked(board, from + 2, enemy)) {
        add(from, from + 2, "castleK");
    }
    if ((castling & queenSide) && board[from - 1] === "" && board[from - 2] === "" && board[from - 3] === ""
        && !isAttacked(board, from - 1, enemy) && !isAttacked(board, from - 2, enemy)) {
        add(from, from - 2, "castleQ");
    }
}

function legalMoves(state) {
    const mover = state.turn;
    return pseudoMoves(state).filter((move) => {
        makeMove(state, move);
        const isSafe = !isAttacked(state.board, state.kings[mover], state.turn);
        undoMove(state);
        return isSafe;
    });
}


/* ---------------------------------------------------------------------
   3. Hacer y deshacer jugadas
   La computadora prueba miles de jugadas por segundo, así que deshacer debe
   ser exacto: cualquier error aquí corrompería la partida.
   --------------------------------------------------------------------- */
function makeMove(state, move) {
    const { board } = state;
    const { from, to, piece, kind, promotion, captured } = move;
    state.undoStack.push({ move, castling: state.castling, enPassant: state.enPassant, halfmove: state.halfmove });

    board[from] = "";
    board[to] = promotion || piece;
    if (kind === "enpassant") {
        board[to + (state.turn === "w" ? 8 : -8)] = "";
    } else if (kind === "castleK") {
        board[to - 1] = board[to + 1];
        board[to + 1] = "";
    } else if (kind === "castleQ") {
        board[to + 1] = board[to - 2];
        board[to - 2] = "";
    }

    const type = piece.toUpperCase();
    if (type === "K") {
        state.kings[state.turn] = to;
    }
    state.castling &= CASTLE_KEEP[from] & CASTLE_KEEP[to];
    state.enPassant = kind === "double" ? (from + to) / 2 : -1;
    state.halfmove = type === "P" || captured !== "" ? 0 : state.halfmove + 1;
    if (state.turn === "b") {
        state.fullmove += 1;
    }
    state.turn = opposite(state.turn);
}

function undoMove(state) {
    const { move, castling, enPassant, halfmove } = state.undoStack.pop();
    const { board } = state;
    const { from, to, piece, kind, captured } = move;
    state.turn = opposite(state.turn);
    if (state.turn === "b") {
        state.fullmove -= 1;
    }
    state.castling = castling;
    state.enPassant = enPassant;
    state.halfmove = halfmove;

    board[from] = piece;
    board[to] = captured;
    if (kind === "enpassant") {
        board[to + (state.turn === "w" ? 8 : -8)] = state.turn === "w" ? "p" : "P";
    } else if (kind === "castleK") {
        board[to + 1] = board[to - 1];
        board[to - 1] = "";
    } else if (kind === "castleQ") {
        board[to - 2] = board[to + 1];
        board[to + 1] = "";
    }
    if (piece.toUpperCase() === "K") {
        state.kings[state.turn] = from;
    }
}


/* ---------------------------------------------------------------------
   4. Fin de partida y notación
   --------------------------------------------------------------------- */

/* Falta de material: ni con ayuda del rival se podría dar mate. */
function hasInsufficientMaterial(board) {
    const others = [];
    for (let square = 0; square < 64; square += 1) {
        const piece = board[square];
        if (piece !== "" && piece.toUpperCase() !== "K") {
            others.push({ type: piece.toUpperCase(), color: colorOf(piece), square });
        }
    }
    if (others.length === 0) {
        return true;
    }
    if (others.length === 1) {
        return others[0].type === "N" || others[0].type === "B";
    }
    if (others.length === 2 && others.every((piece) => piece.type === "B") && others[0].color !== others[1].color) {
        const shade = ({ square }) => ((square >> 3) + (square & 7)) % 2;
        return shade(others[0]) === shade(others[1]);
    }
    return false;
}

/* repetitions: cuántas veces ha ocurrido la posición actual en la partida. */
function gameStatus(state, repetitions = 1) {
    const moves = legalMoves(state);
    if (moves.length === 0) {
        return inCheck(state)
            ? { over: true, reason: "mate", winner: opposite(state.turn) }
            : { over: true, reason: "ahogado", winner: "" };
    }
    if (hasInsufficientMaterial(state.board)) {
        return { over: true, reason: "material", winner: "" };
    }
    if (state.halfmove >= 100) {
        return { over: true, reason: "cincuenta", winner: "" };
    }
    if (repetitions >= 3) {
        return { over: true, reason: "repeticion", winner: "" };
    }
    return { over: false, reason: "", winner: "" };
}

/* Notación algebraica en español: R rey, D dama, T torre, A alfil, C caballo. */
const SPANISH_LETTER = { K: "R", Q: "D", R: "T", B: "A", N: "C", P: "" };

function moveToSan(state, move) {
    let san;
    if (move.kind === "castleK") {
        san = "O-O";
    } else if (move.kind === "castleQ") {
        san = "O-O-O";
    } else {
        const type = move.piece.toUpperCase();
        const isCapture = move.captured !== "" || move.kind === "enpassant";
        let origin = "";
        if (type === "P") {
            origin = isCapture ? squareName(move.from)[0] : "";
        } else {
            // Si otra pieza igual puede llegar a la misma casilla, hay que aclarar cuál.
            const twins = legalMoves(state).filter((other) => other.piece === move.piece && other.to === move.to && other.from !== move.from);
            if (twins.length > 0) {
                const sameCol = twins.some((other) => (other.from & 7) === (move.from & 7));
                const sameRow = twins.some((other) => (other.from >> 3) === (move.from >> 3));
                const name = squareName(move.from);
                origin = !sameCol ? name[0] : !sameRow ? name[1] : name;
            }
        }
        const promotion = move.promotion ? `=${SPANISH_LETTER[move.promotion.toUpperCase()]}` : "";
        san = `${SPANISH_LETTER[type]}${origin}${isCapture ? "x" : ""}${squareName(move.to)}${promotion}`;
    }
    makeMove(state, move);
    if (inCheck(state)) {
        san += legalMoves(state).length === 0 ? "#" : "+";
    }
    undoMove(state);
    return san;
}


/* ---------------------------------------------------------------------
   5. Cómo piensa la computadora
   No "entiende" el ajedrez: da puntos a cada posición y prueba jugadas.
   Supone que tú también elegirás lo mejor para ti. Esa idea se llama minimax.

   La poda alfa-beta ahorra trabajo: si una jugada ya resultó peor que otra,
   deja de analizarla. Las capturas se revisan hasta el final (búsqueda de
   quietud) para no creer que gana una pieza que le recapturarán enseguida.
   --------------------------------------------------------------------- */
const PIECE_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };

/* Puntos según la casilla, desde el lado de las blancas (primera fila = fila 8).
   Por ejemplo, un caballo vale más en el centro que en una esquina. */
const SQUARE_BONUS = {
    P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
};

const MATE_SCORE = 100000;
const MAX_CAPTURE_PLIES = 6;

/* Puntos desde el punto de vista de las blancas: positivo = ventaja blanca. */
function evaluateForWhite(board) {
    let score = 0;
    for (let square = 0; square < 64; square += 1) {
        const piece = board[square];
        if (piece === "") {
            continue;
        }
        if (piece < "a") {
            score += PIECE_VALUE[piece] + SQUARE_BONUS[piece][square];
        } else {
            const type = piece.toUpperCase();
            score -= PIECE_VALUE[type] + SQUARE_BONUS[type][square ^ 56]; // ^ 56 voltea el tablero
        }
    }
    return score;
}

/* Revisar primero las capturas buenas (peón captura dama) hace que la poda corte más. */
function moveOrder(move) {
    let order = 0;
    if (move.captured !== "") {
        order += 10 * PIECE_VALUE[move.captured.toUpperCase()] - PIECE_VALUE[move.piece.toUpperCase()] + 1000;
    }
    if (move.promotion) {
        order += PIECE_VALUE[move.promotion.toUpperCase()];
    }
    return order;
}

function sortedMoves(moves) {
    return moves.map((move) => [moveOrder(move), move]).sort((a, b) => b[0] - a[0]).map((pair) => pair[1]);
}

/* level: { depth, timeMs, noise }. "noise" agrega errores para los niveles fáciles. */
function chooseMove(state, level) {
    const started = Date.now();
    const deadline = started + level.timeMs;
    let nodes = 0;
    let stopped = false;

    const countNode = () => {
        nodes += 1;
        if (nodes % 2048 === 0 && Date.now() > deadline) {
            stopped = true;
        }
    };

    function quiesce(alpha, beta, plies) {
        countNode();
        const side = state.turn === "w" ? 1 : -1;
        const standPat = side * evaluateForWhite(state.board);
        if (standPat >= beta || plies === 0 || stopped) {
            return standPat;
        }
        let best = Math.max(alpha, standPat);
        const captures = legalMoves(state).filter((move) => move.captured !== "" || move.kind === "enpassant");
        for (const move of sortedMoves(captures)) {
            makeMove(state, move);
            const score = -quiesce(-beta, -best, plies - 1);
            undoMove(state);
            if (score >= beta) {
                return score;
            }
            best = Math.max(best, score);
        }
        return best;
    }

    function negamax(depth, alpha, beta, ply) {
        countNode();
        if (stopped) {
            return 0;
        }
        const moves = legalMoves(state);
        if (moves.length === 0) {
            return inCheck(state) ? -(MATE_SCORE - ply) : 0; // un mate más cercano vale más
        }
        if (state.halfmove >= 100) {
            return 0;
        }
        if (depth === 0) {
            return quiesce(alpha, beta, MAX_CAPTURE_PLIES);
        }
        let best = -Infinity;
        for (const move of sortedMoves(moves)) {
            makeMove(state, move);
            const score = -negamax(depth - 1, -beta, -alpha, ply + 1);
            undoMove(state);
            if (score > best) {
                best = score;
            }
            alpha = Math.max(alpha, score);
            if (alpha >= beta) {
                break; // poda: el rival nunca permitiría llegar hasta aquí
            }
        }
        return best;
    }

    const rootMoves = sortedMoves(legalMoves(state));
    let result = { move: rootMoves[0], score: 0, depth: 0 };

    // Profundización iterativa: piensa 1 jugada, luego 2, 3... hasta que se acabe el tiempo.
    for (let depth = 1; depth <= level.depth; depth += 1) {
        let bestMove = null;
        let bestScore = -Infinity;
        let alpha = -Infinity;
        for (const move of rootMoves) {
            makeMove(state, move);
            let score = -negamax(depth - 1, -Infinity, level.noise ? Infinity : -alpha, 1);
            undoMove(state);
            if (stopped) {
                break;
            }
            // La tentación de los niveles fáciles: pequeños errores al juzgar una jugada.
            // Un mate forzado no se disimula, para no regalar errores absurdos.
            if (level.noise && Math.abs(score) < MATE_SCORE - 100) {
                score += Math.round((Math.random() - 0.5) * level.noise);
            }
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
            alpha = Math.max(alpha, score);
        }
        if (stopped || !bestMove) {
            break;
        }
        result = { move: bestMove, score: bestScore, depth };
        // La mejor jugada se revisa primero en la siguiente vuelta: así se poda más.
        rootMoves.splice(rootMoves.indexOf(bestMove), 1);
        rootMoves.unshift(bestMove);
        if (Math.abs(bestScore) >= MATE_SCORE - 100) {
            break; // ya encontró un mate: no hace falta pensar más
        }
    }
    return { ...result, nodes, ms: Date.now() - started };
}


/* ---------------------------------------------------------------------
   6. Perft ("performance test")
   Cuenta todas las posiciones posibles después de N jugadas. Para la posición
   inicial, esos números se conocen desde hace décadas: 20, 400, 8902, 197281...
   Si nuestro conteo coincide, las reglas muy probablemente están bien programadas.
   --------------------------------------------------------------------- */
function perft(state, depth) {
    if (depth === 0) {
        return 1;
    }
    let total = 0;
    for (const move of legalMoves(state)) {
        makeMove(state, move);
        total += perft(state, depth - 1);
        undoMove(state);
    }
    return total;
}
