"use strict";

/* =====================================================================
   programacion.js: taller interactivo de programacion.html.

   Une los tres cuadros de texto en un documento y lo muestra en un iframe.
   El atributo sandbox="allow-scripts" del iframe aísla la vista previa: el
   código puede correr ahí, pero no puede tocar el resto del sitio ni ver lo
   que el navegador guarda. Nada se envía a internet.
   ===================================================================== */

const playgroundHtml = document.querySelector("#playground-html");
const playgroundCss = document.querySelector("#playground-css");
const playgroundJs = document.querySelector("#playground-js");
const playgroundPreview = document.querySelector("#playground-preview");
const playgroundStatus = document.querySelector("#playground-status");

/* Sin esto, un error de JavaScript solo se vería en la consola y parecería
   que no pasó nada. Va en su propio <script> porque un error de escritura
   impide ejecutar todo el <script> donde aparece. */
const errorReporter = `window.onerror = (mensaje) => {
  const aviso = document.createElement("pre");
  aviso.style.cssText = "margin:8px;padding:8px;border:3px ridge red;background:#ffffc0;color:#800000;font:13px monospace;white-space:pre-wrap";
  aviso.textContent = "Tu JavaScript tiene un error: " + mensaje;
  document.body.prepend(aviso);
};`;

function updatePlayground() {
    playgroundPreview.srcdoc = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${playgroundCss.value}</style>
</head>
<body>
  <script>${errorReporter}<\/script>
  ${playgroundHtml.value}
  <script>${playgroundJs.value}<\/script>
</body>
</html>`;
    playgroundStatus.textContent = "Vista previa actualizada. Prueba los botones dentro del marco.";
}

document.querySelector("#run-playground").addEventListener("click", updatePlayground);
updatePlayground();
