# Santiago500 sin smog

Aplicación web que muestra la calidad del aire en las comunas del Gran Santiago sobre un mapa interactivo. Cada comuna se pinta con el color de su nivel de contaminación (índice AQI) y muestra el valor en el centro.

Proyecto para el curso **IWG400 Proyecto Inicial**, Universidad Técnica Federico Santa María.

![Mapa de calidad del aire por comuna](docs/mapa.png)

## Qué hace

- Mapa de Santiago con las 34 comunas del Gran Santiago coloreadas según su AQI.
- Número de AQI en el centro de cada comuna (aparece al acercar el zoom, para que no se amontonen).
- Selección de comuna desde el mapa o un selector accesible con teclado. La comuna queda resaltada y su ficha muestra nombre, AQI, categoría y fecha del dato.
- Panel «Tu salud, primero»: orientación en español según el AQI y los grupos seleccionados (asma o afecciones respiratorias, infancia, personas mayores, embarazo, enfermedades cardiovasculares y ejercicio exterior). Permite combinar grupos y limpiar la selección; sin selecciones, orienta a la población general.
- Interfaz adaptable a computador, tablet y celular, con leyenda fuera del mapa, acceso directo a las recomendaciones y una guía breve para interpretar los datos.
- Vista inicial centrada en el área urbana; «Ver todo» muestra los límites completos de las comunas. El botón «Actualizar» permite volver a consultar los datos respetando la caché del servidor.
- Leyenda con las categorías de la escala AQI de la EPA, de "Bueno" a "Peligroso".
- Los datos se guardan en base de datos y se refrescan automáticamente cada 10 minutos.
- Si la API externa falla, el mapa sigue mostrando los últimos datos guardados y avisa del problema.

## Tecnologías

