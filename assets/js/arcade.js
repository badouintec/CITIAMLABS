"use strict";

/* =====================================================================
   arcade.js: juegos de arcade.html.

     Herramientas compartidas
     1. Reto relámpago de matemáticas
     2. Ruta del robot
     3. Misión desierto           (usa createQuiz)
     4. Memorama STEAM
     5. Laboratorio de sombras
     6. Detective de código       (usa createQuiz)
     7. Reto RGB
     8. Bitácora del desierto

   Las puntuaciones viven solo en estas variables: al recargar la página
   se pierden y nunca se envían a un servidor.
   ===================================================================== */


/* ---------------------------------------------------------------------
   Herramientas compartidas
   --------------------------------------------------------------------- */
function randomInteger(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

/* Devuelve una copia mezclada de la lista (algoritmo Fisher-Yates). */
function shuffled(list) {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInteger(0, index);
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}

/* Motor de los juegos de preguntas. Busca los elementos por su prefijo: con
   prefix "quiz" usa #quiz-question, #quiz-answers, #quiz-round, #quiz-score,
   #quiz-feedback, #quiz-start y #quiz-next.

   Cada pregunta es { question, answers, correct, explanation }, y "correct"
   es la posición de la respuesta correcta en "answers" (0 es la primera).
   Mezcla preguntas y respuestas en cada partida para que la posición no
   delate la respuesta.

   onShow(pregunta) es opcional y se ejecuta al mostrar cada pregunta.
   finishText(aciertos, total) devuelve el mensaje final. */
function createQuiz({ prefix, questions, finishText, finalFeedback, onShow, onFinish }) {
    const element = (name) => document.querySelector(`#${prefix}-${name}`);
    const questionLabel = element("question");
    const answersBox = element("answers");
    const roundLabel = element("round");
    const scoreLabel = element("score");
    const feedback = element("feedback");
    const startButton = element("start");
    const nextButton = element("next");
    let deck = [];
    let index = 0;
    let score = 0;
    let answered = false;

    function buildDeck() {
        return shuffled(questions).map((question) => {
            const options = shuffled(question.answers.map((text, position) => ({
                text,
                isCorrect: position === question.correct
            })));
            return { ...question, options };
        });
    }

    function answer(option, button) {
        if (answered) {
            return;
        }
        answered = true;
        const current = deck[index];
        const correctPosition = current.options.findIndex((candidate) => candidate.isCorrect);
        answersBox.children[correctPosition].classList.add("is-correct");
        if (option.isCorrect) {
            score += 1;
            feedback.textContent = `¡Correcto! ${current.explanation}`;
        } else {
            button.classList.add("is-incorrect");
            feedback.textContent = `La respuesta correcta es "${current.options[correctPosition].text}". ${current.explanation}`;
        }
        scoreLabel.textContent = `Aciertos: ${score}`;
        answersBox.querySelectorAll("button").forEach((answerButton) => {
            answerButton.disabled = true;
        });
        nextButton.hidden = false;
        nextButton.textContent = index === deck.length - 1 ? "VER RESULTADO" : "SIGUIENTE PREGUNTA";
    }

    function show() {
        const current = deck[index];
        questionLabel.textContent = current.question;
        roundLabel.textContent = `Pregunta: ${index + 1}/${deck.length}`;
        scoreLabel.textContent = `Aciertos: ${score}`;
        feedback.textContent = "";
        nextButton.hidden = true;
        answered = false;
        onShow?.(current);
        answersBox.replaceChildren(...current.options.map((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "retro-button";
            button.textContent = option.text;
            button.addEventListener("click", () => answer(option, button));
            return button;
        }));
    }

    startButton.addEventListener("click", () => {
        deck = buildDeck();
        index = 0;
        score = 0;
        startButton.hidden = true;
        show();
    });

    nextButton.addEventListener("click", () => {
        if (!answered) {
            return;
        }
        index += 1;
        if (index < deck.length) {
            show();
            return;
        }
        questionLabel.textContent = finishText(score, deck.length);
        roundLabel.textContent = "Pregunta: final";
        feedback.textContent = finalFeedback;
        answersBox.replaceChildren();
        nextButton.hidden = true;
        startButton.hidden = false;
        startButton.textContent = "JUGAR OTRA VEZ";
        onFinish?.();
    });
}


/* ---------------------------------------------------------------------
   1. Reto relámpago: 5 problemas en 45 segundos. Con una respuesta
   incorrecta el reloj sigue corriendo y se puede volver a intentar.
   --------------------------------------------------------------------- */
const mathForm = document.querySelector("#math-form");
const mathAnswer = document.querySelector("#math-answer");
const mathQuestion = document.querySelector("#math-question");
const mathRound = document.querySelector("#math-round");
const mathScore = document.querySelector("#math-score");
const mathTimer = document.querySelector("#math-timer");
const mathFeedback = document.querySelector("#math-feedback");
const mathSubmit = document.querySelector("#math-submit");
const mathStart = document.querySelector("#math-start");
const mathState = { round: 0, score: 0, answer: 0, timeLeft: 45, timer: null };
const mathRounds = 5;

function makeMathQuestion() {
    const type = randomInteger(0, 3);
    const first = randomInteger(12, 72);
    const second = randomInteger(3, 28);
    if (type === 0) {
        return { text: `En un mapa del desierto, el grupo marca ${first} kilómetros de una ruta y ${second} de otra. ¿Cuántos kilómetros son en total?`, answer: first + second };
    }
    if (type === 1) {
        const larger = Math.max(first, second);
        const smaller = Math.min(first, second);
        return { text: `En una prueba imaginaria, una superficie marca ${larger} grados al sol y ${smaller} grados a la sombra. ¿Cuál es la diferencia entre las mediciones?`, answer: larger - smaller };
    }
    if (type === 2) {
        const rows = randomInteger(2, 8);
        const plantsPerRow = randomInteger(3, 9);
        return { text: `En un modelo escolar hay ${rows} filas con ${plantsPerRow} plantas dibujadas en cada fila. ¿Cuántas plantas aparecen?`, answer: rows * plantsPerRow };
    }
    // Factores pequeños: 72 x 28 no se resuelve de cabeza en un reto de 45 segundos.
    const rate = randomInteger(3, 15);
    const seconds = randomInteger(3, 12);
    return { text: `Un sensor de prueba registra ${rate} unidades por segundo durante ${seconds} segundos. ¿Cuántas unidades registra en total?`, answer: rate * seconds };
}

function updateMathScoreboard() {
    mathRound.textContent = mathState.round > 0
        ? `Ronda: ${Math.min(mathState.round, mathRounds)}/${mathRounds}`
        : "Ronda: lista";
    mathScore.textContent = `Puntos: ${mathState.score}`;
    mathTimer.textContent = `Tiempo: ${mathState.timeLeft} s`;
}

function showMathQuestion() {
    const problem = makeMathQuestion();
    mathQuestion.textContent = problem.text;
    mathState.answer = problem.answer;
    mathAnswer.value = "";
    mathAnswer.disabled = false;
    mathSubmit.disabled = false;
    mathAnswer.focus();
    updateMathScoreboard();
}

function finishMathGame(message) {
    window.clearInterval(mathState.timer);
    mathState.timer = null;
    mathAnswer.disabled = true;
    mathSubmit.disabled = true;
    mathFeedback.textContent = `${message} Resultado: ${mathState.score} de ${mathRounds} puntos.`;
    mathQuestion.textContent = "Reto terminado. ¡Puedes intentarlo otra vez!";
    mathStart.textContent = "JUGAR DE NUEVO";
}

mathStart.addEventListener("click", () => {
    window.clearInterval(mathState.timer);
    mathState.round = 1;
    mathState.score = 0;
    mathState.timeLeft = 45;
    mathFeedback.textContent = "";
    mathStart.textContent = "REINICIAR RETO";
    showMathQuestion();
    mathState.timer = window.setInterval(() => {
        mathState.timeLeft -= 1;
        updateMathScoreboard();
        if (mathState.timeLeft <= 0) {
            finishMathGame("¡Se acabó el tiempo!");
        }
    }, 1000);
});

mathForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!mathState.timer || mathAnswer.disabled) {
        return;
    }
    if (Number(mathAnswer.value) !== mathState.answer) {
        mathFeedback.textContent = "Todavía no. Revisa la operación y vuelve a intentarlo.";
        mathAnswer.select();
        return;
    }

    mathState.score += 1;
    mathFeedback.textContent = "¡Correcto! Buen cálculo.";
    updateMathScoreboard();
    if (mathState.round === mathRounds) {
        finishMathGame("¡Completaste todas las rondas!");
        earnStamp("relampago");
        return;
    }
    mathState.round += 1;
    showMathQuestion();
});


