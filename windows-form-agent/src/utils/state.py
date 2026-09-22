"""Suivi persistant des documents deja traites, pour la surveillance continue.

Permet de relancer l'agent (ou de survivre a une coupure VPN) sans retraiter
les documents deja geres. Un document est identifie par son chemin + sa
taille + sa date de modification : s'il est modifie/remplace sur le dossier
partage, il est retraite automatiquement.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_STATE_PATH = Path(__file__).resolve().parent.parent.parent / ".state" / "processed.json"


def load_state(state_path: str | Path = DEFAULT_STATE_PATH) -> dict[str, Any]:
    state_path = Path(state_path)
    if not state_path.exists():
        return {}
    try:
        with open(state_path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        logger.warning("Fichier d'etat '%s' illisible, redemarrage a zero.", state_path)
        return {}


def save_state(state: dict[str, Any], state_path: str | Path = DEFAULT_STATE_PATH) -> None:
    state_path = Path(state_path)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with open(state_path, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, ensure_ascii=False)


def _fingerprint(path: Path) -> dict[str, float]:
    stat = path.stat()
    return {"mtime": stat.st_mtime, "size": stat.st_size}


def is_already_processed(state: dict[str, Any], path: Path) -> bool:
    key = str(path.resolve())
    entry = state.get(key)
    if entry is None:
        return False
    current = _fingerprint(path)
    return entry.get("mtime") == current["mtime"] and entry.get("size") == current["size"]


def mark_processed(state: dict[str, Any], path: Path, outcome: str) -> None:
    key = str(path.resolve())
    fingerprint = _fingerprint(path)
    state[key] = {**fingerprint, "outcome": outcome}
