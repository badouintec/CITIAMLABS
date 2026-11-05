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
     escritorio.js    en todas las páginas (Panel de Control, skins y juguetes)
     home.js          solo en index.html (Hoy en CiTIAM, ideas, contador, libro de visitas, atardecer)
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

/* El beat: composición original al estilo vaporwave. Suena como un disco de
   los 80 tocado lento y editado con tijeras: VAPOR_ARRANGEMENT salta hacia atrás
   y repite pedazos, con cortes secos. Cada compás tiene 16 pasos. Las notas
   usan números MIDI (60 es do central). */
const VAPOR_STEP = 60 / 62 / 4; // segundos por paso, a 62 pulsos por minuto
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
const VAPOR_ARRANGEMENT = [ // desde qué paso toca y cuántos pasos, en orden
    [0, 32], [16, 16], [24, 4], [24, 4], [24, 4], [28, 4],
    [32, 32], [48, 8], [52, 4], [52, 4],
    [64, 32], [64, 32], [96, 16], [104, 8], [104, 4], [104, 4],
    [112, 16], [120, 4], [120, 4], [120, 8]
];
const VAPOR_TIMELINE = VAPOR_ARRANGEMENT.flatMap(([from, steps]) => Array.from({ length: steps }, (_, i) => from + i));
const VAPOR_LOOP = VAPOR_TIMELINE.length; // pasos antes de repetir
const VAPOR_PIANO = [0, 3, 6, 10]; // golpes del piano eléctrico dentro del compás
const VAPOR_KICK = [0, 10];
const VAPOR_SNARE = [4, 12];
const VAPOR_BASS = [0, 3, 6, 8, 11, 14];
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
    tape.frequency.value = 2600;
    tape.connect(output);

    const reverb = context.createConvolver();
    reverb.buffer = makeNoise(3.6, (position) => (1 - position) ** 3);
    const wet = context.createGain();
    wet.gain.value = 0.5;
    reverb.connect(wet);
    wet.connect(tape);
    const noise = makeNoise(1, () => 1);

    /* Tres controles de afinación: el temblor de la cinta, el vibrato de la voz
       y la caída de cada corte. */
    const makeWobble = (frequency, depth) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.value = depth;
        oscillator.connect(gain);
        oscillator.start();
        return { oscillator, gain };
    };
    const flutter = makeWobble(0.4, 20);
    const vibrato = makeWobble(3.4, 24);
    const drag = context.createConstantSource();
    drag.offset.value = 0;
    drag.start();

    const hiss = context.createBufferSource();
    const hissFilter = context.createBiquadFilter();
    const hissGain = context.createGain();
    hiss.buffer = noise;
    hiss.loop = true;
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 3200;
    hissGain.gain.value = 0.012;
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(output);
    hiss.start();

    /* Un corte manda a silencio el tramo anterior, salvo su reverb. */
    let section = null;
    let padFilter = null;
    let previousVoice = null;

    function startSection(time) {
        section?.gain.setValueAtTime(0, time);
        section = context.createGain();
        section.gain.setValueAtTime(0, 0);
        section.gain.setValueAtTime(1, time);
        section.connect(tape);
        padFilter = context.createBiquadFilter();
        padFilter.type = "lowpass";
        padFilter.frequency.value = 850;
        padFilter.connect(section);
        padFilter.connect(reverb);
        drag.offset.setValueAtTime(-55, time);
        drag.offset.linearRampToValueAtTime(0, time + 0.4);
    }

    function envelope(time, length, volume, attack) {
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(volume, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        return gain;
    }

    function connectPitch(oscillator) {
        flutter.gain.connect(oscillator.detune);
        drag.connect(oscillator.detune);
    }

    function playNote(type, midi, time, length, volume, attack, destination, sendToReverb) {
        const oscillator = context.createOscillator();
        const gain = envelope(time, length, volume, attack);
        oscillator.type = type;
        oscillator.frequency.value = midiToHz(midi);
        connectPitch(oscillator);
        oscillator.connect(gain);
        gain.connect(destination);
        if (sendToReverb) {
            gain.connect(reverb);
        }
        oscillator.start(time);
        oscillator.stop(time + length);
        return oscillator;
    }

    /* Bajo ochentero: el filtro se cierra rápido, como una cuerda pellizcada. */
    function playBass(midi, time, length) {
        const oscillator = context.createOscillator();
        const filter = context.createBiquadFilter();
        const gain = envelope(time, length, 0.3, 0.006);
        oscillator.type = "sawtooth";
        oscillator.frequency.value = midiToHz(midi);
        connectPitch(oscillator);
        filter.type = "lowpass";
        filter.Q.value = 7;
        filter.frequency.setValueAtTime(1300, time);
        filter.frequency.exponentialRampToValueAtTime(190, time + 0.16);
        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(section);
        oscillator.start(time);
        oscillator.stop(time + length);
    }

    /* Voz grave: dos filtros forman una vocal que se abre poco a poco, y cada
       nota llega resbalando desde la anterior. */
    function playVoice(midi, time, length) {
        const target = midiToHz(midi);
        const oscillator = context.createOscillator();
        const gain = envelope(time, length, 1.5, 0.05);
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(previousVoice ?? target * 0.93, time);
        oscillator.frequency.exponentialRampToValueAtTime(target, time + 0.16);
        previousVoice = target;
        connectPitch(oscillator);
        vibrato.gain.connect(oscillator.detune);
        [[600, 7], [1020, 9]].forEach(([frequency, q]) => {
            const formant = context.createBiquadFilter();
            formant.type = "bandpass";
            formant.Q.value = q;
            formant.frequency.setValueAtTime(frequency, time);
            formant.frequency.linearRampToValueAtTime(frequency * 1.14, time + length);
            oscillator.connect(formant);
            formant.connect(gain);
        });
        gain.connect(section);
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
        gain.connect(section);
        if (sendToReverb) {
            gain.connect(reverb);
        }
        source.start(time);
        source.stop(time + length);
    }

    function playStep(index, time) {
        const step = VAPOR_TIMELINE[index];
        const previous = VAPOR_TIMELINE[(index + VAPOR_LOOP - 1) % VAPOR_LOOP];
        const isCut = section === null || step !== previous + 1;
        const beat = step % 16;
        const [bass, chord] = VAPOR_CHORDS[Math.floor(step / 16) % VAPOR_CHORDS.length];

        if (isCut) {
            startSection(time);
        }
        if (beat === 0 || isCut) {
            chord.forEach((midi) => {
                [-8, 8].forEach((cents) => {
                    const note = playNote("sawtooth", midi, time, VAPOR_STEP * 17, 0.022, 0.08, padFilter, false);
                    note.detune.setValueAtTime(cents, time);
                });
            });
        }
        if (VAPOR_PIANO.includes(beat)) {
            chord.forEach((midi) => {
                playNote("sine", midi, time, VAPOR_STEP * 3, 0.05, 0.006, section, true);
                playNote("sine", midi + 24, time, VAPOR_STEP * 0.8, 0.012, 0.003, section, true);
            });
        }
        if (VAPOR_BASS.includes(beat)) {
            playBass(beat === 6 || beat === 14 ? bass + 12 : bass, time, VAPOR_STEP * 2);
        }
        if (VAPOR_KICK.includes(beat)) {
            const kick = playNote("sine", 45, time, 0.28, 0.3, 0.005, section, false);
            kick.frequency.setValueAtTime(100, time);
            kick.frequency.exponentialRampToValueAtTime(42, time + 0.1);
        }
        if (VAPOR_SNARE.includes(beat)) {
            playNoise(time, "bandpass", 1300, 0.2, 0.2, true);
        }
        if (beat % 2 === 0) {
            playNoise(time, "highpass", 5000, 0.04, 0.02, false);
        }
        VAPOR_MELODY.filter(([start]) => start === step).forEach(([, midi, steps]) => {
            playVoice(midi - 12, time, VAPOR_STEP * steps * 1.15);
        });
    }

    playStep.stop = () => {
        flutter.oscillator.stop();
        vibrato.oscillator.stop();
        drag.stop();
        hiss.stop();
    };
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

/* La llamada de un módem de 56k, en orden: tono de marcado, número, timbre,
   pitido de respuesta, "bidibidi", "bong-bong" y estático. Al conectar, el
   módem apagaba su bocina: por eso el sonido se corta de golpe. Devuelve cuántos
   segundos dura. */
function createModemSound(context, output) {
    const lowCut = context.createBiquadFilter();
    const highCut = context.createBiquadFilter();
    lowCut.type = "highpass";
    lowCut.frequency.value = 300; // lo que deja pasar una línea de teléfono
    highCut.type = "lowpass";
    highCut.frequency.value = 3400;
    lowCut.connect(highCut);
    highCut.connect(output);

    function envelope(start, length, volume) {
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.004);
        gain.gain.setValueAtTime(volume, start + length - 0.004);
        gain.gain.linearRampToValueAtTime(0, start + length);
        gain.connect(lowCut);
        return gain;
    }

    function tone(frequencies, start, length, volume) {
        const gain = envelope(start, length, volume);
        frequencies.forEach((frequency) => {
            const oscillator = context.createOscillator();
            oscillator.frequency.value = frequency;
            oscillator.connect(gain);
            oscillator.start(start);
            oscillator.stop(start + length);
        });
        return gain;
    }

    /* Datos a 300 bits por segundo: cada bit elige una de dos frecuencias. */
    let seed = 1998;
    function dataTone(low, high, start, length, volume) {
        const oscillator = context.createOscillator();
        for (let bit = 0; bit * (1 / 300) < length; bit += 1) {
            seed = (seed * 75 + 74) % 65537;
            oscillator.frequency.setValueAtTime(seed % 2 ? high : low, start + bit / 300);
        }
        oscillator.connect(envelope(start, length, volume));
        oscillator.start(start);
        oscillator.stop(start + length);
    }

    const noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    noiseBuffer.getChannelData(0).forEach((_, i, data) => {
        data[i] = Math.random() * 2 - 1;
    });
    function noise(start, length, volume) {
        const source = context.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;
        source.connect(envelope(start, length, volume));
        source.start(start);
        source.stop(start + length);
    }

    const DIGITS = { 1: [697, 1209], 5: [770, 1336], 8: [852, 1336], 9: [852, 1477] };
    let time = context.currentTime + 0.05;
    const add = (seconds) => {
        const start = time;
        time += seconds;
        return start;
    };

    tone([350, 440], add(1.1), 1.1, 0.07); // tono de marcado
    add(0.15);
    [5, 5, 5, 1, 9, 9, 8].forEach((digit) => { // 555-1998, un número ficticio
        tone(DIGITS[digit], add(0.09), 0.09, 0.09);
        add(0.07);
    });
    add(0.5);
    tone([440, 480], add(1.2), 1.2, 0.06); // timbre
    add(0.45);

    const answerStart = add(2.4); // pitido de respuesta, con su temblor y chasquidos
    const answer = tone([2100], answerStart, 2.4, 0.1);
    const shake = context.createOscillator();
    const shakeDepth = context.createGain();
    shake.frequency.value = 15;
    shakeDepth.gain.value = 0.02;
    shake.connect(shakeDepth);
    shakeDepth.connect(answer.gain);
    shake.start(answerStart);
    shake.stop(answerStart + 2.4);
    for (let click = 0.45; click < 2.3; click += 0.45) {
        answer.gain.setValueAtTime(0, answerStart + click);
        answer.gain.setValueAtTime(0.1, answerStart + click + 0.006);
    }

    const dataStart = add(1.3); // "bidibidi": los dos módems se presentan
    dataTone(980, 1180, dataStart, 1.3, 0.07);
    dataTone(1650, 1850, dataStart, 1.3, 0.07);
    add(0.2);

    tone([1200], add(0.5), 0.5, 0.11); // "bong-bong"
    tone([2400], add(0.5), 0.5, 0.08);
    add(0.1);
    const probe = Array.from({ length: 12 }, (_, i) => 300 + i * 270); // prueban la línea
    tone(probe, add(0.75), 0.75, 0.018);
    add(0.1);

    noise(add(0.6), 0.6, 0.1); // estático: ya están enviando datos de prueba
    add(0.35);
    noise(add(3.2), 3.2, 0.17);
    return time - context.currentTime;
}

const modemButton = document.querySelector("#btn-modem");
let modemBus = null;
let modemTimer = null;

function hangUpModem() {
    window.clearTimeout(modemTimer);
    const bus = modemBus;
    modemBus = null;
    bus.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
    window.setTimeout(() => bus.disconnect(), 200);
    modemButton.textContent = "SONIDO DE MÓDEM";
    modemButton.setAttribute("aria-pressed", "false");
}

modemButton?.addEventListener("click", () => {
    if (modemBus) {
        hangUpModem();
        return;
    }
    if (!getAudioContext()) {
        modemButton.textContent = "SIN SONIDO EN ESTE NAVEGADOR";
        modemButton.disabled = true;
        return;
    }
    audioContext.resume();
    modemBus = audioContext.createGain();
    modemBus.connect(audioContext.destination);
    const seconds = createModemSound(audioContext, modemBus);
    modemTimer = window.setTimeout(hangUpModem, seconds * 1000);
    modemButton.textContent = "COLGAR EL MÓDEM";
    modemButton.setAttribute("aria-pressed", "true");
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
    { id: "no-caigo", name: "No caigo", hint: "Descubre la trampa del pop-up que sale en la portada.", page: "index" },
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
