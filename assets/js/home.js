"use strict";

/* =====================================================================
   home.js: solo para index.html. Se carga DESPUÉS de script.js porque usa
   sus funciones readStorage y writeStorage.

     1. Misión de observación (botón DAME UNA IDEA)
     2. Contador de visitas
     3. Libro de visitas
     4. Hoy en CiTIAM: un dato por día y tu siguiente misión

   El contador y el libro guardan sus datos solo en este navegador.
   Nada viaja a internet, por eso nadie más puede ver las firmas.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Misión de observación: muestra una idea sin repetir la anterior.
   Para agregar una idea, escribe otra línea en la lista.
   --------------------------------------------------------------------- */
const investigationIdeas = [
    "Dibuja la sombra de un objeto en dos horarios distintos. ¿Qué cambió?",
    "Observa una planta del patio. ¿Qué detalles podrías medir cada semana?",
    "Busca dos superficies con distinta textura. ¿Cómo podrías compararlas sin dañarlas?",
    "Mira un objeto cotidiano y dibuja tres formas distintas de mejorarlo.",
    "Diseña una ruta para que un robot llegue a una meta sin cruzar obstáculos.",
    "Elige un sonido del entorno y piensa qué herramienta usarías para medirlo.",
    "Imagina un semillero escolar. ¿Cómo calcularías el espacio que necesitan las plantas?",
    "Compara dos objetos que den sombra. ¿Qué datos necesitarías para saber cuál cubre más?"
];
const ideaPrompt = document.querySelector("#idea-prompt");
let previousIdea = -1;

document.querySelector("#idea-button").addEventListener("click", () => {
    let nextIdea = Math.floor(Math.random() * investigationIdeas.length);
    while (nextIdea === previousIdea) {
        nextIdea = Math.floor(Math.random() * investigationIdeas.length);
    }
    previousIdea = nextIdea;
    ideaPrompt.textContent = investigationIdeas[nextIdea];
});


/* ---------------------------------------------------------------------
   2. Contador de visitas: cuenta cuántas veces se abrió la portada en este
   navegador. No es el total de visitantes del sitio.
   --------------------------------------------------------------------- */
const counterStorageKey = "citiam-visit-count";
const previousVisits = Number.parseInt(readStorage(counterStorageKey) ?? "0", 10);
const visitCount = Number.isSafeInteger(previousVisits) && previousVisits >= 0 ? previousVisits + 1 : 1;

writeStorage(counterStorageKey, String(visitCount));
document.querySelector("#hit-counter").textContent = String(visitCount).padStart(7, "0");


/* ---------------------------------------------------------------------
   3. Libro de visitas: guarda hasta 50 firmas como texto JSON.
   Usamos textContent para que nadie pueda inyectar HTML con una firma.
   --------------------------------------------------------------------- */
const guestbookForm = document.querySelector("#guestbook-form");
const guestbookEntries = document.querySelector("#guestbook-entries");
const guestbookStatus = document.querySelector("#guestbook-status");
const guestbookStorageKey = "citiam-guestbook-entries";

function readGuestbook() {
    try {
        const entries = JSON.parse(readStorage(guestbookStorageKey) ?? "[]");
        return Array.isArray(entries)
            ? entries.filter((entry) => typeof entry?.name === "string" && typeof entry?.message === "string")
            : [];
    } catch {
        guestbookStatus.textContent = "No se pudieron leer las firmas guardadas en este navegador.";
        return [];
    }
}

function renderGuestbook() {
    guestbookEntries.replaceChildren(...readGuestbook().map((entry) => {
        const paragraph = document.createElement("p");
        const name = document.createElement("strong");
        paragraph.className = "guest-entry";
        name.textContent = `${entry.name}: `;
        paragraph.append(name, document.createTextNode(entry.message));
        return paragraph;
    }));
}

guestbookForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#gb-name").value.trim();
    const message = document.querySelector("#gb-msg").value.trim();
    if (!name || !message) {
        guestbookStatus.textContent = "Escribe un apodo y un comentario antes de firmar.";
        return;
    }

    const entries = [...readGuestbook(), { name, message }].slice(-50);
    if (!writeStorage(guestbookStorageKey, JSON.stringify(entries))) {
        guestbookStatus.textContent = "No se pudo guardar. Este navegador tiene bloqueado el almacenamiento.";
        return;
    }

    guestbookForm.reset();
    guestbookStatus.textContent = "Tu firma quedó guardada en este navegador.";
    renderGuestbook();
});

document.querySelector("#clear-guestbook").addEventListener("click", () => {
    writeStorage(guestbookStorageKey, "[]");
    guestbookStatus.textContent = "Se borraron las firmas guardadas en este navegador.";
    renderGuestbook();
});

renderGuestbook();


/* ---------------------------------------------------------------------
   4. Hoy en CiTIAM: el dato depende de la fecha, así que cambia cada día sin
   necesidad de un servidor. Solo agrega datos que tengan fuente en el sitio.
   --------------------------------------------------------------------- */
const DAILY_FACTS = [
    { text: "Astronautas del programa Apolo entrenaron en El Pinacate, en Sonora, antes de ir a la Luna.", page: "historias", anchor: "astronautas" },
    { text: "El Cerro de la Campana se llama así porque sus rocas suenan al golpearlas.", page: "historias", anchor: "cerro" },
    { text: "Guillermo González Camarena hizo su primera cámara de televisión cuando tenía unos 17 años.", page: "historias", anchor: "tele" },
    { text: "El cráter del asteroide de los dinosaurios lo encontraron geofísicos que buscaban petróleo para Pemex.", page: "historias", anchor: "crater" },
    { text: "Rodolfo Campodónico, de Hermosillo, empezó a componer música a los 11 años.", page: "artistas", anchor: "campodonico" },
    { text: "Para pintar un puente de Hermosillo con flora y fauna del desierto se usaron 260 latas y botes de pintura.", page: "artistas", anchor: "sangre" },
    { text: "Mario Molina ganó el Nobel por advertir sobre la capa de ozono, aunque al principio parte de la comunidad lo criticó.", page: "historias", anchor: "ozono" },
    { text: "Un equipo de la primera generación de CiTIAM Labs convirtió su proyecto en una plataforma que hoy se está incubando.", page: "casos-de-exito", anchor: "irven" }
];

function renderToday() {
    const dayNumber = Math.floor(Date.now() / 86400000);
    const fact = DAILY_FACTS[dayNumber % DAILY_FACTS.length];
    document.querySelector("#hoy-dato").textContent = fact.text;
    document.querySelector("#hoy-enlace").href = `${pageUrl(fact.page)}#${fact.anchor}`;

    const earned = loadStamps();
    const next = STAMPS.find((stamp) => !earned.includes(stamp.id));
    const mission = document.querySelector("#hoy-mision");
    mission.textContent = next ? next.hint : "¡Ya tienes todos los sellos! Imprime tu diploma.";
    mission.href = next ? pageUrl(next.page) + (next.anchor ? `#${next.anchor}` : "") : pageUrl("pasaporte");
    document.querySelector("#hoy-rango").textContent = stampRank(earned.length);
}

window.addEventListener("stamp-earned", renderToday);
renderToday();
