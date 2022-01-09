from django.urls import path

from .websocket_consumers import ChangeNotifier

websocket_urlpatterns = [
    path('ws/', ChangeNotifier.as_asgi())
]