/* ---------------------------------------------------------------------
   2. Ruta del robot: tablero de 5 x 5. Las coordenadas son "fila,columna"
   y la fila 0 es la de arriba. Para cambiar el mapa, edita routeRocks y
   comprueba que todavía exista una ruta de 8 pasos o menos.
   --------------------------------------------------------------------- */
const routeBoard = document.querySelector("#route-board");
const routeProgramLabel = document.querySelector("#route-program");
const routeFeedback = document.querySelector("#route-feedback");
const routeRunButton = document.querySelector("#route-run");
const routeUndoButton = document.querySelector("#route-undo");
const routeClearButton = document.querySelector("#route-clear");
const routeMoveButtons = document.querySelectorAll("[data-move]");
const routeDirections = {
    up: { row: -1, column: 0, label: "↑" },
    down: { row: 1, column: 0, label: "↓" },
    left: { row: 0, column: -1, label: "←" },
    right: { row: 0, column: 1, label: "→" }
};
const routeRocks = new Set([
    "1,1", "1,2", "1,3",
    "2,1", "2,2", "2,3",
    "3,1", "3,2", "3,3"
]);
const routeStart = { row: 4, column: 0 };
const routeGoal = { row: 0, column: 4 };
const routeMaxMoves = 8;
const routeProgram = [];
let routePosition = { ...routeStart };
let routeRunning = false;

