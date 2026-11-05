"use strict";

/* =====================================================================
   script.js: programa común. TODAS las páginas lo cargan.

   Contiene solo lo que aparece en la barra de controles de cada página:
     1. Guardar preferencias sin que el programa se rompa
     2. Música MIDI y sonido de módem
     3. Pausar animaciones
     4. Pasaporte: los sellos
     5. El código secreto y el modo terminal
     6. Robotín

   Otros programas:
     home.js          solo en index.html (Hoy en CiTIAM, ideas, contador, libro de visitas)
     arcade.js        solo en arcade.html (los retos y la bitácora)
     records.js       solo en arcade.html (tabla de récords en Supabase)
     maquinitas.js    solo en arcade.html (Robot Runner, Buscacactus, Hongotchi, Expedición)
     programacion.js  solo en programacion.html (taller de código)
     Cada sala interactiva tiene su propio programa: ver guia.html
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Guardar preferencias
   localStorage puede estar bloqueado (ventana privada, reglas de la
   escuela). Si falla, el sitio sigue funcionando: solo no recuerda nada.
   home.js también usa estas dos funciones.
   --------------------------------------------------------------------- */
function readStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}


/* ---------------------------------------------------------------------
   2. Sonido
   No hay archivos de audio: el navegador fabrica cada nota con un
   oscilador. El módem suena al pulsar su botón. La música empieza apagada:
   si alguien la enciende, se recuerda e intenta sonar en cada página. Si el
   navegador lo bloquea, espera al primer clic.
   --------------------------------------------------------------------- */
let audioContext;

function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
        audioContext ??= new AudioContextClass();
    }
    return audioContext;
}

function playTone(frequency, duration = 0.12, type = "square", volume = 0.035) {
    if (!getAudioContext()) {
        return false;
    }
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
    return true;
}

/* El beat: composición original de 8 compases, al estilo vaporwave: como un
   disco de los 80 tocado lento, con frases cortadas que se repiten. Cada compás
   tiene 16 pasos. Las notas usan números MIDI (60 es do central). */
const VAPOR_STEP = 60 / 66 / 4; // segundos por paso, a 66 pulsos por minuto
const VAPOR_LOOP = 128; // pasos antes de repetir
const VAPOR_TRANSPOSE = -2; // todo más grave, como un disco lento
const VAPOR_CHORDS = [ // bajo y acorde: Re♭maj7, Si♭m9, Sol♭maj7 y La♭7
    [37, [61, 65, 68, 72]],
    [34, [58, 61, 65, 72]],
    [42, [54, 58, 61, 65]],
    [44, [56, 60, 63, 66]]
];
const VAPOR_MELODY = [ // paso, nota y duración en pasos
    [0, 80, 5], [6, 77, 2], [8, 75, 6],
    [16, 80, 5], [22, 77, 2], [24, 75, 2], [26, 73, 6],
    [32, 77, 3], [36, 77, 3], [40, 77, 2], [42, 75, 2], [44, 73, 4],
    [48, 75, 2], [50, 75, 1], [51, 75, 1], [52, 75, 2], [54, 72, 2], [56, 68, 8],
    [64, 80, 5], [70, 77, 2], [72, 75, 6],
    [80, 82, 5], [86, 80, 2], [88, 77, 2], [90, 75, 6],
    [96, 77, 1], [97, 77, 1], [98, 77, 1], [99, 77, 1], [100, 80, 4], [106, 77, 2], [108, 75, 4],
    [112, 73, 6], [120, 72, 2], [122, 72, 1], [123, 72, 1], [124, 70, 4]
];
const VAPOR_PIANO = [0, 3, 6, 10]; // golpes del piano eléctrico dentro del compás
const VAPOR_KICK = [0, 10];
const VAPOR_SNARE = [4, 12];
const VAPOR_BASS = [0, 3, 8, 11, 14];
const midiToHz = (midi) => 440 * 2 ** ((midi + VAPOR_TRANSPOSE - 69) / 12);

