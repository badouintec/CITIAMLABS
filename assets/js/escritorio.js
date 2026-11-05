"use strict";

/* =====================================================================
   escritorio.js: juguetes de computadora vieja en TODAS las páginas.
   Se carga DESPUÉS de script.js porque usa sus funciones y variables.

     1. Ventanas que se arrastran
     2. Skins, como los de Winamp
     3. Tarjetas enrollables, como el WindowShade del Mac
     4. Estela del cursor
     5. Protector de pantalla
     6. Pop-up de "¡GANASTE!": un simulacro para aprender a desconfiar
     7. Panel de Control con la Radio CiTIAM FM
     8. Menú plegable en teléfonos

   Todo lo que guarda se queda en este navegador. Nada viaja a internet.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Ventanas que se arrastran
   No bloquean la página, así que no atrapan el foco. Esc cierra la última.
   --------------------------------------------------------------------- */
const openWindows = [];
let windowCount = 0;
let topLayer = 20;

function createWindow(titleText, className = "") {
    windowCount += 1;
    const element = document.createElement("section");
    const bar = document.createElement("div");
    const closeBox = document.createElement("button");
    const title = document.createElement("h2");
    const body = document.createElement("div");
    let opener = null;

    element.className = `desk-window ${className}`;
    element.hidden = true;
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-labelledby", `desk-title-${windowCount}`);
    bar.className = "desk-titlebar";
    closeBox.className = "desk-close";
    closeBox.type = "button";
    closeBox.setAttribute("aria-label", `Cerrar ${titleText}`);
    title.id = `desk-title-${windowCount}`;
    title.textContent = titleText;
    body.className = "desk-body";
    bar.append(closeBox, title);
    element.append(bar, body);
    document.body.append(element);

    const raise = () => {
        topLayer += 1;
        element.style.zIndex = topLayer;
    };
    const place = (left, top) => {
        element.style.left = `${Math.max(0, Math.min(left, window.innerWidth - element.offsetWidth))}px`;
        element.style.top = `${Math.max(0, Math.min(top, window.innerHeight - bar.offsetHeight))}px`;
    };
    const api = {
        element,
        body,
        onClose: null,
        isOpen: () => !element.hidden,
        open(moveFocus = true) {
            element.hidden = false;
            raise();
            place((window.innerWidth - element.offsetWidth) / 2, Math.max(10, (window.innerHeight - element.offsetHeight) / 3));
            openWindows.push(api);
            if (moveFocus) {
                opener = document.activeElement;
                closeBox.focus();
            }
        },
        close() {
            element.hidden = true;
            openWindows.splice(openWindows.indexOf(api), 1);
            api.onClose?.();
            opener?.focus();
            opener = null;
        }
    };

    closeBox.addEventListener("click", () => api.close());
    element.addEventListener("pointerdown", raise);
    bar.addEventListener("pointerdown", (event) => {
        if (event.target === closeBox) {
            return;
        }
        const offsetX = event.clientX - element.offsetLeft;
        const offsetY = event.clientY - element.offsetTop;
        const move = (moveEvent) => place(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
        bar.setPointerCapture(event.pointerId);
        bar.addEventListener("pointermove", move);
        bar.addEventListener("pointerup", () => bar.removeEventListener("pointermove", move), { once: true });
    });
    return api;
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openWindows.length) {
        openWindows.at(-1).close();
    }
});


/* ---------------------------------------------------------------------
   2. Skins
   Solo cambian colores y fondos: la clase data-skin está en <html> y las
   reglas en la sección 21 de style.css. Para agregar uno, escribe otra línea
   aquí y sus reglas allá. El japonés siempre lleva su traducción.
   --------------------------------------------------------------------- */
const SKIN_KEY = "citiam-skin";
const SKINS = [
    { id: "clasico", name: "Clásico 98", word: "" },
    { id: "atardecer", name: "Atardecer", word: "夕焼け · atardecer" },
    { id: "mac", name: "Mac Plus", word: "計算機 · computadora" },
    { id: "aero", name: "Aero", word: "空 · cielo" },
    { id: "neon", name: "Neón", word: "夜の街 · ciudad de noche" }
];
const skinWord = document.createElement("p");
skinWord.className = "skin-word";
skinWord.setAttribute("aria-hidden", "true");
document.querySelector(".masthead")?.append(skinWord);

