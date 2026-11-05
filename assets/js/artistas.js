"use strict";

/* =====================================================================
   artistas.js: el mural pixelado de artistas.html.
   Cada casilla guarda el número de un color de la paleta. El dibujo se
   guarda como una lista de números en este navegador.
   ===================================================================== */

const MURAL_COLS = 32;
const MURAL_ROWS = 18;
const MURAL_CELL = 10;
const MURAL_KEY = "citiam-mural";
const SKY = 8;
const SAND = 9;
const MURAL_COLORS = [
    ["#000000", "negro"], ["#ffffff", "blanco"], ["#ff3300", "rojo"], ["#ff9900", "naranja"], ["#ffff00", "amarillo"],
    ["#00aa00", "verde"], ["#005500", "verde oscuro"], ["#ff66cc", "rosa"], ["#3399ff", "azul cielo"],
    ["#cc9966", "arena"], ["#663300", "café"], ["#6600cc", "morado"]
];

const muralCanvas = document.querySelector("#mural-canvas");
const muralContext = muralCanvas.getContext("2d");
const muralPalette = document.querySelector("#mural-palette");
const muralStatus = document.querySelector("#mural-status");
let brush = 5;
let isPainting = false;

function blankMural() {
    return Array.from({ length: MURAL_COLS * MURAL_ROWS }, (_, index) => (index >= MURAL_COLS * 13 ? SAND : SKY));
}

function loadMural() {
    try {
        const saved = JSON.parse(readStorage(MURAL_KEY) ?? "null");
        const isValid = Array.isArray(saved) && saved.length === MURAL_COLS * MURAL_ROWS
            && saved.every((color) => Number.isInteger(color) && color >= 0 && color < MURAL_COLORS.length);
        return isValid ? saved : blankMural();
    } catch {
        return blankMural();
    }
}

let mural = loadMural();

function drawCell(index) {
    muralContext.fillStyle = MURAL_COLORS[mural[index]][0];
    muralContext.fillRect((index % MURAL_COLS) * MURAL_CELL, Math.floor(index / MURAL_COLS) * MURAL_CELL, MURAL_CELL, MURAL_CELL);
}

function drawMural() {
    mural.forEach((_, index) => drawCell(index));
}

function paintAt(event) {
    const box = muralCanvas.getBoundingClientRect();
    const col = Math.floor((event.clientX - box.left) / box.width * MURAL_COLS);
    const row = Math.floor((event.clientY - box.top) / box.height * MURAL_ROWS);
    if (col < 0 || col >= MURAL_COLS || row < 0 || row >= MURAL_ROWS) {
        return;
    }
    const index = row * MURAL_COLS + col;
    mural[index] = brush;
    drawCell(index);
}

muralCanvas.addEventListener("pointerdown", (event) => {
    isPainting = true;
    muralCanvas.setPointerCapture(event.pointerId);
    paintAt(event);
});
muralCanvas.addEventListener("pointermove", (event) => {
    if (isPainting) {
        paintAt(event);
    }
});
muralCanvas.addEventListener("pointerup", () => {
    isPainting = false;
    writeStorage(MURAL_KEY, JSON.stringify(mural));
});
muralCanvas.addEventListener("pointercancel", () => {
    isPainting = false;
});

MURAL_COLORS.forEach(([color, name], index) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "mural-swatch";
    swatch.style.background = color;
    swatch.setAttribute("aria-label", `Color ${name}`);
    swatch.setAttribute("aria-pressed", String(index === brush));
    swatch.addEventListener("click", () => {
        brush = index;
        muralPalette.querySelectorAll("button").forEach((button, position) => {
            button.setAttribute("aria-pressed", String(position === index));
        });
    });
    muralPalette.append(swatch);
});

document.querySelector("#mural-reset").addEventListener("click", () => {
    mural = blankMural();
    writeStorage(MURAL_KEY, JSON.stringify(mural));
    drawMural();
    muralStatus.textContent = "Pared lista para un mural nuevo.";
});

document.querySelector("#mural-save").addEventListener("click", () => {
    muralCanvas.toBlob((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "mi-mural-citiam.png";
        link.click();
        URL.revokeObjectURL(link.href);
        muralStatus.textContent = "¡Listo! Busca mi-mural-citiam.png en tus descargas.";
        earnStamp("mural");
    });
});

drawMural();
