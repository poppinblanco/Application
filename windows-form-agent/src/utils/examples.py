"""Bibliotheque d'exemples corriges, par job, pour guider l'IA sur des cas
techniques ou elle se trompe.

L'IA locale (Ollama) ne "retient" rien d'un lancement a l'autre : sans aide,
elle referait la meme erreur d'extraction sur un cas similaire. Ce module
permet d'enregistrer une correction faite par l'utilisateur (dans le mode
pas-a-pas) et de la reinjecter dans le prompt envoye a l'IA pour les
prochains documents du meme job (technique dite du "few-shot prompting") :
ce n'est pas de l'apprentissage automatique, mais ca evite de repeter
indefiniment la meme erreur.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_EXAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "examples"

# Nombre maximum d'exemples conserves par job (les plus recents remplacent
# les plus anciens) : suffisant pour couvrir des cas varies sans faire
# gonfler le prompt envoye a l'IA a chaque document.
MAX_EXAMPLES_PER_JOB = 20

# Nombre d'exemples effectivement inclus dans le prompt (les plus recents).
MAX_EXAMPLES_IN_PROMPT = 5

# Longueur de l'extrait de document conserve par exemple (assez pour donner
# du contexte a l'IA, sans stocker le document entier).
EXCERPT_LENGTH = 500


def _examples_path(job_name: str, examples_dir: str | Path = DEFAULT_EXAMPLES_DIR) -> Path:
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in job_name)
    return Path(examples_dir) / f"{safe_name}.json"


def load_examples(job_name: str, examples_dir: str | Path = DEFAULT_EXAMPLES_DIR) -> list[dict[str, Any]]:
    path = _examples_path(job_name, examples_dir)
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        logger.warning("Fichier d'exemples '%s' illisible, ignore.", path)
        return []


def add_example(
    job_name: str,
    document_text: str,
    corrected_values: dict[str, str],
    examples_dir: str | Path = DEFAULT_EXAMPLES_DIR,
) -> None:
    """Enregistre une correction comme nouvel exemple pour ce job."""
    examples = load_examples(job_name, examples_dir)
    examples.append(
        {
            "document_excerpt": document_text[:EXCERPT_LENGTH].strip(),
            "corrected_values": corrected_values,
        }
    )
    examples = examples[-MAX_EXAMPLES_PER_JOB:]

    path = _examples_path(job_name, examples_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(examples, fh, indent=2, ensure_ascii=False)

    logger.info("Exemple enregistre pour le job '%s' (%d exemple(s) au total).", job_name, len(examples))


def format_examples_for_prompt(examples: list[dict[str, Any]], max_used: int = MAX_EXAMPLES_IN_PROMPT) -> str:
    """Formate les exemples les plus recents pour les inclure dans le prompt d'extraction."""
    if not examples:
        return ""

    recent = examples[-max_used:]
    blocks = []
    for i, example in enumerate(recent, start=1):
        values_json = json.dumps(example.get("corrected_values", {}), ensure_ascii=False)
        blocks.append(
            f"Exemple {i} - extrait de document :\n"
            f"{example.get('document_excerpt', '')}\n"
            f"Valeurs correctes attendues : {values_json}"
        )

    return "\n\n".join(blocks)
