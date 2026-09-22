"""Chargement de la configuration de l'agent (config.yaml)."""
from __future__ import annotations

import copy
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config.yaml"
EXAMPLE_CONFIG_PATH = PROJECT_ROOT / "config.example.yaml"
DEFAULT_BROWSER_PROFILE_DIR = "browser_profile"

# Internet Explorer est retire par Microsoft depuis le 15 juin 2022 : il ne
# recoit plus de mises a jour de securite et n'est plus supporte par les
# outils d'automatisation modernes (Playwright, Selenium 4+, etc.).
UNSUPPORTED_BROWSERS = {"ie", "internet explorer", "iexplore"}
SUPPORTED_BROWSER_CHANNELS = {"chromium", "chrome", "msedge", "firefox"}


@dataclass
class FieldSpec:
    name: str
    required: bool = False
    regex: str | None = None
    description: str = ""


@dataclass
class JobTarget:
    type: str  # pdf_form | docx_template | xlsx_template | web_form | desktop_app
    path: str | None = None
    url: str | None = None
    field_selectors: dict[str, str] = field(default_factory=dict)
    submit_selector: str | None = None
    success_selector: str | None = None
    app_path: str | None = None
    window_title: str | None = None
    control_map: dict[str, str] = field(default_factory=dict)


@dataclass
class JobSpec:
    name: str
    source_pattern: str
    target: JobTarget
    fields: list[FieldSpec]


@dataclass
class OllamaConfig:
    host: str = "http://localhost:11434"
    text_model: str = "llama3.2"
    vision_model: str = "llava"
    timeout_seconds: int = 120


@dataclass
class BrowserConfig:
    channel: str = "msedge"
    headless: bool = False
    # Dossier de profil navigateur persistant (cookies/session conserves
    # entre deux lancements, pour rester connecte apres un premier login
    # manuel). None = session vierge a chaque lancement (jamais connecte).
    profile_dir: str | None = DEFAULT_BROWSER_PROFILE_DIR


@dataclass
class WatchConfig:
    enabled: bool = False
    interval_seconds: int = 30
    # Si le dossier partage (VPN) devient injoignable, l'agent reessaie
    # au lieu de s'arreter (utile en cas de coupure/reconnexion VPN).
    retry_interval_seconds: int = 15


@dataclass
class AppConfig:
    source_folder: str
    output_folder: str
    ollama: OllamaConfig
    browser: BrowserConfig
    watch: WatchConfig
    jobs: list[JobSpec]
    # Nombre maximum de documents remplis par jour, tous modes confondus
    # (None = illimite). Une fois la limite atteinte, l'agent s'arrete de
    # traiter de nouveaux documents ; le compteur repart a zero le lendemain.
    daily_limit: int | None = None
    # Dossier ou le document source est deplace une fois traite avec succes
    # (None = jamais deplace, comportement d'origine). Indispensable pour le
    # mode automatique : sans deplacement, les documents traites resteraient
    # melanges avec ceux encore a faire dans source_folder.
    archive_folder: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


def _parse_field(raw: dict[str, Any]) -> FieldSpec:
    return FieldSpec(
        name=raw["name"],
        required=bool(raw.get("required", False)),
        regex=raw.get("regex"),
        description=raw.get("description", ""),
    )


def _parse_target(raw: dict[str, Any]) -> JobTarget:
    return JobTarget(
        type=raw["type"],
        path=raw.get("path"),
        url=raw.get("url"),
        field_selectors=raw.get("field_selectors", {}) or {},
        submit_selector=raw.get("submit_selector"),
        success_selector=raw.get("success_selector"),
        app_path=raw.get("app_path"),
        window_title=raw.get("window_title"),
        control_map=raw.get("control_map", {}) or {},
    )


def _parse_job(raw: dict[str, Any]) -> JobSpec:
    return JobSpec(
        name=raw["name"],
        source_pattern=raw["source_pattern"],
        target=_parse_target(raw["target"]),
        fields=[_parse_field(f) for f in raw.get("fields", [])],
    )


def _resolve_profile_dir(raw_browser: dict[str, Any]) -> str | None:
    if "profile_dir" not in raw_browser:
        value = DEFAULT_BROWSER_PROFILE_DIR
    else:
        value = raw_browser["profile_dir"]
        if value in (None, ""):
            return None

    path = Path(value)
    return str(path if path.is_absolute() else PROJECT_ROOT / path)


def validate_browser_channel(channel: str) -> str:
    normalized = (channel or "").strip().lower()
    if normalized in UNSUPPORTED_BROWSERS:
        raise ValueError(
            "Internet Explorer n'est plus supporte (retire par Microsoft depuis "
            "juin 2022, sans mise a jour de securite). Utilise 'chrome', 'msedge' "
            "ou 'firefox' dans config.yaml."
        )
    if normalized not in SUPPORTED_BROWSER_CHANNELS:
        raise ValueError(
            f"Navigateur '{channel}' inconnu. Valeurs possibles : "
            f"{sorted(SUPPORTED_BROWSER_CHANNELS)}."
        )
    return normalized


def load_config(path: str | os.PathLike | None = None) -> AppConfig:
    """Charge config.yaml (ou config.example.yaml si absent, pour la demo)."""
    config_path = Path(path) if path else DEFAULT_CONFIG_PATH
    if not config_path.exists():
        if config_path == DEFAULT_CONFIG_PATH and EXAMPLE_CONFIG_PATH.exists():
            config_path = EXAMPLE_CONFIG_PATH
        else:
            raise FileNotFoundError(
                f"Fichier de configuration introuvable : {config_path}. "
                "Copie config.example.yaml vers config.yaml et adapte-le."
            )

    with open(config_path, "r", encoding="utf-8") as fh:
        raw = yaml.safe_load(fh) or {}

    raw = copy.deepcopy(raw)
    ollama_raw = raw.get("ollama", {}) or {}
    browser_raw = raw.get("browser", {}) or {}
    watch_raw = raw.get("watch", {}) or {}

    browser_channel = validate_browser_channel(browser_raw.get("channel", "msedge"))

    return AppConfig(
        source_folder=raw["source_folder"],
        output_folder=raw["output_folder"],
        ollama=OllamaConfig(
            host=ollama_raw.get("host", "http://localhost:11434"),
            text_model=ollama_raw.get("text_model", "llama3.2"),
            vision_model=ollama_raw.get("vision_model", "llava"),
            timeout_seconds=int(ollama_raw.get("timeout_seconds", 120)),
        ),
        browser=BrowserConfig(
            channel=browser_channel,
            headless=bool(browser_raw.get("headless", False)),
            profile_dir=_resolve_profile_dir(browser_raw),
        ),
        watch=WatchConfig(
            enabled=bool(watch_raw.get("enabled", False)),
            interval_seconds=int(watch_raw.get("interval_seconds", 30)),
            retry_interval_seconds=int(watch_raw.get("retry_interval_seconds", 15)),
        ),
        jobs=[_parse_job(j) for j in raw.get("jobs", [])],
        daily_limit=int(raw["daily_limit"]) if raw.get("daily_limit") not in (None, "") else None,
        archive_folder=raw["archive_folder"] if raw.get("archive_folder") not in (None, "") else None,
        raw=raw,
    )
