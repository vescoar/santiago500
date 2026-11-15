# Checklist de entrega y presentación — Santiago500 sin smog

Basada en **«Entregable Final (Presentacion).docx»**, IWG400, P4 — Presentación (20%). Las secciones 1 a 7 recogen las exigencias del documento; la sección 8 añade recomendaciones para preparar la demostración.

**Material al Aula: hasta el 16 de noviembre.** El documento no indica una hora límite; confírmenla en el Aula.

**Presentación: durante las clases de las semanas del 16 al 30 de noviembre**, según el calendario del paralelo y el orden informado por el profesor o profesora.

## 1. Material que deben subir al Aula

- [ ] Preparar el archivo de presentación en **PDF o PowerPoint**.
- [ ] Grabar un video de respaldo de **máximo 3 minutos**.
- [ ] Mostrar en el video la funcionalidad corazón: consultar la calidad del aire de una comuna.
- [ ] Mostrar en el video la segunda funcionalidad prioritaria: orientación de salud según AQI y grupos seleccionados.
- [ ] Publicar el video en un lugar que permita compartir un enlace.
- [ ] Comprobar que el profesor o profesora puede abrir el enlace y reproducirlo.
- [ ] Subir al Aula **el enlace del video y el archivo de presentación hasta el 16 de noviembre**.
- [ ] Confirmar que ambos materiales quedaron entregados correctamente.

El video es un respaldo y **no reemplaza la demostración en vivo**. La comprobación del enlace y de la entrega son pasos prácticos para asegurar que el material solicitado sea accesible.

## 2. Versión final de la aplicación

- [ ] Confirmar que la funcionalidad corazón funciona de principio a fin.
- [ ] Confirmar que la segunda funcionalidad está integrada en la misma aplicación.
- [ ] Poder mostrar un flujo desde la selección de información hasta un resultado.
- [ ] Poder demostrar el uso efectivo de la base de datos o de una API.
- [ ] Tener la aplicación ejecutándose al menos en **localhost**.
- [ ] Verificar que la solución corresponde al problema y a las personas que el equipo identificó durante el semestre.

**Flujo sugerido para este proyecto:** abrir el mapa → seleccionar una comuna → consultar AQI, categoría y fecha → marcar uno o varios grupos → leer la orientación resultante.

La publicación en Internet **no es obligatoria**. La versión de PythonAnywhere puede apoyar la demostración, pero localhost también cumple ese requisito.

## 3. Pitch — 2 minutos, máximo 5 diapositivas

- [ ] Explicar el problema abordado.
- [ ] Identificar a las personas afectadas y el contexto.
- [ ] Presentar **una evidencia relevante y su fuente** que justifique la necesidad.
- [ ] Explicar la solución y señalar claramente la funcionalidad corazón.
- [ ] Explicar el aporte de la aplicación frente a otras soluciones existentes.
- [ ] Ajustar el pitch a **2 minutos** y **no más de 5 diapositivas**.

Propuesta de distribución:

| Diapositiva | Contenido |
| --- | --- |
| 1 | Problema y contexto de Santiago. |
| 2 | Personas afectadas y evidencia que respalda la necesidad. |
| 3 | Solución y consulta de AQI por comuna. |
| 4 | Orientación de salud integrada en el flujo. |
| 5 | Aporte: información por comuna, interfaz en español y orientación comprensible para el público elegido. |

El máximo de cinco diapositivas corresponde al **pitch**; el documento no establece ese máximo para toda la presentación. Eviten afirmar que el modelo es más preciso que las estaciones oficiales o que la aplicación es única sin evidencia que lo respalde.

## 4. Demostración en vivo — 4 minutos

- [ ] Abrir la aplicación en un navegador y mostrar su funcionamiento real.
- [ ] Seleccionar una comuna y explicar el AQI, su categoría y la fecha del dato.
- [ ] Completar el flujo de la funcionalidad corazón.
- [ ] Seleccionar grupos de riesgo y mostrar el funcionamiento de la segunda funcionalidad.
- [ ] Mostrar el resultado concreto que recibe la persona usuaria.
- [ ] Presentar evidencia observable de persistencia o de uso de una API.
- [ ] Ensayar la demostración completa para terminar en **4 minutos**.

Para evidenciar persistencia, pueden abrir `/admin/` y mostrar registros guardados con su comuna y fechas. Como complemento, `/api/estaciones/` muestra el JSON que entrega Django. Aclaren que este endpoint pertenece a la aplicación y que el servidor consulta Open-Meteo cuando corresponde.

## 5. Relato técnico y aprendizajes — 4 minutos

### Diagrama entidad-relación

- [ ] Preparar un diagrama actualizado que coincida con la versión que van a demostrar.
- [ ] Incluir `ZonaMonitoreo` y sus campos principales.
- [ ] Incluir `RegistroContaminacion` y su relación **muchos a uno** con `ZonaMonitoreo`.
- [ ] Mostrar que una zona puede tener varios registros y que no se repite la combinación de zona y fecha del dato.
- [ ] Incluir `EstadoActualizacion`, que guarda el próximo intento permitido y el aviso de la fuente externa. Actualmente no tiene una relación directa con las otras tablas.
- [ ] Explicar cómo estas entidades se utilizan en la aplicación.
- [ ] Si el diseño cambió, explicar al menos una modificación relevante y su justificación.

