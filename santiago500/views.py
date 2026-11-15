from datetime import timedelta

from django.http import JsonResponse
from django.db.models import Q
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.cache import never_cache

from .models import EstadoActualizacion, ZonaMonitoreo
from .services import ErrorAPI, actualizar_datos

MINUTOS_CACHE = 10


def mapa(request):
    return render(request, "santiago500/mapa.html")


@never_cache
def api_estaciones(request):
    estado, _ = EstadoActualizacion.objects.get_or_create(pk=1)
    ahora = timezone.now()
    reservado = EstadoActualizacion.objects.filter(pk=estado.pk).filter(
        Q(proximo_intento__isnull=True) | Q(proximo_intento__lte=ahora)
    ).update(proximo_intento=ahora + timedelta(minutes=MINUTOS_CACHE))
    if reservado:
        try:
            actualizar_datos()
        except ErrorAPI as e:
            EstadoActualizacion.objects.filter(pk=estado.pk).update(
                aviso=str(e),
                proximo_intento=timezone.now() + timedelta(seconds=e.segundos_reintento),
            )
        else:
            EstadoActualizacion.objects.filter(pk=estado.pk).update(
                aviso="", proximo_intento=timezone.now() + timedelta(minutes=MINUTOS_CACHE),
            )
    estado.refresh_from_db()

    estaciones = []
    for zona in ZonaMonitoreo.objects.all():
        reg = zona.registros.first()
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

    return JsonResponse({
        "estaciones": estaciones,
        "aviso": estado.aviso or None,
        "proximo_intento": timezone.localtime(estado.proximo_intento).strftime("%d-%m-%Y %H:%M")
        if estado.aviso and estado.proximo_intento else None,
    })
