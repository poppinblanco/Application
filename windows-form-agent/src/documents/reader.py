"""Point d'entree unique pour lire n'importe quel document source supporte."""
from __future__ import annotations

from pathlib import Path

from . import office_reader, pdf_reader

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx"}


def extract_text(path: str | Path) -> str:
    path = Path(path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        return pdf_reader.extract_text(path)
    if suffix == ".docx":
        return office_reader.extract_text_from_docx(path)
    if suffix == ".xlsx":
        return office_reader.extract_text_from_xlsx(path)

    raise ValueError(
        f"Extension non supportee : '{suffix}'. Extensions gerees : "
        f"{sorted(SUPPORTED_EXTENSIONS)}."
    )
