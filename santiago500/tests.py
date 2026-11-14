from datetime import timedelta
from unittest.mock import patch

import requests
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from .models import EstadoActualizacion, RegistroContaminacion, ZonaMonitoreo
from .services import ErrorAPI, actualizar_datos


class ActualizacionEstacionesTests(TestCase):
    def setUp(self):
        self.ahora = timezone.now()
        zona = ZonaMonitoreo.objects.create(uid=1, nombre="Santiago", latitud=-33.45, longitud=-70.65)
        RegistroContaminacion.objects.create(zona=zona, aqi=80, medido_en=self.ahora - timedelta(hours=4))

    @patch("santiago500.views.actualizar_datos", return_value=0)
    def test_dato_repetido_no_provoca_consulta_por_cada_visita(self, actualizar):
        for _ in range(3):
            respuesta = self.client.get("/api/estaciones/")
            self.assertEqual(respuesta.status_code, 200)
            self.assertIsNone(respuesta.json()["aviso"])
        actualizar.assert_called_once()

    @patch("santiago500.views.actualizar_datos", side_effect=ErrorAPI("Límite HTTP 429", 3600))
    def test_limite_conserva_datos_y_aviso_sin_repetir_consulta(self, actualizar):
        primera = self.client.get("/api/estaciones/").json()
        segunda = self.client.get("/api/estaciones/").json()
        self.assertEqual(primera["estaciones"][0]["aqi"], 80)
        self.assertEqual(primera["aviso"], "Límite HTTP 429")
        self.assertEqual(segunda["aviso"], primera["aviso"])
        self.assertTrue(segunda["proximo_intento"])
        self.assertGreater(EstadoActualizacion.objects.get(pk=1).proximo_intento, self.ahora + timedelta(minutes=59))
        actualizar.assert_called_once()

    @patch("santiago500.views.actualizar_datos", return_value=0)
    def test_reintenta_al_vencer_la_espera_y_limpia_aviso(self, actualizar):
        EstadoActualizacion.objects.create(pk=1, proximo_intento=self.ahora - timedelta(seconds=1), aviso="Fallo anterior")
        respuesta = self.client.get("/api/estaciones/")
        self.assertIsNone(respuesta.json()["aviso"])
        self.assertIsNone(respuesta.json()["proximo_intento"])
        self.assertIn("no-store", respuesta.headers["Cache-Control"])
        actualizar.assert_called_once()

    @patch("santiago500.views.actualizar_datos")
    def test_una_reserva_existente_impide_otro_intento(self, actualizar):
        EstadoActualizacion.objects.create(pk=1, proximo_intento=self.ahora + timedelta(minutes=10))
        self.client.get("/api/estaciones/")
        actualizar.assert_not_called()

    @patch("santiago500.views.actualizar_datos", return_value=0)
    def test_vuelve_a_consultar_tras_diez_minutos(self, actualizar):
        self.client.get("/api/estaciones/")
        with patch("santiago500.views.timezone.now", return_value=self.ahora + timedelta(minutes=11)):
            self.client.get("/api/estaciones/")
        self.assertEqual(actualizar.call_count, 2)

    @patch("santiago500.views.actualizar_datos", side_effect=ErrorAPI("Fuente no disponible"))
    def test_sin_datos_el_error_no_se_convierte_en_resultado_favorable(self, actualizar):
        RegistroContaminacion.objects.all().delete()
        respuesta = self.client.get("/api/estaciones/").json()
        self.assertEqual(respuesta["estaciones"], [])
        self.assertEqual(respuesta["aviso"], "Fuente no disponible")


class LimiteOpenMeteoTests(SimpleTestCase):
    def respuesta_limite(self, cabecera=None):
        respuesta = requests.Response()
        respuesta.status_code = 429
        respuesta.url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        if cabecera is not None:
            respuesta.headers["Retry-After"] = cabecera
        return respuesta

    @patch("santiago500.services.requests.get")
    def test_limite_sin_cabecera_espera_una_hora(self, get):
        get.return_value = self.respuesta_limite()
        with self.assertRaises(ErrorAPI) as error:
            actualizar_datos()
        self.assertEqual(error.exception.segundos_reintento, 3600)
        self.assertIn("HTTP 429", str(error.exception))

    @patch("santiago500.services.requests.get")
    def test_respeta_una_espera_mayor_indicada_por_la_fuente(self, get):
        get.return_value = self.respuesta_limite("7200")
        with self.assertRaises(ErrorAPI) as error:
            actualizar_datos()
        self.assertEqual(error.exception.segundos_reintento, 7200)

    @patch("santiago500.services.requests.get")
    def test_cabecera_invalida_no_rompe_el_manejo_del_error(self, get):
        get.return_value = self.respuesta_limite("no es una fecha")
        with self.assertRaises(ErrorAPI) as error:
            actualizar_datos()
        self.assertEqual(error.exception.segundos_reintento, 3600)
