from django.contrib import admin

from .models import RegistroContaminacion, ZonaMonitoreo


@admin.register(ZonaMonitoreo)
class ZonaMonitoreoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "uid", "latitud", "longitud")
    search_fields = ("nombre",)


@admin.register(RegistroContaminacion)
class RegistroContaminacionAdmin(admin.ModelAdmin):
    list_display = ("zona", "aqi", "medido_en", "creado_en")
    list_filter = ("zona",)
