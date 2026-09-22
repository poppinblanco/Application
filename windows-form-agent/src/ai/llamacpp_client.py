"""Client pour un serveur llama.cpp local (llama-server.exe).

Alternative 100% portable a Ollama : llama-server.exe est un executable
unique, sans installateur ni service Windows -- ideal sur un poste
verrouille qui autorise l'execution de programmes portables mais pas
l'installation de nouveaux logiciels (aucun droit administrateur requis).

llama.cpp expose une API compatible OpenAI (/v1/chat/completions). Ce
client garde exactement la meme interface que ai/ollama_client.py
(is_available/ask_text/extract_json), pour que le reste du programme n'ait
pas a savoir quel moteur d'IA tourne derriere (voir ai/factory.py).
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger(__name__)


class LlamaCppError(RuntimeError):
    pass


class LlamaCppClient:
    def __init__(self, host: str = "http://127.0.0.1:8080", timeout_seconds: int = 120):
        self.host = host.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def is_available(self) -> bool:
        try:
            resp = requests.get(f"{self.host}/health", timeout=5)
            return resp.status_code == 200
        except requests.RequestException:
            return False

    def _chat(self, prompt: str, json_mode: bool = False) -> str:
        payload: dict[str, Any] = {
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            resp = requests.post(
                f"{self.host}/v1/chat/completions", json=payload, timeout=self.timeout_seconds
            )
        except requests.RequestException as exc:
            raise LlamaCppError(
                f"Impossible de contacter le moteur d'IA local sur {self.host}. "
                "Verifie que llama-server.exe est bien lance (voir run_portable.bat)."
            ) from exc

        if resp.status_code != 200:
            raise LlamaCppError(f"Le moteur d'IA local a repondu {resp.status_code}: {resp.text[:500]}")

        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise LlamaCppError(f"Reponse inattendue du moteur d'IA local : {data}") from exc

    def ask_text(self, prompt: str, json_mode: bool = False) -> str:
        return self._chat(prompt, json_mode=json_mode)

    def ask_vision(self, prompt: str, image_path: str | Path, json_mode: bool = False) -> str:
        raise LlamaCppError(
            "Le mode vision d'ecran n'est pas pris en charge par le moteur portable llama.cpp "
            "dans cette version. Utilise Ollama si tu as besoin de cette fonctionnalite."
        )

    def extract_json(self, prompt: str, image_path: str | Path | None = None) -> dict[str, Any]:
        raw = (
            self.ask_vision(prompt, image_path, json_mode=True)
            if image_path is not None
            else self.ask_text(prompt, json_mode=True)
        )
        return self._safe_parse_json(raw)

    @staticmethod
    def _safe_parse_json(raw: str) -> dict[str, Any]:
        raw = raw.strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = raw[start : end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as exc:
                raise LlamaCppError(
                    f"Reponse du modele non exploitable en JSON : {raw[:300]}"
                ) from exc

        raise LlamaCppError(f"Reponse du modele non exploitable en JSON : {raw[:300]}")
