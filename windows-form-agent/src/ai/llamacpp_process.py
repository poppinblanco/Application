"""Demarrage/arret automatique de llama-server.exe (moteur d'IA portable).

Objectif : que l'utilisateur n'ait jamais a ouvrir une invite de commandes
ou a lancer quoi que ce soit manuellement -- le programme demarre le
moteur d'IA tout seul au besoin, comme il le ferait pour verifier
qu'Ollama tourne, et l'arrete proprement a la fermeture.
"""
from __future__ import annotations

import logging
import subprocess
import time
from pathlib import Path

import requests

logger = logging.getLogger(__name__)


class LlamaCppProcess:
    def __init__(
        self,
        server_path: str | Path,
        model_path: str | Path,
        host: str = "127.0.0.1",
        port: int = 8080,
        context_size: int = 4096,
    ):
        self.server_path = Path(server_path)
        self.model_path = Path(model_path)
        self.host = host
        self.port = port
        self.context_size = context_size
        self._process: subprocess.Popen | None = None

    @property
    def base_url(self) -> str:
        return f"http://{self.host}:{self.port}"

    def is_running(self) -> bool:
        if self._process is not None and self._process.poll() is not None:
            return False
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=2)
            return resp.status_code == 200
        except requests.RequestException:
            return False

    def start(self, timeout_seconds: int = 60) -> None:
        """Demarre llama-server.exe s'il ne tourne pas deja, et attend qu'il
        soit pret a repondre. Ne fait rien si un serveur repond deja sur ce
        port (par exemple demarre manuellement, ou par un lancement precedent
        pas encore arrete)."""
        if self.is_running():
            logger.info("Moteur d'IA local deja demarre sur %s.", self.base_url)
            return

        if not self.server_path.exists():
            raise FileNotFoundError(
                f"'{self.server_path}' introuvable. Verifie que le paquet portable a ete "
                "assemble correctement (voir PORTABLE_BUILD.md)."
            )
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Modele d'IA introuvable : '{self.model_path}'. Verifie que le paquet portable "
                "a ete assemble correctement (voir PORTABLE_BUILD.md)."
            )

        logger.info("Demarrage du moteur d'IA local : %s", self.server_path)
        self._process = subprocess.Popen(
            [
                str(self.server_path),
                "--model", str(self.model_path),
                "--host", self.host,
                "--port", str(self.port),
                "--ctx-size", str(self.context_size),
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            if self.is_running():
                logger.info("Moteur d'IA local pret sur %s.", self.base_url)
                return
            if self._process.poll() is not None:
                raise RuntimeError(
                    "Le moteur d'IA local s'est arrete de facon inattendue au demarrage "
                    "(modele corrompu, incompatible, ou memoire insuffisante ?)."
                )
            time.sleep(0.5)

        self.stop()
        raise TimeoutError(f"Le moteur d'IA local n'a pas demarre dans les {timeout_seconds}s.")

    def stop(self) -> None:
        if self._process is not None and self._process.poll() is None:
            logger.info("Arret du moteur d'IA local.")
            self._process.terminate()
            try:
                self._process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._process.kill()
        self._process = None
