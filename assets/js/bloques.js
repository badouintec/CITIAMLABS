"use strict";

/* =====================================================================
   bloques.js: taller de programación con bloques de bloques.html.

     1. Catálogo de bloques          (para inventar un bloque nuevo, empieza aquí)
     2. Misiones
     3. El mundo del robot
     4. Ejecutar el programa
     5. Traducir los bloques a JavaScript
     6. Editar el programa
     7. Dibujar los bloques
     8. Arrastrar y soltar
     9. Botones y arranque

   El programa es una lista de objetos, no texto:
     { id, type: "repeat", args: ["4"], children: [ ... ], otherwise: [] }
   children son los bloques de adentro y otherwise los del "si no".
   Ejecutar es recorrer esa lista: nunca se usa eval.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Catálogo de bloques
   parts describe lo que dice el bloque. Un texto se muestra tal cual; un objeto
   crea un campo: number (número o la letra n), text (texto) o select (lista).
   mouth: true significa que tiene bloques adentro; else: true, que también tiene
   un "si no". Para agregar un bloque: añádelo aquí, a runBlock y a codeFor.
   --------------------------------------------------------------------- */
const CONDITIONS = [
    ["wallAhead", "hay pared enfrente"],
    ["wallRight", "hay pared a la derecha"],
    ["wallLeft", "hay pared a la izquierda"],
    ["lineLeft", "el sensor izquierdo ve la línea"],
    ["lineRight", "el sensor derecho ve la línea"]
];
const PEN_COLORS = [
    ["#00ffff", "cian"], ["#ffff00", "amarillo"], ["#ff00ff", "magenta"],
    ["#00ff00", "verde"], ["#ff9900", "naranja"], ["#ffffff", "blanco"], ["#ff3333", "rojo"]
];
const NOTES = [["261.63", "do"], ["293.66", "re"], ["329.63", "mi"], ["349.23", "fa"], ["392", "sol"], ["440", "la"], ["493.88", "si"]];

const BLOCK_TYPES = {
    forward: { category: "motion", parts: ["avanzar", { kind: "number", value: "40" }, "pasos"] },
    right: { category: "motion", parts: ["girar a la derecha", { kind: "number", value: "90" }, "grados"] },
    left: { category: "motion", parts: ["girar a la izquierda", { kind: "number", value: "90" }, "grados"] },
    repeat: { category: "control", parts: ["repetir", { kind: "number", value: "4" }, "veces"], mouth: true },
    until: { category: "control", parts: ["repetir hasta llegar a la meta"], mouth: true },
    ifThen: { category: "control", parts: ["si", { kind: "select", options: CONDITIONS, value: "wallAhead" }], mouth: true },
    ifElse: { category: "control", parts: ["si", { kind: "select", options: CONDITIONS, value: "wallAhead" }], mouth: true, else: true },
    penUp: { category: "pen", parts: ["subir el lápiz"] },
    penDown: { category: "pen", parts: ["bajar el lápiz"] },
    color: { category: "pen", parts: ["color del lápiz:", { kind: "select", options: PEN_COLORS, value: "#00ffff" }] },
    setN: { category: "variable", parts: ["poner n en", { kind: "number", value: "10" }] },
    addN: { category: "variable", parts: ["sumarle a n", { kind: "number", value: "5" }] },
    say: { category: "look", parts: ["decir", { kind: "text", value: "¡Hola!" }] },
    note: { category: "look", parts: ["tocar la nota", { kind: "select", options: NOTES, value: "261.63" }] }
};

const CATEGORIES = [
    ["motion", "Movimiento"],
    ["control", "Control"],
    ["pen", "Lápiz"],
    ["variable", "Variable n"],
    ["look", "Decir y sonar"]
];


/* ---------------------------------------------------------------------
   2. Misiones
   kind "trace": pasar por encima de la figura punteada.
   kind "goal": llegar a la meta sin chocar. kind "free": dibujo libre.
   par: cuántos bloques bastan. solution: una forma de resolverla, en formato
   [tipo, [argumentos], [adentro], [si no]].
   --------------------------------------------------------------------- */
const CELL = 40;

function polygonPath(x, y, side, turn, count) {
    const points = [[x, y]];
    let heading = 0;
    for (let index = 1; index < count; index += 1) {
        x += side * Math.sin(heading * Math.PI / 180);
        y -= side * Math.cos(heading * Math.PI / 180);
        points.push([x, y]);
        heading += turn;
    }
    return points;
}

function wavePath() {
    const points = [];
    for (let x = 20; x <= 300; x += 4) {
        points.push([x, 120 + 50 * Math.sin((x - 20) / 280 * Math.PI * 2)]);
    }
    return points;
}

