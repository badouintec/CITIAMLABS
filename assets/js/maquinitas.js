"use strict";

/* =====================================================================
   maquinitas.js: los cuatro juegos de la Sala de maquinitas, en arcade.html.

     1. Robot Runner
     2. Buscacactus
     3. Hongotchi
     4. Expedición al Pinacate

   Cada juego va entre llaves { } para que sus variables no choquen.
   Regla de esta sala: si un juego necesita explicación larga, está mal hecho.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Robot Runner: salta los cactus y las rocas. Es un paso fijo de 60 veces
   por segundo, para que corra igual en una pantalla rápida y en una lenta.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#runner-canvas");
    const context = canvas.getContext("2d");
    const scoreLabel = document.querySelector("#runner-score");
    const recordLabel = document.querySelector("#runner-record");
    const soundBox = document.querySelector("#runner-sound");
    const W = canvas.width;
    const H = canvas.height;
    const GROUND = H - 26;
    const STEP = 1000 / 60;
    const GRAVITY = 0.62;
    const JUMP_SPEED = -10.4;
    const RECORD_KEY = "citiam-runner-record";
    const STAMP_SCORE = 500;
    const ROBOT_X = 56;
    const SKIES = [
        { from: 0, sky: "#3399ff", far: "#6677aa", near: "#8a6a4a", sand: "#e0b070", text: "#000033" },
        { from: 400, sky: "#ff9966", far: "#774466", near: "#663333", sand: "#cc8855", text: "#000033" },
        { from: 800, sky: "#000044", far: "#222255", near: "#1a1a33", sand: "#554433", text: "#ffff00" }
    ];
    const FAILS = ["¡Chocaste! Eso también es un dato.", "Ese cactus no se movió. Tú sí.", "Revisa tu programa y salta antes.", "Hasta los robots de la NASA fallan a veces."];
    const STARS = Array.from({ length: 40 }, () => [Math.random() * W, Math.random() * (GROUND - 30)]);

    let phase = "idle";
    let robot = { y: GROUND, vy: 0 };
    let things = [];
    let score = 0;
    let bonus = 0;
    let speed = 3.4;
    let nextThing = 0;
    let scroll = 0;
    let frameCount = 0;
    let lastTime = 0;
    let leftover = 0;
    let message = "";
    let overAt = -1000;

    const readRecord = () => Number.parseInt(readStorage(RECORD_KEY) ?? "0", 10) || 0;
    const total = () => Math.floor(score) + bonus;
    const beep = (frequency, length = 0.08) => {
        if (soundBox.checked) {
            playTone(frequency, length, "square", 0.025);
        }
    };

    function currentSky() {
        const cycle = total() % 1200;
        return [...SKIES].reverse().find((sky) => cycle >= sky.from);
    }

    function reset() {
        robot = { y: GROUND, vy: 0 };
        things = [];
        score = 0;
        bonus = 0;
        speed = 3.4;
        nextThing = 40;
        message = "";
    }

    function jump() {
        if (phase !== "running") {
            if (performance.now() - overAt < 500) {
                return; // quien sigue machacando la tecla alcanza a ver su resultado
            }
            reset();
            phase = "running";
            lastTime = 0;
            leftover = 0;
            window.requestAnimationFrame(loop);
            return;
        }
        if (robot.y >= GROUND) {
            robot.vy = JUMP_SPEED;
            beep(520);
        }
    }

    function spawn() {
        const roll = Math.random();
        if (roll < 0.22) {
            things.push({ kind: "drop", x: W + 10, y: GROUND - 62, w: 10, h: 12 });
        } else if (roll < 0.5) {
            things.push({ kind: "rock", x: W + 10, y: GROUND - 14, w: 22, h: 14 });
        } else if (roll < 0.85 || speed < 5) {
            things.push({ kind: "cactus", x: W + 10, y: GROUND - 30, w: 14, h: 30 });
        } else {
            things.push({ kind: "cactus", x: W + 10, y: GROUND - 30, w: 14, h: 30 }, { kind: "cactus", x: W + 28, y: GROUND - 24, w: 12, h: 24 });
        }
        nextThing = 48 + Math.random() * 62 + speed * 3;
    }

    function update() {
        frameCount += 1;
        scroll += speed;
        score += speed / 8;
        speed = Math.min(9, 3.4 + total() / 700);
        robot.vy += GRAVITY;
        robot.y = Math.min(GROUND, robot.y + robot.vy);
        if (robot.y >= GROUND) {
            robot.vy = 0;
        }
        nextThing -= 1;
        if (nextThing <= 0) {
            spawn();
        }
        const box = { left: ROBOT_X - 7, right: ROBOT_X + 7, top: robot.y - 22, bottom: robot.y - 1 };
        things = things.filter((thing) => {
            thing.x -= speed;
            const overlaps = box.right > thing.x + 2 && box.left < thing.x + thing.w - 2 && box.bottom > thing.y + 2 && box.top < thing.y + thing.h;
            if (overlaps && thing.kind === "drop") {
                bonus += 25;
                beep(880);
                return false;
            }
            if (overlaps) {
                gameOver();
            }
            return thing.x > -40;
        });
        if (total() >= STAMP_SCORE) {
            earnStamp("runner");
        }
    }

    function gameOver() {
        phase = "over";
        overAt = performance.now();
        beep(160, 0.3);
        message = FAILS[Math.floor(Math.random() * FAILS.length)];
        if (total() > readRecord()) {
            writeStorage(RECORD_KEY, String(total()));
        }
        recordLabel.textContent = String(readRecord());
        offerRecord("runner", total());
    }

    function drawDisc(cx, cy, radius, color) {
        context.fillStyle = color;
        for (let dy = -radius; dy <= radius; dy += 1) {
            const half = Math.round(Math.sqrt(radius * radius - dy * dy));
            context.fillRect(cx - half, cy + dy, half * 2, 1);
        }
    }

    function drawMountains(color, offset, base, height) {
        context.fillStyle = color;
        for (let x = -8; x < W + 8; x += 8) {
            const world = x + scroll * offset;
            const top = base - height * (0.5 + 0.5 * Math.sin(world / 53) * Math.cos(world / 31));
            context.fillRect(x, Math.round(top), 8, GROUND - top);
        }
    }

    function drawRobot() {
        const y = Math.round(robot.y);
        const step = robot.y < GROUND ? 0 : Math.floor(frameCount / 6) % 2;
        context.fillStyle = "#ff9900";
        context.fillRect(ROBOT_X - 6, y - 4 + (step ? 0 : 1), 4, step ? 4 : 3);
        context.fillRect(ROBOT_X + 2, y - 4 + (step ? 1 : 0), 4, step ? 3 : 4);
        context.fillStyle = "#00ffff";
        context.fillRect(ROBOT_X - 7, y - 14, 14, 10);
        context.fillStyle = "#003399";
        context.fillRect(ROBOT_X - 7, y - 14, 14, 2);
        context.fillStyle = "#ffffff";
        context.fillRect(ROBOT_X - 6, y - 23, 12, 9);
        context.fillStyle = "#000000";
        context.fillRect(ROBOT_X - 3, y - 20, 2, 3);
        context.fillRect(ROBOT_X + 2, y - 20, 2, 3);
        context.fillStyle = frameCount % 30 < 15 ? "#ff0000" : "#ffff00";
        context.fillRect(ROBOT_X - 1, y - 27, 2, 4);
    }

    function drawThing({ kind, x, y, w, h }) {
        const left = Math.round(x);
        if (kind === "cactus") {
            context.fillStyle = "#007700";
            context.fillRect(left + 4, y, 6, h);
            context.fillRect(left, y + 8, 4, 3);
            context.fillRect(left, y + 3, 3, 7);
            context.fillRect(left + 10, y + 12, 4, 3);
            context.fillRect(left + 11, y + 6, 3, 8);
            context.fillStyle = "#00aa00";
            context.fillRect(left + 5, y, 2, h);
        } else if (kind === "rock") {
            context.fillStyle = "#665544";
            context.fillRect(left + 2, y + 3, w - 4, h - 3);
            context.fillRect(left, y + 7, w, h - 7);
            context.fillStyle = "#998877";
            context.fillRect(left + 5, y + 3, 8, 3);
        } else {
            context.fillStyle = "#00ccff";
            context.fillRect(left + 3, y, 4, 3);
            context.fillRect(left + 1, y + 3, 8, 7);
            context.fillStyle = "#ffffff";
            context.fillRect(left + 3, y + 5, 2, 2);
        }
    }

    function centered(text, y, size, color) {
        context.font = `bold ${size}px monospace`;
        context.textAlign = "center";
        context.fillStyle = "#000000";
        context.fillText(text, W / 2 + 1, y + 1);
        context.fillStyle = color;
        context.fillText(text, W / 2, y);
    }

    function draw() {
        const sky = currentSky();
        context.fillStyle = sky.sky;
        context.fillRect(0, 0, W, H);
        if (sky.from === 800) {
            context.fillStyle = "#ffffff";
            STARS.forEach(([x, y]) => context.fillRect(Math.round(x), Math.round(y), 1, 1));
            drawDisc(W - 130, 30, 8, "#ffffff");
        } else {
            drawDisc(W - 130, sky.from === 0 ? 28 : 58, 11, "#ffff00");
        }
        drawMountains(sky.far, 0.15, GROUND - 22, 34);
        drawMountains(sky.near, 0.35, GROUND - 6, 22);
        context.fillStyle = sky.sand;
        context.fillRect(0, GROUND, W, H - GROUND);
        context.fillStyle = "#000000";
        for (let index = 0; index < 22; index += 1) {
            context.fillRect((index * 37 - Math.round(scroll)) % W + (scroll > 0 ? W : 0), GROUND + 6 + (index % 3) * 6, 3, 1);
        }
        things.forEach(drawThing);
        drawRobot();

        context.font = "bold 12px monospace";
        context.textAlign = "right";
        context.fillStyle = sky.text;
        context.fillText(`PUNTOS ${String(total()).padStart(4, "0")}`, W - 8, 15);
        scoreLabel.textContent = String(total());

        if (phase === "idle") {
            centered("HAZ CLIC PARA EMPEZAR", 54, 18, "#ffff00");
            centered("luego salta con clic o barra espaciadora", 74, 11, "#ffffff");
        } else if (phase === "over") {
            centered(message, 44, 14, "#ffff00");
            centered(`${total()} PUNTOS`, 68, 20, "#ffffff");
            centered("clic para volver a intentar", 86, 11, "#ffffff");
        }
    }

    function loop(time) {
        if (phase !== "running") {
            draw();
            return;
        }
        if (!lastTime) {
            lastTime = time;
        }
        leftover += Math.min(100, time - lastTime);
        lastTime = time;
        while (leftover >= STEP && phase === "running") {
            update();
            leftover -= STEP;
        }
        draw();
        window.requestAnimationFrame(loop);
    }

    canvas.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        canvas.focus();
        jump();
    });
    canvas.addEventListener("keydown", (event) => {
        if (event.key === " " || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
            if (!event.repeat) {
                jump();
            }
        }
    });

    recordLabel.textContent = String(readRecord());
    draw();
}


/* ---------------------------------------------------------------------
   2. Buscacactus: el buscaminas de 1998, con cactus. El número de cada casilla
   dice cuántos cactus la rodean. El primer clic nunca pincha.
   --------------------------------------------------------------------- */
{
    const board = document.querySelector("#mine-board");
    const faceButton = document.querySelector("#mine-face");
    const flagButton = document.querySelector("#mine-flag");
    const leftLabel = document.querySelector("#mine-left");
    const timeLabel = document.querySelector("#mine-time");
    const statusLabel = document.querySelector("#mine-status");
    const SIZE = 9;
    const CACTI = 10;
    const FACES = { playing: ":-)", won: "B-)", lost: "X-(" };
    let cells = [];
    let started = false;
    let finished = false;
    let flagMode = false;
    let seconds = 0;
    let timer = 0;

    const neighbors = (index) => {
        const row = Math.floor(index / SIZE);
        const col = index % SIZE;
        const result = [];
        for (let r = row - 1; r <= row + 1; r += 1) {
            for (let c = col - 1; c <= col + 1; c += 1) {
                if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && !(r === row && c === col)) {
                    result.push(r * SIZE + c);
                }
            }
        }
        return result;
    };

    function newGame() {
        window.clearInterval(timer);
        cells = Array.from({ length: SIZE * SIZE }, () => ({ cactus: false, open: false, flag: false, count: 0 }));
        started = false;
        finished = false;
        seconds = 0;
        faceButton.textContent = FACES.playing;
        statusLabel.textContent = "Abre casillas sin pincharte. Cada número te dice cuántos cactus tiene alrededor.";
        render();
    }

    function plant(safeIndex) {
        const safe = new Set([safeIndex, ...neighbors(safeIndex)]);
        let planted = 0;
        while (planted < CACTI) {
            const index = Math.floor(Math.random() * cells.length);
            if (!safe.has(index) && !cells[index].cactus) {
                cells[index].cactus = true;
                planted += 1;
            }
        }
        cells.forEach((cell, index) => {
            cell.count = neighbors(index).filter((other) => cells[other].cactus).length;
        });
    }

    function open(index) {
        const stack = [index];
        while (stack.length) {
            const current = stack.pop();
            const cell = cells[current];
            if (cell.open || cell.flag) {
                continue;
            }
            cell.open = true;
            if (cell.count === 0 && !cell.cactus) {
                stack.push(...neighbors(current));
            }
        }
    }

    function finish(won) {
        finished = true;
        window.clearInterval(timer);
        faceButton.textContent = won ? FACES.won : FACES.lost;
        if (won) {
            statusLabel.textContent = `¡Cruzaste el campo de cactus en ${seconds} segundos!`;
            earnStamp("buscacactus");
            offerRecord("buscacactus", seconds);
        } else {
            statusLabel.textContent = "¡Auch! Te espinaste. Pulsa la carita para intentar de nuevo.";
            cells.forEach((cell) => {
                cell.open = cell.open || cell.cactus;
            });
        }
    }

    function press(index) {
        if (finished) {
            return;
        }
        const cell = cells[index];
        if (flagMode) {
            toggleFlag(index);
            return;
        }
        if (cell.flag || cell.open) {
            return;
        }
        if (!started) {
            started = true;
            plant(index);
            timer = window.setInterval(() => {
                seconds += 1;
                timeLabel.textContent = String(seconds).padStart(3, "0");
            }, 1000);
        }
        open(index);
        if (cell.cactus) {
            cell.boom = true;
            finish(false);
        } else if (cells.every((other) => other.open || other.cactus)) {
            finish(true);
        }
        render();
    }

    function toggleFlag(index) {
        const cell = cells[index];
        if (!finished && !cell.open) {
            cell.flag = !cell.flag;
            render();
        }
    }

    function render() {
        const flags = cells.filter((cell) => cell.flag).length;
        leftLabel.textContent = String(CACTI - flags).padStart(3, "0");
        timeLabel.textContent = String(seconds).padStart(3, "0");
        board.replaceChildren(...cells.map((cell, index) => {
            const button = document.createElement("button");
            button.type = "button";
            let label = "tapada";
            let className = "mine-cell";
            if (cell.open) {
                className += " is-open";
                if (cell.cactus) {
                    className += cell.boom ? " is-cactus is-boom" : " is-cactus";
                    label = "cactus";
                } else {
                    label = cell.count ? `${cell.count} cactus cerca` : "libre";
                    if (cell.count) {
                        button.textContent = String(cell.count);
                        button.dataset.count = String(cell.count);
                    }
                }
            } else if (cell.flag) {
                className += " is-flag";
                label = "con banderita";
            }
            button.className = className;
            button.setAttribute("aria-label", `Fila ${Math.floor(index / SIZE) + 1}, columna ${index % SIZE + 1}: ${label}`);
            button.addEventListener("click", () => press(index));
            button.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                toggleFlag(index);
            });
            return button;
        }));
    }

    faceButton.addEventListener("click", newGame);
    flagButton.addEventListener("click", () => {
        flagMode = !flagMode;
        flagButton.textContent = flagMode ? "BANDERITA: SÍ" : "BANDERITA: NO";
        flagButton.setAttribute("aria-pressed", String(flagMode));
    });
    newGame();
}