/* Recibe dónde sonar y devuelve la función que programa cada paso. */
function createVaporBeat(context, output) {
    const makeNoise = (seconds, fade) => {
        const length = Math.floor(context.sampleRate * seconds);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * fade(i / length);
        }
        return buffer;
    };

    /* Todo pasa por este filtro: quita los agudos, como una cinta gastada. */
    const tape = context.createBiquadFilter();
    tape.type = "lowpass";
    tape.frequency.value = 3400;
    tape.connect(output);

    const reverb = context.createConvolver();
    reverb.buffer = makeNoise(3.2, (position) => (1 - position) ** 3);
    const wet = context.createGain();
    wet.gain.value = 0.42;
    reverb.connect(wet);
    wet.connect(tape);

    const padFilter = context.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 900;
    padFilter.connect(tape);
    padFilter.connect(reverb);
    const noise = makeNoise(1, () => 1);

    /* Un oscilador muy lento hace temblar la afinación de todas las notas. */
    const wobble = context.createOscillator();
    const wobbleDepth = context.createGain();
    wobble.frequency.value = 0.45;
    wobbleDepth.gain.value = 14;
    wobble.connect(wobbleDepth);
    wobble.start();

    function envelope(time, length, volume, attack) {
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(volume, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        return gain;
    }

    function playNote(type, midi, time, length, volume, attack, destination, sendToReverb) {
        const oscillator = context.createOscillator();
        const gain = envelope(time, length, volume, attack);
        oscillator.type = type;
        oscillator.frequency.value = midiToHz(midi);
        wobbleDepth.connect(oscillator.detune);
        oscillator.connect(gain);
        gain.connect(destination);
        if (sendToReverb) {
            gain.connect(reverb);
        }
        oscillator.start(time);
        oscillator.stop(time + length);
        return oscillator;
    }

    /* Una voz grave: dos filtros forman una "a" y la nota entra deslizándose. */
    function playVoice(midi, time, length) {
        const oscillator = context.createOscillator();
        const gain = envelope(time, length, 1, 0.05);
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(midiToHz(midi) * 0.93, time);
        oscillator.frequency.exponentialRampToValueAtTime(midiToHz(midi), time + 0.1);
        wobbleDepth.connect(oscillator.detune);
        [[720, 7], [1180, 9]].forEach(([frequency, q]) => {
            const formant = context.createBiquadFilter();
            formant.type = "bandpass";
            formant.frequency.value = frequency;
            formant.Q.value = q;
            oscillator.connect(formant);
            formant.connect(gain);
        });
        gain.connect(tape);
        gain.connect(reverb);
        oscillator.start(time);
        oscillator.stop(time + length);
    }

    function playNoise(time, filterType, frequency, length, volume, sendToReverb) {
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = noise;
        filter.type = filterType;
        filter.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(tape);
        if (sendToReverb) {
            gain.connect(reverb);
        }
        source.start(time);
        source.stop(time + length);
    }

    function playStep(step, time) {
        const bar = Math.floor(step / 16);
        const beat = step % 16;
        const [bass, chord] = VAPOR_CHORDS[bar % VAPOR_CHORDS.length];

        if (beat === 0) {
            chord.forEach((midi) => {
                [-8, 8].forEach((cents) => {
                    const note = playNote("sawtooth", midi, time, VAPOR_STEP * 17, 0.022, 0.3, padFilter, false);
                    note.detune.setValueAtTime(cents, time);
                });
            });
        }
        if (VAPOR_PIANO.includes(beat)) {
            chord.forEach((midi) => {
                playNote("sine", midi, time, VAPOR_STEP * 3, 0.05, 0.006, tape, true);
                playNote("sine", midi + 24, time, VAPOR_STEP * 0.8, 0.012, 0.003, tape, true);
            });
        }
        if (VAPOR_BASS.includes(beat)) {
            playNote("triangle", beat === 14 ? bass + 12 : bass, time, VAPOR_STEP * 2.6, 0.24, 0.012, tape, false);
        }
        if (VAPOR_KICK.includes(beat)) {
            const kick = playNote("sine", 45, time, 0.3, 0.42, 0.005, tape, false);
            kick.frequency.setValueAtTime(110, time);
            kick.frequency.exponentialRampToValueAtTime(42, time + 0.1);
        }
        if (VAPOR_SNARE.includes(beat)) {
            playNoise(time, "bandpass", 1500, 0.26, 0.26, true);
        }
        if (beat % 2 === 0) {
            playNoise(time, "highpass", 6000, beat === 14 ? 0.14 : 0.04, 0.035, false);
        }
        VAPOR_MELODY.filter(([start]) => start === step).forEach(([, midi, steps]) => {
            playVoice(midi - 12, time, VAPOR_STEP * steps * 1.15);
        });
    }

    playStep.stop = () => wobble.stop();
    return playStep;
}