function applySkin(id) {
    const skin = SKINS.find((candidate) => candidate.id === id) ?? SKINS[0];
    if (skin.id === "clasico") {
        document.documentElement.removeAttribute("data-skin");
    } else {
        document.documentElement.dataset.skin = skin.id;
    }
    skinWord.textContent = skin.word;
    return skin.id;
}

let currentSkin = applySkin(readStorage(SKIN_KEY));


/* ---------------------------------------------------------------------
   3. Tarjetas enrollables
   --------------------------------------------------------------------- */
const shadeButtons = [];

function setShaded(card, button, isShaded) {
    card.classList.toggle("is-shaded", isShaded);
    button.textContent = isShaded ? "+" : "–";
    button.setAttribute("aria-expanded", String(!isShaded));
}

document.querySelectorAll(".article-card > h2").forEach((heading) => {
    const card = heading.parentElement;
    const button = document.createElement("button");
    button.className = "shade-box";
    button.type = "button";
    button.setAttribute("aria-label", `Enrollar o desenrollar: ${heading.textContent.trim()}`);
    setShaded(card, button, false);
    button.addEventListener("click", () => setShaded(card, button, !card.classList.contains("is-shaded")));
    card.prepend(button); // fuera del título, para no ensuciar el nombre de la sección
    shadeButtons.push({ card, button });
});

function shadeAll(isShaded) {
    shadeButtons.forEach(({ card, button }) => setShaded(card, button, isShaded));
}


/* ---------------------------------------------------------------------
   4. Estela del cursor
   Doce estrellas que se reciclan. Solo con mouse y nunca con animaciones
   en pausa.
   --------------------------------------------------------------------- */
const TRAIL_KEY = "citiam-estela";
const TRAIL_SIZE = 12;
let trailStars = [];
let trailIndex = 0;
let trailLast = 0;

