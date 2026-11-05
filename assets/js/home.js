"use strict";

/* =====================================================================
   home.js: solo para index.html. Se carga DESPUÉS de script.js porque usa
   sus funciones readStorage y writeStorage.

     1. Misión de observación (botón DAME UNA IDEA)
     2. Contador de visitas
     3. Libro de visitas
     4. Hoy en CiTIAM: un dato por día y tu siguiente misión
     5. Atardecer-o-matic: el cielo según la hora

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


/* ---------------------------------------------------------------------
   5. Atardecer-o-matic
   Un paisaje de 320 x 120 pixeles. El color del cielo depende de la altura
   del Sol: SKY guarda varios cielos y se mezclan los dos más cercanos.
   Solo se anima el piso, y nunca con las animaciones en pausa.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#sunset-canvas");
    const context = canvas.getContext("2d");
    const hourInput = document.querySelector("#sunset-hour");
    const timeLabel = document.querySelector("#sunset-time");
    const note = document.querySelector("#sunset-note");
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const HORIZON = 78;
    const SUNRISE = 6;
    const SUNSET = 19;
    const BANDS = 12; // pocas franjas de color, como una pantalla de 256 colores
    const SKY = [
        { height: -0.5, top: [2, 2, 30], low: [12, 8, 54], ground: [8, 6, 30], line: [110, 60, 200] },
        { height: -0.12, top: [20, 8, 60], low: [96, 30, 112], ground: [24, 12, 50], line: [255, 70, 190] },
        { height: 0.02, top: [43, 10, 61], low: [255, 111, 145], ground: [50, 16, 70], line: [255, 90, 200] },
        { height: 0.2, top: [70, 90, 170], low: [255, 195, 113], ground: [120, 80, 70], line: [255, 180, 120] },
        { height: 0.5, top: [40, 120, 220], low: [160, 215, 255], ground: [205, 170, 110], line: [160, 120, 70] },
        { height: 1, top: [30, 110, 225], low: [150, 210, 255], ground: [215, 180, 120], line: [170, 130, 80] }
    ];
    const STARS = Array.from({ length: 50 }, (_, i) => [(i * 73) % WIDTH, (i * 37) % HORIZON]);
    let hour = 19;
    let gridOffset = 0;
    let isVisible = true;
    let lastFrame = 0;

    const mix = (a, b, amount) => a.map((value, i) => Math.round(value + (b[i] - value) * amount));
    const toColor = ([red, green, blue]) => `rgb(${red}, ${green}, ${blue})`;
    const sunHeight = (time) => Math.sin(Math.PI * (time - SUNRISE) / (SUNSET - SUNRISE));
    const belowHorizon = (time) => time < SUNRISE || time > SUNSET;

    function skyAt(height) {
        const value = Math.max(SKY[0].height, Math.min(height, 1));
        const nextIndex = SKY.findIndex((sky) => sky.height >= value);
        const after = SKY[Math.max(nextIndex, 1)];
        const before = SKY[Math.max(nextIndex, 1) - 1];
        const amount = (value - before.height) / (after.height - before.height);
        return Object.fromEntries(["top", "low", "ground", "line"].map((key) => [key, mix(before[key], after[key], amount)]));
    }

    function drawSun(height, sky) {
        const x = Math.round(((hour - 5) / 17) * WIDTH);
        const y = Math.round(HORIZON - 16 - height * 50);
        const radius = 15;
        const color = mix([255, 90, 140], [255, 240, 120], Math.max(0, Math.min(height * 2.5, 1)));
        for (let row = -radius; row <= radius; row += 1) {
            /* Cerca del horizonte el Sol se parte en franjas. */
            const striped = height < 0.35 && row > 0 && (row % 5) < Math.min(1 + row / 4, 3);
            if (striped || y + row >= HORIZON) {
                continue;
            }
            const half = Math.round(Math.sqrt(radius * radius - row * row));
            context.fillStyle = toColor(mix(color, sky.low, row > 0 ? (row / radius) * 0.25 : 0));
            context.fillRect(x - half, y + row, half * 2, 1);
        }
    }

    function drawSaguaro(x, base, size, color) {
        context.fillStyle = color;
        context.fillRect(x, base - size, 4, size);
        context.fillRect(x - 5, base - Math.round(size * 0.65), 5, 2);
        context.fillRect(x - 5, base - Math.round(size * 0.9), 2, Math.round(size * 0.25));
        context.fillRect(x + 4, base - Math.round(size * 0.5), 5, 2);
        context.fillRect(x + 7, base - Math.round(size * 0.8), 2, Math.round(size * 0.3));
    }

    function draw() {
        const height = belowHorizon(hour)
            ? -Math.min(1, Math.min(Math.abs(hour - SUNRISE), Math.abs(hour - SUNSET)) / 3)
            : sunHeight(hour);
        const sky = skyAt(height);

        for (let band = 0; band < BANDS; band += 1) {
            context.fillStyle = toColor(mix(sky.top, sky.low, band / (BANDS - 1)));
            context.fillRect(0, Math.floor((band / BANDS) * HORIZON), WIDTH, Math.ceil(HORIZON / BANDS));
        }
        if (height < -0.02) {
            context.fillStyle = "#ffffff";
            STARS.slice(0, Math.round(Math.min(1, -height * 2.5) * STARS.length)).forEach(([x, y]) => context.fillRect(x, y, 1, 1));
        }
        if (height > -0.2) {
            drawSun(height, sky);
        }

        const hills = toColor(mix(sky.ground, sky.top, 0.4));
        context.fillStyle = hills;
        for (let x = 0; x < WIDTH; x += 4) { // el Cerro de la Campana, más o menos
            const rise = Math.round(7 + 6 * Math.sin(x / 41) + 4 * Math.sin(x / 13));
            context.fillRect(x, HORIZON - rise, 4, rise);
        }

        context.fillStyle = toColor(sky.ground);
        context.fillRect(0, HORIZON, WIDTH, HEIGHT - HORIZON);
        context.fillStyle = toColor(sky.line);
        for (let i = 0; i < 7; i += 1) {
            const depth = ((i + gridOffset) / 7) ** 2.2;
            context.fillRect(0, HORIZON + Math.floor(depth * (HEIGHT - HORIZON)), WIDTH, 1);
        }
        for (let row = HORIZON; row < HEIGHT; row += 1) {
            for (let k = -12; k <= 12; k += 1) {
                const slope = k * 1.1;
                context.fillRect(Math.round(WIDTH / 2 + slope * (row - HORIZON + 6)), row, Math.max(1, Math.ceil(Math.abs(slope))), 1);
            }
        }

        const silhouette = toColor(mix(sky.ground, [0, 0, 0], height > 0.35 ? 0.55 : 0.85));
        drawSaguaro(62, 92, 38, silhouette);
        drawSaguaro(200, 84, 22, silhouette);
    }

    function explain() {
        if (belowHorizon(hour)) {
            return hour > SUNSET && hour < SUNSET + 1
                ? "Ya se metió el Sol, pero su luz todavía llega a lo alto de la atmósfera. Por eso queda ese brillo morado."
                : "Noche: sin luz directa del Sol se alcanzan a ver las estrellas, que de día siguen ahí.";
        }
        const height = sunHeight(hour);
        if (height < 0.3) {
            return "Con el Sol bajo, su luz cruza mucho más aire. El azul se dispersa por el camino y a tus ojos llegan sobre todo el naranja y el rojo.";
        }
        return "Con el Sol alto, el aire dispersa la luz azul mucho más que la roja. Esa luz azul te llega de todas partes: por eso el cielo se ve azul.";
    }

    function setHour(value) {
        hour = Math.max(5, Math.min(22, value));
        hourInput.value = hour;
        const whole = Math.floor(hour);
        timeLabel.textContent = `${String(whole).padStart(2, "0")}:${String(Math.round((hour - whole) * 60)).padStart(2, "0")}`;
        const text = explain();
        if (note.textContent !== text) {
            note.textContent = text;
        }
        draw();
    }

    function hourFromPointer(event) {
        const box = canvas.getBoundingClientRect();
        setHour(5 + Math.round((((event.clientX - box.left) / box.width) * 17) * 4) / 4);
    }

    function setNow() {
        const now = new Date();
        setHour(now.getHours() + Math.floor(now.getMinutes() / 15) / 4);
    }

    hourInput.addEventListener("input", () => setHour(Number(hourInput.value)));
    document.querySelector("#sunset-now").addEventListener("click", setNow);
    canvas.addEventListener("pointerdown", (event) => {
        canvas.setPointerCapture(event.pointerId);
        hourFromPointer(event);
        canvas.addEventListener("pointermove", hourFromPointer);
        canvas.addEventListener("pointerup", () => canvas.removeEventListener("pointermove", hourFromPointer), { once: true });
    });

    new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
    }).observe(canvas);

    function animate(time) {
        if (isVisible && !animationsPaused && time - lastFrame > 90) {
            lastFrame = time;
            gridOffset = (gridOffset + 0.05) % 1;
            draw();
        }
        window.requestAnimationFrame(animate);
    }

    setHour(18.5);
    window.requestAnimationFrame(animate);
}
