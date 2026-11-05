"use strict";

/* =====================================================================
   laboratorio.js: simuladores de laboratorio.html.

     1. Órbitas y gravedad
     2. Epidemia y vacunas
     3. Constructor de átomos
     4. Tiempo de reacción
     5. Sonido y prueba de oído
     6. Caída libre en otros mundos
     7. El reloj de la Tierra

   Cada simulador va entre llaves { } para que sus variables no choquen con las
   de otro. Un simulador es un modelo: deja fuera mucho de la realidad para que
   se entienda una idea. Cada sección de la página explica qué simplifica.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Órbitas: cada planeta siente solo la gravedad de la estrella.
   a = masa / distancia². Se ignora la gravedad entre planetas.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#orbit-canvas");
    const context = canvas.getContext("2d");
    const massSlider = document.querySelector("#orbit-mass");
    const distanceSlider = document.querySelector("#orbit-distance");
    const speedSlider = document.querySelector("#orbit-speed");
    const report = document.querySelector("#orbit-report");
    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;
    const COLORS = ["#00ffff", "#ff66ff", "#00ff00", "#ff9900", "#ffffff", "#ff3333"];
    const MAX_PLANETS = 6;
    const STAR_RADIUS = 10;
    const planets = [];
    let lost = { star: 0, space: 0 };
    let launch = null;
    let frame = 0;
    let colorIndex = 0;

    const mass = () => Number(massSlider.value);

    function addPlanet(x, y, vx, vy) {
        if (planets.length >= MAX_PLANETS) {
            planets.shift();
        }
        planets.push({ x, y, vx, vy, color: COLORS[colorIndex++ % COLORS.length], trail: [] });
        start();
    }

    function step() {
        const substeps = 4;
        const dt = 1 / substeps;
        for (let s = 0; s < substeps; s += 1) {
            for (let index = planets.length - 1; index >= 0; index -= 1) {
                const planet = planets[index];
                const dx = CX - planet.x;
                const dy = CY - planet.y;
                const distance = Math.hypot(dx, dy);
                if (distance < STAR_RADIUS) {
                    planets.splice(index, 1);
                    lost.star += 1;
                    continue;
                }
                if (distance > 1200) {
                    planets.splice(index, 1);
                    lost.space += 1;
                    continue;
                }
                const acceleration = mass() / (distance * distance);
                planet.vx += (acceleration * dx / distance) * dt;
                planet.vy += (acceleration * dy / distance) * dt;
                planet.x += planet.vx * dt;
                planet.y += planet.vy * dt;
            }
        }
        planets.forEach((planet) => {
            planet.trail.push([Math.round(planet.x), Math.round(planet.y)]);
            if (planet.trail.length > 400) {
                planet.trail.shift();
            }
        });
    }

    function draw() {
        context.fillStyle = "#000011";
        context.fillRect(0, 0, W, H);
        context.fillStyle = "#ffff00";
        context.beginPath();
        context.arc(CX, CY, STAR_RADIUS, 0, Math.PI * 2);
        context.fill();
        planets.forEach((planet) => {
            context.fillStyle = planet.color;
            planet.trail.forEach(([x, y], index) => {
                if (index % 2 === 0) {
                    context.fillRect(x, y, 1, 1);
                }
            });
            context.fillRect(Math.round(planet.x) - 2, Math.round(planet.y) - 2, 5, 5);
        });
        if (launch) {
            context.strokeStyle = "#ffffff";
            context.beginPath();
            context.moveTo(launch.x, launch.y);
            context.lineTo(launch.toX, launch.toY);
            context.stroke();
            context.fillStyle = "#ffffff";
            context.fillRect(launch.x - 2, launch.y - 2, 5, 5);
        }
    }

    function updateReport() {
        const last = planets.at(-1);
        const motion = last
            ? ` Último planeta: distancia ${Math.round(Math.hypot(last.x - CX, last.y - CY))}, velocidad ${Math.hypot(last.vx, last.vy).toFixed(1)}.`
            : " Lanza un planeta.";
        report.textContent = `En órbita: ${planets.length}. Cayeron en la estrella: ${lost.star}. Se perdieron en el espacio: ${lost.space}.${motion}`;
    }

    function animate() {
        step();
        draw();
        updateReport();
        if (planets.length > 0 || launch) {
            frame = window.requestAnimationFrame(animate);
        } else {
            frame = 0;
        }
    }

    function start() {
        if (!frame) {
            frame = window.requestAnimationFrame(animate);
        }
    }

    function canvasPoint(event) {
        const box = canvas.getBoundingClientRect();
        return { x: (event.clientX - box.left) * W / box.width, y: (event.clientY - box.top) * H / box.height };
    }

    // Arrastrar: la línea indica hacia dónde y qué tan rápido sale el planeta.
    canvas.addEventListener("pointerdown", (event) => {
        const point = canvasPoint(event);
        canvas.setPointerCapture(event.pointerId);
        launch = { x: point.x, y: point.y, toX: point.x, toY: point.y };
        start();
    });
    canvas.addEventListener("pointermove", (event) => {
        if (launch) {
            const point = canvasPoint(event);
            launch.toX = point.x;
            launch.toY = point.y;
        }
    });
    canvas.addEventListener("pointerup", () => {
        if (launch) {
            addPlanet(launch.x, launch.y, (launch.toX - launch.x) * 0.05, (launch.toY - launch.y) * 0.05);
            launch = null;
        }
    });
    canvas.addEventListener("pointercancel", () => {
        launch = null;
    });

    function syncLabels() {
        document.querySelector("#orbit-mass-label").textContent = massSlider.value;
        document.querySelector("#orbit-distance-label").textContent = distanceSlider.value;
        document.querySelector("#orbit-speed-label").textContent = Number(speedSlider.value).toFixed(1);
    }

    [massSlider, distanceSlider, speedSlider].forEach((slider) => slider.addEventListener("input", syncLabels));

    document.querySelector("#orbit-launch").addEventListener("click", () => {
        addPlanet(CX + Number(distanceSlider.value), CY, 0, -Number(speedSlider.value));
    });

    // Velocidad circular: v = raíz(masa / distancia). Aquí la fórmula se vuelve útil.
    document.querySelector("#orbit-circular").addEventListener("click", () => {
        const speed = Math.sqrt(mass() / Number(distanceSlider.value));
        speedSlider.value = String(Math.min(Number(speedSlider.max), speed));
        syncLabels();
        addPlanet(CX + Number(distanceSlider.value), CY, 0, -speed);
    });

    document.querySelector("#orbit-clear").addEventListener("click", () => {
        planets.length = 0;
        lost = { star: 0, space: 0 };
        draw();
        updateReport();
    });

    syncLabels();
    draw();
    updateReport();
}


/* ---------------------------------------------------------------------
   2. Epidemia: personas que se mueven y se contagian al acercarse.
   S sana, I infectada, R recuperada, V vacunada. Simplificación: la vacuna aquí
   protege al 100 % y nadie se contagia dos veces; las reales no son perfectas.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#sir-canvas");
    const context = canvas.getContext("2d");
    const chart = document.querySelector("#sir-chart");
    const chartContext = chart.getContext("2d");
    const vaccineSlider = document.querySelector("#sir-vaccine");
    const stillSlider = document.querySelector("#sir-still");
    const startButton = document.querySelector("#sir-start");
    const report = document.querySelector("#sir-report");
    const runsBody = document.querySelector("#sir-runs");
    const W = canvas.width;
    const H = canvas.height;
    const POPULATION = 200;
    const CONTACT_DISTANCE = 7;
    const CONTAGION_CHANCE = 0.2;   // por cuadro, cuando dos personas están cerca
    const SICK_FRAMES = 260;
    const FRAMES_PER_DAY = 26;
    const COLORS = { S: "#ffffff", I: "#ff0000", R: "#808080", V: "#00ffff" };
    let people = [];
    let frame = 0;
    let ticks = 0;
    let peak = 0;
    let everSick = 0;
    let running = false;

    const randomBetween = (low, high) => low + Math.random() * (high - low);

    function setup() {
        const vaccinated = POPULATION * Number(vaccineSlider.value) / 100;
        const still = POPULATION * Number(stillSlider.value) / 100;
        people = Array.from({ length: POPULATION }, (_, index) => {
            const angle = randomBetween(0, Math.PI * 2);
            const moves = index >= still;
            return {
                x: randomBetween(4, W - 4),
                y: randomBetween(4, H - 4),
                vx: moves ? Math.cos(angle) : 0,
                vy: moves ? Math.sin(angle) : 0,
                state: "S",
                sickFor: 0
            };
        });
        // Las vacunas se reparten al azar, sin importar quién se queda en casa.
        for (let given = 0; given < vaccinated;) {
            const person = people[Math.floor(Math.random() * POPULATION)];
            if (person.state === "S") {
                person.state = "V";
                given += 1;
            }
        }
        const firstCase = people.find((person) => person.state === "S" && person.vx !== 0) ?? people.find((person) => person.state === "S");
        if (firstCase) {
            firstCase.state = "I";
        }
        ticks = 0;
        peak = 1;
        everSick = firstCase ? 1 : 0;
        chartContext.fillStyle = "#000000";
        chartContext.fillRect(0, 0, chart.width, chart.height);
    }

    function step() {
        ticks += 1;
        for (const person of people) {
            person.x += person.vx;
            person.y += person.vy;
            if (person.x < 3 || person.x > W - 3) {
                person.vx *= -1;
            }
            if (person.y < 3 || person.y > H - 3) {
                person.vy *= -1;
            }
        }
        const sick = people.filter((person) => person.state === "I");
        for (const carrier of sick) {
            for (const other of people) {
                if (other.state === "S" && Math.abs(carrier.x - other.x) < CONTACT_DISTANCE && Math.abs(carrier.y - other.y) < CONTACT_DISTANCE && Math.random() < CONTAGION_CHANCE) {
                    other.state = "I";
                    everSick += 1;
                }
            }
            carrier.sickFor += 1;
            if (carrier.sickFor > SICK_FRAMES) {
                carrier.state = "R";
            }
        }
    }

    const countOf = (state) => people.filter((person) => person.state === state).length;

    function draw() {
        context.fillStyle = "#000022";
        context.fillRect(0, 0, W, H);
        for (const person of people) {
            context.fillStyle = COLORS[person.state];
            context.fillRect(Math.round(person.x) - 1, Math.round(person.y) - 1, 3, 3);
        }
    }

    /* Una columna por cada pocos cuadros: rojo abajo, luego gris, cian y blanco. */
    function drawChartColumn() {
        const x = Math.floor(ticks / 4);
        if (x >= chart.width) {
            return;
        }
        let y = chart.height;
        for (const state of ["I", "R", "V", "S"]) {
            const height = countOf(state) / POPULATION * chart.height;
            chartContext.fillStyle = COLORS[state];
            chartContext.fillRect(x, y - height, 1, height + 1);
            y -= height;
        }
    }

    function updateReport() {
        report.textContent = `Día ${Math.floor(ticks / FRAMES_PER_DAY)} · Enfermos ahora: ${countOf("I")} · Recuperados: ${countOf("R")} · Vacunados: ${countOf("V")} · Sin contagiarse: ${countOf("S")}`;
    }

    function finishRun() {
        running = false;
        earnStamp("epidemia");
        startButton.textContent = "INICIAR OTRA EPIDEMIA";
        const row = document.createElement("tr");
        const nonVaccinated = POPULATION - countOf("V");
        [`${vaccineSlider.value} %`, `${stillSlider.value} %`, peak, everSick, `${Math.round(everSick / Math.max(1, nonVaccinated) * 100)} %`, Math.floor(ticks / FRAMES_PER_DAY)].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.append(cell);
        });
        runsBody.append(row);
    }

    function animate() {
        for (let repeat = 0; repeat < 2 && running; repeat += 1) {
            step();
            peak = Math.max(peak, countOf("I"));
            if (ticks % 4 === 0) {
                drawChartColumn();
            }
            if (countOf("I") === 0) {
                finishRun();
            }
        }
        draw();
        updateReport();
        if (running) {
            frame = window.requestAnimationFrame(animate);
        }
    }

    function syncLabels() {
        document.querySelector("#sir-vaccine-label").textContent = vaccineSlider.value;
        document.querySelector("#sir-still-label").textContent = stillSlider.value;
    }

    [vaccineSlider, stillSlider].forEach((slider) => slider.addEventListener("input", syncLabels));

    startButton.addEventListener("click", () => {
        window.cancelAnimationFrame(frame);
        setup();
        running = true;
        startButton.textContent = "REINICIAR";
        animate();
    });

    syncLabels();
    setup();
    draw();
    updateReport();
}