function renderRouteBoard() {
    routeBoard.replaceChildren();
    for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 5; column += 1) {
            const cell = document.createElement("span");
            cell.className = "route-cell";
            if (routeRocks.has(`${row},${column}`)) {
                cell.classList.add("is-rock");
            } else if (row === routePosition.row && column === routePosition.column) {
                cell.classList.add("is-robot"); // antes que la meta: el robot debe verse al llegar
            } else if (row === routeGoal.row && column === routeGoal.column) {
                cell.classList.add("is-goal");
            }
            routeBoard.append(cell);
        }
    }
    routeBoard.setAttribute("aria-label", `Robot en fila ${routePosition.row + 1}, columna ${routePosition.column + 1}; panel solar en fila 1, columna 5.`);
}

function updateRouteControls() {
    const isEmpty = routeProgram.length === 0;
    routeMoveButtons.forEach((button) => {
        button.disabled = routeRunning || routeProgram.length >= routeMaxMoves;
    });
    routeUndoButton.disabled = routeRunning || isEmpty;
    routeClearButton.disabled = routeRunning || isEmpty;
    routeRunButton.disabled = routeRunning || isEmpty;
}

function renderRouteProgram() {
    const symbols = routeProgram.map((move) => routeDirections[move].label).join(" ");
    routeProgramLabel.textContent = `Programa: ${symbols || "vacío"} (${routeProgram.length}/${routeMaxMoves})`;
    updateRouteControls();
}

function stopRoute(message) {
    routeRunning = false;
    routeFeedback.textContent = message;
    updateRouteControls();
}