function moveTrail(event) {
    if (event.pointerType !== "mouse" || animationsPaused || event.timeStamp - trailLast < 45) {
        return;
    }
    trailLast = event.timeStamp;
    const star = trailStars[trailIndex];
    trailIndex = (trailIndex + 1) % TRAIL_SIZE;
    star.style.left = `${event.clientX + 6}px`;
    star.style.top = `${event.clientY + 6}px`;
    star.animate(
        [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(16px)" }],
        { duration: 600, easing: "steps(4)", fill: "forwards" }
    );
}

function setTrail(isOn) {
    trailStars.forEach((star) => star.remove());
    trailStars = [];
    window.removeEventListener("pointermove", moveTrail);
    if (isOn) {
        trailStars = Array.from({ length: TRAIL_SIZE }, () => {
            const star = document.createElement("span");
            star.className = "trail-star";
            star.style.backgroundImage = `url("${new URL("assets/gifs/estrella.gif", siteRoot).href}")`;
            document.body.append(star);
            return star;
        });
        window.addEventListener("pointermove", moveTrail, { passive: true });
    }
}

setTrail(readStorage(TRAIL_KEY) === "si");


/* ---------------------------------------------------------------------
   5. Protector de pantalla
   Viene apagado: un protector que salta mientras alguien lee estorba.
   Cualquier movimiento o tecla lo quita.
   --------------------------------------------------------------------- */
const SAVER_KEY = "citiam-protector";
const SAVER_IDLE_MS = 180000;
const SAVER_SPRITES = ["robot-mini", "hongo-mini", "cactus-mini", "sol-mini", "roca-mini"];
let saverOn = readStorage(SAVER_KEY) === "si";
let saverRunning = false;
let lastActivity = Date.now();

function startScreensaver() {
    if (saverRunning) {
        return;
    }
    saverRunning = true;
    const canvas = document.createElement("canvas");
    const scale = 3;
    canvas.className = "saver-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = Math.ceil(window.innerWidth / scale);
    canvas.height = Math.ceil(window.innerHeight / scale);
    document.body.append(canvas);
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    const total = canvas.width + canvas.height;
    const images = SAVER_SPRITES.map((name) => {
        const image = new Image();
        image.src = new URL(`assets/gifs/${name}.gif`, siteRoot).href;
        return image;
    });
    const flyers = Array.from({ length: 14 }, (_, i) => ({
        image: images[i % images.length],
        position: (i / 14) * total + Math.random() * 30,
        lane: Math.random() * total,
        speed: 0.5 + Math.random() * 0.9
    }));
    const stars = Array.from({ length: 70 }, () => [Math.random() * canvas.width, Math.random() * canvas.height]);
    const logo = { x: 20, y: 20, dx: 0.6, dy: 0.45 };
    let frame = 0;

    function draw() {
        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        stars.forEach(([x, y]) => context.fillRect(Math.floor(x), Math.floor(y), 1, 1));
        flyers.forEach((flyer) => {
            /* Vuelan en diagonal, como las tostadoras de After Dark. */
            if (!animationsPaused) {
                flyer.position = (flyer.position + flyer.speed) % total;
            }
            const x = flyer.lane - flyer.position;
            const y = flyer.position - flyer.lane * 0.3;
            if (flyer.image.complete && flyer.image.naturalWidth) {
                const wrapped = ((x % total) + total) % total - 24;
                context.drawImage(flyer.image, Math.floor(wrapped), Math.floor(((y % total) + total) % total - 24), 24, 24);
            }
        });
        if (!animationsPaused) {
            logo.x += logo.dx;
            logo.y += logo.dy;
            if (logo.x < 0 || logo.x > canvas.width - 66) {
                logo.dx *= -1;
            }
            if (logo.y < 10 || logo.y > canvas.height - 4) {
                logo.dy *= -1;
            }
        }
        context.font = "bold 12px 'Courier New', monospace";
        context.fillStyle = ["#ff71ce", "#01cdfe", "#fffb96", "#05ffa1"][Math.floor(frame / 40) % 4];
        context.fillText("CiTIAM OS", Math.floor(logo.x), Math.floor(logo.y));
        frame += 1;
        if (saverRunning) {
            window.requestAnimationFrame(draw);
        }
    }

    let startX = null;
    let startY = null;
    const wake = (event) => {
        if (event.type === "pointermove") {
            startX ??= event.clientX;
            startY ??= event.clientY;
            if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) < 8) {
                return;
            }
        }
        event.stopPropagation();
        saverRunning = false;
        lastActivity = Date.now();
        canvas.remove();
        ["pointermove", "pointerdown", "keydown"].forEach((type) => window.removeEventListener(type, wake, true));
    };
    ["pointermove", "pointerdown", "keydown"].forEach((type) => window.addEventListener(type, wake, true));
    draw();
}

["pointermove", "pointerdown", "keydown", "scroll"].forEach((type) => {
    window.addEventListener(type, () => {
        lastActivity = Date.now();
    }, { passive: true });
});

window.setInterval(() => {
    if (saverOn && !animationsPaused && !document.hidden && Date.now() - lastActivity > SAVER_IDLE_MS) {
        startScreensaver();
    }
}, 5000);


/* ---------------------------------------------------------------------
   6. Pop-up de "¡GANASTE!"
   Copia las trampas de los anuncios de los 90 para enseñar a reconocerlas.
   Es un simulacro: no pide datos ni envía nada. Sale solo una vez, en la
   portada, y no le quita el foco a nadie. Quien lo cierra o cae, gana el sello.
   --------------------------------------------------------------------- */
const POPUP_KEY = "citiam-popup-visto";
const POPUP_DELAY_MS = 25000;
let scamWindow = null;