const MUSIC_KEY = "citiam-musica";
const musicButton = document.querySelector("#btn-midi");
let musicTimer = null;
let musicBus = null;
let musicPlayStep = null;
let musicNextTime = null;
let musicStep = 0;

function updateMusicButton() {
    if (!musicButton) {
        return;
    }
    const playing = musicTimer !== null && audioContext.state === "running";
    musicButton.textContent = playing ? "DETENER MÚSICA" : musicTimer !== null ? "MÚSICA: HAZ CLIC" : "MÚSICA MIDI";
    musicButton.setAttribute("aria-pressed", String(playing));
}

/* Programa un poco por adelantado, porque el navegador frena los temporizadores
   de las pestañas de fondo. El paso sale del reloj para que el beat no vuelva
   al inicio al cambiar de página. */
function scheduleMusic() {
    if (audioContext.state !== "running") {
        return;
    }
    const now = audioContext.currentTime;
    if (musicNextTime === null || musicNextTime < now) {
        const clock = Date.now() / 1000;
        const nextStep = Math.ceil(clock / VAPOR_STEP);
        musicStep = nextStep % VAPOR_LOOP;
        musicNextTime = now + nextStep * VAPOR_STEP - clock;
    }
    while (musicNextTime < now + 1.2) {
        musicPlayStep(musicStep, musicNextTime);
        musicStep = (musicStep + 1) % VAPOR_LOOP;
        musicNextTime += VAPOR_STEP;
    }
}

function startMusic() {
    if (!getAudioContext()) {
        return false;
    }
    if (musicTimer === null) {
        musicBus = audioContext.createGain();
        musicBus.gain.value = 0.7;
        musicBus.connect(audioContext.destination);
        musicPlayStep = createVaporBeat(audioContext, musicBus);
        musicNextTime = null;
        musicTimer = window.setInterval(scheduleMusic, 250);
    }
    audioContext.resume().then(scheduleMusic);
    updateMusicButton();
    return true;
}

function stopMusic() {
    window.clearInterval(musicTimer);
    musicTimer = null;
    const bus = musicBus;
    const playStep = musicPlayStep;
    bus.gain.setTargetAtTime(0, audioContext.currentTime, 0.08); // las notas ya programadas se apagan
    window.setTimeout(() => {
        playStep.stop();
        bus.disconnect();
    }, 2000); // más que lo que se programa por adelantado
    updateMusicButton();
}

musicButton?.addEventListener("click", () => {
    if (musicTimer !== null && audioContext.state === "running") {
        stopMusic();
        writeStorage(MUSIC_KEY, "no");
        return;
    }
    if (!startMusic()) {
        musicButton.textContent = "SIN SONIDO EN ESTE NAVEGADOR";
        musicButton.disabled = true;
        return;
    }
    writeStorage(MUSIC_KEY, "si");
});

