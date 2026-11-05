"use strict";

/* =====================================================================
   records.js: la tabla de récords del arcade, guardada en Supabase.

   Sin librerías: usa fetch contra la API REST de Supabase.
   Mientras SUPABASE_URL y SUPABASE_KEY estén vacías, las tablas no aparecen,
   no se conecta a nada y los juegos funcionan igual.

   La llave es la "publishable", hecha para ir en el navegador. Quien protege
   los datos son las reglas de la base de datos (ver README). NUNCA pongas
   aquí la llave secreta.

   Privacidad: nada sale de esta página hasta que alguien abre una tabla o
   pulsa PUBLICAR. Solo se envían el juego, un apodo al azar y el resultado.
   No hay texto libre, para que nadie publique su nombre o una grosería.

   Si cambias RECORD_GAMES o las listas de apodos, cambia también el SQL.
   ===================================================================== */

const SUPABASE_URL = ""; // https://tu-proyecto.supabase.co
const SUPABASE_KEY = ""; // sb_publishable_...

const RECORD_GAMES = {
    runner: { order: "score.desc", unit: "puntos", min: 1, max: 20000 },
    buscacactus: { order: "score.asc", unit: "segundos", min: 1, max: 999 },
    memorama: { order: "score.asc", unit: "intentos", min: 6, max: 500 }
};
const NICK_NOUNS = ["Robot", "Cactus", "Coyote", "Saguaro", "Cometa", "Átomo", "Hongo", "Tortuga", "Colibrí", "Lince", "Planeta", "Búho"];
const NICK_COLORS = ["Azul", "Verde", "Naranja", "Turquesa", "Violeta", "Plata", "Cobre", "Neón"];
const NICK_KEY = "citiam-apodo";
const recordBoxes = {};

function randomNickname() {
    const choose = (list) => list[Math.floor(Math.random() * list.length)];
    const nickname = `${choose(NICK_NOUNS)} ${choose(NICK_COLORS)} ${10 + Math.floor(Math.random() * 90)}`;
    writeStorage(NICK_KEY, nickname);
    return nickname;
}

const currentNickname = () => readStorage(NICK_KEY) ?? randomNickname();

async function recordsRequest(query, options = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/records${query}`, {
        ...options,
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...options.headers },
        signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
        throw new Error(`Supabase respondió ${response.status}`);
    }
    return response;
}

async function loadRecordTable(game) {
    const box = recordBoxes[game];
    const { order, unit } = RECORD_GAMES[game];
    box.status.textContent = "Cargando...";
    try {
        const response = await recordsRequest(`?select=nickname,score&game=eq.${game}&order=${order},created_at.asc&limit=10`);
        const rows = await response.json();
        box.list.replaceChildren(...rows.map(({ nickname, score }) => {
            const item = document.createElement("li");
            item.textContent = `${nickname}: ${score} ${unit}`;
            item.classList.toggle("is-mine", nickname === readStorage(NICK_KEY));
            return item;
        }));
        box.status.textContent = rows.length ? "" : "Todavía no hay récords. ¡Estrena la tabla!";
    } catch {
        box.status.textContent = "No se pudo cargar la tabla. Revisa tu conexión; el juego sigue funcionando.";
    }
}

async function publishRecord(game) {
    const box = recordBoxes[game];
    box.publish.disabled = true;
    box.status.textContent = "Enviando...";
    box.details.open = true;
    try {
        await recordsRequest("", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ game, nickname: currentNickname(), score: box.pending })
        });
        box.offer.hidden = true;
        await loadRecordTable(game);
    } catch {
        box.publish.disabled = false;
        box.details.open = true;
        box.status.textContent = "No se pudo publicar. Intenta otra vez en un momento.";
    }
}

/* Lo llaman los juegos al terminar. Sin Supabase configurado no hace nada. */
function offerRecord(game, score) {
    const box = recordBoxes[game];
    const { min, max, unit } = RECORD_GAMES[game];
    if (!box || score < min || score > max) {
        return;
    }
    box.pending = score;
    box.result.textContent = `${score} ${unit}`;
    box.nickname.textContent = currentNickname();
    box.publish.disabled = false;
    box.offer.hidden = false;
}

if (SUPABASE_URL && SUPABASE_KEY) {
    Object.keys(RECORD_GAMES).forEach((game) => {
        const root = document.querySelector(`#records-${game}`);
        root.innerHTML = `
            <p class="records-offer" hidden>
                Tu resultado: <strong data-part="result"></strong>. Apodo: <strong data-part="nickname"></strong>
                <button class="retro-button" data-part="reroll" type="button">OTRO APODO</button>
                <button class="retro-button" data-part="publish" type="button">PUBLICAR</button>
            </p>
            <details>
                <summary>Tabla de récords</summary>
                <ol></ol>
            </details>
            <p class="tiny" data-part="status" aria-live="polite"></p>`;
        const part = (name) => root.querySelector(`[data-part="${name}"]`);
        const box = {
            offer: root.querySelector(".records-offer"),
            details: root.querySelector("details"),
            list: root.querySelector("ol"),
            result: part("result"),
            nickname: part("nickname"),
            publish: part("publish"),
            status: part("status"),
            pending: 0
        };
        recordBoxes[game] = box;
        root.hidden = false;
        part("reroll").addEventListener("click", () => {
            box.nickname.textContent = randomNickname();
        });
        box.publish.addEventListener("click", () => publishRecord(game));
        box.details.addEventListener("toggle", () => {
            if (box.details.open && box.status.textContent !== "Enviando...") {
                loadRecordTable(game);
            }
        });
    });
}