routeMoveButtons.forEach((button) => {
    button.addEventListener("click", () => {
        routeProgram.push(button.dataset.move);
        renderRouteProgram();
        routeFeedback.textContent = "Instrucción añadida. ¿Ya planeaste cómo rodear las rocas?";
    });
});

routeUndoButton.addEventListener("click", () => {
    routeProgram.pop();
    renderRouteProgram();
});

routeClearButton.addEventListener("click", () => {
    routeProgram.length = 0;
    routePosition = { ...routeStart };
    renderRouteProgram();
    renderRouteBoard();
    routeFeedback.textContent = "Programa borrado. Planea una ruta nueva.";
});

routeRunButton.addEventListener("click", () => {
    routePosition = { ...routeStart };
    routeRunning = true;
    let moveIndex = 0;
    routeFeedback.textContent = "Ejecutando el programa...";
    renderRouteBoard();
    updateRouteControls();

    function executeNextMove() {
        if (moveIndex >= routeProgram.length) {
            stopRoute("El robot no llegó al panel. Edita el programa y prueba otra ruta.");
            return;
        }

        const direction = routeDirections[routeProgram[moveIndex]];
        const row = routePosition.row + direction.row;
        const column = routePosition.column + direction.column;
        moveIndex += 1;

        if (row < 0 || row > 4 || column < 0 || column > 4) {
            stopRoute("¡Fuera de la cuadrícula! Deshaz un paso o borra el programa.");
            return;
        }
        if (routeRocks.has(`${row},${column}`)) {
            stopRoute("¡Roca en el camino! El robot se detuvo. Cambia la secuencia.");
            return;
        }

        routePosition = { row, column };
        renderRouteBoard();
        if (row === routeGoal.row && column === routeGoal.column) {
            stopRoute(`¡Ruta completada en ${moveIndex} pasos! ¡Buen trabajo de programación!`);
            earnStamp("ruta");
            return;
        }
        window.setTimeout(executeNextMove, 300);
    }

    window.setTimeout(executeNextMove, 250);
});

renderRouteBoard();
renderRouteProgram();


/* ---------------------------------------------------------------------
   3. Misión desierto
   --------------------------------------------------------------------- */
createQuiz({
    prefix: "quiz",
    onFinish: () => earnStamp("desierto"),
    finishText: (score, total) => `Misión terminada: lograste ${score} de ${total} aciertos.`,
    finalFeedback: "Vuelve a jugar para practicar o elige una respuesta que quieras investigar más.",
    questions: [
        {
            question: "¿Cuál de estas ciudades es la capital del estado de Sonora?",
            answers: ["Hermosillo", "Guaymas", "Nogales"],
            correct: 0,
            explanation: "Hermosillo es la capital de Sonora. Localízala en un mapa y observa dónde está respecto a otras ciudades del estado."
        },
        {
            question: "¿Por qué muchas plantas de zonas secas tienen hojas pequeñas o espinas?",
            answers: ["Para reducir la pérdida de agua", "Para producir más sombra debajo de la tierra", "Para atraer más lluvia"],
            correct: 0,
            explanation: "En diversas plantas, hojas reducidas o espinas ayudan a disminuir la superficie por donde se pierde agua. Las adaptaciones dependen de cada especie."
        },
        {
            question: "¿Qué convierte la luz del Sol en electricidad en un panel solar fotovoltaico?",
            answers: ["Celdas fotovoltaicas", "Un sensor de sonido", "Un engrane"],
            correct: 0,
            explanation: "Las celdas fotovoltaicas transforman parte de la energía luminosa en energía eléctrica."
        },
        {
            question: "¿Qué necesita hacer un robot seguidor de línea para decidir hacia dónde moverse?",
            answers: ["Leer sensores y ejecutar instrucciones", "Adivinar el color del piso", "Conectarse siempre a internet"],
            correct: 0,
            explanation: "El programa compara las lecturas de los sensores con reglas y decide qué señal enviar a los motores."
        },
        {
            question: "Una planta recibe 3 horas de luz en la mañana y 2 por la tarde. ¿Cuántas horas de luz recibió en total?",
            answers: ["5 horas", "6 horas", "1 hora"],
            correct: 0,
            explanation: "Sumamos los dos intervalos: 3 + 2 = 5. Es un ejemplo de práctica, no un registro del clima local."
        }
    ]
});


