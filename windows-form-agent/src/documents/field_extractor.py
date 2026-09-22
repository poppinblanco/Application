"""Utilise l'IA locale (Ollama) pour transformer un texte brut en champs structures.

L'IA ne fait ici qu'une chose : lire un texte libre (facture, dossier, etc.)
et en extraire les valeurs demandees, au format JSON. Toute la logique de
remplissage/validation reste du code deterministe (voir forms/validation.py),
ce qui evite qu'une hallucination du modele casse un formulaire officiel
sans qu'on s'en rende compte.
"""
from __future__ import annotations

import logging

from ai.ollama_client import OllamaClient
from config import FieldSpec

logger = logging.getLogger(__name__)


def build_extraction_prompt(document_text: str, fields: list[FieldSpec], examples_text: str = "") -> str:
    field_lines = []
    for f in fields:
        hint = f" ({f.description})" if f.description else ""
        field_lines.append(f'- "{f.name}"{hint}')

    fields_desc = "\n".join(field_lines)

    examples_block = ""
    if examples_text:
        examples_block = f"""
Voici des exemples de corrections faites par l'utilisateur sur des documents
similaires par le passe : inspire-toi en pour ne pas refaire les memes
erreurs d'extraction sur des cas proches.
---
{examples_text}
---
"""

    return f"""Tu es un assistant qui extrait des informations precises d'un document.
{examples_block}
Voici le contenu du document :
---
{document_text}
---

Extrait UNIQUEMENT les champs suivants et renvoie STRICTEMENT un objet JSON
(aucun texte avant/apres, aucune explication). Si une valeur est absente du
document, mets une chaine vide "".

Champs a extraire :
{fields_desc}

Reponds avec un objet JSON dont les cles sont exactement les noms de champs
ci-dessus.
"""


def extract_fields(
    client: OllamaClient, document_text: str, fields: list[FieldSpec], examples_text: str = ""
) -> dict[str, str]:
    """Renvoie {nom_du_champ: valeur} en s'appuyant sur le modele de texte local.

    `examples_text` (voir utils/examples.py) fournit des exemples de
    corrections precedentes pour guider l'IA sur des cas techniques.
    """
    prompt = build_extraction_prompt(document_text, fields, examples_text)
    result = client.extract_json(prompt)

    extracted: dict[str, str] = {}
    for f in fields:
        value = result.get(f.name, "")
        extracted[f.name] = "" if value is None else str(value).strip()

    missing_required = [f.name for f in fields if f.required and not extracted.get(f.name)]
    if missing_required:
        logger.warning(
            "Champs obligatoires non trouves par l'IA dans le document : %s",
            missing_required,
        )

    return extracted