if (readStorage(MUSIC_KEY) === "si" && startMusic()) {
    audioContext.addEventListener("statechange", updateMusicButton);
    /* Enter o espacio sobre un enlace o botón también generan un clic. */
    document.addEventListener("click", () => {
        if (musicTimer !== null) {
            audioContext.resume();
        }
    });
}

document.querySelector("#btn-modem")?.addEventListener("click", () => {
    [440, 620, 480, 880, 700].forEach((frequency, index) => {
        window.setTimeout(() => playTone(frequency, 0.16, "sawtooth", 0.025), index * 170);
    });
});


/* ---------------------------------------------------------------------
   3. Pausar animaciones
   Un GIF no se puede pausar con CSS. Para detenerlo, cambiamos la imagen
   por un <canvas> con un solo cuadro y guardamos la imagen para devolverla
   después. El marquee y el texto parpadeante se detienen con la clase
   "sin-animacion" (ver style.css).

   Empieza en pausa si la persona lo pidió antes, o si su sistema operativo
   indica que prefiere reducir el movimiento.
   --------------------------------------------------------------------- */
const pauseStorageKey = "citiam-animaciones-pausadas";
const pauseButton = document.querySelector("#btn-pausa");
const frozenGifs = new Map(); // imagen original -> canvas que la sustituye
const savedPause = readStorage(pauseStorageKey);
let animationsPaused = savedPause === null
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : savedPause === "si";