const MISSIONS = [
    {
        id: "cuadrado", title: "1. El cuadrado", kind: "trace",
        start: { x: 120, y: 170, heading: 0 }, target: polygonPath(120, 170, 80, 90, 4), par: 3,
        text: "Pasa por encima de la figura punteada: un cuadrado de 80 pasos por lado.",
        hint: "Un cuadrado es avanzar y girar 90 grados, cuatro veces. Se puede hacer con 8 bloques... o con 3.",
        solution: [["repeat", ["4"], [["forward", ["80"]], ["right", ["90"]]]]]
    },
    {
        id: "triangulo", title: "2. El triángulo", kind: "trace",
        start: { x: 110, y: 180, heading: 0 }, target: polygonPath(110, 180, 100, 120, 3), par: 3,
        text: "Ahora un triángulo equilátero de 100 pasos por lado.",
        hint: "Sus ángulos interiores miden 60 grados, pero el robot gira lo que le falta para dar la vuelta. Para terminar donde empezó, debe sumar 360 grados en total: 360 / 3 = ?",
        solution: [["repeat", ["3"], [["forward", ["100"]], ["right", ["120"]]]]]
    },
    {
        id: "estrella", title: "3. La estrella", kind: "trace",
        start: { x: 170, y: 210, heading: 0 }, target: polygonPath(170, 210, 130, 144, 5), par: 3,
        text: "Traza la estrella de cinco puntas con lados de 130 pasos, sin levantar el lápiz.",
        hint: "Da dos vueltas completas antes de cerrar: suma 720 grados en cinco giros. 720 / 5 = ?",
        solution: [["repeat", ["5"], [["forward", ["130"]], ["right", ["144"]]]]]
    },
    {
        id: "escalera", title: "4. La escalera", kind: "goal", pen: false,
        start: { x: 20, y: 220, heading: 0 }, goal: [5, 0], par: 8,
        map: ["####.G##", "###..###", "##..####", "#..#####", "..######", ".#######"],
        text: "Lleva al robot hasta el panel solar sin chocar. Cada casilla mide 40 pasos.",
        hint: "Busca el patrón que se repite: un escalón es arriba y a la derecha.",
        solution: [["repeat", ["4"], [["forward", ["40"]], ["right", ["90"]], ["forward", ["40"]], ["left", ["90"]]]], ["forward", ["40"]], ["right", ["90"]], ["forward", ["40"]]]
    },
    {
        id: "laberinto", title: "5. El laberinto", kind: "goal", pen: false,
        start: { x: 20, y: 220, heading: 0 }, goal: [7, 0], par: 7,
        map: ["...#...G", ".#.#.###", ".#...#..", ".#####.#", ".......#", ".#####.#"],
        text: "Resuélvelo sin mirar el mapa: usa los sensores de pared. Un mismo programa debería funcionar en cualquier laberinto.",
        hint: "La regla de la mano derecha: si no hay pared a tu derecha, gira y avanza. Si la hay, sigue de frente; y si tampoco puedes, gira a la izquierda.",
        solution: [["until", [], [["ifElse", ["wallRight"], [["ifElse", ["wallAhead"], [["left", ["90"]]], [["forward", ["40"]]]]], [["right", ["90"]], ["forward", ["40"]]]]]]]
    },
    {
        id: "seguidor", title: "6. El seguidor de línea", kind: "goal", pen: false, line: wavePath(),
        start: { x: 20, y: 120, heading: 138 }, goalPoint: [300, 120], par: 6,
        text: "Como los robots del club: dos sensores miran el piso. Programa al robot para seguir la línea hasta el panel solar.",
        hint: "Avanza poquito y corrige. Si el sensor izquierdo ve la línea, gira a la izquierda; si la ve el derecho, a la derecha. Prueba girando 15 grados y avanzando 3 pasos.",
        solution: [["until", [], [["ifThen", ["lineLeft"], [["left", ["15"]]]], ["ifThen", ["lineRight"], [["right", ["15"]]]], ["forward", ["3"]]]]]
    },
    {
        id: "libre", title: "7. Dibujo libre", kind: "free",
        start: { x: 160, y: 120, heading: 0 }, par: 0,
        text: "Sin reglas. Inventa una figura. ¿Qué sale al repetir una figura muchas veces, girando un poco entre cada una?",
        hint: "Usa n: si n crece en cada vuelta, los lados son cada vez más largos y aparece una espiral.",
        solution: [["setN", ["2"]], ["repeat", ["70"], [["forward", ["n"]], ["right", ["91"]], ["addN", ["2"]]]]]
    }
];


/* ---------------------------------------------------------------------
   3. El mundo del robot
   El escenario mide 320 x 240 y la pantalla lo agranda sin suavizar, para que se
   vea pixelado. Rumbo: 0 es arriba y crece hacia la derecha.
   --------------------------------------------------------------------- */
const STAGE_W = 320;
const STAGE_H = 240;
const stage = document.querySelector("#block-stage");
const stageContext = stage.getContext("2d");
const trailCanvas = document.createElement("canvas");
const backgroundCanvas = document.createElement("canvas");
trailCanvas.width = backgroundCanvas.width = STAGE_W;
trailCanvas.height = backgroundCanvas.height = STAGE_H;
const trailContext = trailCanvas.getContext("2d");
const backgroundContext = backgroundCanvas.getContext("2d");

let mission = MISSIONS[0];
let world = null;

function newWorld() {
    return {
        x: mission.start.x,
        y: mission.start.y,
        heading: mission.start.heading,
        penDown: mission.pen !== false,
        color: "#00ffff",
        n: 0,
        segments: [],
        speech: "",
        speechTicks: 0,
        crashed: "",
        reachedGoal: false
    };
}

/* Línea de pixeles sin suavizado (algoritmo de Bresenham). */
function plotLine(context, x0, y0, x1, y1, color) {
    context.fillStyle = color;
    let x = Math.round(x0);
    let y = Math.round(y0);
    const endX = Math.round(x1);
    const endY = Math.round(y1);
    const dx = Math.abs(endX - x);
    const dy = -Math.abs(endY - y);
    const stepX = x < endX ? 1 : -1;
    const stepY = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
        context.fillRect(x, y, 1, 1);
        if (x === endX && y === endY) {
            break;
        }
        const doubled = 2 * error;
        if (doubled >= dy) {
            error += dy;
            x += stepX;
        }
        if (doubled <= dx) {
            error += dx;
            y += stepY;
        }
    }
}

function goalPosition() {
    if (mission.goalPoint) {
        return mission.goalPoint;
    }
    return [mission.goal[0] * CELL + CELL / 2, mission.goal[1] * CELL + CELL / 2];
}