/* ---------------------------------------------------------------------
   4. Memorama: seis parejas de palabra y definición.
   --------------------------------------------------------------------- */
const memoryTerms = [
    { term: "Hipótesis", definition: "Idea que se pone a prueba" },
    { term: "Sensor", definition: "Herramienta que mide una señal" },
    { term: "Prototipo", definition: "Modelo que sirve para probar un diseño" },
    { term: "Dato", definition: "Observación registrada con cuidado" },
    { term: "Algoritmo", definition: "Instrucciones ordenadas para una tarea" },
    { term: "Variable", definition: "Factor que puede cambiar en una prueba" }
];
const memoryBoard = document.querySelector("#memory-board");
const memoryPairs = document.querySelector("#memory-pairs");
const memoryMoves = document.querySelector("#memory-moves");
const memoryFeedback = document.querySelector("#memory-feedback");
const memoryStart = document.querySelector("#memory-start");
const memoryHiddenLabel = "Tarjeta oculta. Pulsa para revelar.";
let firstMemoryCard = null;
let memoryLocked = false;
let memoryMatches = 0;
let memoryAttempts = 0;
let memoryMismatchTimer = null;

function updateMemoryScore() {
    memoryPairs.textContent = `Parejas: ${memoryMatches}/${memoryTerms.length}`;
    memoryMoves.textContent = `Intentos: ${memoryAttempts}`;
}

function hideMemoryCards() {
    // :not(.is-matched): las parejas encontradas deben quedarse abiertas.
    memoryBoard.querySelectorAll(".memory-card.is-revealed:not(.is-matched)").forEach((card) => {
        card.classList.remove("is-revealed");
        card.textContent = "?";
        card.setAttribute("aria-label", memoryHiddenLabel);
    });
    memoryLocked = false;
    memoryMismatchTimer = null;
}

function revealMemoryCard(button, card) {
    if (memoryLocked || button.disabled || button.classList.contains("is-revealed")) {
        return;
    }

    button.classList.add("is-revealed");
    button.textContent = card.label;
    button.setAttribute("aria-label", `Tarjeta: ${card.label}`);
    if (!firstMemoryCard) {
        firstMemoryCard = { button, card };
        memoryFeedback.textContent = "Elige una segunda tarjeta.";
        return;
    }

    memoryAttempts += 1;
    updateMemoryScore();
    if (firstMemoryCard.card.pair === card.pair) {
        [firstMemoryCard.button, button].forEach((matchedButton) => {
            matchedButton.classList.add("is-matched");
            matchedButton.disabled = true;
        });
        memoryMatches += 1;
        firstMemoryCard = null;
        updateMemoryScore();
        if (memoryMatches === memoryTerms.length) {
            earnStamp("memorama");
            offerRecord("memorama", memoryAttempts);
        }
        memoryFeedback.textContent = memoryMatches === memoryTerms.length
            ? `Completaste el memorama en ${memoryAttempts} intentos. ¡Buen trabajo!`
            : `Pareja encontrada: ${card.term} — ${card.definition}.`;
        return;
    }

    memoryLocked = true;
    memoryFeedback.textContent = "No coinciden. Observa las palabras y vuelve a intentar.";
    memoryMismatchTimer = window.setTimeout(() => {
        firstMemoryCard = null;
        hideMemoryCards();
    }, 1000);
}

