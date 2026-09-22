"""Extraction de texte depuis des PDF : texte natif, ou OCR pour les scans."""
from __future__ import annotations

import logging
from pathlib import Path

import pdfplumber
import pytesseract
from pdf2image import convert_from_path

logger = logging.getLogger(__name__)

# En dessous de ce seuil de caracteres par page, on considere que le PDF
# est probablement un scan (image) et on bascule sur l'OCR.
MIN_CHARS_PER_PAGE_BEFORE_OCR = 20


def extract_text(pdf_path: str | Path) -> str:
    """Renvoie le texte d'un PDF, en utilisant l'OCR si necessaire (scan)."""
    pdf_path = Path(pdf_path)
    text_parts: list[str] = []
    needs_ocr = False

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if len(page_text.strip()) < MIN_CHARS_PER_PAGE_BEFORE_OCR:
                needs_ocr = True
            text_parts.append(page_text)

    if needs_ocr:
        logger.info("PDF '%s' semble scanne, bascule sur l'OCR (Tesseract).", pdf_path.name)
        return _extract_text_via_ocr(pdf_path)

    return "\n".join(text_parts).strip()


def _extract_text_via_ocr(pdf_path: Path) -> str:
    images = convert_from_path(str(pdf_path))
    ocr_text = []
    for i, image in enumerate(images):
        text = pytesseract.image_to_string(image, lang="fra+eng")
        ocr_text.append(text)
        logger.debug("OCR page %d/%d effectue pour %s", i + 1, len(images), pdf_path.name)
    return "\n".join(ocr_text).strip()


def list_form_field_names(pdf_path: str | Path) -> list[str]:
    """Liste les noms des champs de formulaire (AcroForm) presents dans un PDF cible."""
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    fields = reader.get_fields() or {}
    return list(fields.keys())
