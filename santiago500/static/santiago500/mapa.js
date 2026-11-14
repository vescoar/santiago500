/* Interfaz del mapa. Los textos de orientación se mantienen en salud.js. */
"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const app = $("aplicacion");
  const estado = $("estado");
  const botonActualizar = $("actualizar");
  const cargaMapa = $("mapa-carga");

  if (typeof L === "undefined" || typeof SaludAire === "undefined") {
    estado.textContent = "No se pudo iniciar el mapa.";
    estado.parentElement.dataset.estado = "error";
    cargaMapa.textContent = "Revisa tu conexión y vuelve a cargar la página.";
    botonActualizar.disabled = false;
    botonActualizar.addEventListener("click", () => window.location.reload());
    return;
  }

  const niveles = SaludAire.niveles;
  const nivel = aqi => typeof aqi === "number" && Number.isFinite(aqi) && aqi >= 0
    ? niveles.find(n => aqi <= n[0]) : null;
  const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const esc = s => String(s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const icono = nombre => `<svg class="icono" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;
  const selector = $("selector-comuna");
  const resultado = $("salud-resultado");
  const resumen = $("resumen-comuna");
  const resumenVacio = resumen.innerHTML;
  const consejoVacio = resultado.innerHTML;
  const grupos = $("grupos-salud");
  const nombresCortos = {
    asma: "Asma o afección respiratoria", infancia: "Niños y adolescentes",
    mayores: "Personas mayores", embarazo: "Embarazo",
    cardiovascular: "Afección cardíaca", ejercicio: "Ejercicio al aire libre",
  };
  let datos = new Map();
  let geometria = null;
  let capaComunas = null;
  let seleccion = null;
  let avisoDatos = false;
  let cargando = false;
  const capasPorNombre = new Map();

  $("opciones-salud").innerHTML = SaludAire.grupos.map(g =>
    `<label class="salud-grupo"><input type="checkbox" name="grupo-salud" value="${g.id}" aria-label="${esc(g.nombre)}"><span>${esc(nombresCortos[g.id])}</span></label>`
  ).join("");

  $("leyenda").innerHTML = niveles.map((n, i) => {
    const desde = i === 0 ? 0 : niveles[i - 1][0] + 1;
    const rango = n[0] === Infinity ? `${desde}+` : `${desde}–${n[0]}`;
    return `<div class="leyenda-nivel" style="--nivel-color:${n[1]}"><div class="leyenda-color"></div><span class="leyenda-rango">${rango}</span><span>${esc(n[2])}</span></div>`;
  }).join("");

  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mapa = L.map("mapa", { zoomControl: false, scrollWheelZoom: false, zoomSnap: .25 }).setView([-33.48, -70.65], 10);
  L.control.zoom({ position: "topright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(mapa);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    referrerPolicy: "strict-origin-when-cross-origin",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://open-meteo.com/">Open-Meteo</a> (modelo)',
  }).addTo(mapa);
  const etiquetas = L.layerGroup();
  function actualizarVisibilidadEtiquetas() {
    if (mapa.getZoom() >= 10) etiquetas.addTo(mapa);
    else mapa.removeLayer(etiquetas);
  }
  mapa.on("zoomend", actualizarVisibilidadEtiquetas);
  actualizarVisibilidadEtiquetas();
  // El mapa debe ajustarse cuando cambia el ancho disponible o la orientación.
  new ResizeObserver(() => mapa.invalidateSize({ pan: false })).observe($("mapa"));

  function actualizarSalud() {
    const elegidos = Array.from(grupos.querySelectorAll("input:checked"), input => input.value);
    $("limpiar-grupos").hidden = elegidos.length === 0;
    $("perfil-activo").textContent = elegidos.length
      ? `${elegidos.length} ${elegidos.length === 1 ? "grupo seleccionado" : "grupos seleccionados"}.`
      : "Sin selecciones: población general.";

    if (!seleccion) {
      resumen.innerHTML = resumenVacio;
      resultado.innerHTML = consejoVacio;
      return;
    }
    const e = datos.get(norm(seleccion));
    const consejo = e ? SaludAire.recomendar(e.aqi, elegidos) : null;
    if (!consejo) {
      resumen.innerHTML = `<div class="comuna-vacia">${icono("pin")}<div><h3>${esc(seleccion)}</h3><p>Sin datos de AQI disponibles.</p></div></div>`;
      resultado.innerHTML = `<div class="consejo-vacio">${icono("info")}<p>No hay datos válidos para ofrecer orientación. Vuelve a intentarlo con el botón Actualizar.</p></div>`;
      return;
    }
    resumen.innerHTML =
      `<div class="comuna-datos" style="--aqi-color:${consejo.color}">` +
        `<p class="sobretitulo">CALIDAD DEL AIRE EN</p><h3>${esc(seleccion)}</h3>` +
        `<div class="aqi-fila"><strong class="aqi-valor">${e.aqi}</strong>` +
          `<div class="aqi-categoria"><small>Índice AQI</small><span><i class="aqi-color" aria-hidden="true"></i>${esc(consejo.categoria)}</span></div></div>` +
        `<p class="fecha-dato">${icono("reloj")}<span>Dato: ${esc(e.medido_en || "Fecha no disponible")} · hora de Santiago</span></p>` +
      `</div>`;
    resultado.innerHTML =
      (avisoDatos ? `<p class="salud-aviso">No se pudo actualizar. Esta orientación usa el último dato guardado; las condiciones actuales pueden ser distintas.</p>` : "") +
      `<h3 class="consejo-titulo">${icono("corazon")}Para cuidarte hoy</h3>` +
      `<p class="solo-lectores">Orientación para: ${consejo.perfiles.map(esc).join("; ")}</p>` +
      `<p class="consejo-accion">${esc(consejo.accion)}</p>` +
      (consejo.consejos.length ? `<ul class="consejos-lista">${consejo.consejos.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : "");
  }

  grupos.addEventListener("change", actualizarSalud);
  $("limpiar-grupos").addEventListener("click", () => {
    grupos.querySelectorAll("input").forEach(input => { input.checked = false; });
    grupos.querySelector("input").focus({ preventScroll: true });
    actualizarSalud();
  });

  function estilo(feature) {
    const e = datos.get(norm(feature.properties.nombre));
    const n = e && nivel(e.aqi);
    const activa = feature.properties.nombre === seleccion;
    return {
      fillColor: n ? n[1] : "#c0c9bb", fillOpacity: activa ? .67 : .45,
      color: activa ? "#254b36" : "#f7faf3", weight: activa ? 3 : 1.5,
      opacity: 1,
    };
  }

  function areaAnillo(r) {
    return r.reduce((s, [x1, y1], i) => {
      const [x2, y2] = r[(i + 1) % r.length];
      return s + x1 * y2 - x2 * y1;
    }, 0) / 2;
  }
  function centroide(geom) {
    const polis = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    const anillo = polis.reduce((mayor, p) => Math.abs(areaAnillo(p[0])) > Math.abs(areaAnillo(mayor)) ? p[0] : mayor, polis[0][0]);
    const a = areaAnillo(anillo);
    let cx = 0, cy = 0;
    for (let i = 0; i < anillo.length; i++) {
      const [x1, y1] = anillo[i], [x2, y2] = anillo[(i + 1) % anillo.length];
      const cruz = x1 * y2 - x2 * y1;
      cx += (x1 + x2) * cruz;
      cy += (y1 + y2) * cruz;
    }
    return [cy / (6 * a), cx / (6 * a)];
  }

  function actualizarMapa() {
    if (!capaComunas) return;
    etiquetas.clearLayers();
    capaComunas.eachLayer(layer => {
      const nombre = layer.feature.properties.nombre;
      const e = datos.get(norm(nombre));
      const n = e && nivel(e.aqi);
      capaComunas.resetStyle(layer);
      const tooltip = `<strong>${esc(nombre)}</strong><br>${n ? `AQI ${e.aqi} · ${esc(n[2])}` : "Sin datos"}`;
      if (layer.getTooltip()) layer.setTooltipContent(tooltip);
      else layer.bindTooltip(tooltip, { sticky: true, direction: "top" });
      if (!n) return;
      L.marker(centroide(layer.feature.geometry), {
        interactive: false, keyboard: false,
        icon: L.divIcon({
          className: "", html: `<span class="etiqueta${nombre === seleccion ? " etiqueta-seleccionada" : ""}">${e.aqi}</span>`,
          iconSize: [32, 23], iconAnchor: [16, 11],
        }),
      }).addTo(etiquetas);
    });
    if (seleccion) capasPorNombre.get(seleccion)?.bringToFront();
  }

  function seleccionarComuna(nombre, acercar = false) {
    seleccion = capasPorNombre.has(nombre) ? nombre : null;
    selector.value = seleccion || "";
    $("comuna-enlace").hidden = !seleccion;
    $("comuna-enlace-nombre").textContent = seleccion || "";
    actualizarMapa();
    actualizarSalud();
    if (seleccion && acercar) {
      mapa.fitBounds(capasPorNombre.get(seleccion).getBounds(), {
        padding: [45, 45], maxZoom: 13, animate: !movimientoReducido.matches,
      });
    }
  }
  selector.addEventListener("change", () => seleccionarComuna(selector.value, true));
  function verTodo() {
    if (capaComunas) mapa.fitBounds(capaComunas.getBounds(), { padding: [25, 25], animate: !movimientoReducido.matches });
  }
  $("ver-todo").addEventListener("click", verTodo);
  $("comuna-enlace").addEventListener("click", () => $("panel-salud").focus({ preventScroll: true }));
  $("enlace-guia").addEventListener("click", () => { $("guia").open = true; });

  async function cargarGeometria() {
    if (geometria) return geometria;
    const resp = await fetch(app.dataset.comunasUrl);
    if (!resp.ok) throw new Error("geometria");
    const geo = await resp.json();
    if (!Array.isArray(geo.features) || !geo.features.length) throw new Error("geometria");
    geometria = geo;
    capaComunas = L.geoJSON(geo, {
      style: estilo,
      onEachFeature: (f, layer) => {
        const nombre = f.properties.nombre;
        capasPorNombre.set(nombre, layer);
        layer.on("mouseover", () => layer.setStyle({ weight: 3, fillOpacity: .65 }));
        layer.on("mouseout", () => capaComunas.resetStyle(layer));
        layer.on("click", () => seleccionarComuna(nombre));
      },
    }).addTo(mapa);
    const nombres = [...capasPorNombre.keys()].sort((a, b) => a.localeCompare(b, "es"));
    for (const nombre of nombres) selector.add(new Option(nombre, nombre));
    selector.disabled = false;
    $("ver-todo").disabled = false;
    $("cobertura").textContent = `${nombres.length} comunas del Gran Santiago`;
    cargaMapa.hidden = true;
    // La vista inicial se concentra en el área urbana; «Ver todo» incluye los límites cordilleranos.
    mapa.fitBounds([[-33.65, -70.81], [-33.32, -70.48]], { padding: [16, 16], animate: false });
    actualizarMapa();
    return geometria;
  }

  function mostrarAviso(texto) {
    $("aviso-mapa").textContent = texto;
    $("aviso-mapa").hidden = !texto;
  }

  async function cargar() {
    if (cargando) return;
    cargando = true;
    botonActualizar.disabled = true;
    estado.textContent = "Consultando datos…";
    estado.parentElement.dataset.estado = "cargando";
    try {
      const [, api] = await Promise.all([
        cargarGeometria(),
        fetch(app.dataset.estacionesUrl).then(async resp => {
          if (!resp.ok) throw new Error("datos");
          const api = await resp.json();
          if (!Array.isArray(api.estaciones)) throw new Error("datos");
          return api;
        }),
      ]);
      datos = new Map(api.estaciones.filter(e => e && typeof e.nombre === "string").map(e => [norm(e.nombre), e]));
      avisoDatos = Boolean(api.aviso);
      actualizarMapa();
      actualizarSalud();
      const disponibles = [...capasPorNombre.keys()].filter(nombre => nivel(datos.get(norm(nombre))?.aqi)).length;
      const hora = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
      estado.parentElement.dataset.estado = avisoDatos || !disponibles ? "error" : "listo";
      if (avisoDatos) {
        estado.textContent = "Mostrando datos guardados";
        const motivo = typeof api.aviso === "string" ? api.aviso : "No pudimos actualizar la calidad del aire.";
        const reintento = api.proximo_intento ? ` Próximo intento permitido: ${api.proximo_intento}, hora de Santiago.` : "";
        mostrarAviso(`${motivo}${reintento} Revisa la fecha del dato en la ficha de tu comuna.`);
      } else if (!disponibles) {
        estado.textContent = "Sin datos disponibles";
        mostrarAviso("Aún no hay datos de calidad del aire disponibles. Puedes explorar las comunas y volver a intentarlo con Actualizar.");
      } else {
        estado.textContent = `${disponibles} ${disponibles === 1 ? "comuna con datos" : "comunas con datos"} · Consulta ${hora}`;
        mostrarAviso("");
      }
    } catch {
      avisoDatos = true;
      actualizarSalud();
      estado.parentElement.dataset.estado = "error";
      estado.textContent = "No se pudo actualizar";
      mostrarAviso(datos.size
        ? "La consulta falló. Conservamos los últimos datos disponibles. Puedes volver a intentarlo con Actualizar."
        : "No pudimos cargar toda la información. Revisa tu conexión y pulsa Actualizar para volver a intentarlo.");
      if (!geometria) cargaMapa.innerHTML = `${icono("info")}<span>No se pudo cargar el mapa.</span>`;
    } finally {
      cargando = false;
      botonActualizar.disabled = false;
    }
  }
  botonActualizar.addEventListener("click", cargar);
  cargar();
  setInterval(cargar, 10 * 60 * 1000);
})();