memoryStart.addEventListener("click", () => {
    window.clearTimeout(memoryMismatchTimer);
    firstMemoryCard = null;
    memoryLocked = false;
    memoryMatches = 0;
    memoryAttempts = 0;
    const cards = shuffled(memoryTerms.flatMap((entry, pair) => [
        { pair, label: entry.term, ...entry },
        { pair, label: entry.definition, ...entry }
    ]));
    memoryBoard.replaceChildren(...cards.map((card) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "memory-card";
        button.textContent = "?";
        button.setAttribute("aria-label", memoryHiddenLabel);
        button.addEventListener("click", () => revealMemoryCard(button, card));
        return button;
    }));
    memoryFeedback.textContent = "Busca cada palabra y su explicación.";
    memoryStart.textContent = "MEZCLAR Y REINICIAR";
    updateMemoryScore();
});


/* ---------------------------------------------------------------------
   5. Laboratorio de sombras: largo = altura / tangente(ángulo).
   El dibujo es un esquema; sus medidas no están a escala con los centímetros.
   El Sol siempre queda del lado contrario a la sombra, como en la realidad.
   --------------------------------------------------------------------- */
const sunAngle = document.querySelector("#sun-angle");
const sunAngleLabel = document.querySelector("#sun-angle-label");
const shadowLength = document.querySelector("#shadow-length");
const shadowVisual = document.querySelector("#shadow-visual");
const shadowFeedback = document.querySelector("#shadow-feedback");
const shadowObjectHeight = 10;
const longestShadow = shadowObjectHeight / Math.tan(15 * Math.PI / 180);

function updateShadowModel() {
    const angle = Number(sunAngle.value);
    const radians = angle * Math.PI / 180;
    const length = shadowObjectHeight / Math.tan(radians);
    sunAngleLabel.value = String(angle);
    shadowLength.value = length.toFixed(1);
    // El objeto está en left: 30% y el suelo a 130 px del borde superior (ver style.css).
    shadowVisual.style.setProperty("--sun-x", `${30 - 26 * Math.cos(radians)}%`);
    shadowVisual.style.setProperty("--sun-y", `${130 - 12 - 105 * Math.sin(radians)}px`);
    shadowVisual.style.setProperty("--shadow-width", `${(length / longestShadow) * 62}%`);
    shadowFeedback.textContent = angle < 45
        ? "El Sol está bajo en este modelo: la sombra es larga. Prueba un ángulo mayor."
        : "El Sol está más alto en este modelo: la sombra es más corta. Prueba un ángulo menor.";
}

sunAngle.addEventListener("input", updateShadowModel);
updateShadowModel();


/* ---------------------------------------------------------------------
   6. Detective de código
   --------------------------------------------------------------------- */
const codeSnippet = document.querySelector("#code-snippet");

createQuiz({
    prefix: "code",
    onShow: (current) => {
        codeSnippet.textContent = current.snippet;
    },
    onFinish: () => {
        codeSnippet.textContent = "¡Ya reconoces varias piezas del código de CiTIAM!";
        earnStamp("detective");
    },
    finishText: (score, total) => `Investigación terminada: lograste ${score} de ${total} aciertos.`,
    finalFeedback: "Abre Programación para practicar escribiendo tus propios fragmentos.",
    questions: [
        {
            snippet: '<h1 class="cyan">CiTIAM Labs</h1>',
            question: "¿Qué hace este fragmento HTML?",
            answers: ["Crea un título y le asigna una clase", "Cambia el color de toda la página", "Escucha un clic"],
            correct: 0,
            explanation: "h1 representa un título principal; class permite aplicarle estilos CSS."
        },
        {
            snippet: ".article-card { background: #050505; padding: 14px; }",
            question: "¿Qué describe esta regla CSS?",
            answers: ["El fondo y el espacio interior de las tarjetas", "El texto de un enlace", "Una pregunta de JavaScript"],
            correct: 0,
            explanation: "El selector elige elementos con la clase article-card y define su fondo y espacio interior."
        },
        {
            snippet: 'document.querySelector("#idea-button")',
            question: "¿Qué busca este selector?",
            answers: ["El elemento cuyo id es idea-button", "Todos los enlaces de la página", "Un archivo llamado idea-button"],
            correct: 0,
            explanation: "querySelector encuentra el elemento que coincide con el selector CSS; # busca un id."
        },
        {
            snippet: 'boton.addEventListener("click", mostrarIdea);',
            question: "¿Cuándo se ejecuta mostrarIdea?",
            answers: ["Cuando alguien hace clic en el botón", "Al cambiar el color de fondo", "Antes de cargar el HTML"],
            correct: 0,
            explanation: "addEventListener conecta el evento click con la función indicada."
        },
        {
            snippet: 'mensaje.textContent = "¡Bienvenidos!";',
            question: "¿Qué cambia textContent?",
            answers: ["El texto dentro de un elemento", "El tamaño del archivo CSS", "La dirección de un enlace"],
            correct: 0,
            explanation: "textContent reemplaza el texto del elemento sin interpretar el contenido como HTML."
        }
    ]
});