Ejemplo de modificación para explicar, si corresponde a la historia del equipo: incorporar el estado persistente de actualización para evitar consultas externas repetidas y respetar las esperas tras un error HTTP 429.

### Caso de prueba ejecutado

- [ ] Elegir y ejecutar al menos **un caso de prueba** de la aplicación.
- [ ] Registrar las entradas y condiciones de la prueba.
- [ ] Indicar el comportamiento esperado.
- [ ] Mostrar el resultado realmente observado.
- [ ] Explicar la conclusión o mejora derivada de la prueba.

Caso sugerido: simular una respuesta HTTP 429, comprobar que se conservan los datos guardados y verificar que una segunda visita dentro de la espera no vuelve a consultar la API. El proyecto tiene pruebas de este comportamiento que se ejecutan con:

```bash
python manage.py test santiago500
```

Otra opción es mostrar una prueba de la orientación por grupo mediante:

```bash
node --test tests/salud.test.cjs
```

Usen un caso específico para explicar qué se probó; no se limiten a decir «todas las pruebas pasaron». Si utilizan datos o errores simulados, identifíquenlos como tales.

### Dificultad y aprendizaje

- [ ] Elegir una dificultad significativa que el equipo realmente haya enfrentado.
- [ ] Explicar cómo la abordaron y qué decisión tomaron.
- [ ] Explicar qué aprendieron de la experiencia.
- [ ] Ajustar diagrama, prueba y dificultad a **4 minutos en total**.

Pueden elegir el cambio de proveedor de datos o el límite de consultas observado al desplegar, siempre que puedan explicar las decisiones y limitaciones con sus propias palabras.

## 6. Preguntas, defensa y participación — 3 minutos

- [ ] Asignar intervenciones para que **todos los integrantes participen** en alguna sección o en la defensa.
- [ ] Confirmar que todos entienden el propósito, el funcionamiento general y las decisiones principales.
- [ ] Ensayar preguntas cruzadas, incluyendo componentes que cada integrante no haya programado.
- [ ] Confirmar la fecha y el orden de presentación del paralelo.

Preguntas sugeridas para ensayar:

- [ ] ¿Qué problema resuelve la aplicación y para quién?
- [ ] ¿Cuál es la funcionalidad corazón y cuál es la segunda funcionalidad?
- [ ] ¿Qué hacen Django, SQLite, JavaScript y Leaflet?
- [ ] ¿De dónde provienen el AQI y los límites de las comunas?
- [ ] ¿Por qué comunas distintas pueden mostrar el mismo AQI?
- [ ] ¿Cómo se elige una recomendación y qué ocurre al combinar grupos?
- [ ] ¿Qué diferencia hay entre la fecha del dato y la fecha en que se guardó?
- [ ] ¿Qué pasa si Open-Meteo falla o limita las consultas?
- [ ] ¿Cómo se controla la espera entre intentos de actualización?
- [ ] ¿Qué limitaciones tiene la solución?

## 7. Uso responsable de IA

- [ ] Identificar qué componentes se desarrollaron con apoyo de IA.
- [ ] Explicar las sugerencias recibidas y las decisiones que tomó el equipo.
- [ ] Explicar cómo comprobaron que los resultados eran pertinentes.
- [ ] Poder explicar los componentes relevantes del código, aunque se hayan generado con ayuda.

En este proyecto pueden comentar el apoyo recibido para la interfaz, la lógica de orientación y las pruebas. Distingan ese apoyo durante el desarrollo del funcionamiento público: las recomendaciones son textos y reglas predefinidos, no respuestas generadas por IA durante cada visita.

## 8. Preparación recomendada para evitar problemas

Estas medidas son recomendaciones para el ensayo y la demostración, no entregables adicionales exigidos por el documento.

- [ ] Elegir el computador y la versión de la aplicación que van a demostrar.
- [ ] Comprobar el funcionamiento local antes de depender de la versión publicada.
- [ ] Ejecutar `python manage.py migrate` si hay migraciones pendientes.
- [ ] Comprobar la fecha real del dato antes de grabar y antes de presentar.
- [ ] Si la fuente está limitada, explicar que se muestran datos guardados; no presentarlos como datos recién obtenidos.
- [ ] Preparar y probar el acceso al administrador si lo utilizarán para mostrar persistencia.
- [ ] Tener listas las pestañas del mapa, el administrador y la evidencia de la prueba.
- [ ] Probar la conexión: localhost también necesita Internet para consultar Open-Meteo y cargar recursos externos del mapa.
- [ ] Comprobar que se lean bien el texto y el mapa en la pantalla o proyector.
- [ ] Guardar una copia local de la presentación y del video de respaldo.
- [ ] Ensayar el recorrido completo con cronómetro y con todos los integrantes.

## Control de tiempos

| Sección | Tiempo asignado |
| --- | --- |
| Pitch | 2 minutos |
| Demostración en vivo | 4 minutos |
| Relato técnico y aprendizajes | 4 minutos |
| Preguntas y defensa | 3 minutos |
| **Total** | **13 minutos** |

## Orden de trabajo sugerido

- [ ] **Antes de la entrega del 16 de noviembre:** terminar las diapositivas, grabar el video y subir ambos materiales al Aula.
- [ ] **Antes del día de presentación:** cerrar el diagrama, documentar la prueba ejecutada, distribuir las intervenciones y ensayar.
- [ ] **El día de presentación:** comprobar datos y conexión, abrir las pestañas necesarias y tener a mano los respaldos.
