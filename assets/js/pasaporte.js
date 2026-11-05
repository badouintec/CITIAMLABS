"use strict";

/* =====================================================================
   pasaporte.js: muestra los sellos de pasaporte.html.
   La lista STAMPS y earnStamp están en script.js, porque cualquier página
   puede dar un sello.
   ===================================================================== */

const DIPLOMA_MINIMUM = 9;
const stampGrid = document.querySelector("#stamp-grid");
const diploma = document.querySelector("#diploma");
const diplomaName = document.querySelector("#diploma-name");

function renderPassport() {
    const earned = loadStamps();
    const total = STAMPS.length;

    document.querySelector("#pass-rank").textContent = stampRank(earned.length);
    document.querySelector("#pass-count").textContent = `Tienes ${earned.length} de ${total} sellos.`;
    document.querySelector("#pass-bar").style.width = `${earned.length / total * 100}%`;

    stampGrid.replaceChildren(...STAMPS.map((stamp) => {
        const isEarned = earned.includes(stamp.id);
        const card = document.createElement("a");
        card.className = `stamp ${isEarned ? "is-earned" : ""}`;
        card.href = pageUrl(stamp.page) + (stamp.anchor ? `#${stamp.anchor}` : "");
        const mark = document.createElement("span");
        mark.className = "stamp-mark";
        mark.textContent = isEarned ? "★" : "?";
        const title = document.createElement("strong");
        title.textContent = stamp.name;
        const hint = document.createElement("span");
        hint.textContent = stamp.hint;
        card.append(mark, title, hint);
        return card;
    }));

    document.querySelector("#sala-secreta").hidden = !earned.includes("secreto");

    const canPrint = earned.length >= DIPLOMA_MINIMUM;
    document.querySelector("#diploma-tools").hidden = !canPrint;
    diploma.hidden = !canPrint;
    document.querySelector("#diploma-note").textContent = canPrint
        ? "Te lo ganaste. Escribe tu apodo e imprímelo para enseñarlo en casa."
        : `Se desbloquea con ${DIPLOMA_MINIMUM} sellos. Te faltan ${DIPLOMA_MINIMUM - earned.length}.`;
    document.querySelector("#diploma-count").textContent = `${earned.length} de ${total}`;
    document.querySelector("#diploma-rank").textContent = stampRank(earned.length);
    updateDiplomaName();
}

function updateDiplomaName() {
    document.querySelector("#diploma-shown").textContent = diplomaName.value.trim() || "Tu apodo aquí";
}

diplomaName.addEventListener("input", updateDiplomaName);
document.querySelector("#diploma-print").addEventListener("click", () => window.print());

document.querySelector("#stamps-reset").addEventListener("click", () => {
    writeStorage(STAMP_KEY, "[]");
    renderPassport();
});

const terminalButton = document.querySelector("#toggle-terminal");

function syncTerminalButton() {
    terminalButton.textContent = document.documentElement.classList.contains("modo-terminal")
        ? "DESACTIVAR MODO TERMINAL"
        : "ACTIVAR MODO TERMINAL";
}

terminalButton.addEventListener("click", () => {
    setTerminalMode(!document.documentElement.classList.contains("modo-terminal"));
    syncTerminalButton();
});

window.addEventListener("stamp-earned", renderPassport);
syncTerminalButton();
renderPassport();
