from django.db import models


class ZonaMonitoreo(models.Model):
    uid = models.IntegerField(unique=True)  # id de la estación en WAQI
    nombre = models.CharField(max_length=200)
    latitud = models.FloatField()
    longitud = models.FloatField()

    class Meta:
        verbose_name = "zona de monitoreo"
        verbose_name_plural = "zonas de monitoreo"

    def __str__(self):
        return self.nombre


class RegistroContaminacion(models.Model):
    zona = models.ForeignKey(
        ZonaMonitoreo, on_delete=models.CASCADE, related_name="registros"
    )
    aqi = models.IntegerField()
    medido_en = models.DateTimeField()  # hora de la medición según la estación
    creado_en = models.DateTimeField(auto_now_add=True)  # cuándo lo guardamos

    class Meta:
        verbose_name = "registro de contaminación"
        verbose_name_plural = "registros de contaminación"
        ordering = ["-medido_en"]
        constraints = [
            models.UniqueConstraint(
                fields=["zona", "medido_en"], name="registro_unico_por_hora"
            )
        ]

    def __str__(self):
        return f"{self.zona} - AQI {self.aqi} ({self.medido_en:%d-%m %H:%M})"
