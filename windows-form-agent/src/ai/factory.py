"""Choisit et prepare le moteur d'IA (Ollama ou llama.cpp portable) selon
`config.ai_engine`, pour que le reste du programme (documents/field_extractor.py,
automation/screen_agent.py) n'ait pas a savoir lequel tourne : les deux
clients exposent la meme interface (is_available/ask_text/extract_json).
"""
from __future__ import annotations

import logging

from config import AppConfig

logger = logging.getLogger(__name__)


def make_ai_client(config: AppConfig):
    """Renvoie un client IA pret a l'emploi. Pour le moteur "llamacpp", le
    processus llama-server.exe est demarre automatiquement si besoin (voir
    LlamaCppConfig.auto_start) et attache au client via `.process`, pour que
    l'appelant puisse l'arreter proprement (voir stop_ai_client)."""
    if config.ai_engine == "llamacpp":
        from ai.llamacpp_client import LlamaCppClient
        from ai.llamacpp_process import LlamaCppProcess

        process = LlamaCppProcess(
            server_path=config.llamacpp.server_path,
            model_path=config.llamacpp.model_path,
            host=config.llamacpp.host,
            port=config.llamacpp.port,
            context_size=config.llamacpp.context_size,
        )
        if config.llamacpp.auto_start:
            process.start()

        client = LlamaCppClient(host=process.base_url, timeout_seconds=120)
        client.process = process
        return client

    from ai.ollama_client import OllamaClient

    client = OllamaClient(
        host=config.ollama.host,
        text_model=config.ollama.text_model,
        vision_model=config.ollama.vision_model,
        timeout_seconds=config.ollama.timeout_seconds,
    )
    client.process = None
    return client


def stop_ai_client(client) -> None:
    """Arrete proprement le processus du moteur d'IA local si le client en
    gere un (llama.cpp uniquement -- ne fait rien pour Ollama, qui tourne
    independamment du programme)."""
    process = getattr(client, "process", None)
    if process is not None:
        process.stop()