/* ---------------------------------------------------------------------
   3. Constructor de átomos: protones = elemento; neutrones = isótopo;
   electrones = carga. Los electrones no giran como planetas: el dibujo es un
   modelo sencillo de capas. Las capas 2, 8, 8, 2 sirven hasta el calcio.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#atom-canvas");
    const context = canvas.getContext("2d");
    const ELEMENTS = [
        null,
        ["H", "Hidrógeno"], ["He", "Helio"], ["Li", "Litio"], ["Be", "Berilio"], ["B", "Boro"], ["C", "Carbono"], ["N", "Nitrógeno"],
        ["O", "Oxígeno"], ["F", "Flúor"], ["Ne", "Neón"], ["Na", "Sodio"], ["Mg", "Magnesio"], ["Al", "Aluminio"], ["Si", "Silicio"],
        ["P", "Fósforo"], ["S", "Azufre"], ["Cl", "Cloro"], ["Ar", "Argón"], ["K", "Potasio"], ["Ca", "Calcio"]
    ];
    // Números de masa de los isótopos estables, de H a Ca.
    const STABLE = [
        [], [1, 2], [3, 4], [6, 7], [9], [10, 11], [12, 13], [14, 15], [16, 17, 18], [19], [20, 21, 22], [23], [24, 25, 26],
        [27], [28, 29, 30], [31], [32, 33, 34, 36], [35, 37], [36, 38, 40], [39, 41], [40, 42, 43, 44, 46]
    ];
    const LIMITS = { p: 20, n: 26, e: 20 };
    const SHELLS = [2, 8, 8, 2];
    const atom = { p: 0, n: 0, e: 0 };
    const CHALLENGES = [
        { id: "h", text: "Hidrógeno: el átomo más sencillo, con 1 protón y 1 electrón.", done: () => atom.p === 1 && atom.n === 0 && atom.e === 1 },
        { id: "he", text: "Helio-4 neutro, el gas de los globos.", done: () => atom.p === 2 && atom.n === 2 && atom.e === 2 },
        { id: "c14", text: "Carbono-14 neutro: el isótopo que sirve para fechar restos antiguos.", done: () => atom.p === 6 && atom.n === 8 && atom.e === 6 },
        { id: "na", text: "Un ion de sodio Na+ (sodio-23), como el de la sal de mesa.", done: () => atom.p === 11 && atom.n === 12 && atom.e === 10 },
        { id: "cl", text: "Un ion de cloruro Cl- (cloro-35), su pareja en la sal.", done: () => atom.p === 17 && atom.n === 18 && atom.e === 18 }
    ];
    const solved = new Set();
    const challengeList = document.querySelector("#atom-challenges");

    CHALLENGES.forEach((challenge) => {
        const item = document.createElement("li");
        item.dataset.id = challenge.id;
        item.textContent = challenge.text;
        challengeList.append(item);
    });

    function draw() {
        const W = canvas.width;
        const cx = W / 2;
        const cy = canvas.height / 2;
        context.fillStyle = "#000022";
        context.fillRect(0, 0, W, canvas.height);

        let remaining = atom.e;
        SHELLS.forEach((capacity, shell) => {
            const radius = 34 + shell * 22;
            const count = Math.min(capacity, remaining);
            remaining -= count;
            context.strokeStyle = count > 0 ? "#336699" : "#111133";
            context.beginPath();
            context.arc(cx, cy, radius, 0, Math.PI * 2);
            context.stroke();
            for (let index = 0; index < count; index += 1) {
                const angle = (index / capacity) * Math.PI * 2 - Math.PI / 2;
                context.fillStyle = "#00ffff";
                context.fillRect(Math.round(cx + radius * Math.cos(angle)) - 2, Math.round(cy + radius * Math.sin(angle)) - 2, 5, 5);
            }
        });

        // Núcleo: protones y neutrones alternados en espiral.
        const total = atom.p + atom.n;
        let protons = atom.p;
        let neutrons = atom.n;
        for (let index = 0; index < total; index += 1) {
            const useProton = neutrons === 0 || (protons > 0 && index % 2 === 0);
            if (useProton) {
                protons -= 1;
            } else {
                neutrons -= 1;
            }
            const angle = index * 2.4;
            const radius = 2.2 * Math.sqrt(index);
            context.fillStyle = useProton ? "#ff3333" : "#c0c0c0";
            context.fillRect(Math.round(cx + radius * Math.cos(angle)) - 2, Math.round(cy + radius * Math.sin(angle)) - 2, 4, 4);
        }
    }

    function describe() {
        const name = document.querySelector("#atom-name");
        const detail = document.querySelector("#atom-detail");
        const stability = document.querySelector("#atom-stability");
        const charge = atom.p - atom.e;
        const mass = atom.p + atom.n;
        if (atom.p === 0) {
            name.textContent = atom.n + atom.e === 0 ? "Vacío" : "Sin elemento";
            detail.textContent = "Sin protones no hay elemento. Agrega un protón: su número decide qué átomo es.";
            stability.textContent = "";
            return;
        }
        const [symbol, element] = ELEMENTS[atom.p];
        const sign = charge > 0 ? "+" : "-";
        const chargeText = charge === 0 ? "neutro" : `ion ${symbol}${Math.abs(charge) > 1 ? Math.abs(charge) : ""}${sign}`;
        name.textContent = `${element}-${mass} (${symbol})`;
        detail.textContent = `Protones: ${atom.p} · Neutrones: ${atom.n} · Electrones: ${atom.e} · Masa: ${mass} · Carga: ${charge > 0 ? "+" : ""}${charge} · ${chargeText}`;
        stability.textContent = STABLE[atom.p].includes(mass)
            ? "Este núcleo es estable."
            : "Este núcleo es inestable o radiactivo: con el tiempo se transforma en otro.";
    }

    function update() {
        document.querySelector("#atom-p").textContent = String(atom.p);
        document.querySelector("#atom-n").textContent = String(atom.n);
        document.querySelector("#atom-e").textContent = String(atom.e);
        draw();
        describe();
        CHALLENGES.forEach((challenge) => {
            if (challenge.done()) {
                solved.add(challenge.id);
            }
            challengeList.querySelector(`[data-id="${challenge.id}"]`).classList.toggle("is-done", solved.has(challenge.id));
        });
        if (solved.size === CHALLENGES.length) {
            earnStamp("atomos");
        }
    }

    document.querySelectorAll("[data-atom]").forEach((button) => {
        button.addEventListener("click", () => {
            const key = button.dataset.atom;
            atom[key] = Math.max(0, Math.min(LIMITS[key], atom[key] + Number(button.dataset.delta)));
            update();
        });
    });

    update();
}


/* ---------------------------------------------------------------------
   4. Tiempo de reacción: mide cuánto tardas en responder a un cambio de color.
   Los tiempos se quedan en esta página y se borran al recargar.
   --------------------------------------------------------------------- */
{
    const pad = document.querySelector("#reaction-pad");
    const conditionSelect = document.querySelector("#reaction-condition");
    const attemptsElement = document.querySelector("#reaction-attempts");
    const resultsBody = document.querySelector("#reaction-results");
    const ATTEMPTS = 5;
    let phase = "idle";
    let startedAt = 0;
    let waitTimer = 0;
    let times = [];

    function setPad(state, message) {
        pad.className = `reaction-pad is-${state}`;
        pad.textContent = message;
    }

    function median(values) {
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    }

    function showAttempts() {
        attemptsElement.textContent = times.length
            ? `Intentos: ${times.map((time) => `${time} ms`).join(", ")}`
            : "Haz 5 intentos para tener un buen dato: una sola medida no basta.";
    }

    function press() {
        if (phase === "idle" || phase === "done") {
            if (phase === "done") {
                times = [];
                showAttempts();
            }
            phase = "waiting";
            setPad("waiting", "Espera el verde...");
            waitTimer = window.setTimeout(() => {
                phase = "go";
                startedAt = performance.now();
                setPad("go", "¡AHORA!");
            }, 1500 + Math.random() * 2500);
        } else if (phase === "waiting") {
            window.clearTimeout(waitTimer);
            phase = "idle";
            setPad("early", "¡Muy pronto! Ese intento no cuenta. Pulsa para repetirlo.");
        } else if (phase === "go") {
            times.push(Math.round(performance.now() - startedAt));
            showAttempts();
            if (times.length < ATTEMPTS) {
                phase = "idle";
                setPad("idle", `${times.at(-1)} ms. Pulsa para el intento ${times.length + 1} de ${ATTEMPTS}.`);
            } else {
                phase = "done";
                earnStamp("reaccion");
                const typical = median(times);
                setPad("idle", `Tu mediana: ${typical} ms. Pulsa para empezar otra serie.`);
                const row = document.createElement("tr");
                [conditionSelect.selectedOptions[0].textContent, `${typical} ms`, `${Math.min(...times)} ms`, `${Math.max(...times)} ms`].forEach((value) => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.append(cell);
                });
                resultsBody.append(row);
            }
        }
    }

    // pointerdown y keydown responden al instante: un "click" llegaría unos milisegundos tarde.
    pad.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        press();
    });
    pad.addEventListener("keydown", (event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            press();
        }
    });

    showAttempts();
}


