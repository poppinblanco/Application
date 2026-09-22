"""Lecture/ecriture de config.yaml en preservant les commentaires existants.

Utilise ruamel.yaml (mode round-trip) plutot que PyYAML : PyYAML ne
preserve pas les commentaires lors d'une reecriture, ce qui effacerait
toute l'aide inline du fichier de configuration a chaque sauvegarde faite
depuis l'interface graphique (dossiers, URL...).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ruamel.yaml import YAML

from config import DEFAULT_CONFIG_PATH

_yaml = YAML()
_yaml.preserve_quotes = True
_yaml.width = 4096  # evite que ruamel ne retourne les lignes longues (URLs, chemins UNC)


def load_raw(config_path: str | Path = DEFAULT_CONFIG_PATH) -> Any:
    with open(config_path, "r", encoding="utf-8") as fh:
        return _yaml.load(fh)


def save_raw(data: Any, config_path: str | Path = DEFAULT_CONFIG_PATH) -> None:
    config_path = Path(config_path)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as fh:
        _yaml.dump(data, fh)


def update_paths(
    config_path: str | Path = DEFAULT_CONFIG_PATH,
    source_folder: str | None = None,
    output_folder: str | None = None,
    archive_folder: str | None = None,
) -> None:
    """Met a jour un ou plusieurs des dossiers principaux (les valeurs a
    None sont laissees inchangees), sans toucher au reste de la
    configuration ni a ses commentaires."""
    data = load_raw(config_path)
    if source_folder is not None:
        data["source_folder"] = source_folder
    if output_folder is not None:
        data["output_folder"] = output_folder
    if archive_folder is not None:
        data["archive_folder"] = archive_folder
    save_raw(data, config_path)


def update_job_url(job_name: str, url: str, config_path: str | Path = DEFAULT_CONFIG_PATH) -> None:
    """Met a jour l'URL cible d'un job (formulaire web)."""
    data = load_raw(config_path)
    for job in data.get("jobs", []):
        if job.get("name") == job_name:
            job.setdefault("target", {})["url"] = url
            save_raw(data, config_path)
            return
    raise ValueError(f"Job '{job_name}' introuvable dans {config_path}.")
