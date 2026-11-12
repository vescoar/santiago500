from datetime import timedelta

from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone

from .models import RegistroContaminacion, ZonaMonitoreo
from .services import ErrorAPI, actualizar_datos

MINUTOS_CACHE = 10


def mapa(request):
    return render(request, "santiago500/mapa.html")


def api_estaciones(request):
    """Último AQI de cada estación. Refresca desde la API si los datos tienen más de 10 min."""
    ultimo = RegistroContaminacion.objects.order_by("-creado_en").first()
    desactualizado = (
        ultimo is None
        or timezone.now() - ultimo.creado_en > timedelta(minutes=MINUTOS_CACHE)
    )

    aviso = None
    if desactualizado:
        try:
            actualizar_datos()
        except ErrorAPI as e:
            # Si falla, seguimos mostrando lo último que tengamos guardado
            aviso = str(e)

    estaciones = []
    for zona in ZonaMonitoreo.objects.all():
        reg = zona.registros.first()  # ordering = -medido_en
        if reg is None:
            continue
        estaciones.append(
            {
                "nombre": zona.nombre,
                "lat": zona.latitud,
                "lon": zona.longitud,
                "aqi": reg.aqi,
                "medido_en": timezone.localtime(reg.medido_en).strftime("%d-%m-%Y %H:%M"),
            }
        )

    return JsonResponse({"estaciones": estaciones, "aviso": aviso})
