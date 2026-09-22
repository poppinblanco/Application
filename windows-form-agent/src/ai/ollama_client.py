"""Client minimal pour un serveur Ollama local (IA open source, 100% locale).

Ollama (https://ollama.com) fait tourner des modeles ouverts (Llama, Mistral,
LLaVA, Qwen, ...) directement sur la machine, sans envoyer de donnees sur
internet. Ce module se contente d'appeler son API HTTP locale.
"""
from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger(__name__)


class OllamaError(RuntimeError):
    pass


class OllamaClient:
    def __init__(self, host: str, text_model: str, vision_model: str, timeout_seconds: int = 120):
        self.host = host.rstrip("/")
        self.text_model = text_model
        self.vision_model = vision_model
        self.timeout_seconds = timeout_seconds

    def is_available(self) -> bool:
        try:
            resp = requests.get(f"{self.host}/api/tags", timeout=5)
            return resp.status_code == 200
        except requests.RequestException:
            return False

    def _generate(self, model: str, prompt: str, images: list[str] | None = None, json_mode: bool = False) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }
        if images:
            payload["images"] = images
        if json_mode:
            payload["format"] = "json"

        try:
            resp = requests.post(
                f"{self.host}/api/generate",
                json=payload,
                timeout=self.timeout_seconds,
            )
        except requests.RequestException as exc:
            raise OllamaError(
                f"Impossible de contacter Ollama sur {self.host}. "
                "Verifie qu'Ollama est installe et lance ('ollama serve')."
            ) from exc

        if resp.status_code != 200:
            raise OllamaError(f"Ollama a repondu {resp.status_code}: {resp.text[:500]}")

        data = resp.json()
        return data.get("response", "")

    def ask_text(self, prompt: str, json_mode: bool = False) -> str:
        """Interroge le modele de texte local avec un prompt simple."""
        return self._generate(self.text_model, prompt, json_mode=json_mode)

    def ask_vision(self, prompt: str, image_path: str | Path, json_mode: bool = False) -> str:
        """Interroge le modele de vision local avec une image (capture d'ecran, scan...)."""
        image_bytes = Path(image_path).read_bytes()
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return self._generate(self.vision_model, prompt, images=[encoded], json_mode=json_mode)

    def extract_json(self, prompt: str, image_path: str | Path | None = None) -> dict[str, Any]:
        """Demande une reponse strictement JSON et la parse.

        Si le modele renvoie du texte autour du JSON, on tente d'isoler le
        premier bloc {...} valide plutot que d'echouer directement.
        """
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
                raise OllamaError(
                    f"Reponse du modele non exploitable en JSON : {raw[:300]}"
                ) from exc

        raise OllamaError(f"Reponse du modele non exploitable en JSON : {raw[:300]}")