function drawBackground() {
    const context = backgroundContext;
    context.fillStyle = mission.line ? "#cc9966" : "#000022";
    context.fillRect(0, 0, STAGE_W, STAGE_H);
    if (!mission.line) {
        context.fillStyle = "#1a1a44";
        for (let x = 0; x <= STAGE_W; x += 20) {
            for (let y = 0; y <= STAGE_H; y += 20) {
                context.fillRect(x, y, 1, 1);
            }
        }
    }
    if (mission.map) {
        mission.map.forEach((row, r) => {
            [...row].forEach((cell, c) => {
                if (cell === "#") {
                    context.fillStyle = "#803300";
                    context.fillRect(c * CELL, r * CELL, CELL, CELL);
                    context.fillStyle = "#552200";
                    for (let band = 0; band < 4; band += 1) {
                        context.fillRect(c * CELL, r * CELL + band * 10, CELL, 1);
                        context.fillRect(c * CELL + (band % 2 ? 10 : 30), r * CELL + band * 10, 1, 10);
                    }
                }
            });
        });
    }
    if (mission.line) {
        for (let index = 1; index < mission.line.length; index += 1) {
            const [ax, ay] = mission.line[index - 1];
            const [bx, by] = mission.line[index];
            for (let offset = -2; offset <= 2; offset += 1) {
                plotLine(context, ax, ay + offset, bx, by + offset, "#000000");
            }
        }
    }
    if (mission.target) {
        mission.target.forEach(([ax, ay], index) => {
            const [bx, by] = mission.target[(index + 1) % mission.target.length];
            const length = Math.hypot(bx - ax, by - ay);
            for (let distance = 0; distance < length; distance += 4) {
                context.fillStyle = "#808080";
                context.fillRect(Math.round(ax + (bx - ax) * distance / length), Math.round(ay + (by - ay) * distance / length), 1, 1);
            }
        });
    }
    if (mission.kind === "goal") {
        const [gx, gy] = goalPosition();
        context.fillStyle = "#c0c0c0";
        context.fillRect(gx - 13, gy - 11, 26, 22);
        context.fillStyle = "#0033cc";
        context.fillRect(gx - 11, gy - 9, 22, 18);
        context.fillStyle = "#66ccff";
        for (let x = -11; x < 11; x += 6) {
            context.fillRect(gx + x, gy - 9, 1, 18);
        }
        context.fillRect(gx - 11, gy - 1, 22, 1);
    }
}

function drawStage() {
    const context = stageContext;
    context.drawImage(backgroundCanvas, 0, 0);
    context.drawImage(trailCanvas, 0, 0);

    context.save();
    context.translate(Math.round(world.x), Math.round(world.y));
    context.rotate(world.heading * Math.PI / 180);
    context.fillStyle = "#ffff00";
    context.fillRect(-7, -4, 2, 8);
    context.fillRect(5, -4, 2, 8);
    context.fillStyle = "#0000cc";
    context.fillRect(-5, -6, 10, 12);
    context.fillStyle = "#ffffff";
    context.fillRect(-4, -5, 3, 3);
    context.fillRect(1, -5, 3, 3);
    context.fillStyle = "#ff0000";
    context.fillRect(-1, -9, 2, 3);
    context.restore();

    if (mission.line) {
        const [left, right] = sensorPoints();
        context.fillStyle = senseLine(left) ? "#00ff00" : "#ff0000";
        context.fillRect(Math.round(left[0]) - 1, Math.round(left[1]) - 1, 3, 3);
        context.fillStyle = senseLine(right) ? "#00ff00" : "#ff0000";
        context.fillRect(Math.round(right[0]) - 1, Math.round(right[1]) - 1, 3, 3);
    }

    if (world.speech) {
        context.font = "10px monospace";
        const width = Math.ceil(context.measureText(world.speech).width) + 8;
        const x = Math.max(2, Math.min(STAGE_W - width - 2, world.x + 8));
        const y = Math.max(2, world.y - 24);
        context.fillStyle = "#ffffcc";
        context.fillRect(x, y, width, 14);
        context.fillStyle = "#000000";
        context.fillText(world.speech, x + 4, y + 10);
    }
}

function hitsWall(x, y) {
    if (mission.kind !== "goal") {
        return false;
    }
    if (x < 4 || y < 4 || x > STAGE_W - 4 || y > STAGE_H - 4) {
        return true;
    }
    if (!mission.map) {
        return false;
    }
    const margin = 5;
    return [[x - margin, y - margin], [x + margin, y - margin], [x - margin, y + margin], [x + margin, y + margin]].some(([px, py]) => isWallPoint(px, py));
}

function isWallPoint(x, y) {
    if (x < 0 || y < 0 || x >= STAGE_W || y >= STAGE_H) {
        return true;
    }
    return mission.map?.[Math.floor(y / CELL)]?.[Math.floor(x / CELL)] === "#";
}

function pointFrom(x, y, heading, distance) {
    const radians = heading * Math.PI / 180;
    return [x + distance * Math.sin(radians), y - distance * Math.cos(radians)];
}

function sensorPoints() {
    const [ax, ay] = pointFrom(world.x, world.y, world.heading, 9);
    return [pointFrom(ax, ay, world.heading - 90, 7), pointFrom(ax, ay, world.heading + 90, 7)];
}

function senseLine([x, y]) {
    if (!mission.line) {
        return false;
    }
    return mission.line.some(([px, py]) => Math.hypot(px - x, py - y) <= 4);
}

function checkCondition(condition) {
    const probe = (angle) => {
        const [x, y] = pointFrom(world.x, world.y, world.heading + angle, CELL * 0.75);
        return isWallPoint(x, y);
    };
    if (condition === "wallAhead") {
        return probe(0);
    }
    if (condition === "wallRight") {
        return probe(90);
    }
    if (condition === "wallLeft") {
        return probe(-90);
    }
    if (condition === "lineLeft") {
        return senseLine(sensorPoints()[0]);
    }
    return senseLine(sensorPoints()[1]);
}

