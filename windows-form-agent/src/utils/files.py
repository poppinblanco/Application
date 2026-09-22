"""Aides pour parcourir le dossier source (local ou lecteur reseau via VPN).

Un dossier "connecte en VPN" est, du point de vue de Windows et de Python,
un chemin de fichier classique : soit une lettre de lecteur mappee
(ex: "Z:\\Documents"), soit un chemin UNC direct
(ex: "\\\\serveur-vpn\\partage\\Documents"). Aucune bibliotheque reseau
particuliere n'est necessaire ici, l'important est que le VPN soit deja
connecte et le lecteur deja monte avant de lancer l'agent.
"""
from __future__ import annotations

from pathlib import Path


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