function showScam(moveFocus) {
    if (scamWindow?.isOpen()) {
        return;
    }
    scamWindow ??= createWindow("¡¡¡FELICIDADES!!!", "scam-window");
    const { body } = scamWindow;
    let seconds = 10;
    let timer = 0;

    function explain(headline) {
        window.clearInterval(timer);
        body.replaceChildren();
        const title = document.createElement("p");
        const list = document.createElement("ul");
        const note = document.createElement("p");
        title.className = "scam-result";
        title.textContent = headline;
        ["Un premio que nunca pediste.", "Prisa falsa: la cuenta regresiva es para que no pienses.", "Te pide hacer clic antes de decirte quién lo manda."].forEach((text) => {
            const item = document.createElement("li");
            item.textContent = text;
            list.append(item);
        });
        note.className = "tiny";
        note.textContent = "Fue un simulacro: no se envió nada. Si ves algo así de verdad, cierra la página y pregúntale a una persona adulta.";
        body.append(title, list, note);
        writeStorage(POPUP_KEY, "si");
        earnStamp("no-caigo");
    }

    const prize = document.createElement("p");
    const countdown = document.createElement("p");
    const claim = document.createElement("button");
    const refuse = document.createElement("button");
    prize.className = "scam-prize";
    prize.innerHTML = '¡ERES EL VISITANTE <span class="blink">1,000,000</span>!<br>Ganaste una COMPUTADORA PENTIUM II con MODEM de 56K';
    countdown.setAttribute("aria-live", "off");
    claim.className = "retro-button";
    claim.type = "button";
    claim.textContent = "¡¡RECLAMAR MI PREMIO!!";
    refuse.className = "retro-button";
    refuse.type = "button";
    refuse.textContent = "No, gracias";
    const tick = () => {
        countdown.textContent = `La oferta termina en ${seconds} segundos`;
        if (seconds === 0) {
            explain("¡Se acabó el tiempo! Y no pasó nada. Esa prisa era la trampa.");
        }
        seconds -= 1;
    };
    claim.addEventListener("click", () => explain("¡Caíste! No hay ninguna computadora. Fíjate en las señales:"));
    refuse.addEventListener("click", () => explain("¡Bien hecho, no caíste! Estas son las señales de la trampa:"));
    body.replaceChildren(prize, countdown, claim, refuse);
    scamWindow.onClose = () => {
        window.clearInterval(timer);
        writeStorage(POPUP_KEY, "si");
    };
    tick();
    timer = window.setInterval(tick, 1000);
    scamWindow.open(moveFocus);
}

if (document.querySelector("#hoy") && readStorage(POPUP_KEY) !== "si") {
    window.setTimeout(() => {
        if (!saverRunning && !document.hidden) {
            showScam(false);
        }
    }, POPUP_DELAY_MS);
}


/* ---------------------------------------------------------------------
   7. Panel de Control con la Radio CiTIAM FM
   La radio solo aprieta el botón de MÚSICA MIDI de script.js y mira el sonido
   con un analizador. Dibuja nada más mientras el panel está abierto.
   --------------------------------------------------------------------- */
const toolbar = document.querySelector(".toolbar");
const panelButton = document.createElement("button");
panelButton.className = "retro-button";
panelButton.id = "btn-panel";
panelButton.type = "button";
panelButton.textContent = "PANEL DE CONTROL";
toolbar?.append(panelButton);

const RADIO_TEXT = "ＣｉＴＩＡＭ ＦＭ ９８．７ ◆ 現代の実験室 (el laboratorio moderno) ◆ desde Hermosillo, Sonora ◆ ";
let panelWindow = null;

