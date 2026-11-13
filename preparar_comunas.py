"""
Descarga los límites de las comunas de Chile y deja solo las 34 del Gran Santiago.
Ejecutar UNA VEZ, desde la carpeta que tiene manage.py, con el venv activado:

    python preparar_comunas.py
"""
import json
import os
import unicodedata

import requests

URL = "https://raw.githubusercontent.com/fcortes/Chile-GeoJSON/refs/heads/master/comunas.geojson"
SALIDA = os.path.join("santiago500", "static", "santiago500", "comunas.geojson")

COMUNAS = [
    "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central",
    "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja",
    "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo",
    "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda",
    "Peñalolén", "Providencia", "Pudahuel", "Puente Alto", "Quilicura",
    "Quinta Normal", "Recoleta", "Renca", "San Bernardo", "San Joaquín",
    "San Miguel", "San Ramón", "Santiago", "Vitacura",
]


def norm(texto):
    """Minúsculas y sin tildes, para comparar nombres sin problemas de ortografía."""
    sin_tildes = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode()
    return sin_tildes.lower().strip()


def redondear(coords):
    """Redondea a 4 decimales (~10 m) para que el archivo pese menos."""
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], 4), round(coords[1], 4)]
    return [redondear(c) for c in coords]


def main():
    print("Descargando límites de comunas (puede tardar un poco)...")
    resp = requests.get(URL, timeout=180)
    resp.raise_for_status()
    datos = resp.json()

    buscadas = {norm(n): n for n in COMUNAS}
    features = []
    encontradas = set()

    for f in datos["features"]:
        props = f.get("properties", {})
        if "metropolitana" not in norm(props.get("Region", "")):
            continue
        clave = norm(props.get("Comuna", ""))
        if clave not in buscadas:
            continue
        encontradas.add(clave)
        features.append(
            {
                "type": "Feature",
                "properties": {"nombre": buscadas[clave]},
                "geometry": {
                    "type": f["geometry"]["type"],
                    "coordinates": redondear(f["geometry"]["coordinates"]),
                },
            }
        )

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as archivo:
        json.dump(
            {"type": "FeatureCollection", "features": features},
            archivo,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    print(f"Listo: {len(features)} comunas guardadas en {SALIDA}")
    faltan = [n for k, n in buscadas.items() if k not in encontradas]
    if faltan:
        print("No se encontraron:", ", ".join(faltan))


if __name__ == "__main__":
    main()