function atGoal() {
    if (mission.kind !== "goal") {
        return false;
    }
    const [gx, gy] = goalPosition();
    return Math.hypot(world.x - gx, world.y - gy) <= 14;
}

/* Distancia de un punto a un segmento: para saber si el robot pasó por la figura. */
function distanceToSegment(px, py, [ax, ay], [bx, by]) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/* Cumple si recorrió toda la figura y no se salió de ella. */
function tracedTarget() {
    const tolerance = 6;
    const edges = mission.target.map((point, index) => [point, mission.target[(index + 1) % mission.target.length]]);
    const sample = ([ax, ay], [bx, by], visit) => {
        const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 4));
        for (let step = 0; step <= steps; step += 1) {
            if (!visit(ax + (bx - ax) * step / steps, ay + (by - ay) * step / steps)) {
                return false;
            }
        }
        return true;
    };
    const coversFigure = edges.every(([a, b]) => sample(a, b, (x, y) => world.segments.some(([c, d]) => distanceToSegment(x, y, c, d) <= tolerance)));
    const staysOnFigure = world.segments.every(([a, b]) => sample(a, b, (x, y) => edges.some(([c, d]) => distanceToSegment(x, y, c, d) <= tolerance * 2)));
    return coversFigure && staysOnFigure;
}


/* ---------------------------------------------------------------------
   4. Ejecutar el programa
   Las funciones con * son generadores: cada yield pausa el programa para que se
   vea cada paso. { block } marca dónde empieza un bloque nuevo y null es solo un
   pequeño paso de la animación.
   --------------------------------------------------------------------- */
const MAX_TICKS = 40000;

const numberArg = (value) => (String(value).trim().toLowerCase() === "n" ? world.n : Number(value));

function* moveForward(distance) {
    const direction = distance < 0 ? -1 : 1;
    let remaining = Math.abs(distance);
    const [dx, dy] = pointFrom(0, 0, world.heading, direction);
    const start = [world.x, world.y];
    while (remaining > 0 && !world.crashed && !world.reachedGoal) {
        const step = Math.min(2, remaining);
        const x = world.x + dx * step;
        const y = world.y + dy * step;
        if (hitsWall(x, y)) {
            world.crashed = "¡Chocó! El robot se detuvo.";
            break;
        }
        const clampedX = Math.max(0, Math.min(STAGE_W - 1, x));
        const clampedY = Math.max(0, Math.min(STAGE_H - 1, y));
        if (world.penDown) {
            plotLine(trailContext, world.x, world.y, clampedX, clampedY, world.color);
        }
        world.x = clampedX;
        world.y = clampedY;
        remaining -= step;
        if (atGoal()) {
            world.reachedGoal = true;
        }
        yield null;
    }
    if (world.penDown) {
        world.segments.push([start, [world.x, world.y]]);
    }
}

function* turn(degrees) {
    const steps = Math.ceil(Math.abs(degrees) / 15) || 1;
    for (let step = 0; step < steps; step += 1) {
        world.heading += degrees / steps;
        yield null;
    }
    world.heading = Math.round(world.heading * 1000) / 1000;
}

function* runBlock(block) {
    switch (block.type) {
    case "forward":
        yield* moveForward(numberArg(block.args[0]));
        break;
    case "right":
        yield* turn(numberArg(block.args[0]));
        break;
    case "left":
        yield* turn(-numberArg(block.args[0]));
        break;
    case "repeat": {
        const times = numberArg(block.args[0]);
        for (let count = 0; count < times && !isFinished(); count += 1) {
            yield* runList(block.children);
            yield null; // así un repetir vacío también avanza
        }
        break;
    }
    case "until":
        while (!atGoal() && !isFinished()) {
            yield* runList(block.children);
            yield null;
        }
        break;
    case "ifThen":
        if (checkCondition(block.args[0])) {
            yield* runList(block.children);
        }
        break;
    case "ifElse":
        yield* runList(checkCondition(block.args[0]) ? block.children : block.otherwise);
        break;
    case "penUp":
        world.penDown = false;
        break;
    case "penDown":
        world.penDown = true;
        break;
    case "color":
        world.color = block.args[0];
        break;
    case "setN":
        world.n = numberArg(block.args[0]);
        break;
    case "addN":
        world.n += numberArg(block.args[0]);
        break;
    case "say":
        world.speech = block.args[0];
        for (let tick = 0; tick < 50 && !isFinished(); tick += 1) {
            yield null;
        }
        world.speech = "";
        break;
    case "note":
        playTone(Number(block.args[0]), 0.2, "square", 0.03);
        for (let tick = 0; tick < 12; tick += 1) {
            yield null;
        }
        break;
    }
}

function isFinished() {
    return Boolean(world.crashed) || world.reachedGoal;
}

function* runList(list) {
    for (const block of list) {
        if (isFinished()) {
            return;
        }
        yield { block };
        yield* runBlock(block);
    }
}

let execution = null;

function resetWorld() {
    world = newWorld();
    trailContext.clearRect(0, 0, STAGE_W, STAGE_H);
    setActiveBlock(null);
    drawStage();
}

function setActiveBlock(id) {
    document.querySelector(".block.is-active")?.classList.remove("is-active");
    if (id !== null) {
        document.querySelector(`.block[data-id="${id}"]`)?.classList.add("is-active");
    }
}

function stopExecution() {
    if (execution) {
        window.cancelAnimationFrame(execution.frame);
        execution = null;
    }
    runButton.textContent = "EJECUTAR";
    setActiveBlock(null);
}

