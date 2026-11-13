/* Orientación general adaptada de las guías EPA/AirNow de partículas y ozono.
 * Fuentes y límites de uso visibles en el panel del mapa.
 */
"use strict";

const SaludAire = (() => {
  const niveles = [
    [50, "#2e9e5b", "Bueno"],
    [100, "#f4d03f", "Moderado"],
    [150, "#f39c34", "Dañino para grupos sensibles"],
    [200, "#d6334a", "Dañino"],
    [300, "#7b2d8e", "Muy dañino"],
    [Infinity, "#6e1423", "Peligroso"],
  ];

  const grupos = [
    { id: "asma", nombre: "Asma u otras afecciones respiratorias" },
    { id: "infancia", nombre: "Niños, niñas y adolescentes" },
    { id: "mayores", nombre: "Personas mayores" },
    { id: "embarazo", nombre: "Embarazo" },
    { id: "cardiovascular", nombre: "Enfermedades cardiovasculares" },
    { id: "ejercicio", nombre: "Ejercicio al aire libre" },
  ];

  const general = [
    "Puedes realizar tus actividades habituales al aire libre según tu condición de salud.",
    "En general puedes mantener tus actividades al aire libre. Si notas molestias por la contaminación, reduce su duración e intensidad.",
    "Considera acortar las actividades al aire libre y bajar su intensidad, especialmente si aparecen molestias.",
    "Reduce las actividades largas o intensas al aire libre y toma más descansos.",
    "Evita las actividades largas o intensas al aire libre. Considera posponerlas o realizarlas en un interior con aire más limpio.",
    "Evita toda actividad física al aire libre. Busca un interior con aire más limpio.",
  ];

  const sensibles = [
    general[0],
    "Si eres especialmente sensible a la contaminación, considera actividades más cortas y suaves. Presta atención a la tos o la falta de aire.",
    "Acorta las actividades al aire libre, reduce su intensidad y toma más descansos. Presta atención a la tos o la falta de aire.",
    "Evita las actividades largas o intensas al aire libre. Considera posponerlas o trasladarlas a un interior con aire más limpio.",
    "Evita toda actividad física al aire libre. Traslada las actividades a un interior con aire más limpio o posponlas.",
    "Permanece en un interior con aire más limpio y mantén un nivel de actividad bajo. Evita toda actividad física al aire libre.",
  ];

  function recomendar(aqi, seleccionados = []) {
    // Un dato ausente o inválido nunca debe convertirse en una recomendación favorable.
    if (typeof aqi !== "number" || !Number.isFinite(aqi) || aqi < 0) return null;
    const indice = niveles.findIndex(n => aqi <= n[0]);
    const elegidos = new Set(seleccionados);
    const perfiles = grupos.filter(g => elegidos.has(g.id));
    const consejos = [];

    if (elegidos.has("asma")) {
      consejos.push("Si tienes asma, sigue el plan de acción indicado por tu médico y ten a mano el inhalador de rescate que te hayan recetado.");
    }
    if (indice > 0 && elegidos.has("infancia")) {
      consejos.push("Durante juegos o deporte, observa si hay tos o dificultad para respirar y adapta la actividad.");
    }
    if (indice > 0 && elegidos.has("mayores")) {
      consejos.push("Presta atención a cambios en la respiración o a un cansancio inusual durante la actividad.");
    }
    if (indice > 0 && elegidos.has("embarazo")) {
      consejos.push("Durante el embarazo, adapta el esfuerzo y los descansos a cómo te sientes y sigue las indicaciones de tu equipo de salud.");
    }
    if (indice > 0 && elegidos.has("cardiovascular")) {
      consejos.push("Si aparecen palpitaciones, falta de aire o un cansancio inusual, contacta a tu equipo de salud.");
    }
    if (indice > 0 && elegidos.has("ejercicio")) {
      consejos.push("Reduce la exposición eligiendo una actividad más suave; si corresponde evitar el ejercicio exterior, pospón la sesión o hazla en un interior con aire más limpio.");
    }

    return {
      categoria: niveles[indice][2],
      color: niveles[indice][1],
      perfiles: perfiles.length ? perfiles.map(g => g.nombre) : ["Población general"],
      accion: (perfiles.length ? sensibles : general)[indice],
      consejos,
    };
  }

  return { niveles, grupos, recomendar };
})();

// Permite comprobar la lógica de orientación con node --test, sin dependencias.
if (typeof module !== "undefined" && module.exports) module.exports = SaludAire;