function freezeGif(image) {
    if (!animationsPaused || frozenGifs.has(image)) {
        return;
    }
    if (!image.complete || !image.naturalWidth) {
        image.addEventListener("load", () => freezeGif(image), { once: true }); // loading="lazy": aún no llega
        return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.className = image.className;
    canvas.getContext("2d").drawImage(image, 0, 0);
    if (image.alt) {
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", image.alt);
    } else {
        canvas.setAttribute("aria-hidden", "true");
    }
    image.replaceWith(canvas);
    frozenGifs.set(image, canvas);
}

function applyAnimationPause() {
    document.documentElement.classList.toggle("sin-animacion", animationsPaused);
    if (pauseButton) {
        pauseButton.textContent = animationsPaused ? "REANUDAR ANIMACIONES" : "PAUSAR ANIMACIONES";
        pauseButton.setAttribute("aria-pressed", String(animationsPaused));
    }
    if (animationsPaused) {
        document.querySelectorAll('img[src$=".gif"]').forEach(freezeGif);
        return;
    }
    frozenGifs.forEach((canvas, image) => canvas.replaceWith(image));
    frozenGifs.clear();
}

pauseButton?.addEventListener("click", () => {
    animationsPaused = !animationsPaused;
    writeStorage(pauseStorageKey, animationsPaused ? "si" : "no");
    applyAnimationPause();
});


/* ---------------------------------------------------------------------
   4. Pasaporte: los sellos
   Para agregar un reto, añádelo a STAMPS y llama a earnStamp("su-id") en el
   momento en que se logre. Se guardan solo en este navegador.
   --------------------------------------------------------------------- */
const STAMP_KEY = "citiam-pasaporte";
const VISITS_KEY = "citiam-salas-visitadas";
const VISITS_FOR_STAMP = 8;
const STAMPS = [
    { id: "explorador", name: "Trotamundos", hint: `Visita ${VISITS_FOR_STAMP} salas distintas del sitio.`, page: "sitios" },
    { id: "historias", name: "Buena lectura", hint: "Abre todas las adivinanzas de Historias.", page: "historias" },
    { id: "mural", name: "Muralista", hint: "Pinta y descarga tu mural.", page: "artistas", anchor: "mural" },
    { id: "bloques-cuadrado", name: "Primer programa", hint: "Resuelve la misión del cuadrado.", page: "bloques" },
    { id: "bloques-laberinto", name: "Mano derecha", hint: "Resuelve el laberinto con bloques.", page: "bloques" },
    { id: "bloques-seguidor", name: "Seguidor de línea", hint: "Programa al robot para seguir la línea.", page: "bloques" },
    { id: "runner", name: "Corre, robot", hint: "Llega a 500 puntos en Robot Runner.", page: "arcade", anchor: "runner" },
    { id: "buscacactus", name: "Sin espinas", hint: "Gana una partida de Buscacactus.", page: "arcade", anchor: "buscacactus" },
    { id: "hongotchi", name: "Mano verde", hint: "Cosecha a tu Hongotchi.", page: "arcade", anchor: "hongotchi" },
    { id: "expedicion", name: "Rumbo al cráter", hint: "Llega al cráter en la Expedición.", page: "arcade", anchor: "expedicion" },
    { id: "relampago", name: "Relámpago", hint: "Termina las 5 rondas del reto de matemáticas.", page: "arcade", anchor: "math-game" },
    { id: "ruta", name: "Panel solar", hint: "Lleva al robot hasta el panel en el arcade.", page: "arcade", anchor: "robot-game" },
    { id: "desierto", name: "Misión desierto", hint: "Termina las preguntas de ciencia.", page: "arcade", anchor: "desert-quiz" },
    { id: "memorama", name: "Memoria de elefante", hint: "Completa el memorama.", page: "arcade", anchor: "memory-game" },
    { id: "detective", name: "Detective", hint: "Termina Detective de código.", page: "arcade", anchor: "code-game" },
    { id: "mate", name: "Jaque mate", hint: "Resuelve un problema de mate en uno.", page: "ajedrez", anchor: "problemas" },
    { id: "vencer-compu", name: "Le ganaste a la máquina", hint: "Gánale a la computadora en ajedrez.", page: "ajedrez", anchor: "partida" },
    { id: "epidemia", name: "Contra la epidemia", hint: "Corre una epidemia hasta el final.", page: "laboratorio", anchor: "epidemia" },
    { id: "atomos", name: "Arma átomos", hint: "Completa los 5 retos de átomos.", page: "laboratorio", anchor: "atomos" },
    { id: "reaccion", name: "Reflejos", hint: "Termina una serie de tiempo de reacción.", page: "laboratorio", anchor: "reaccion" },
    { id: "secreto", name: "???", hint: "Hay un código secreto. Mira el código fuente del Pasaporte.", page: "pasaporte" }
];
const STAMP_RANKS = [[STAMPS.length, "Leyenda de CiTIAM"], [15, "Jefatura de laboratorio"], [9, "Investigación en marcha"], [4, "Asistente de laboratorio"], [1, "Aprendiz"], [0, "Visitante"]];

/* Las rutas cambian según la carpeta de la página, así que parten de este archivo. */
const siteRoot = new URL("../../", document.currentScript.src);

function pageUrl(page) {
    return new URL(page === "index" ? "index.html" : `pages/${page}.html`, siteRoot).href;
}

function loadStamps() {
    try {
        const saved = JSON.parse(readStorage(STAMP_KEY) ?? "[]");
        return Array.isArray(saved) ? saved.filter((id) => STAMPS.some((stamp) => stamp.id === id)) : [];
    } catch {
        return [];
    }
}

function stampRank(count) {
    return STAMP_RANKS.find(([minimum]) => count >= minimum)[1];
}

function earnStamp(id) {
    const earned = loadStamps();
    const stamp = STAMPS.find((candidate) => candidate.id === id);
    if (!stamp || earned.includes(id)) {
        return;
    }
    earned.push(id);
    writeStorage(STAMP_KEY, JSON.stringify(earned));
    playTone(880, 0.1, "square", 0.03);
    window.setTimeout(() => playTone(1318.5, 0.18, "square", 0.03), 110);
    robotinSay(`¡Sello nuevo: ${stamp.name}! Llevas ${earned.length} de ${STAMPS.length}. Tu rango: ${stampRank(earned.length)}.`);
    window.dispatchEvent(new CustomEvent("stamp-earned"));
}

function recordVisit() {
    const page = location.pathname.split("/").pop().replace(".html", "") || "index";
    let visited = [];
    try {
        visited = JSON.parse(readStorage(VISITS_KEY) ?? "[]");
    } catch {
        visited = [];
    }
    if (!Array.isArray(visited)) {
        visited = [];
    }
    const isFirstVisit = !visited.includes(page);
    if (isFirstVisit) {
        visited.push(page);
        writeStorage(VISITS_KEY, JSON.stringify(visited));
    }
    return { page, isFirstVisit, count: visited.length };
}


/* ---------------------------------------------------------------------
   5. El código secreto y el modo terminal
   El código Konami se escribe con el teclado. No se activa mientras escribes
   en un campo de texto.
   --------------------------------------------------------------------- */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const TERMINAL_KEY = "citiam-modo-terminal";
let konamiProgress = 0;

function setTerminalMode(isOn) {
    document.documentElement.classList.toggle("modo-terminal", isOn);
    writeStorage(TERMINAL_KEY, isOn ? "si" : "no");
}

setTerminalMode(readStorage(TERMINAL_KEY) === "si");

document.addEventListener("keydown", (event) => {
    if (event.target.closest("input, textarea, select")) {
        return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    konamiProgress = key === KONAMI[konamiProgress] ? konamiProgress + 1 : Number(key === KONAMI[0]);
    if (konamiProgress === KONAMI.length) {
        konamiProgress = 0;
        earnStamp("secreto");
        robotinSay("¡¿Cómo supiste?! Ya se abrió la sala secreta en tu Pasaporte.");
    }
});


/* ---------------------------------------------------------------------
   6. Robotín: el ayudante pesado de 1998, como el clip de los procesadores de
   texto de esa época. Pulsarlo saca otro comentario; se puede cerrar.
   Para que diga algo nuevo, agrega una frase a la lista de su página.
   --------------------------------------------------------------------- */
const ROBOTIN_KEY = "citiam-robotin";
const ROBOTIN_LINES = {
    index: ["¡Hola! Soy Robotín. Veo que entraste a una página web. ¿Necesitas ayuda?", "Tip: en el Pasaporte puedes ganar sellos por todo el sitio."],
    acerca: ["Parece que quieres saber qué es CiTIAM. Hay un video arriba, por si te da flojera leer.", "Yo salgo poco en el video. Fue una decisión difícil."],
    proyectos: ["Parece que quieres cultivar un hongo. ¿Necesitas ayuda? Lo primero es NO comerte uno que no conozcas.", "Yo también soy un proyecto. Me falta una tuerca."],
    "casos-de-exito": ["Quién sabe, igual el siguiente caso de éxito es el tuyo.", "A mí todavía no me incuban. Sigo esperando."],
    temas: ["STEAM no es vapor. Bueno, en inglés sí. Pero aquí no.", "¿Sabías que el arte también es ciencia? Yo tampoco, hasta que leí esta página."],
    historias: ["Antes de leer cada historia, intenta adivinar. Yo siempre fallo.", "Prueba a golpear la roca del Cerro de la Campana. No te duele, soy de metal."],
    artistas: ["¿Ya pintaste tu mural? Yo solo sé dibujar cuadros. Literal.", "Te doy un tip de arte: primero el cielo, luego lo demás."],
    laboratorio: ["Aquí puedes lanzar planetas sin permiso de la NASA.", "¿Ya frenaste una epidemia hoy? Yo tampoco."],
    programacion: ["Si un botón no funciona, revisa el id. Si sigue sin funcionar, revísalo otra vez.", "Te cuento un secreto: los programadores también buscan todo en internet."],
    bloques: ["Yo soy primo del robot del escenario. No nos hablamos desde lo del laberinto.", "Si chocas, usa PASO A PASO. A mí me ayudó mucho."],
    arcade: ["Mi primo sale en Robot Runner. Dice que los cactus no se quitan solos.", "Cuida a tu Hongotchi, o le saldrá moho. A mí me pasó.", "Aviso: Buscacactus pica. Literal."],
    ajedrez: ["Consejo de experto: no pierdas a la dama. Yo perdí la mía en 1998.", "¿Le ganaste a la computadora? Tengo un sello para ti."],
    pasaporte: ["Te falta un sello con nombre raro... Mira el código fuente de esta página.", "Ahí nomás, los sellos no se pueden revender."],
    sitios: ["Antes de hacer clic: nunca des tus datos personales. Ni a mí.", "Aquí está lo mejor de internet. Según yo, que vivo en 1998."],
    galeria: ["Esas fotos no son mías. Yo salgo mejor en GIF.", "Haz clic en una miniatura para agrandarla. ¡Tecnología de punta!"],
    guia: ["Parece que estás leyendo el manual. Nadie lee el manual. Te respeto.", "Si quieres cambiar algo, copia antes la carpeta. Hazme caso."]
};
const ROBOTIN_JOKES = [
    "¿Qué le dijo un electrón a otro? Nos vemos en la siguiente órbita.",
    "Me dijeron que tengo muchos bugs. Son mis mascotas.",
    "El módem de 1998 hacía ese ruido porque le daba gusto verte.",
    "¿Por qué el libro de matemáticas estaba triste? Tenía muchos problemas.",
    "Hay 10 tipos de personas: las que entienden binario y las que no."
];
let robotinBubble = null;
let robotinHideTimer = 0;
let robotinIndex = 0;

function robotinSay(message) {
    if (!robotinBubble) {
        return;
    }
    robotinBubble.textContent = message;
    robotinBubble.hidden = false;
    window.clearTimeout(robotinHideTimer);
    robotinHideTimer = window.setTimeout(() => {
        robotinBubble.hidden = true;
    }, 9000);
}

function buildRobotin(page, showGreeting) {
    const lines = [...(ROBOTIN_LINES[page] ?? []), ...ROBOTIN_JOKES];
    const box = document.createElement("div");
    box.className = "robotin";
    robotinBubble = document.createElement("p");
    robotinBubble.className = "robotin-bubble";
    robotinBubble.setAttribute("role", "status");
    robotinBubble.hidden = true;

    const body = document.createElement("button");
    body.type = "button";
    body.className = "robotin-body";
    body.setAttribute("aria-label", "Robotín: dime otra cosa");
    const sprite = document.createElement("img");
    sprite.src = new URL("assets/gifs/robot-mini.gif", siteRoot).href;
    sprite.alt = "";
    sprite.width = 48;
    sprite.height = 48;
    body.append(sprite);
    body.addEventListener("click", () => {
        robotinSay(lines[robotinIndex % lines.length]);
        robotinIndex += 1;
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "robotin-close";
    close.textContent = "x";
    close.setAttribute("aria-label", "Cerrar a Robotín");
    close.addEventListener("click", () => setRobotinVisible(false));

    box.append(robotinBubble, close, body);
    document.body.append(box);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "retro-button";
    toggle.textContent = "ROBOTÍN";
    toggle.addEventListener("click", () => setRobotinVisible(box.hidden));
    document.querySelector(".toolbar")?.append(toggle);

    function setRobotinVisible(isVisible) {
        box.hidden = !isVisible;
        toggle.setAttribute("aria-pressed", String(isVisible));
        writeStorage(ROBOTIN_KEY, isVisible ? "si" : "no");
    }

    box.hidden = readStorage(ROBOTIN_KEY) === "no";
    toggle.setAttribute("aria-pressed", String(!box.hidden));
    if (showGreeting && !box.hidden) {
        robotinIndex = 1;
        window.setTimeout(() => robotinSay(lines[0]), 1200);
    }
}

const visit = recordVisit();
buildRobotin(visit.page, visit.isFirstVisit);
if (visit.count >= VISITS_FOR_STAMP) {
    earnStamp("explorador");
}

applyAnimationPause();
