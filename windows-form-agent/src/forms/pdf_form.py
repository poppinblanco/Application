"""Remplissage de formulaires PDF (champs AcroForm) avec pypdf."""
from __future__ import annotations

import logging
from pathlib import Path

from pypdf import PdfReader, PdfWriter

logger = logging.getLogger(__name__)


def fill_pdf_form(
    template_path: str | Path, output_path: str | Path, values: dict[str, str]
) -> list[str]:
    """Remplit les champs d'un PDF a partir d'un dictionnaire {champ: valeur}.

    Renvoie la liste des champs demandes qui n'existent pas dans le PDF
    (utile pour detecter un mauvais modele de formulaire).
    """
    reader = PdfReader(str(template_path))
    writer = PdfWriter()
    writer.append(reader)

    available_fields = set((reader.get_fields() or {}).keys())
    unknown_fields = [name for name in values if name not in available_fields]
    if unknown_fields:
        logger.warning(
            "Champs demandes absents du PDF '%s' : %s",
            Path(template_path).name,
            unknown_fields,
        )

    fields_to_write = {k: v for k, v in values.items() if k in available_fields}

    for page in writer.pages:
        writer.update_page_form_field_values(page, fields_to_write)

    if writer._root_object.get("/AcroForm") is not None:
        writer.set_need_appearances_writer(True)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as fh:
        writer.write(fh)

    return unknown_fields


def read_pdf_form_values(pdf_path: str | Path) -> dict[str, str]:
    """Relit les valeurs actuellement remplies dans un PDF, pour validation post-remplissage."""
    reader = PdfReader(str(pdf_path))
    fields = reader.get_fields() or {}
    return {name: (f.value or "") for name, f in fields.items()}
