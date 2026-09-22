"""Orchestrateur : pour chaque "job" de config.yaml, analyse les documents
source correspondants, remplit le formulaire cible et le valide.

Usage :
    python -m src.main [--config config.yaml] [--job nom_du_job] [--dry-run]
    python -m src.main --watch                 (surveillance continue du dossier partage)
"""
from __future__ import annotations

import argparse
import datetime
import logging
import sys
import time
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai.ollama_client import OllamaClient  # noqa: E402
from automation.browser import BrowserSession  # noqa: E402
from config import AppConfig, JobSpec, load_config  # noqa: E402
from documents.field_extractor import extract_fields  # noqa: E402
from documents.reader import extract_text  # noqa: E402
from forms.pdf_form import fill_pdf_form, read_pdf_form_values  # noqa: E402
from forms.office_form import fill_docx_template, fill_xlsx_template  # noqa: E402
from forms.validation import ValidationResult, validate_fields  # noqa: E402
from utils.files import find_matching_files  # noqa: E402
from utils.logging_setup import setup_logging  # noqa: E402
from utils.state import (  # noqa: E402
    daily_limit_reached,
    increment_daily_counter,
    is_already_processed,
    load_state,
    mark_processed,
    save_state,
)

logger = logging.getLogger(__name__)

_daily_limit_notice_date: str | None = None


def _notify_daily_limit_once(limit: int) -> None:
    """Journalise l'atteinte de la limite quotidienne une seule fois par jour
    (evite de spammer les logs a chaque cycle de surveillance)."""
    global _daily_limit_notice_date
    today = datetime.date.today().isoformat()
    if _daily_limit_notice_date != today:
        logger.warning(
            "Limite quotidienne de %d documents atteinte : plus aucun document ne sera "
            "rempli aujourd'hui. La limite sera reinitialisee demain.",
            limit,
        )
        _daily_limit_notice_date = today


@dataclass
class DocumentAnalysis:
    """Resultat d'analyse d'un document, avant tout remplissage (mode pas-a-pas)."""

    source_path: Path
    job: JobSpec
    values: dict[str, str]
    validation: ValidationResult | None
    error: str | None = None

    @property
    def can_apply(self) -> bool:
        return self.error is None and self.validation is not None and self.validation.is_valid


def analyze_document(config: AppConfig, job: JobSpec, client: OllamaClient, source_path: Path) -> DocumentAnalysis:
    """Lit et analyse un document via l'IA locale, sans remplir/soumettre le formulaire cible."""
    logger.info("[%s] Analyse de %s", job.name, source_path.name)
    try:
        document_text = extract_text(source_path)
        values = extract_fields(client, document_text, job.fields)
    except Exception as exc:
        logger.exception("[%s] Echec d'analyse de %s.", job.name, source_path.name)
        return DocumentAnalysis(source_path=source_path, job=job, values={}, validation=None, error=str(exc))

    validation = validate_fields(job.fields, values)
    if not validation.is_valid:
        logger.warning("[%s] %s : %s", job.name, source_path.name, validation.summary())

    return DocumentAnalysis(source_path=source_path, job=job, values=values, validation=validation)


def apply_document(config: AppConfig, analysis: DocumentAnalysis) -> str:
    """Remplit/soumet le formulaire cible pour un document deja analyse et valide."""
    if not analysis.can_apply:
        raise ValueError("Ce document n'a pas ete valide, impossible de le remplir.")

    try:
        _apply_to_target(config, analysis.job, analysis.source_path, analysis.values)
    except Exception:
        logger.exception(
            "[%s] Echec de remplissage du formulaire pour %s.", analysis.job.name, analysis.source_path.name
        )
        return "erreur"

    increment_daily_counter()
    return "ok"


def process_single_file(
    config: AppConfig, job: JobSpec, client: OllamaClient, source_path: Path, dry_run: bool
) -> str:
    """Traite un seul document de bout en bout (analyse + remplissage). Renvoie
    un statut court ("ok", "invalide", "erreur"). Utilise par le mode traitement
    unique et la surveillance continue ; le mode pas-a-pas utilise plutot
    `analyze_document`/`apply_document` separement.
    """
    analysis = analyze_document(config, job, client, source_path)

    if analysis.error is not None:
        return "erreur"

    if analysis.validation is not None and not analysis.validation.is_valid:
        return "invalide"

    if dry_run:
        logger.info("[%s] (dry-run) Valeurs extraites et valides : %s", job.name, analysis.values)
        return "ok"

    return apply_document(config, analysis)


