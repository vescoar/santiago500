from datetime import datetime

import requests
from django.conf import settings
from django.utils import timezone

from .models import RegistroContaminacion, ZonaMonitoreo

# Rectángulo que cubre Santiago: lat_sur, lon_oeste, lat_norte, lon_este
SANTIAGO_BOUNDS = "-33.65,-70.85,-33.30,-70.45"
WAQI_URL = "https://api.waqi.info/map/bounds/"


class ErrorAPI(Exception):
    pass


def _parse_hora(valor):
    """Convierte la hora de la estación a datetime con zona horaria."""
    try:
        dt = datetime.fromisoformat(valor)
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        return dt
    except (TypeError, ValueError):
        return timezone.now().replace(minute=0, second=0, microsecond=0)


def actualizar_datos():
    """Pide las estaciones de Santiago a WAQI y guarda lo nuevo. Devuelve cuántos registros nuevos."""
    token = settings.WAQI_TOKEN
    if not token:
        raise ErrorAPI("Falta WAQI_TOKEN en el archivo .env")

    try:
        resp = requests.get(
            WAQI_URL,
            params={"latlng": SANTIAGO_BOUNDS, "token": token},
            timeout=10,
        )
        resp.raise_for_status()
        payload = resp.json()
    except (requests.RequestException, ValueError) as e:
        raise ErrorAPI(f"No se pudo consultar la API: {e}")

    if payload.get("status") != "ok":
        raise ErrorAPI(f"La API respondió con error: {payload.get('data')}")

    nuevos = 0
    for est in payload["data"]:
        try:
            aqi = int(est["aqi"])  # viene como "-" si la estación no reporta
        except (ValueError, TypeError):
            continue

        zona, _ = ZonaMonitoreo.objects.update_or_create(
            uid=est["uid"],
            defaults={
                "nombre": est["station"]["name"],
                "latitud": est["lat"],
                "longitud": est["lon"],
            },
        )
        _, creado = RegistroContaminacion.objects.get_or_create(
            zona=zona,
            medido_en=_parse_hora(est["station"].get("time")),
            defaults={"aqi": aqi},
        )
        nuevos += creado
    return nuevos