/* ---------------------------------------------------------------------
   5. Sonido: longitud de onda = velocidad del sonido / frecuencia.
   El volumen está fijo y bajo. Usa playTone y audioContext de script.js.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#wave-canvas");
    const context = canvas.getContext("2d");
    const slider = document.querySelector("#tone-slider");
    const toggle = document.querySelector("#tone-toggle");
    const hearingStart = document.querySelector("#hearing-start");
    const hearingYes = document.querySelector("#hearing-yes");
    const hearingNo = document.querySelector("#hearing-no");
    const hearingReport = document.querySelector("#hearing-report");
    const SPEED_OF_SOUND = 343;
    const VOLUME = 0.03;
    const HEARING_STEPS = [8000, 10000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000];
    let oscillator = null;
    let gain = null;
    let stepIndex = 0;
    let highest = 0;

    // El control es logarítmico, como el oído: de 100 a 200 Hz se percibe igual que de 1000 a 2000.
    const frequency = () => Math.round(50 * 2 ** (Number(slider.value) / 100));

    function update() {
        const hz = frequency();
        const wavelength = SPEED_OF_SOUND / hz;
        document.querySelector("#tone-label").textContent = hz.toLocaleString("es-MX");
        document.querySelector("#tone-wavelength").textContent = wavelength >= 1
            ? `${wavelength.toFixed(2)} metros`
            : `${(wavelength * 100).toFixed(1)} centímetros`;
        if (oscillator) {
            oscillator.frequency.value = hz;
        }
        drawWave(hz);
    }

    function drawWave(hz) {
        const W = canvas.width;
        const H = canvas.height;
        context.fillStyle = "#000000";
        context.fillRect(0, 0, W, H);
        context.fillStyle = "#333333";
        context.fillRect(0, H / 2, W, 1);
        // Las ondas de verdad son demasiado juntas para dibujarlas: se reduce la escala.
        const cycles = Math.min(60, 1 + hz / 150);
        context.fillStyle = "#00ff00";
        let lastY = H / 2;
        for (let x = 0; x < W; x += 1) {
            const y = Math.round(H / 2 - (H / 2 - 6) * Math.sin((x / W) * cycles * Math.PI * 2));
            context.fillRect(x, Math.min(y, lastY), 1, Math.abs(y - lastY) + 1);
            lastY = y;
        }
    }

    function stopTone() {
        if (oscillator) {
            oscillator.stop();
            oscillator = null;
        }
        toggle.textContent = "ENCENDER EL TONO";
    }

    toggle.addEventListener("click", () => {
        if (oscillator) {
            stopTone();
            return;
        }
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext ??= new AudioContextClass();
        audioContext.resume();
        oscillator = audioContext.createOscillator();
        gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency();
        gain.gain.value = VOLUME;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        toggle.textContent = "APAGAR EL TONO";
    });

    slider.addEventListener("input", update);

    function playStep() {
        const hz = HEARING_STEPS[stepIndex];
        playTone(hz, 1.5, "sine", VOLUME);
        hearingReport.textContent = `Sonando: ${hz.toLocaleString("es-MX")} Hz. ¿Lo oíste?`;
    }

    function finishHearing() {
        hearingYes.hidden = true;
        hearingNo.hidden = true;
        hearingStart.hidden = false;
        hearingStart.textContent = "REPETIR LA PRUEBA";
        hearingReport.textContent = highest
            ? `Oíste hasta ${highest.toLocaleString("es-MX")} Hz con estas bocinas. Compara con otras personas de distintas edades.`
            : "No oíste ni el primer tono. Revisa que el sonido esté activado.";
    }

    hearingStart.addEventListener("click", () => {
        stopTone();
        stepIndex = 0;
        highest = 0;
        hearingStart.hidden = true;
        hearingYes.hidden = false;
        hearingNo.hidden = false;
        playStep();
    });

    hearingYes.addEventListener("click", () => {
        highest = HEARING_STEPS[stepIndex];
        stepIndex += 1;
        if (stepIndex >= HEARING_STEPS.length) {
            finishHearing();
        } else {
            playStep();
        }
    });

    hearingNo.addEventListener("click", finishHearing);

    update();
}


/* ---------------------------------------------------------------------
   6. Caída libre: distancia = g t² / 2, sin aire. Sin aire todo cae igual,
   sin importar su masa. El tiempo de la animación es el real.
   --------------------------------------------------------------------- */
{
    const canvas = document.querySelector("#fall-canvas");
    const context = canvas.getContext("2d");
    const heightSlider = document.querySelector("#fall-height");
    const jumpSlider = document.querySelector("#jump-height");
    const button = document.querySelector("#fall-start");
    const WORLDS = [
        { name: "Luna", g: 1.62, color: "#c0c0c0" },
        { name: "Marte", g: 3.71, color: "#ff6633" },
        { name: "Tierra", g: 9.81, color: "#00ccff" },
        { name: "Júpiter", g: 24.79, color: "#ffcc66" }
    ];
    const EARTH_G = 9.81;
    let frame = 0;
    let startedAt = 0;

    const fallTime = (height, g) => Math.sqrt(2 * height / g);

    function draw(elapsed) {
        const W = canvas.width;
        const H = canvas.height;
        const top = 22;
        const bottom = H - 24;
        const height = Number(heightSlider.value);
        const columnWidth = W / WORLDS.length;
        context.fillStyle = "#000022";
        context.fillRect(0, 0, W, H);
        context.font = "11px monospace";
        context.textAlign = "center";
        WORLDS.forEach((world, index) => {
            const cx = columnWidth * index + columnWidth / 2;
            const total = fallTime(height, world.g);
            const time = Math.min(elapsed, total);
            const fallen = world.g * time * time / 2;
            const y = top + (bottom - top) * (fallen / height);
            context.fillStyle = world.color;
            context.fillText(world.name, cx, 13);
            context.fillRect(columnWidth * index + 12, bottom + 5, columnWidth - 24, 3);
            context.fillRect(Math.round(cx) - 4, Math.round(y) - 4, 9, 9);
            context.fillStyle = "#ffffff";
            context.fillText(`${time.toFixed(2)} s`, cx, H - 3);
        });
    }

    function animate(now) {
        const elapsed = (now - startedAt) / 1000;
        draw(elapsed);
        const longest = fallTime(Number(heightSlider.value), WORLDS[0].g);
        if (elapsed < longest) {
            frame = window.requestAnimationFrame(animate);
        } else {
            button.textContent = "SOLTAR OTRA VEZ";
        }
    }

    function updateJump() {
        const jump = Number(jumpSlider.value) / 100;
        document.querySelector("#jump-label").textContent = jumpSlider.value;
        document.querySelector("#jump-results").textContent = WORLDS.map((world) => {
            const meters = jump * EARTH_G / world.g;
            return `${world.name}: ${meters.toFixed(2)} m`;
        }).join(" · ");
    }

    heightSlider.addEventListener("input", () => {
        window.cancelAnimationFrame(frame);
        document.querySelector("#fall-label").textContent = heightSlider.value;
        draw(0);
    });
    jumpSlider.addEventListener("input", updateJump);
    button.addEventListener("click", () => {
        window.cancelAnimationFrame(frame);
        startedAt = performance.now();
        frame = window.requestAnimationFrame(animate);
    });

    draw(0);
    updateJump();
}


