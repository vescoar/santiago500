const { test } = require("node:test");
const assert = require("node:assert/strict");
const { recomendar, grupos } = require("../santiago500/static/santiago500/salud.js");

test("respeta los límites de las seis categorías AQI", () => {
  const casos = [
    [0, "Bueno"], [50, "Bueno"],
    [51, "Moderado"], [100, "Moderado"],
    [101, "Dañino para grupos sensibles"], [150, "Dañino para grupos sensibles"],
    [151, "Dañino"], [200, "Dañino"],
    [201, "Muy dañino"], [300, "Muy dañino"],
    [301, "Peligroso"], [500, "Peligroso"], [501, "Peligroso"],
  ];
  for (const [aqi, categoria] of casos) {
    assert.equal(recomendar(aqi).categoria, categoria, `AQI ${aqi}`);
  }
});

test("no ofrece orientación con valores ausentes o inválidos", () => {
  for (const dato of [null, undefined, "", "111", -1, NaN, Infinity, {}, []]) {
    assert.equal(recomendar(dato, ["asma"]), null);
  }
});

test("sin grupos seleccionados orienta a la población general", () => {
  assert.deepEqual(recomendar(111).perfiles, ["Población general"]);
  assert.notEqual(recomendar(111).accion, recomendar(111, ["asma"]).accion);
});

test("el nivel moderado condiciona los ajustes a la sensibilidad individual", () => {
  assert.match(recomendar(75, ["asma"]).accion, /Si eres especialmente sensible/);
  assert.match(recomendar(75).accion, /En general puedes mantener/);
});

test("con AQI 151 los grupos sensibles evitan el esfuerzo intenso; el resto lo reduce", () => {
  assert.match(recomendar(151).accion, /^Reduce/);
  for (const grupo of grupos) {
    assert.match(recomendar(151, [grupo.id]).accion, /^Evita/);
  }
});

test("combinar grupos conserva las precauciones y el plan de asma", () => {
  const combinado = recomendar(201, ["asma", "infancia", "ejercicio", "asma"]);
  assert.equal(combinado.accion, recomendar(201, ["asma"]).accion);
  assert.equal(combinado.perfiles.length, 3);
  assert.match(combinado.accion, /Evita toda actividad física al aire libre/);
  assert.ok(combinado.consejos.some(c => /plan de acción/.test(c) && /recetado/.test(c)));
  assert.ok(combinado.consejos.some(c => /juegos o deporte/.test(c)));
});

test("el recordatorio de asma permanece incluso con AQI bueno", () => {
  assert.ok(recomendar(25, ["asma"]).consejos.some(c => /plan de acción/.test(c)));
});

test("con AQI peligroso todos evitan ejercicio exterior y los grupos sensibles reducen actividad interior", () => {
  assert.match(recomendar(301).accion, /Evita toda actividad física al aire libre/);
  assert.match(recomendar(301, ["embarazo"]).accion, /interior.*actividad bajo/);
});

test("un grupo desconocido no modifica la orientación general", () => {
  assert.deepEqual(recomendar(151, ["desconocido"]), recomendar(151));
});