function buildPanel() {
    panelWindow = createWindow("Panel de Control", "panel-window");
    panelWindow.body.innerHTML = `
        <fieldset>
            <legend>Radio CiTIAM FM</legend>
            <div class="radio-face">
                <canvas class="radio-bars" width="96" height="28" aria-hidden="true"></canvas>
                <p class="radio-text" aria-hidden="true"></p>
            </div>
            <button class="retro-button" data-part="radio" type="button"></button>
        </fieldset>
        <fieldset data-part="skins">
            <legend>Skin</legend>
        </fieldset>
        <fieldset>
            <legend>Efectos</legend>
            <label><input type="checkbox" data-part="trail"> Estela del cursor</label>
            <label><input type="checkbox" data-part="saver"> Protector de pantalla (a los 3 minutos)</label>
            <button class="retro-button" data-part="saver-test" type="button">PROBAR PROTECTOR</button>
            <button class="retro-button" data-part="scam" type="button">VER EL POP-UP</button>
        </fieldset>
        <fieldset>
            <legend>Esta página</legend>
            <button class="retro-button" data-part="shade" type="button">ENROLLAR TARJETAS</button>
            <button class="retro-button" data-part="unshade" type="button">DESENROLLAR</button>
        </fieldset>`;
    const part = (name) => panelWindow.body.querySelector(`[data-part="${name}"]`);

    const skinsBox = part("skins");
    SKINS.forEach((skin) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "desk-skin";
        input.value = skin.id;
        input.checked = skin.id === currentSkin;
        input.addEventListener("change", () => {
            currentSkin = applySkin(skin.id);
            writeStorage(SKIN_KEY, skin.id);
        });
        label.append(input, ` ${skin.name}`);
        skinsBox.append(label);
    });

    const trail = part("trail");
    trail.checked = readStorage(TRAIL_KEY) === "si";
    trail.addEventListener("change", () => {
        setTrail(trail.checked);
        writeStorage(TRAIL_KEY, trail.checked ? "si" : "no");
    });
    const saver = part("saver");
    saver.checked = saverOn;
    saver.addEventListener("change", () => {
        saverOn = saver.checked;
        writeStorage(SAVER_KEY, saverOn ? "si" : "no");
    });
    part("saver-test").addEventListener("click", startScreensaver);
    part("scam").addEventListener("click", () => showScam(true));
    part("shade").addEventListener("click", () => shadeAll(true));
    part("unshade").addEventListener("click", () => shadeAll(false));

    /* La radio. */
    const midiButton = document.querySelector("#btn-midi");
    const radioButton = part("radio");
    const bars = panelWindow.body.querySelector(".radio-bars");
    const barsContext = bars.getContext("2d");
    const radioText = panelWindow.body.querySelector(".radio-text");
    let analyser = null;
    let tappedBus = null;
    let levels = null;
    let textOffset = 0;
    let frame = 0;

    radioButton.addEventListener("click", () => midiButton?.click());

    function drawRadio() {
        if (!panelWindow.isOpen()) {
            return;
        }
        const playing = musicTimer !== null && audioContext?.state === "running";
        radioButton.textContent = playing ? "■ APAGAR" : "▶ ENCENDER";
        barsContext.fillStyle = "#000000";
        barsContext.fillRect(0, 0, bars.width, bars.height);
        if (playing && musicBus !== tappedBus) {
            analyser ??= audioContext.createAnalyser();
            analyser.fftSize = 128;
            levels ??= new Uint8Array(analyser.frequencyBinCount);
            musicBus.connect(analyser);
            tappedBus = musicBus;
        }
        for (let i = 0; i < 16; i += 1) {
            let height = 1;
            if (playing && analyser && !animationsPaused) {
                analyser.getByteFrequencyData(levels);
                height = Math.max(1, Math.round((levels[i + 1] / 255) * bars.height));
            }
            for (let y = 0; y < height; y += 2) { // barras por escalones, como Winamp
                barsContext.fillStyle = y > 20 ? "#ff3030" : y > 12 ? "#ffff00" : "#00ff00";
                barsContext.fillRect(i * 6, bars.height - 1 - y, 5, 1);
            }
        }
        frame += 1;
        if (!animationsPaused && frame % 12 === 0) {
            textOffset = (textOffset + 1) % RADIO_TEXT.length;
        }
        radioText.textContent = (RADIO_TEXT + RADIO_TEXT).slice(textOffset, textOffset + 22);
        window.requestAnimationFrame(drawRadio);
    }
    panelWindow.startRadio = drawRadio;
    if (!getAudioContext()) {
        radioButton.disabled = true;
    }
}

panelButton.addEventListener("click", () => {
    if (!panelWindow) {
        buildPanel();
    }
    if (panelWindow.isOpen()) {
        panelWindow.close();
        return;
    }
    panelWindow.open();
    panelWindow.startRadio();
});


/* ---------------------------------------------------------------------
   8. Menú plegable en teléfonos
   El menú tiene 16 botones y empuja la página. El botón solo se ve en
   pantallas angostas (sección 14 de style.css). Sin JavaScript, el menú queda
   abierto como siempre.
   --------------------------------------------------------------------- */
const siteNav = document.querySelector(".site-nav");
if (siteNav) {
    const menuToggle = document.createElement("button");
    menuToggle.className = "retro-button menu-toggle";
    menuToggle.type = "button";
    menuToggle.textContent = "≡ MENÚ";
    menuToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.add("is-collapsible");
    menuToggle.addEventListener("click", () => {
        const isOpen = siteNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    siteNav.before(menuToggle);
}