/* ---------------------------------------------------------------------
   7. El reloj de la Tierra: 4,540 millones de años comprimidos en un día.
   hace: hace cuántos millones de años ocurrió. Las fechas son aproximadas.
   --------------------------------------------------------------------- */
{
    const EARTH_AGE = 4540;
    const EVENTS = [
        { hace: 4540, text: "Se forma la Tierra." },
        { hace: 4500, text: "Un choque gigante probablemente forma la Luna." },
        { hace: 3500, text: "Los primeros rastros claros de vida: microbios." },
        { hace: 2400, text: "El oxígeno empieza a acumularse en el aire, gracias a microbios." },
        { hace: 540, text: "Explosión de formas de vida animal en el mar." },
        { hace: 470, text: "Las plantas llegan a tierra firme." },
        { hace: 230, text: "Aparecen los dinosaurios." },
        { hace: 66, text: "Un asteroide cae en Chicxulub, Yucatán. Desaparecen los dinosaurios no aviares." },
        { hace: 6, text: "Aparecen nuestros parientes que caminan en dos pies." },
        { hace: 0.3, text: "Aparece nuestra especie, Homo sapiens." },
        { hace: 0.005, text: "Se inventa la escritura." }
    ];
    const secondsOfDay = (hace) => (1 - hace / EARTH_AGE) * 86400;

    function clockText(seconds) {
        const whole = Math.floor(seconds);
        const hours = String(Math.floor(whole / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
        const rest = String(whole % 60).padStart(2, "0");
        return `${hours}:${minutes}:${rest}`;
    }

    const slider = document.querySelector("#clock-slider");
    const clockLabel = document.querySelector("#clock-time");
    const clockEvent = document.querySelector("#clock-event");
    const clockAgo = document.querySelector("#clock-ago");
    const clockList = document.querySelector("#clock-events");

    EVENTS.forEach((event, index) => {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        const jump = document.createElement("button");
        jump.type = "button";
        jump.className = "retro-button";
        jump.textContent = clockText(secondsOfDay(event.hace));
        jump.setAttribute("aria-label", `Ir a las ${jump.textContent}: ${event.text}`);
        jump.addEventListener("click", () => {
            slider.value = String(secondsOfDay(event.hace));
            update(secondsOfDay(event.hace)); // el control redondea; aquí queremos la hora exacta
        });
        cell.append(jump);
        const text = document.createElement("td");
        text.textContent = event.text;
        row.append(cell, text);
        row.dataset.index = String(index);
        clockList.append(row);
    });

    function update(seconds = Number(slider.value)) {
        const ago = (1 - seconds / 86400) * EARTH_AGE;
        clockLabel.textContent = clockText(seconds);
        clockAgo.textContent = ago >= 1
            ? `Hace unos ${Math.round(ago).toLocaleString("es-MX")} millones de años.`
            : ago > 0.001 ? `Hace unos ${Math.round(ago * 1000).toLocaleString("es-MX")} mil años.` : "Hoy.";
        const current = [...EVENTS].reverse().find((event) => secondsOfDay(event.hace) <= seconds + 0.5) ?? EVENTS[0];
        clockEvent.textContent = current.text;
    }

    slider.addEventListener("input", () => update());
    update();
}
