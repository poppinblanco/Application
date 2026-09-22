"""Automatisation d'applications Windows natives via UI Automation (pywinauto).

Ce module ne fonctionne que sur Windows (pywinauto s'appuie sur les API
Win32/UIA). Sur les autres systemes, l'import de pywinauto echoue ; on le
rend donc optionnel pour ne pas casser le reste de l'agent en developpement.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

try:
    from pywinauto import Application
    from pywinauto.findwindows import ElementNotFoundError

    PYWINAUTO_AVAILABLE = True
except ImportError:  # pragma: no cover - attendu hors Windows
    PYWINAUTO_AVAILABLE = False
    Application = None  # type: ignore
    ElementNotFoundError = Exception  # type: ignore


@dataclass
class DesktopFormResult:
    success: bool
    filled_controls: list[str] = field(default_factory=list)
    missing_controls: list[str] = field(default_factory=list)
    message: str = ""
    interrupted: bool = False


class DesktopFormFiller:
    """Ouvre une application Windows, remplit des controles, valide, ferme la fenetre."""

    def __init__(self, backend: str = "uia"):
        if not PYWINAUTO_AVAILABLE:
            raise RuntimeError(
                "pywinauto n'est disponible que sous Windows. "
                "Ce module ne peut pas s'executer sur ce systeme."
            )
        self.backend = backend
        self._app: Application | None = None

    def launch(self, app_path: str, timeout: float = 15.0) -> None:
        self._app = Application(backend=self.backend).start(app_path)
        time.sleep(1)  # laisse le temps a la fenetre principale d'apparaitre
        logger.info("Application lancee : %s", app_path)

    def connect(self, window_title: str, timeout: float = 15.0) -> None:
        self._app = Application(backend=self.backend).connect(
            title_re=window_title, timeout=timeout
        )
        logger.info("Connecte a la fenetre existante : %s", window_title)

    def fill_form(
        self,
        window_title: str,
        control_map: dict[str, str],
        values: dict[str, str],
        stop_event=None,
    ) -> DesktopFormResult:
        """control_map: {nom_du_champ: automation_id_ou_titre_du_controle}.

        `stop_event` (threading.Event) est verifie avant chaque controle :
        en cas d'arret d'urgence, on s'arrete immediatement sans toucher aux
        controles restants, en laissant la fenetre telle quelle.
        """
        assert self._app is not None, "Appelle launch() ou connect() avant fill_form()."

        try:
            window = self._app.window(title_re=window_title)
            window.wait("visible", timeout=15)
        except ElementNotFoundError as exc:
            return DesktopFormResult(
                success=False,
                message=f"Fenetre '{window_title}' introuvable : {exc}",
            )

        filled: list[str] = []
        missing: list[str] = []

        for field_name, control_id in control_map.items():
            if stop_event is not None and stop_event.is_set():
                logger.warning(
                    "Arret d'urgence : remplissage interrompu avant le controle '%s'.", field_name
                )
                return DesktopFormResult(
                    success=False,
                    filled_controls=filled,
                    message="Interrompu par l'utilisateur (arret d'urgence) avant la fin du remplissage.",
                    interrupted=True,
                )

            value = values.get(field_name, "")
            if not value:
                continue
            try:
                control = window.child_window(auto_id=control_id, control_type="Edit")
                control.set_edit_text(value)
                filled.append(field_name)
            except ElementNotFoundError:
                missing.append(control_id)

        if missing:
            return DesktopFormResult(
                success=False,
                filled_controls=filled,
                missing_controls=missing,
                message=f"Controles introuvables : {missing}",
            )

        return DesktopFormResult(
            success=True,
            filled_controls=filled,
            message="Formulaire desktop rempli avec succes.",
        )

    def close(self, window_title: str) -> None:
        if self._app is None:
            return
        try:
            window = self._app.window(title_re=window_title)
            window.close()
            logger.info("Fenetre fermee : %s", window_title)
        except ElementNotFoundError:
            logger.warning("Impossible de fermer '%s' : fenetre introuvable.", window_title)
