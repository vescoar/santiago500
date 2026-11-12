from django.urls import path

from . import views

urlpatterns = [
    path("", views.mapa, name="mapa"),
    path("api/estaciones/", views.api_estaciones, name="api_estaciones"),
]