/* Ejecuta hasta "budget" pasitos, o hasta el siguiente bloque si untilBlock. */
function advance(budget, untilBlock) {
    for (let count = 0; count < budget; count += 1) {
        const { value, done } = execution.generator.next();
        execution.ticks += 1;
        if (done) {
            finishExecution();
            return false;
        }
        if (execution.ticks > MAX_TICKS) {
            stopExecution();
            setStatus("El programa lleva demasiados pasos y parece que nunca termina. Revisa tus ciclos.", "bad");
            return false;
        }
        if (value) {
            setActiveBlock(value.block.id);
            if (untilBlock) {
                return true;
            }
        }
    }
    return true;
}

function animate() {
    if (!execution) {
        return;
    }
    const keepGoing = advance(Number(speedSelect.value), false);
    drawStage();
    if (keepGoing) {
        execution.frame = window.requestAnimationFrame(animate);
    }
}

function beginExecution() {
    const invalid = findInvalidBlock(program);
    if (invalid) {
        setStatus(`Revisa el bloque resaltado: "${invalid.value}" debe ser un número o la letra n.`, "bad");
        setActiveBlock(invalid.block.id);
        return false;
    }
    if (program.length === 0) {
        setStatus("Tu programa está vacío. Agrega bloques desde la paleta.", "bad");
        return false;
    }
    resetWorld();
    execution = { generator: runList(program), ticks: 0, frame: 0 };
    runButton.textContent = "DETENER";
    setStatus("Ejecutando...", "");
    return true;
}

function countBlocks(list) {
    return list.reduce((total, block) => total + 1 + countBlocks(block.children) + countBlocks(block.otherwise), 0);
}

function finishExecution() {
    stopExecution();
    drawStage();
    const total = countBlocks(program);
    if (world.crashed) {
        setStatus(`${world.crashed} Revisa el último bloque resaltado y vuelve a intentar.`, "bad");
        return;
    }
    let success = mission.kind === "free";
    if (mission.kind === "goal") {
        success = world.reachedGoal;
    } else if (mission.kind === "trace") {
        success = tracedTarget();
    }
    if (!success) {
        setStatus(mission.kind === "trace"
            ? "Todavía no: el robot no recorrió toda la figura, o se salió de ella. Compara su camino con la línea punteada."
            : "El programa terminó, pero el robot no llegó al panel solar.", "bad");
        return;
    }
    if (mission.kind === "free") {
        setStatus(`¡Listo! Tu dibujo usó ${total} ${total === 1 ? "bloque" : "bloques"}.`, "good");
        return;
    }
    markSolved();
    setStatus(total <= mission.par
        ? `¡Misión cumplida con ${total} bloques! Es un programa elegante: pocos bloques, mucho trabajo.`
        : `¡Misión cumplida con ${total} bloques! ¿Puedes lograrlo con ${mission.par}? Busca lo que se repite.`, "good");
}


/* ---------------------------------------------------------------------
   5. Traducir los bloques a JavaScript
   Este texto solo se muestra: enseña que los bloques y el código son lo mismo.
   --------------------------------------------------------------------- */
const LOOP_VARS = ["i", "j", "k", "m", "p", "q"];
const CONDITION_CODE = {
    wallAhead: "hayParedEnfrente()",
    wallRight: "hayParedDerecha()",
    wallLeft: "hayParedIzquierda()",
    lineLeft: "sensorIzquierdo()",
    lineRight: "sensorDerecho()"
};

const optionLabel = (options, value) => options.find(([key]) => key === value)?.[1] ?? value;
const argCode = (value) => (String(value).trim().toLowerCase() === "n" ? "n" : String(value));

function codeFor(list, depth = 0, loops = 0) {
    const pad = "  ".repeat(depth);
    return list.flatMap((block) => {
        const a = block.args[0];
        const inner = (items, nextLoops = loops) => codeFor(items, depth + 1, nextLoops);
        switch (block.type) {
        case "forward": return [`${pad}avanzar(${argCode(a)});`];
        case "right": return [`${pad}girarDerecha(${argCode(a)});`];
        case "left": return [`${pad}girarIzquierda(${argCode(a)});`];
        case "penUp": return [`${pad}subirLapiz();`];
        case "penDown": return [`${pad}bajarLapiz();`];
        case "color": return [`${pad}colorLapiz("${optionLabel(PEN_COLORS, a)}");`];
        case "setN": return [`${pad}n = ${argCode(a)};`];
        case "addN": return [`${pad}n = n + ${argCode(a)};`];
        case "say": return [`${pad}decir(${JSON.stringify(a)});`];
        case "note": return [`${pad}tocarNota("${optionLabel(NOTES, a)}");`];
        case "repeat": {
            const v = LOOP_VARS[loops % LOOP_VARS.length];
            return [`${pad}for (let ${v} = 0; ${v} < ${argCode(a)}; ${v}++) {`, ...inner(block.children, loops + 1), `${pad}}`];
        }
        case "until": return [`${pad}while (!llegoALaMeta()) {`, ...inner(block.children), `${pad}}`];
        case "ifThen": return [`${pad}if (${CONDITION_CODE[a]}) {`, ...inner(block.children), `${pad}}`];
        case "ifElse": return [`${pad}if (${CONDITION_CODE[a]}) {`, ...inner(block.children), `${pad}} else {`, ...inner(block.otherwise), `${pad}}`];
        default: return [];
        }
    });
}

function usesN(list) {
    return list.some((block) => block.type === "setN" || block.type === "addN" || block.args.includes("n") || usesN(block.children) || usesN(block.otherwise));
}

function renderCode() {
    const lines = codeFor(program);
    if (usesN(program)) {
        lines.unshift("let n = 0;");
    }
    document.querySelector("#block-code").textContent = lines.join("\n") || "// Aquí aparecerá tu programa en JavaScript.";
    document.querySelector("#block-count").textContent = `Bloques: ${countBlocks(program)}`;
}


/* ---------------------------------------------------------------------
   6. Editar el programa
   Cada misión guarda su programa en este navegador. Lo leído se valida porque
   localStorage se puede editar a mano y un dato raro no debe romper la página.
   --------------------------------------------------------------------- */