def process_job(
    config: AppConfig,
    job: JobSpec,
    client: OllamaClient,
    dry_run: bool,
    state: dict | None = None,
) -> int:
    """Traite tous les documents correspondant au job. Renvoie le nombre traite.

    Si `state` est fourni (mode surveillance), les documents deja traites et
    inchanges depuis sont ignores, et chaque document traite est marque dans
    `state` (a sauvegarder par l'appelant).
    """
    source_files = find_matching_files(config.source_folder, job.source_pattern)
    if not source_files:
        logger.info("[%s] Aucun document source correspondant a '%s'.", job.name, job.source_pattern)
        return 0

    processed_count = 0
    for source_path in source_files:
        if state is not None and is_already_processed(state, source_path):
            continue

        if not dry_run and daily_limit_reached(config.daily_limit):
            _notify_daily_limit_once(config.daily_limit)
            break

        outcome = process_single_file(config, job, client, source_path, dry_run)
        processed_count += 1

        if state is not None and not dry_run:
            mark_processed(state, source_path, outcome)

    return processed_count


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
        with BrowserSession(
            channel=config.browser.channel,
            headless=config.browser.headless,
            profile_dir=config.browser.profile_dir,
        ) as session:
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


def run_watch_forever(
    config: AppConfig,
    client: OllamaClient,
    jobs: list[JobSpec],
    dry_run: bool = False,
    stop_event=None,
    state_path=None,
) -> None:
    """Surveille en continu le dossier partage et traite les nouveaux documents.

    Concu pour rester actif pendant que le poste reste connecte au VPN : si
    le dossier partage devient injoignable (coupure VPN), l'agent journalise
    un avertissement et reessaie plus tard au lieu de s'arreter.

    `stop_event` (threading.Event) permet a l'appelant (GUI) d'arreter la
    boucle proprement.
    """
    from utils.state import DEFAULT_STATE_PATH

    state_path = state_path or DEFAULT_STATE_PATH
    state = load_state(state_path)

    logger.info(
        "Surveillance demarree sur '%s' (intervalle %ds). Ctrl+C pour arreter.",
        config.source_folder,
        config.watch.interval_seconds,
    )

    while stop_event is None or not stop_event.is_set():
        try:
            total = 0
            for job in jobs:
                total += process_job(config, job, client, dry_run=dry_run, state=state)
            save_state(state, state_path)
            if total:
                logger.info("Cycle de surveillance termine : %d document(s) traite(s).", total)
        except FileNotFoundError as exc:
            logger.warning(
                "Dossier partage injoignable (VPN deconnecte ?) : %s. Nouvel essai dans %ds.",
                exc,
                config.watch.retry_interval_seconds,
            )
            _sleep_or_stop(config.watch.retry_interval_seconds, stop_event)
            continue
        except Exception:
            logger.exception("Erreur inattendue pendant le cycle de surveillance.")

        _sleep_or_stop(config.watch.interval_seconds, stop_event)


def _sleep_or_stop(seconds: int, stop_event) -> None:
    if stop_event is None:
        time.sleep(seconds)
    else:
        stop_event.wait(seconds)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Agent d'analyse et remplissage de formulaires.")
    parser.add_argument("--config", default=None, help="Chemin vers config.yaml")
    parser.add_argument("--job", default=None, help="Ne traiter qu'un seul job (par son nom)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyse et valide sans remplir/soumettre le formulaire cible",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Surveille en continu le dossier source (VPN/partage) au lieu de traiter une seule fois",
    )
    parser.add_argument(
        "--daily-limit",
        type=int,
        default=None,
        help="Nombre maximum de documents a remplir aujourd'hui (remplace la valeur de config.yaml)",
    )
    args = parser.parse_args(argv)

    setup_logging()
    config = load_config(args.config)
    if args.daily_limit is not None:
        config.daily_limit = args.daily_limit

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

    if args.watch:
        try:
            run_watch_forever(config, client, jobs, dry_run=args.dry_run)
        except KeyboardInterrupt:
            logger.info("Surveillance arretee par l'utilisateur.")
        return 0

    for job in jobs:
        process_job(config, job, client, dry_run=args.dry_run)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