/* ---------------------------------------------------------------------
   7. Reto RGB: acierta si los tres canales quedan a 24 puntos o menos del
   objetivo. Los valores objetivo salen de rgbPalette.
   --------------------------------------------------------------------- */
const rgbTarget = document.querySelector("#rgb-target");
const rgbCurrent = document.querySelector("#rgb-current");
const rgbTargetValues = document.querySelector("#rgb-target-values");
const rgbCurrentValues = document.querySelector("#rgb-current-values");
const rgbFeedback = document.querySelector("#rgb-feedback");
const rgbRoundLabel = document.querySelector("#rgb-round");
const rgbScoreLabel = document.querySelector("#rgb-score");
const rgbCheck = document.querySelector("#rgb-check");
const rgbNext = document.querySelector("#rgb-next");
const rgbChannels = ["red", "green", "blue"].map((name) => document.querySelector(`#rgb-${name}`));
const rgbOutputs = ["red", "green", "blue"].map((name) => document.querySelector(`#rgb-${name}-value`));
const rgbPalette = [0, 32, 64, 96, 128, 160, 192, 224, 255];
const rgbTolerance = 24;
const rgbRounds = 5;
const rgbState = { target: [], round: 1, score: 0, answered: false, finished: false };

function currentRgb() {
    return rgbChannels.map((channel) => Number(channel.value));
}

function updateRgbDisplay() {
    const values = currentRgb();
    rgbOutputs.forEach((output, index) => {
        output.value = String(values[index]);
    });
    rgbCurrent.style.backgroundColor = `rgb(${values.join(", ")})`;
    rgbCurrentValues.textContent = `RGB(${values.join(", ")})`;
}

function createRgbTarget() {
    rgbState.target = Array.from({ length: 3 }, () => rgbPalette[randomInteger(0, rgbPalette.length - 1)]);
    rgbTarget.style.backgroundColor = `rgb(${rgbState.target.join(", ")})`;
    rgbTargetValues.textContent = `RGB(${rgbState.target.join(", ")})`;
    rgbTargetValues.hidden = true;
    rgbState.answered = false;
    rgbFeedback.textContent = "Ajusta los canales y comprueba tu mezcla.";
    rgbCheck.hidden = false;
    rgbNext.hidden = true;
    rgbChannels.forEach((channel) => {
        channel.disabled = false;
    });
    rgbRoundLabel.textContent = `Ronda: ${rgbState.round}/${rgbRounds}`;
}

rgbChannels.forEach((channel) => channel.addEventListener("input", updateRgbDisplay));