let program = [];
let nextId = 1;
let cursor = { owner: null, slot: "children" }; // a dónde llegan los bloques al pulsar en la paleta
const undoStack = [];
const SOLVED_KEY = "citiam-bloques-logros";
const MAX_NESTING = 8;

const programKey = () => `citiam-bloques-${mission.id}`;

function makeBlock(type, args, children = [], otherwise = []) {
    const parts = BLOCK_TYPES[type].parts.filter((part) => typeof part === "object");
    return {
        id: nextId++,
        type,
        args: parts.map((part, index) => String(args?.[index] ?? part.value)),
        children,
        otherwise
    };
}

function blockFromSolution([type, args, children = [], otherwise = []]) {
    return makeBlock(type, args, children.map(blockFromSolution), otherwise.map(blockFromSolution));
}

function loadSaved(raw, depth = 0) {
    if (!Array.isArray(raw) || depth > MAX_NESTING) {
        return [];
    }
    return raw.filter((item) => BLOCK_TYPES[item?.type]).map((item) => makeBlock(
        item.type,
        Array.isArray(item.args) ? item.args : [],
        loadSaved(item.children, depth + 1),
        loadSaved(item.otherwise, depth + 1)
    ));
}

const strip = (list) => list.map(({ type, args, children, otherwise }) => ({ type, args, children: strip(children), otherwise: strip(otherwise) }));
const snapshot = () => JSON.stringify(strip(program));

function saveProgram() {
    writeStorage(programKey(), snapshot());
}

function rememberForUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 50) {
        undoStack.shift();
    }
}

function restoreProgram(text) {
    try {
        program = loadSaved(JSON.parse(text));
    } catch {
        program = [];
    }
    cursor = { owner: null, slot: "children" };
}

function findBlock(id, list = program) {
    for (const block of list) {
        if (block.id === id) {
            return block;
        }
        const inside = findBlock(id, block.children) ?? findBlock(id, block.otherwise);
        if (inside) {
            return inside;
        }
    }
    return null;
}

function listOf(owner, slot) {
    if (owner === null) {
        return program;
    }
    return findBlock(owner)?.[slot] ?? program;
}

/* Devuelve la lista que contiene un bloque y la posición que ocupa. */
function locate(id, list = program) {
    const index = list.findIndex((block) => block.id === id);
    if (index >= 0) {
        return { list, index };
    }
    for (const block of list) {
        const found = locate(id, block.children) ?? locate(id, block.otherwise);
        if (found) {
            return found;
        }
    }
    return null;
}

function commit(message, focusId) {
    stopExecution();
    saveProgram();
    renderProgram();
    renderCode();
    if (message) {
        setStatus(message, "");
    }
    if (focusId) {
        document.querySelector(`.block[data-id="${focusId}"] .block-grip`)?.focus();
    }
}

function addFromPalette(type) {
    rememberForUndo();
    const block = makeBlock(type);
    listOf(cursor.owner, cursor.slot).push(block);
    if (BLOCK_TYPES[type].mouth) {
        cursor = { owner: block.id, slot: "children" }; // lo siguiente entra en su interior
    }
    commit(`Bloque agregado: ${blockText(block.type)}.`);
}

function removeBlock(id) {
    const found = locate(id);
    if (!found) {
        return;
    }
    rememberForUndo();
    found.list.splice(found.index, 1);
    if (!findBlock(cursor.owner)) {
        cursor = { owner: null, slot: "children" };
    }
    commit("Bloque borrado. Puedes recuperarlo con DESHACER.");
}

function shiftBlock(id, delta) {
    const found = locate(id);
    const target = found ? found.index + delta : -1;
    if (!found || target < 0 || target >= found.list.length) {
        return;
    }
    rememberForUndo();
    const [block] = found.list.splice(found.index, 1);
    found.list.splice(target, 0, block);
    commit(`Bloque movido a la posición ${target + 1}.`, id);
}

function findInvalidBlock(list) {
    for (const block of list) {
        const fields = BLOCK_TYPES[block.type].parts.filter((part) => typeof part === "object");
        for (let index = 0; index < fields.length; index += 1) {
            const value = block.args[index].trim();
            if (fields[index].kind === "number" && !/^-?\d+(\.\d+)?$|^n$/i.test(value)) {
                return { block, value };
            }
        }
        const inside = findInvalidBlock(block.children) ?? findInvalidBlock(block.otherwise);
        if (inside) {
            return inside;
        }
    }
    return null;
}


/* ---------------------------------------------------------------------
   7. Dibujar los bloques
   --------------------------------------------------------------------- */
const paletteElement = document.querySelector("#block-palette");
const programElement = document.querySelector("#block-program");
const statusLine = document.querySelector("#block-status");

function setStatus(message, tone) {
    statusLine.textContent = message;
    statusLine.className = `game-feedback ${tone === "good" ? "is-good" : tone === "bad" ? "is-bad" : ""}`;
}

function blockText(type) {
    const spec = BLOCK_TYPES[type];
    const text = spec.parts.map((part) => {
        if (typeof part === "string") {
            return part;
        }
        return part.kind === "select" ? optionLabel(part.options, part.value) : `(${part.value})`;
    }).join(" ");
    return spec.else ? `${text} / si no` : text;
}

function renderPalette() {
    CATEGORIES.forEach(([category, title]) => {
        const heading = document.createElement("p");
        heading.className = "palette-title";
        heading.textContent = title;
        paletteElement.append(heading);
        Object.entries(BLOCK_TYPES).filter(([, spec]) => spec.category === category).forEach(([type]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `block palette-block cat-${category}`;
            button.textContent = blockText(type);
            button.setAttribute("aria-label", `Agregar bloque: ${blockText(type)}`);
            button.addEventListener("pointerdown", (event) => startDrag(event, { type }));
            button.addEventListener("click", () => {
                if (!dragJustEnded) {
                    addFromPalette(type);
                }
            });
            paletteElement.append(button);
        });
    });
}