| Parte | Herramienta |
|---|---|
| Backend | Python y Django |
| Base de datos | SQLite |
| Mapa | Leaflet con teselas de OpenStreetMap |
| Datos de calidad del aire | API de Open-Meteo (Air Quality) |
| Límites de comunas | GeoJSON de [fcortes/Chile-GeoJSON](https://github.com/fcortes/Chile-GeoJSON) |

## Cómo funciona

1. El navegador carga la página del mapa y pide los datos a `/api/estaciones/`.
2. Django revisa cuándo se guardó el último registro. Si tiene más de 10 minutos, consulta Open-Meteo, que entrega el AQI actual para un punto de cada comuna.
3. Los resultados se guardan en dos modelos: `ZonaMonitoreo` (comuna y coordenadas) y `RegistroContaminacion` (AQI y hora).
4. El endpoint devuelve el último registro de cada comuna en JSON.
5. El frontend une esos datos con el archivo `comunas.geojson`, pinta cada polígono según su nivel y pone el número en su centro.

## Limitaciones y decisiones de diseño

- **Los datos son modelados, no mediciones de estaciones.** Open-Meteo entrega estimaciones de un modelo atmosférico. Es una buena aproximación general, pero no reemplaza las mediciones oficiales.
- **La resolución del modelo es más gruesa que una comuna.** Por eso comunas vecinas suelen compartir el mismo valor y el mismo color.
- **Los polígonos incluyen zonas no urbanas.** Comunas como Lo Barnechea, Las Condes o Puente Alto llegan hasta la cordillera, y el color representa un solo punto de la comuna.
- **Por qué no usamos estaciones reales:** primero probamos la API de WAQI/AQICN con las estaciones de Santiago, pero al momento de las pruebas todas reportaban `"aqi":"-"` con datos de hacía varios días. Por eso cambiamos a Open-Meteo, que siempre entrega datos actuales.
- Las coordenadas usadas para cada comuna son aproximadas.
- **La orientación de salud es general.** Los textos se adaptan de las guías [EPA/AirNow de partículas](https://document.airnow.gov/air-quality-guide-for-particle-pollution.pdf) y [ozono](https://document.airnow.gov/air-quality-guide-for-ozone.pdf). Como el mapa muestra el AQI agregado y no identifica el contaminante dominante, se usan precauciones generales, sin recomendar horarios específicos. No reemplazan una evaluación médica ni el plan de acción para el asma. Los grupos elegidos se mantienen solo en la página abierta y no se envían al servidor.

## Instalación (Windows)

Requisitos: Python 3 y Git.

```
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Luego abre http://localhost:8000.

Notas:
- Usa el **Símbolo del sistema (cmd)**. En PowerShell, la activación del entorno virtual puede estar bloqueada.
- No hace falta ningún token ni archivo `.env` para los datos de Open-Meteo.
- La primera carga puede demorar unos segundos, porque en ese momento se consultan los datos.
- Para ver los datos guardados, crea un administrador con `python manage.py createsuperuser` y entra a `/admin`.

## Archivos estáticos en Vercel

Con el soporte nativo de Django de Vercel, `STATIC_ROOT` activa la recopilación automática de archivos durante el despliegue. Vercel publica el contenido de `staticfiles/` en `/static/` desde su CDN. Esto incluye el CSS, los scripts, el GeoJSON y los estilos del administrador, incluso con `DEBUG=False`.

La carpeta `staticfiles/` se genera durante el build y no se sube al repositorio. Para comprobar la recopilación localmente:

```
python manage.py collectstatic --noinput
```

Después de subir cambios a la configuración, realiza un nuevo despliegue. La carpeta raíz del proyecto en Vercel debe ser la que contiene `manage.py` y `requirements.txt`.

Referencia: [Django en Vercel: archivos estáticos](https://vercel.com/docs/frameworks/full-stack/django#serving-static-assets).

## Estructura del proyecto

```
santiago500sinsmog/
├── manage.py
├── requirements.txt
├── preparar_comunas.py          # genera comunas.geojson a partir de los límites de Chile
├── santiago500sinsmog/          # configuración de Django (settings.py, urls.py)
└── santiago500/                 # aplicación
    ├── models.py                # ZonaMonitoreo y RegistroContaminacion
    ├── services.py              # consulta a Open-Meteo y guardado de datos
    ├── views.py                 # página del mapa y endpoint JSON
    ├── urls.py
    ├── admin.py
    ├── static/santiago500/
    │   ├── comunas.geojson      # límites de las 34 comunas
    │   ├── mapa.css             # diseño adaptable y estilos del mapa
    │   ├── mapa.js              # selección, mapa y actualización de la interfaz
    │   └── salud.js             # categorías AQI y orientación por grupo
    └── templates/santiago500/
        └── mapa.html            # mapa con Leaflet
```

## Endpoints

| Ruta | Descripción |
|---|---|
| `/` | Mapa de calidad del aire |
| `/api/estaciones/` | Último AQI de cada comuna en JSON (`estaciones` y `aviso`) |
| `/admin/` | Administración de Django |

## Regenerar los límites de comunas

El archivo `comunas.geojson` ya viene incluido. Si necesitas regenerarlo:

```
python preparar_comunas.py
```

El script descarga los límites de todas las comunas de Chile y conserva solo las 34 del Gran Santiago.

## Posibles mejoras

- Usar estaciones de monitoreo reales (por ejemplo, las del SINCA) cuando haya una fuente de datos confiable y de libre acceso.
- Historial y gráficos de la evolución del AQI por comuna.
- Alertas cuando una comuna supere un umbral.
- Actualización programada de datos, sin depender de que alguien abra la página.

## Comprobar la orientación de salud

Con Node.js 18 o superior, sin instalar paquetes adicionales:

```
node --test tests/salud.test.cjs
```

Las pruebas verifican los límites AQI, las precauciones para grupos combinados y el rechazo de valores inválidos. Para probar la interfaz, abre el mapa, elige una comuna (con un clic o con el selector) y cambia los grupos del panel; la orientación se actualiza sin volver a consultar la API. En celular, el enlace «Ver recomendaciones» lleva a la ficha debajo del mapa.

## Créditos

- Datos de calidad del aire: [Open-Meteo](https://open-meteo.com/)
- Mapa base: © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Biblioteca de mapas: [Leaflet](https://leafletjs.com/)
- Límites de comunas: [fcortes/Chile-GeoJSON](https://github.com/fcortes/Chile-GeoJSON), basado en datos de la Biblioteca del Congreso Nacional de Chile

## Equipo

Vicente Escobar
Christian Franco
Antonia Estrada
Alexander Friant
Jose Francisco Escobar
