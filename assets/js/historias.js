"use strict";

/* =====================================================================
   historias.js: detalles interactivos de historias.html.
   Las adivinanzas usan <details>, que funciona sin programación. Aquí solo
   se cuenta cuáles se abrieron, para dar el sello.
   ===================================================================== */

const riddles = document.querySelectorAll(".adivina");

riddles.forEach((riddle) => {
    riddle.addEventListener("toggle", () => {
        riddle.classList.add("was-opened");
        if (document.querySelectorAll(".adivina.was-opened").length === riddles.length) {
            earnStamp("historias");
        }
    });
});

/* Un Mi y un Si agudos que se apagan despacio se parecen un poco a una campana. */
document.querySelector("#golpear-roca").addEventListener("click", () => {
    playTone(1318.5, 1.4, "sine", 0.09);
    playTone(1975.5, 0.8, "sine", 0.04);
});