rgbCheck.addEventListener("click", () => {
    if (rgbState.finished) {
        rgbState.round = 1;
        rgbState.score = 0;
        rgbState.finished = false;
        rgbScoreLabel.textContent = "Aciertos: 0";
        rgbCheck.textContent = "COMPROBAR COLOR";
        createRgbTarget();
        return;
    }
    if (rgbState.answered) {
        return;
    }
    rgbState.answered = true;
    const isClose = currentRgb().every((value, index) => Math.abs(value - rgbState.target[index]) <= rgbTolerance);
    if (isClose) {
        rgbState.score += 1;
        rgbFeedback.textContent = `¡Muy cerca! Tus tres canales están a ${rgbTolerance} puntos o menos del objetivo.`;
    } else {
        rgbFeedback.textContent = `Sigue comparando: el objetivo era RGB(${rgbState.target.join(", ")}).`;
    }
    rgbTargetValues.hidden = false;
    rgbScoreLabel.textContent = `Aciertos: ${rgbState.score}`;
    rgbChannels.forEach((channel) => {
        channel.disabled = true;
    });
    rgbCheck.hidden = true;
    rgbNext.hidden = false;
    rgbNext.textContent = rgbState.round === rgbRounds ? "VER RESULTADO" : "SIGUIENTE COLOR";
});

rgbNext.addEventListener("click", () => {
    if (rgbState.round === rgbRounds) {
        rgbFeedback.textContent = `Reto terminado: lograste ${rgbState.score} de ${rgbRounds} mezclas. ¡Experimenta con los canales RGB!`;
        rgbRoundLabel.textContent = "Ronda: final";
        rgbState.finished = true;
        rgbNext.hidden = true;
        rgbCheck.hidden = false;
        rgbCheck.textContent = "JUGAR OTRA VEZ";
        return;
    }
    rgbState.round += 1;
    createRgbTarget();
});

updateRgbDisplay();
createRgbTarget();


/* ---------------------------------------------------------------------
   8. Bitácora del desierto: fichas con una fuente para seguir investigando.
   Si una ficha no tiene enlace, deja url vacío.
   --------------------------------------------------------------------- */
const desertFacts = [
    {
        text: "Hermosillo es la capital del estado de Sonora. ¿Puedes ubicarla en un mapa y encontrar qué ciudades quedan al norte y al sur?",
        source: "Fuente para investigar: INEGI, información geográfica de Sonora.",
        url: "https://www.inegi.org.mx/app/areasgeograficas/?ag=26"
    },
    {
        text: "El desierto sonorense se extiende por partes de México y Estados Unidos. Los ecosistemas naturales no se detienen en las fronteras dibujadas en los mapas políticos.",
        source: "Fuente para investigar: National Park Service, Saguaro National Park.",
        url: "https://www.nps.gov/sagu/index.htm"
    },
    {
        text: "El saguaro es un cactus característico del desierto sonorense. En Saguaro National Park, en Arizona, se protege parte de su hábitat.",
        source: "Fuente para investigar: National Park Service, Saguaro National Park.",
        url: "https://www.nps.gov/sagu/index.htm"
    },
    {
        text: "Las plantas usan la energía de la luz para fabricar azúcares mediante la fotosíntesis. En un experimento, puedes comparar cómo cambia una planta cuando recibe distintas cantidades de luz.",
        source: "Pista de investigación: consulta un libro escolar de biología sobre fotosíntesis.",
        url: ""
    },
    {
        text: "Un sensor infrarrojo de un robot puede comparar cuánta radiación rebota desde distintas superficies; el programa usa esas lecturas para elegir un movimiento.",
        source: "Pista de investigación: revisa la ficha técnica del sensor usado en el laboratorio.",
        url: ""
    }
];
const factText = document.querySelector("#fact-text");
const factSource = document.querySelector("#fact-source");
let previousFactIndex = -1;

function showNextFact() {
    let factIndex = randomInteger(0, desertFacts.length - 1);
    while (factIndex === previousFactIndex) {
        factIndex = randomInteger(0, desertFacts.length - 1);
    }
    previousFactIndex = factIndex;
    const fact = desertFacts[factIndex];
    factText.textContent = fact.text;
    factSource.replaceChildren(document.createTextNode(fact.source));
    if (fact.url) {
        const sourceLink = document.createElement("a");
        sourceLink.href = fact.url;
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        sourceLink.textContent = " Abrir fuente";
        factSource.append(sourceLink);
    }
}

document.querySelector("#next-fact").addEventListener("click", showNextFact);
showNextFact();
