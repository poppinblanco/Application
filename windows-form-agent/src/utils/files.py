"""Aides pour parcourir le dossier source (local ou lecteur reseau via VPN).

Un dossier "connecte en VPN" est, du point de vue de Windows et de Python,
un chemin de fichier classique : soit une lettre de lecteur mappee
(ex: "Z:\\Documents"), soit un chemin UNC direct
(ex: "\\\\serveur-vpn\\partage\\Documents"). Aucune bibliotheque reseau
particuliere n'est necessaire ici, l'important est que le VPN soit deja
connecte et le lecteur deja monte avant de lancer l'agent.
"""
from __future__ import annotations

import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)


def ensure_folder_reachable(folder: str | Path) -> Path:
    path = Path(folder)
    if not path.exists():
        raise FileNotFoundError(
            f"Dossier introuvable : '{path}'. Si ce chemin est sur un lecteur "
            "reseau/VPN, verifie que le VPN est connecte et le lecteur monte "
            "avant de relancer l'agent."
        )
    if not path.is_dir():
        raise NotADirectoryError(f"'{path}' n'est pas un dossier.")
    return path


def find_matching_files(folder: str | Path, pattern: str) -> list[Path]:
    folder = ensure_folder_reachable(folder)
    return sorted(folder.glob(pattern))


def move_to_archive(source_path: str | Path, archive_folder: str | Path) -> Path:
    """Deplace le document source vers `archive_folder` une fois traite avec
    succes, pour qu'il ne se melange pas avec les documents encore a faire
    et ne soit jamais retraite.

    Si un fichier du meme nom existe deja dans le dossier d'archive (rare,
    mais possible si le meme nom de fichier revient), un suffixe numerote
    est ajoute plutot que d'ecraser le fichier existant.
    """
    source_path = Path(source_path)
    archive_folder = Path(archive_folder)
    archive_folder.mkdir(parents=True, exist_ok=True)

    destination = archive_folder / source_path.name
    counter = 1
    while destination.exists():
        destination = archive_folder / f"{source_path.stem}_{counter}{source_path.suffix}"
        counter += 1

    shutil.move(str(source_path), str(destination))
    logger.info("Document source deplace vers '%s'.", destination)
    return destination