function renderField(block, part, argIndex, label) {
    const value = block.args[argIndex];
    let field;
    if (part.kind === "select") {
        field = document.createElement("select");
        part.options.forEach(([key, text]) => {
            field.add(new Option(text, key, false, key === value));
        });
    } else {
        field = document.createElement("input");
        field.type = "text";
        field.value = value;
        field.maxLength = part.kind === "text" ? 24 : 8;
        field.size = part.kind === "text" ? 10 : 3;
        field.autocomplete = "off";
    }
    field.className = "block-field";
    field.setAttribute("aria-label", label);
    field.addEventListener("input", () => {
        block.args[argIndex] = field.value;
        saveProgram();
        renderCode();
    });
    return field;
}

function renderList(list, owner, slot) {
    const element = document.createElement("div");
    element.className = "block-list";
    element.dataset.owner = owner === null ? "" : String(owner);
    element.dataset.slot = slot;
    list.forEach((block) => element.append(renderBlock(block)));

    const isCursor = cursor.owner === owner && cursor.slot === slot;
    const target = document.createElement("button");
    target.type = "button";
    target.className = `list-target${isCursor ? " is-cursor" : ""}`;
    target.textContent = isCursor ? "v los bloques nuevos llegan aquí v" : "+ agregar aquí";
    target.addEventListener("click", () => {
        cursor = { owner, slot };
        renderProgram();
    });
    element.append(target);
    return element;
}

function renderBlock(block) {
    const spec = BLOCK_TYPES[block.type];
    const element = document.createElement("div");
    element.className = `block cat-${spec.category}`;
    element.dataset.id = String(block.id);

    const row = document.createElement("div");
    row.className = "block-row";
    row.addEventListener("pointerdown", (event) => {
        if (!event.target.closest("input, select, .block-delete")) {
            startDrag(event, { id: block.id });
        }
    });

    const grip = document.createElement("button");
    grip.type = "button";
    grip.className = "block-grip";
    grip.textContent = "::";
    grip.setAttribute("aria-label", `Bloque ${blockText(block.type)}. Flechas arriba y abajo para moverlo, Suprimir para borrarlo.`);
    grip.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            shiftBlock(block.id, event.key === "ArrowUp" ? -1 : 1);
        } else if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            removeBlock(block.id);
        }
    });
    row.append(grip);

    let argIndex = 0;
    spec.parts.forEach((part) => {
        if (typeof part === "string") {
            const label = document.createElement("span");
            label.textContent = part;
            row.append(label);
        } else {
            row.append(renderField(block, part, argIndex, blockText(block.type)));
            argIndex += 1;
        }
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "block-delete";
    remove.textContent = "x";
    remove.setAttribute("aria-label", `Borrar bloque ${blockText(block.type)}`);
    remove.addEventListener("click", () => removeBlock(block.id));
    row.append(remove);
    element.append(row);

    if (spec.mouth) {
        element.append(renderList(block.children, block.id, "children"));
    }
    if (spec.else) {
        const label = document.createElement("div");
        label.className = "block-else";
        label.textContent = "si no";
        element.append(label, renderList(block.otherwise, block.id, "otherwise"));
    }
    if (spec.mouth) {
        const foot = document.createElement("div");
        foot.className = "block-foot";
        element.append(foot);
    }
    return element;
}

function renderProgram() {
    programElement.replaceChildren(renderList(program, null, "children"));
}


/* ---------------------------------------------------------------------
   8. Arrastrar y soltar
   Con Pointer Events funciona igual con mouse y con pantalla táctil. En táctil se
   arrastra desde el asa :: porque tocar el resto del bloque sirve para desplazarse.
   Sin arrastrar también se puede: pulsa un bloque de la paleta o usa el teclado.
   --------------------------------------------------------------------- */
let drag = null;
let dragJustEnded = false;
const DRAG_THRESHOLD = 5;

function startDrag(event, source) {
    if (event.button !== 0) {
        return;
    }
    drag = { source, origin: event.currentTarget, startX: event.clientX, startY: event.clientY, active: false, ghost: null, line: null, drop: null };
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", cancelDrag);
}

function beginGhost() {
    drag.active = true;
    stopExecution();
    const original = drag.origin.closest(".block");
    document.body.classList.add("is-block-dragging");
    window.getSelection()?.removeAllRanges();
    drag.ghost = original.cloneNode(true);
    drag.ghost.classList.add("drag-ghost");
    drag.ghost.style.width = `${original.getBoundingClientRect().width}px`;
    document.body.append(drag.ghost);
    if (drag.source.id) {
        original.classList.add("is-dragging");
    }
    drag.line = document.createElement("div");
    drag.line.className = "drop-line";
    programElement.classList.add("is-receiving");
}

function onDragMove(event) {
    if (!drag) {
        return;
    }
    if (!drag.active) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) {
            return;
        }
        beginGhost();
    }
    event.preventDefault();
    drag.ghost.style.left = `${event.clientX + 6}px`;
    drag.ghost.style.top = `${event.clientY + 6}px`;

    // Desplazar la página al acercarse a los bordes de la ventana.
    if (event.clientY < 50) {
        window.scrollBy(0, -12);
    } else if (event.clientY > window.innerHeight - 50) {
        window.scrollBy(0, 12);
    }

    const under = document.elementFromPoint(event.clientX, event.clientY);
    const listElement = under?.closest(".block-list");
    drag.line.remove();
    drag.overPalette = Boolean(under?.closest("#block-palette"));
    if (!listElement) {
        drag.drop = null;
        return;
    }
    const blocks = [...listElement.children].filter((child) => child.classList.contains("block") && !child.classList.contains("is-dragging"));
    let index = blocks.findIndex((child) => {
        const box = child.getBoundingClientRect();
        return event.clientY < box.top + box.height / 2;
    });
    if (index < 0) {
        index = blocks.length;
    }
    listElement.insertBefore(drag.line, blocks[index] ?? listElement.querySelector(":scope > .list-target"));
    drag.drop = {
        owner: listElement.dataset.owner === "" ? null : Number(listElement.dataset.owner),
        slot: listElement.dataset.slot,
        index
    };
}

