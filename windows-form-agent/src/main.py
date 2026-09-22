"""Orchestrateur : pour chaque "job" de config.yaml, analyse les documents
source correspondants, remplit le formulaire cible et le valide.

Usage :
    python -m src.main [--config config.yaml] [--job nom_du_job] [--dry-run]
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai.ollama_client import OllamaClient  # noqa: E402
from automation.browser import BrowserSession  # noqa: E402
from config import AppConfig, JobSpec, load_config  # noqa: E402
from documents.field_extractor import extract_fields  # noqa: E402
from documents.reader import extract_text  # noqa: E402
from forms.pdf_form import fill_pdf_form, read_pdf_form_values  # noqa: E402
from forms.office_form import fill_docx_template, fill_xlsx_template  # noqa: E402
from forms.validation import validate_fields  # noqa: E402
from utils.files import find_matching_files  # noqa: E402
from utils.logging_setup import setup_logging  # noqa: E402

logger = logging.getLogger(__name__)


def process_job(config: AppConfig, job: JobSpec, client: OllamaClient, dry_run: bool) -> None:
    source_files = find_matching_files(config.source_folder, job.source_pattern)
    if not source_files:
        logger.info("[%s] Aucun document source correspondant a '%s'.", job.name, job.source_pattern)
        return

    for source_path in source_files:
        logger.info("[%s] Traitement de %s", job.name, source_path.name)

        try:
            document_text = extract_text(source_path)
        except Exception:
            logger.exception("[%s] Echec de lecture de %s, document ignore.", job.name, source_path.name)
            continue

        values = extract_fields(client, document_text, job.fields)
        validation = validate_fields(job.fields, values)

        if not validation.is_valid:
            logger.error("[%s] %s : %s", job.name, source_path.name, validation.summary())
            continue

        if dry_run:
            logger.info("[%s] (dry-run) Valeurs extraites et valides : %s", job.name, values)
            continue

        _apply_to_target(config, job, source_path, values)


def _apply_to_target(config: AppConfig, job: JobSpec, source_path: Path, values: dict[str, str]) -> None:
    output_dir = Path(config.output_folder)
    target = job.target

    if target.type == "pdf_form":
        output_path = output_dir / f"{source_path.stem}_rempli.pdf"
        unknown = fill_pdf_form(target.path, output_path, values)
        if unknown:
            logger.warning("[%s] Champs PDF non trouves dans le modele : %s", job.name, unknown)
        final_values = read_pdf_form_values(output_path)
        post_validation = validate_fields(job.fields, final_values)
        if post_validation.is_valid:
            logger.info("[%s] PDF valide et enregistre : %s", job.name, output_path)
        else:
            logger.error("[%s] Validation post-remplissage echouee : %s", job.name, post_validation.summary())

    elif target.type == "docx_template":
        output_path = output_dir / f"{source_path.stem}_rempli.docx"
        remaining = fill_docx_template(target.path, output_path, values)
        if remaining:
            logger.warning("[%s] Placeholders non remplaces dans le docx : %s", job.name, remaining)
        else:
            logger.info("[%s] Document Word rempli et enregistre : %s", job.name, output_path)

    elif target.type == "xlsx_template":
        output_path = output_dir / f"{source_path.stem}_rempli.xlsx"
        missing = fill_xlsx_template(target.path, output_path, values, target.control_map)
        if missing:
            logger.warning("[%s] Champs sans cellule associee dans le xlsx : %s", job.name, missing)
        logger.info("[%s] Classeur Excel rempli et enregistre : %s", job.name, output_path)

    elif target.type == "web_form":
        with BrowserSession(channel=config.browser.channel, headless=config.browser.headless) as session:
            result = session.fill_and_submit_form(
                url=target.url,
                field_selectors=target.field_selectors,
                values=values,
                submit_selector=target.submit_selector,
                success_selector=target.success_selector,
            )
        if result.success:
            logger.info("[%s] Formulaire web soumis avec succes pour %s", job.name, source_path.name)
        else:
            logger.error("[%s] Echec du formulaire web : %s", job.name, result.message)

    elif target.type == "desktop_app":
        from automation.desktop import DesktopFormFiller

        filler = DesktopFormFiller()
        if target.app_path:
            filler.launch(target.app_path)
        else:
            filler.connect(target.window_title)
        result = filler.fill_form(target.window_title, target.control_map, values)
        if result.success:
            logger.info("[%s] Formulaire desktop rempli pour %s", job.name, source_path.name)
        else:
            logger.error("[%s] Echec du formulaire desktop : %s", job.name, result.message)
        filler.close(target.window_title)

    else:
        logger.error("[%s] Type de cible inconnu : %s", job.name, target.type)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Agent d'analyse et remplissage de formulaires.")
    parser.add_argument("--config", default=None, help="Chemin vers config.yaml")
    parser.add_argument("--job", default=None, help="Ne traiter qu'un seul job (par son nom)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyse et valide sans remplir/soumettre le formulaire cible",
    )
    args = parser.parse_args(argv)

    setup_logging()
    config = load_config(args.config)

    client = OllamaClient(
        host=config.ollama.host,
        text_model=config.ollama.text_model,
        vision_model=config.ollama.vision_model,
        timeout_seconds=config.ollama.timeout_seconds,
    )
    if not client.is_available():
        logger.error(
            "Impossible de joindre Ollama sur %s. Installe Ollama (https://ollama.com), "
            "lance-le puis telecharge un modele avec 'ollama pull %s'.",
            config.ollama.host,
            config.ollama.text_model,
        )
        return 1

    jobs = [j for j in config.jobs if args.job is None or j.name == args.job]
    if not jobs:
        logger.error("Aucun job correspondant a '%s' dans la configuration.", args.job)
        return 1

    for job in jobs:
        process_job(config, job, client, dry_run=args.dry_run)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