/* ---------------------------------------------------------------------
   3. Hongotchi: una mascota de 1998, pero es un hongo ostra. Sus medidores bajan
   con el tiempo real, también con la página cerrada, y se guardan en el navegador.
   Aguanta un día sin cuidados y se contamina si lo abandonas casi dos. La máquina del
   tiempo adelanta una hora, por si no quieres esperar: los medidores también bajan.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#tchi-canvas");
    const context = canvas.getContext("2d");
    const messageLabel = document.querySelector("#tchi-message");
    const stageLabel = document.querySelector("#tchi-stage");
    const harvestButton = document.querySelector("#tchi-harvest");
    const KEY = "citiam-hongotchi";
    const STAGES = [
        { at: 0, name: "Micelio", note: "Una red de hilitos blancos invade el sustrato." },
        { at: 60, name: "Primordios", note: "¡Aparecen los primeros bultitos!" },
        { at: 180, name: "Hongitos", note: "Ya se ven los sombreros." },
        { at: 420, name: "Racimo", note: "Crece en racimo. Falta poco." },
        { at: 720, name: "¡Listo!", note: "¡Está listo para cosechar!" }
    ];
    const JOKES = ["¿Cuál es el hongo más ganador? El champiñón.", "No me comas si no sabes quién soy. Regla de oro.", "Dicen que soy pura hifa. Es un cumplido.", "Soy fungi-onario de este laboratorio.", "Respiro oxígeno, como tú. Abre la ventana."];
    const MAX_MINUTES = 4320;
    const DARK = "#0f380f";
    const MID = "#306230";
    const LIGHT = "#8bac0f";
    const SCREEN = "#9bbc0f";
    let pet = load();
    let frame = 0;

    function fresh() {
        return { water: 70, air: 70, clean: 70, growth: 0, danger: 0, mold: false, harvests: pet?.harvests ?? 0, last: Date.now() };
    }

    function load() {
        try {
            const saved = JSON.parse(readStorage(KEY) ?? "null");
            if (saved && [saved.water, saved.air, saved.clean, saved.growth, saved.danger, saved.last].every(Number.isFinite)) {
                return saved;
            }
        } catch {
            return null;
        }
        return null;
    }

    const clamp = (value) => Math.max(0, Math.min(100, value));
    const stageIndex = () => STAGES.reduce((found, stage, index) => (pet.growth >= stage.at ? index : found), 0);
    const isComfy = () => pet.water >= 25 && pet.water <= 95 && pet.air >= 25 && pet.clean >= 25;

    function advance(minutes) {
        for (let step = 0; step < Math.min(minutes, MAX_MINUTES) && !pet.mold; step += 1) {
            pet.water = Math.max(0, pet.water - 1 / 12); // sin tope: el exceso de agua tarda en bajar
            pet.air = clamp(pet.air - 1 / 16);
            pet.clean = clamp(pet.clean - 1 / 24);
            if (isComfy()) {
                pet.growth = Math.min(STAGES.at(-1).at, pet.growth + 1);
            }
            const isDanger = pet.water < 10 || pet.air < 10 || pet.clean < 10;
            pet.danger = isDanger ? pet.danger + 1 : Math.max(0, pet.danger - 1);
            if (pet.danger > 1440) {
                pet.mold = true;
            }
        }
    }

    function catchUp() {
        const minutes = Math.floor((Date.now() - pet.last) / 60000);
        if (minutes > 0) {
            advance(minutes);
            pet.last += minutes * 60000;
        }
        save();
    }

    function save() {
        writeStorage(KEY, JSON.stringify(pet));
    }

    function drawMushroom(x, base, size) {
        const stem = Math.max(1, Math.round(size / 3));
        const top = base - size * 2;
        context.fillStyle = DARK;
        context.fillRect(x - stem - 1, base - size, stem * 2 + 2, size);
        context.fillStyle = SCREEN;
        context.fillRect(x - stem, base - size, stem * 2, size);
        for (let row = 0; row <= size; row += 1) {
            const half = Math.round(size * 1.3 * Math.sqrt(1 - ((size - row) / size) ** 2));
            context.fillStyle = DARK;
            context.fillRect(x - half - 1, top + row, half * 2 + 2, 1);
            if (row > 0 && row < size) {
                context.fillStyle = MID;
                context.fillRect(x - half, top + row, half * 2, 1);
            }
        }
    }

    function drawFace(x, y, happy) {
        context.fillStyle = SCREEN;
        context.fillRect(x - 3, y, 2, 2);
        context.fillRect(x + 2, y, 2, 2);
        context.fillRect(x - 2, y + (happy ? 4 : 3), 5, 1);
        context.fillRect(x - 3, y + (happy ? 3 : 4), 1, 1);
        context.fillRect(x + 3, y + (happy ? 3 : 4), 1, 1);
    }

    function draw() {
        const W = canvas.width;
        const H = canvas.height;
        const bob = !animationsPaused && frame % 2 ? 1 : 0;
        const stage = stageIndex();
        const happy = isComfy() && !pet.mold;
        context.fillStyle = SCREEN;
        context.fillRect(0, 0, W, H);
        context.fillStyle = LIGHT;
        context.fillRect(0, H - 6, W, 6);

        // El sustrato: una bolsita con el micelio cada vez más blanco.
        context.fillStyle = DARK;
        context.fillRect(11, 38, 42, 22);
        context.fillStyle = MID;
        context.fillRect(12, 39, 40, 20);
        context.fillStyle = LIGHT;
        const specks = 8 + Math.min(70, Math.floor(pet.growth / 4));
        for (let index = 0; index < specks; index += 1) {
            context.fillRect(13 + (index * 13) % 38, 40 + (index * 7) % 18, 1, 1);
        }

        // Tamaños de cada etapa: los dos de los lados y el del centro, que trae la cara.
        const sizes = [null, null, [3, 5], [5, 7], [6, 10]][stage];
        if (sizes) {
            drawMushroom(19, 39 - bob, sizes[0]);
            drawMushroom(45, 39 - bob, sizes[0]);
            drawMushroom(32, 39 - bob, sizes[1]);
            drawFace(32, 39 - bob - sizes[1] * 2 + Math.floor(sizes[1] / 2), happy);
        } else {
            if (stage === 1) {
                context.fillStyle = DARK;
                [[21, 3], [31, 5], [42, 4]].forEach(([x, height]) => {
                    context.fillRect(x, 38 - height - bob, 3, height);
                });
            }
            drawFace(32, 45 - bob, happy);
        }

        if (stage === 4 && !animationsPaused) {
            context.fillStyle = DARK;
            const sparkle = frame % 2 ? [[6, 12], [57, 20]] : [[9, 22], [55, 8]];
            sparkle.forEach(([x, y]) => {
                context.fillRect(x - 1, y, 3, 1);
                context.fillRect(x, y - 1, 1, 3);
            });
        }
        if (pet.mold) {
            context.fillStyle = DARK;
            [[15, 42], [24, 51], [38, 41], [46, 53], [31, 55], [20, 34], [41, 33]].forEach(([x, y]) => {
                context.fillRect(x, y, 5, 3);
            });
        }
    }

    function meter(name, value) {
        const bar = document.querySelector(`#tchi-${name}`);
        bar.style.width = `${Math.min(100, value)}%`;
        bar.className = value < 25 || (name === "water" && value > 95) ? "is-low" : "";
    }

    function render() {
        meter("water", pet.water);
        meter("air", pet.air);
        meter("clean", pet.clean);
        const stage = STAGES[stageIndex()];
        stageLabel.textContent = pet.mold ? "Se contaminó" : stage.name;
        harvestButton.hidden = pet.mold || stageIndex() < STAGES.length - 1;
        document.querySelector("#tchi-count").textContent = String(pet.harvests);
        document.querySelector("#tchi-restart").hidden = !pet.mold;
        draw();
    }

    function say(text) {
        messageLabel.textContent = text;
    }

    function describe() {
        if (pet.mold) {
            return "Le salió moho. Lo descuidaste mucho tiempo. Así pasa en los cultivos de verdad: toca empezar de nuevo.";
        }
        if (pet.water > 95) {
            return "¡Demasiada agua! Así no crezco. Espera a que baje.";
        }
        if (pet.water < 25) {
            return "Tengo sed. Me estoy secando.";
        }
        if (pet.air < 25) {
            return "Aquí no se puede respirar. ¡Ventila!";
        }
        if (pet.clean < 25) {
            return "Esto está sucio y me puede dar moho. ¡Limpia!";
        }
        return STAGES[stageIndex()].note;
    }

    function act(name, amount, text) {
        catchUp();
        if (pet.mold) {
            say(describe());
            return;
        }
        pet[name] = Math.min(name === "water" ? 110 : 100, pet[name] + amount);
        save();
        render();
        say(pet.water > 95 ? describe() : text);
    }

    document.querySelector("#tchi-do-water").addEventListener("click", () => act("water", 25, "¡Ahhh! Qué rico rocío."));
    document.querySelector("#tchi-do-air").addEventListener("click", () => act("air", 30, "Aire fresco. Necesito oxígeno, igual que tú."));
    document.querySelector("#tchi-do-clean").addEventListener("click", () => act("clean", 30, "Limpio. Así no llega el moho."));
    document.querySelector("#tchi-do-talk").addEventListener("click", () => say(JOKES[Math.floor(Math.random() * JOKES.length)]));
    document.querySelector("#tchi-do-time").addEventListener("click", () => {
        catchUp();
        advance(60);
        save();
        render();
        say(`Pasó una hora. ${describe()}`);
    });
    harvestButton.addEventListener("click", () => {
        const harvests = pet.harvests + 1;
        pet = fresh();
        pet.harvests = harvests;
        save();
        render();
        earnStamp("hongotchi");
        say("¡Cosecha lista! Empieza un cultivo nuevo. Recuerda: solo se comen los hongos cultivados con supervisión.");
    });
    document.querySelector("#tchi-restart").addEventListener("click", () => {
        pet = fresh();
        save();
        render();
        say("Sustrato nuevo. Esta vez, no me olvides.");
    });

    pet = pet ?? fresh();
    catchUp();
    render();
    say(describe());
    window.setInterval(() => {
        frame += 1;
        if (frame % 30 === 0) {
            catchUp();
            render();
        } else {
            draw();
        }
    }, 1000);
}


/* ---------------------------------------------------------------------
   4. Expedición al Pinacate: una aventura de texto. Cada decisión cambia tu agua
   y tu energía. Los consejos son reales; aun así, al desierto se va con adultos.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#trip-canvas");
    const context = canvas.getContext("2d");
    const dayLabel = document.querySelector("#trip-day");
    const waterLabel = document.querySelector("#trip-water");
    const energyLabel = document.querySelector("#trip-energy");
    const storyLabel = document.querySelector("#trip-story");
    const choicesBox = document.querySelector("#trip-choices");
    const LEGS = 7;
    const SCENES = [
        { icon: "sun", text: "Son las 2 de la tarde. El sol pega durísimo y el suelo quema. ¿Qué haces?", choices: [
            { label: "Descansar en la sombra y caminar al atardecer", energy: 1, smart: true, result: "Buena idea. Caminar en las horas de más calor es de lo más peligroso del desierto." },
            { label: "Seguir caminando: ¡soy de Hermosillo!", water: -2, energy: -2, result: "Ser de Hermosillo no te hace inmune al sol. Perdiste agua y energía." }] },
        { icon: "cactus", text: "Ves un enorme cactus de barril. En las películas lo cortan y beben de él. Tienes sed...", choices: [
            { label: "Cortarlo y beber", energy: -2, result: "Es un mito. Su líquido puede hacerte daño y darte más sed. Además, lastimaste a la planta." },
            { label: "Dejarlo en paz y racionar tu agua", smart: true, result: "Bien hecho. El agua segura es la que traes contigo." }] },
        { icon: "snake", text: "Escuchas un cascabel: rrrrrrr. A tres pasos hay una víbora.", choices: [
            { label: "Alejarte despacio, sin molestarla", smart: true, result: "Correcto. Las víboras no te persiguen: suenan para avisarte que no te acerques." },
            { label: "Acercarte a tomarle una selfie", energy: -2, result: "Se fue, pero el susto te dejó temblando. Ninguna foto vale el riesgo." }] },
        { icon: "cloud", text: "Es hora de acampar. A lo lejos hay nubes negras, y aquí hay un arroyo seco muy plano y cómodo.", choices: [
            { label: "Subir a un terreno más alto", smart: true, result: "Perfecto. Una tormenta lejana puede mandar agua por un arroyo seco de repente." },
            { label: "Acampar en el arroyo, se ve cómodo", energy: -3, result: "A medianoche llegó el agua. Te salvaste, pero pasaste la noche en vela y con la ropa mojada." }] },
        { icon: "guide", text: "Un guía te cuenta que astronautas del programa Apolo entrenaron justo aquí, antes de ir a la Luna.", choices: [
            { label: "Preguntarle cómo y buscar más datos", energy: 1, smart: true, result: "¡Es verdad! En noviembre de 1965 vinieron cuatro astronautas. Lee la historia completa en la sala de Historias." },
            { label: "Reírte: «sí, cómo no»", result: "Pues es cierto. Antes de reírte, investiga." }] },
        { icon: "lava", text: "Encuentras una roca negra de lava, preciosa. Estás en una reserva natural.", choices: [
            { label: "Tomarle una foto y anotar dónde estaba", smart: true, result: "Eso hace un buen científico: registra sin llevarse nada." },
            { label: "Echarla a la mochila de recuerdo", energy: -1, result: "En una reserva no se sacan cosas. Además, pesa. Caminas más cansado." }] },
        { icon: "guide", text: "Una guardaparque te ofrece rellenar tus botellas de agua.", choices: [
            { label: "Aceptar y darle las gracias", water: 3, result: "Pedir ayuda también es de personas inteligentes." },
            { label: "«No, gracias, yo puedo»", energy: -1, result: "Mucho orgullo y mucha sed." }] },
        { icon: "stars", text: "Cae la noche. Sin luces de ciudad, se ven miles de estrellas.", choices: [
            { label: "Buscar constelaciones y dormir temprano", energy: 2, result: "Noche perfecta. Mañana amaneces con energía." },
            { label: "Seguir caminando a oscuras", energy: -2, result: "Tropezaste tres veces. De noche no se ven las piedras ni los cactus." }] },
        { icon: "sun", text: "¡Tu GPS se quedó sin pila! Amanece y necesitas ir hacia el oeste.", choices: [
            { label: "Fijarte en el Sol: sale por el este, y caminar en sentido contrario", smart: true, result: "Muy bien. Ese truco funciona desde hace miles de años." },
            { label: "Caminar a donde sea, ya llegaré", water: -2, result: "Perdiste medio día dando vueltas, y agua." }] }
    ];
    let leg = 0;
    let water = 9;
    let energy = 6;
    let smart = 0;
    let deck = [];

    function shuffle(list) {
        const copy = [...list];
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const other = Math.floor(Math.random() * (index + 1));
            [copy[index], copy[other]] = [copy[other], copy[index]];
        }
        return copy;
    }

    function blob(cx, cy, rx, ry, color) {
        context.fillStyle = color;
        for (let dy = -ry; dy <= ry; dy += 1) {
            const half = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2));
            context.fillRect(cx - half, cy + dy, half * 2, 1);
        }
    }

    function drawScene(icon) {
        const W = canvas.width;
        const H = canvas.height;
        const isNight = icon === "stars";
        context.fillStyle = isNight ? "#000033" : icon === "cloud" ? "#667788" : "#66bbff";
        context.fillRect(0, 0, W, H);
        if (isNight) {
            context.fillStyle = "#ffffff";
            for (let index = 0; index < 70; index += 1) {
                context.fillRect((index * 47) % W, (index * 31) % 66, 1, 1);
            }
        } else {
            const size = icon === "sun" ? 14 : 8;
            blob(W - 40, 24, size, size, "#ffff00");
        }
        // Montañas y arena: cambian poco a poco con la distancia recorrida.
        context.fillStyle = isNight ? "#222244" : "#775544";
        for (let x = 0; x < W; x += 6) {
            const top = 62 - 20 * Math.abs(Math.sin((x + leg * 40) / 44));
            context.fillRect(x, top, 6, 80 - top);
        }
        context.fillStyle = isNight ? "#554433" : "#ddb077";
        context.fillRect(0, 76, W, H - 76);

        const figure = (x) => {
            context.fillStyle = "#ffcc99";
            context.fillRect(x, 70, 6, 6);
            context.fillStyle = "#0033cc";
            context.fillRect(x - 1, 76, 8, 10);
            context.fillStyle = "#333333";
            context.fillRect(x, 86, 2, 6);
            context.fillRect(x + 4, 86, 2, 6);
            context.fillStyle = "#cc3300";
            context.fillRect(x - 3, 77, 3, 7);
        };
        figure(50);
        context.fillStyle = "#007700";
        if (icon === "cactus") {
            blob(185, 80, 18, 18, "#007700");
            context.fillStyle = "#00bb00";
            for (let x = 173; x < 200; x += 6) {
                context.fillRect(x, 68, 1, 26);
            }
            blob(185, 62, 5, 2, "#ff66aa"); // la flor de arriba
        } else if (icon === "snake") {
            context.fillStyle = "#884411";
            context.fillRect(140, 92, 50, 4);
            context.fillRect(186, 86, 6, 8);
            context.fillStyle = "#000000";
            context.fillRect(188, 87, 1, 1);
            context.fillStyle = "#ffcc66";
            context.fillRect(134, 89, 6, 6);
        } else if (icon === "cloud") {
            blob(170, 22, 34, 12, "#333344");
            blob(205, 20, 30, 14, "#333344");
            context.fillStyle = "#88aaff";
            context.fillRect(70, 96, 200, 4);
        } else if (icon === "guide") {
            figure(120);
            context.fillStyle = "#336633";
            context.fillRect(116, 68, 14, 3);
        } else if (icon === "lava") {
            blob(170, 90, 24, 11, "#222222");
            blob(164, 85, 6, 2, "#555555");
        } else if (icon === "crater") {
            blob(195, 95, 112, 18, "#775544");
            blob(195, 97, 94, 13, "#553322");
            blob(195, 100, 70, 8, "#332211");
            context.fillStyle = "#ffff00";
            context.fillRect(292, 60, 2, 28);
            context.fillStyle = "#ff0000";
            context.fillRect(294, 60, 16, 9);
        } else if (icon === "help") {
            context.fillStyle = "#cc0000";
            context.fillRect(150, 18, 60, 16);
            context.fillRect(205, 12, 4, 6);
            context.fillStyle = "#333333";
            context.fillRect(140, 12, 80, 2);
        }
    }

    function updateStatus() {
        dayLabel.textContent = `${Math.min(leg + 1, LEGS)}/${LEGS}`;
        waterLabel.textContent = `${Math.max(0, water)}`;
        energyLabel.textContent = `${Math.max(0, energy)}`;
    }

    function setChoices(list) {
        choicesBox.replaceChildren(...list.map(({ label, action }) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "retro-button";
            button.textContent = label;
            button.addEventListener("click", action);
            return button;
        }));
    }

    function showScene() {
        const scene = deck[leg];
        updateStatus();
        drawScene(scene.icon);
        storyLabel.textContent = scene.text;
        setChoices(shuffle(scene.choices).map((choice) => ({ label: choice.label, action: () => choose(choice) })));
    }

    function choose(choice) {
        water += (choice.water ?? 0) - 1; // cada tramo gasta una botella
        energy = Math.min(9, energy + (choice.energy ?? 0));
        smart += choice.smart ? 1 : 0;
        leg += 1;
        updateStatus();
        if (water <= 0 || energy <= 0) {
            drawScene("help");
            storyLabel.textContent = `${choice.result} ${water <= 0 ? "Te quedaste sin agua" : "Ya no puedes dar un paso"}. Pediste ayuda por radio y un helicóptero te recogió. Regla del desierto: avisa siempre a dónde vas.`;
            setChoices([{ label: "INTENTAR OTRA VEZ", action: start }]);
            return;
        }
        storyLabel.textContent = choice.result;
        setChoices([{ label: leg >= LEGS ? "LLEGAR AL CRÁTER" : "SEGUIR CAMINANDO", action: leg >= LEGS ? arrive : showScene }]);
    }

    function arrive() {
        drawScene("crater");
        const title = smart >= 5 ? "Guía de primera del Pinacate" : smart >= 3 ? "Buena exploración" : "De puro milagro";
        storyLabel.textContent = `¡Llegaste al cráter de El Elegante! Tomaste ${smart} buenas decisiones. Tu título: ${title}.`;
        earnStamp("expedicion");
        setChoices([{ label: "OTRA EXPEDICIÓN", action: start }]);
    }

    function start() {
        leg = 0;
        water = 9;
        energy = 6;
        smart = 0;
        deck = shuffle(SCENES).slice(0, LEGS);
        showScene();
    }

    drawScene("crater");
    updateStatus();
    setChoices([{ label: "EMPEZAR LA EXPEDICIÓN", action: start }]);
}