function endDragListeners() {
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", cancelDrag);
}

function cleanDragVisuals() {
    drag?.ghost?.remove();
    drag?.line?.remove();
    programElement.classList.remove("is-receiving");
    document.body.classList.remove("is-block-dragging");
    document.querySelector(".block.is-dragging")?.classList.remove("is-dragging");
}

function cancelDrag() {
    endDragListeners();
    cleanDragVisuals();
    drag = null;
}

function onDragEnd() {
    endDragListeners();
    if (!drag) {
        return;
    }
    const { active, source, drop, overPalette } = drag;
    cleanDragVisuals();
    drag = null;
    if (!active) {
        return;
    }
    // El navegador lanza un clic al soltar: no debe contar como pulsar el bloque.
    dragJustEnded = true;
    window.setTimeout(() => {
        dragJustEnded = false;
    }, 0);

    if (source.id && overPalette) {
        removeBlock(source.id);
        return;
    }
    if (!drop) {
        return;
    }
    rememberForUndo();
    let block;
    if (source.id) {
        const found = locate(source.id);
        [block] = found.list.splice(found.index, 1);
    } else {
        block = makeBlock(source.type);
    }
    listOf(drop.owner, drop.slot).splice(drop.index, 0, block);
    commit("Bloque colocado.");
}


/* ---------------------------------------------------------------------
   9. Botones y arranque
   --------------------------------------------------------------------- */
const runButton = document.querySelector("#block-run");
const speedSelect = document.querySelector("#block-speed");
const missionButtons = document.querySelector("#mission-buttons");

function solvedMissions() {
    try {
        const solved = JSON.parse(readStorage(SOLVED_KEY) ?? "[]");
        return Array.isArray(solved) ? solved : [];
    } catch {
        return [];
    }
}

function markSolved() {
    const solved = new Set(solvedMissions());
    solved.add(mission.id);
    writeStorage(SOLVED_KEY, JSON.stringify([...solved]));
    if (["cuadrado", "laberinto", "seguidor"].includes(mission.id)) {
        earnStamp(`bloques-${mission.id}`);
    }
    renderMissionButtons();
}

function renderMissionButtons() {
    const solved = solvedMissions();
    missionButtons.replaceChildren(...MISSIONS.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `retro-button${item === mission ? " is-current" : ""}`;
        button.setAttribute("aria-pressed", String(item === mission));
        button.textContent = `${item.title}${solved.includes(item.id) ? " ✓" : ""}`;
        button.addEventListener("click", () => selectMission(item));
        return button;
    }));
}

function selectMission(item) {
    stopExecution();
    mission = item;
    undoStack.length = 0;
    document.querySelector("#mission-text").textContent = item.text;
    const hint = document.querySelector("#mission-hint");
    hint.textContent = item.hint;
    hint.hidden = true;
    document.querySelector("#mission-show-hint").textContent = "VER UNA PISTA";
    document.querySelector("#mission-solution").textContent = item.kind === "free" ? "VER UN EJEMPLO" : "VER UNA SOLUCIÓN";
    restoreProgram(readStorage(programKey()) ?? "[]");
    drawBackground();
    resetWorld();
    renderMissionButtons();
    renderProgram();
    renderCode();
    setStatus("Arma tu programa y pulsa EJECUTAR.", "");
}

runButton.addEventListener("click", () => {
    if (execution) {
        stopExecution();
        setStatus("Programa detenido.", "");
        drawStage();
        return;
    }
    if (beginExecution()) {
        animate();
    }
});

document.querySelector("#block-step").addEventListener("click", () => {
    if (!execution && !beginExecution()) {
        return;
    }
    window.cancelAnimationFrame(execution.frame);
    runButton.textContent = "DETENER";
    if (advance(100000, true)) {
        setStatus("Paso a paso: el bloque resaltado es el que sigue. Pulsa PASO A PASO otra vez.", "");
    }
    drawStage();
});

document.querySelector("#block-reset").addEventListener("click", () => {
    stopExecution();
    resetWorld();
    setStatus("El robot regresó al inicio.", "");
});

document.querySelector("#block-undo").addEventListener("click", () => {
    if (undoStack.length === 0) {
        setStatus("No hay nada que deshacer.", "");
        return;
    }
    restoreProgram(undoStack.pop());
    commit("Listo: se deshizo el último cambio.");
});

document.querySelector("#block-clear").addEventListener("click", () => {
    if (program.length === 0) {
        return;
    }
    rememberForUndo();
    program = [];
    cursor = { owner: null, slot: "children" };
    commit("Programa borrado. Puedes recuperarlo con DESHACER.");
});

document.querySelector("#mission-show-hint").addEventListener("click", (event) => {
    const hint = document.querySelector("#mission-hint");
    hint.hidden = !hint.hidden;
    event.currentTarget.textContent = hint.hidden ? "VER UNA PISTA" : "OCULTAR LA PISTA";
});

document.querySelector("#mission-solution").addEventListener("click", () => {
    rememberForUndo();
    program = mission.solution.map(blockFromSolution);
    cursor = { owner: null, slot: "children" };
    commit("Aquí tienes una solución. Léela, ejecútala y cámbiala. DESHACER recupera tu programa.");
});

renderPalette();
selectMission(MISSIONS[0]);
