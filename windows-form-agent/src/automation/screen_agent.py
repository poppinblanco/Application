"""Mode de secours "vision d'ecran" : capture d'ecran + IA locale + clic/frappe.

A utiliser uniquement quand aucune autre methode structuree (formulaire PDF,
selecteurs web, controles UIA) n'est disponible -- par exemple un logiciel
proprietaire sans automatisation possible. Le modele de vision local (ex:
LLaVA via Ollama) regarde une capture d'ecran et indique ou se trouve le
champ decrit ; l'agent clique puis tape le texte.

Securite : ce mode agit reellement sur la souris/clavier de l'utilisateur.
Il est desactive par defaut (voir `require_confirmation`) et journalise
chaque action.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from pathlib import Path

import mss
import mss.tools
import pyautogui

from ai.ollama_client import OllamaClient

logger = logging.getLogger(__name__)

# Securite de base : un clic/frappe met au moins ce delai, et on ne repete
# jamais une action indefiniment en cas de reponse IA incoherente.
ACTION_DELAY_SECONDS = 0.4
MAX_LOCATE_ATTEMPTS = 2


@dataclass
class ScreenTarget:
    x: int
    y: int
    confidence: str  # "high" | "low" tel que renvoye par le modele


class ScreenAgent:
    def __init__(self, client: OllamaClient, screenshot_dir: str | Path, require_confirmation: bool = True):
        self.client = client
        self.screenshot_dir = Path(screenshot_dir)
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)
        self.require_confirmation = require_confirmation

    def capture_screen(self, name: str = "capture") -> Path:
        out_path = self.screenshot_dir / f"{name}_{int(time.time())}.png"
        with mss.mss() as sct:
            monitor = sct.monitors[1]  # ecran principal
            shot = sct.grab(monitor)
            mss.tools.to_png(shot.rgb, shot.size, output=str(out_path))
        logger.info("Capture d'ecran enregistree : %s", out_path)
        return out_path

    def locate_field(self, description: str) -> ScreenTarget | None:
        """Demande au modele de vision les coordonnees (x, y) d'un champ decrit en langage naturel."""
        screenshot = self.capture_screen("locate")
        prompt = (
            "Voici une capture d'ecran d'une application Windows. "
            f"Trouve le champ de formulaire suivant : \"{description}\". "
            "Reponds STRICTEMENT en JSON avec les cles : x, y (position en pixels "
            "du centre du champ dans l'image), et confidence (\"high\" ou \"low\"). "
            "Si tu ne trouves pas le champ, mets confidence a \"low\" et x=0, y=0."
        )

        result = self.client.extract_json(prompt, image_path=screenshot)
        try:
            x = int(result["x"])
            y = int(result["y"])
            confidence = str(result.get("confidence", "low"))
        except (KeyError, TypeError, ValueError):
            logger.warning("Reponse de localisation invalide : %s", result)
            return None

        if x == 0 and y == 0:
            return None

        return ScreenTarget(x=x, y=y, confidence=confidence)

    def click_and_type(self, description: str, text: str) -> bool:
        """Localise un champ decrit en langage naturel, clique dessus et tape le texte.

        Renvoie False sans agir si le champ n'est pas trouve avec une
        confiance suffisante, ou si la confirmation utilisateur est requise
        et refusee.
        """
        for attempt in range(1, MAX_LOCATE_ATTEMPTS + 1):
            target = self.locate_field(description)
            if target is not None and target.confidence == "high":
                break
            logger.warning(
                "Champ '%s' non localise avec confiance suffisante (tentative %d/%d).",
                description,
                attempt,
                MAX_LOCATE_ATTEMPTS,
            )
        else:
            logger.error("Abandon : impossible de localiser '%s' de facon fiable.", description)
            return False

        if self.require_confirmation:
            logger.info(
                "[confirmation requise] Clic prevu sur (%d, %d) pour '%s'.",
                target.x,
                target.y,
                description,
            )
            answer = input(
                f"Confirmer le clic sur '{description}' en ({target.x}, {target.y}) ? [o/N] "
            )
            if answer.strip().lower() not in ("o", "oui", "y", "yes"):
                logger.info("Action annulee par l'utilisateur.")
                return False

        pyautogui.click(target.x, target.y)
        time.sleep(ACTION_DELAY_SECONDS)
        pyautogui.typewrite(text, interval=0.02)
        logger.info("Champ '%s' rempli via vision d'ecran.", description)
        return True
