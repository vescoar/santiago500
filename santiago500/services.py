from datetime import datetime, timezone as dt_timezone
from email.utils import parsedate_to_datetime

import requests

from .models import RegistroContaminacion, ZonaMonitoreo

URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# Las 34 comunas del Gran Santiago (32 de la provincia de Santiago + Puente Alto y San Bernardo).
# Coordenadas aproximadas del centro de cada comuna.
COMUNAS = [
    ("Cerrillos", -33.4950, -70.7164),
    ("Cerro Navia", -33.4222, -70.7347),
    ("Conchalí", -33.3841, -70.6755),
    ("El Bosque", -33.5667, -70.6767),
    ("Estación Central", -33.4608, -70.6783),
    ("Huechuraba", -33.3700, -70.6400),
    ("Independencia", -33.4175, -70.6600),
    ("La Cisterna", -33.5333, -70.6633),
    ("La Florida", -33.5167, -70.5922),
    ("La Granja", -33.5367, -70.6233),
    ("La Pintana", -33.5842, -70.6342),
    ("La Reina", -33.4452, -70.5481),
    ("Las Condes", -33.4080, -70.5670),
    ("Lo Barnechea", -33.3500, -70.5000),
    ("Lo Espejo", -33.5233, -70.6900),
    ("Lo Prado", -33.4450, -70.7200),
    ("Macul", -33.4900, -70.5980),
    ("Maipú", -33.5100, -70.7580),
    ("Ñuñoa", -33.4569, -70.5978),
    ("Pedro Aguirre Cerda", -33.4900, -70.6700),
    ("Peñalolén", -33.4850, -70.5400),
    ("Providencia", -33.4320, -70.6100),
    ("Pudahuel", -33.4400, -70.7600),
    ("Puente Alto", -33.6117, -70.5758),
    ("Quilicura", -33.3600, -70.7300),
    ("Quinta Normal", -33.4290, -70.6910),
    ("Recoleta", -33.4060, -70.6420),
    ("Renca", -33.4022, -70.7283),
    ("San Bernardo", -33.5933, -70.7000),
    ("San Joaquín", -33.4950, -70.6250),
    ("San Miguel", -33.4950, -70.6500),
    ("San Ramón", -33.5400, -70.6450),
    ("Santiago", -33.4569, -70.6483),
    ("Vitacura", -33.3830, -70.5740),
]

# uid = posición en la lista (empezando en 1). Si agregas comunas, agrégalas al final.
ZONAS = [(i, nombre, lat, lon) for i, (nombre, lat, lon) in enumerate(COMUNAS, start=1)]


class ErrorAPI(Exception):
    def __init__(self, mensaje, segundos_reintento=600):
        super().__init__(mensaje)
        self.segundos_reintento = segundos_reintento


def actualizar_datos():
    """Consulta Open-Meteo para todas las comunas y guarda lo nuevo. Devuelve cuántos registros nuevos."""
    try:
        resp = requests.get(
            URL,
            params={
                "latitude": ",".join(str(z[2]) for z in ZONAS),
                "longitude": ",".join(str(z[3]) for z in ZONAS),
                "current": "us_aqi,pm2_5",
            },
            timeout=20,
        )
        resp.raise_for_status()
        datos = resp.json()
    except (requests.RequestException, ValueError) as e:
        if isinstance(e, requests.HTTPError) and e.response is not None and e.response.status_code == 429:
            # Respeta Retry-After si la fuente indica una espera; si no, espera una hora.
            espera = 3600
            cabecera = e.response.headers.get("Retry-After")
            if cabecera:
                try:
                    espera = max(600, int(cabecera))
                except ValueError:
                    try:
                        fecha = parsedate_to_datetime(cabecera)
                        espera = max(600, (fecha - datetime.now(dt_timezone.utc)).total_seconds())
                    except (TypeError, ValueError, OverflowError):
                        pass
            raise ErrorAPI(
                "Open-Meteo limitó temporalmente las consultas (HTTP 429). "
                "Mostramos los últimos datos guardados mientras esperamos para reintentar.",
                segundos_reintento=espera,
            ) from e
        raise ErrorAPI("No se pudo consultar Open-Meteo. Mostramos los últimos datos guardados.") from e

    if isinstance(datos, dict):
        datos = [datos]

    # Borra zonas antiguas (por ejemplo las 8 estaciones de antes) que ya no están en la lista
    ZonaMonitoreo.objects.exclude(uid__in=[z[0] for z in ZONAS]).delete()

    nuevos = 0
    for (uid, nombre, lat, lon), d in zip(ZONAS, datos):
        actual = d.get("current") or {}
        aqi = actual.get("us_aqi")
        if aqi is None:
            continue

        zona, _ = ZonaMonitoreo.objects.update_or_create(
            uid=uid,
            defaults={"nombre": nombre, "latitud": lat, "longitud": lon},
        )
        medido = datetime.fromisoformat(actual["time"]).replace(tzinfo=dt_timezone.utc)
        _, creado = RegistroContaminacion.objects.get_or_create(
            zona=zona,
            medido_en=medido,
            defaults={"aqi": round(aqi)},
        )
        nuevos += creado
    return nuevos
