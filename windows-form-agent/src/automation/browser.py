"""Automatisation de formulaires web via Playwright.

Navigateurs supportes : Chromium, Google Chrome, Microsoft Edge, Firefox.

Internet Explorer n'est PAS supporte : Microsoft l'a retire le 15 juin 2022,
il ne recoit plus de mises a jour de securite et aucun outil d'automatisation
moderne (Playwright, Selenium 4+) ne le pilote plus. Utilise Chrome, Edge ou
Firefox a la place (ou le mode "Internet Explorer" d'Edge si un vieux site
interne l'exige vraiment, mais ce n'est pas gere ici).

Connexion (login) : quand `profile_dir` est fourni, le navigateur utilise un
profil persistant sur disque (cookies, session) au lieu d'une session vierge
a chaque lancement. Concretement : la premiere fois, l'utilisateur se
connecte manuellement dans la fenetre ouverte par l'agent ; tant que la
session ne s'exprire pas cote serveur, les lancements suivants restent
connectes automatiquement, sans jamais stocker de mot de passe.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

logger = logging.getLogger(__name__)


@dataclass
class WebFormResult:
    success: bool
    filled_fields: list[str]
    missing_selectors: list[str]
    message: str
    interrupted: bool = False


class BrowserSession:
    """Represente une session navigateur : peut ouvrir/fermer plusieurs pages."""

    def __init__(
        self,
        channel: str = "msedge",
        headless: bool = False,
        profile_dir: str | Path | None = None,
    ):
        self.channel = channel
        self.headless = headless
        self.profile_dir = Path(profile_dir) if profile_dir else None
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None

    def __enter__(self) -> "BrowserSession":
        self._playwright = sync_playwright().start()
        browser_type = self._playwright.firefox if self.channel == "firefox" else self._playwright.chromium
        launch_kwargs = {"headless": self.headless}
        if self.channel not in ("firefox", "chromium"):
            # "chrome" ou "msedge" : utilise le vrai navigateur installe sur la machine.
            launch_kwargs["channel"] = self.channel

        if self.profile_dir is not None:
            self.profile_dir.mkdir(parents=True, exist_ok=True)
            logger.info("Navigateur demarre avec le profil persistant '%s' (session/login conserves).", self.profile_dir)
            self._context = browser_type.launch_persistent_context(str(self.profile_dir), **launch_kwargs)
        else:
            self._browser = browser_type.launch(**launch_kwargs)
            self._context = self._browser.new_context()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def close(self) -> None:
        if self._context is not None:
            self._context.close()
            self._context = None
        if self._browser is not None:
            self._browser.close()
            self._browser = None
        if self._playwright is not None:
            self._playwright.stop()
            self._playwright = None

    def open_page(self, url: str) -> Page:
        """Ouvre une nouvelle page (onglet) sur l'URL donnee."""
        assert self._context is not None, "Le navigateur n'est pas demarre (utiliser 'with BrowserSession(...) as s:')"
        page = self._context.new_page()
        page.goto(url, wait_until="domcontentloaded")
        logger.info("Page ouverte : %s", url)
        return page

    @staticmethod
    def close_page(page: Page) -> None:
        page.close()
        logger.info("Page fermee.")

    def fill_and_submit_form(
        self,
        url: str,
        field_selectors: dict[str, str],
        values: dict[str, str],
        submit_selector: str | None = None,
        success_selector: str | None = None,
        timeout_ms: int = 15000,
        stop_event=None,
        confirm_event=None,
        confirm_decision: list | None = None,
        on_ready_for_review=None,
    ) -> WebFormResult:
        """Ouvre une page, remplit les champs indiques, soumet, valide, ferme la page.

        `stop_event` (threading.Event) est verifie avant chaque champ et avant
        la validation finale : si l'utilisateur declenche l'arret d'urgence en
        cours de route, on s'arrete immediatement sans cliquer sur Valider, et
        la page est laissee ouverte (non fermee) pour que l'utilisateur puisse
        l'inspecter ou la corriger lui-meme.

        `confirm_event` (threading.Event), s'il est fourni, ajoute une pause
        entre le remplissage et la validation finale : une fois les champs
        remplis, la page reste ouverte et cette fonction attend
        (`confirm_event.wait()`) que l'appelant (l'interface graphique)
        signale la decision de l'utilisateur dans `confirm_decision[0]`
        ("confirm" pour valider, autre chose pour annuler sans soumettre).
        `on_ready_for_review`, s'il est fourni, est appele juste avant cette
        attente (pour prevenir l'appelant que la page est prete a etre
        inspectee). Tous les appels Playwright restent effectues depuis le
        thread appelant : seule l'attente/le signal traversent les threads.
        """
        page = self.open_page(url)
        filled: list[str] = []
        missing: list[str] = []
        interrupted = False

        try:
            for field_name, selector in field_selectors.items():
                if stop_event is not None and stop_event.is_set():
                    interrupted = True
                    logger.warning(
                        "Arret d'urgence : remplissage interrompu avant le champ '%s'. "
                        "Page laissee ouverte pour verification.",
                        field_name,
                    )
                    return WebFormResult(
                        success=False,
                        filled_fields=filled,
                        missing_selectors=[],
                        message="Interrompu par l'utilisateur (arret d'urgence) avant la fin du remplissage.",
                        interrupted=True,
                    )

                value = values.get(field_name, "")
                if not value:
                    continue
                locator = page.locator(selector)
                if locator.count() == 0:
                    missing.append(selector)
                    continue
                locator.first.fill(value, timeout=timeout_ms)
                filled.append(field_name)

            if missing:
                return WebFormResult(
                    success=False,
                    filled_fields=filled,
                    missing_selectors=missing,
                    message=f"Selecteurs introuvables sur la page : {missing}",
                )

            if confirm_event is not None:
                logger.info("Champs remplis, en attente de la confirmation de l'utilisateur avant l'envoi...")
                if on_ready_for_review is not None:
                    on_ready_for_review()
                confirm_event.wait()
                decision = confirm_decision[0] if confirm_decision else "confirm"
                if decision != "confirm":
                    interrupted = True
                    logger.info("Envoi annule par l'utilisateur apres verification. Page laissee ouverte.")
                    return WebFormResult(
                        success=False,
                        filled_fields=filled,
                        missing_selectors=[],
                        message="Envoi annule par l'utilisateur apres verification.",
                        interrupted=True,
                    )

            if stop_event is not None and stop_event.is_set():
                interrupted = True
                logger.warning(
                    "Arret d'urgence : validation annulee. Page laissee ouverte pour verification."
                )
                return WebFormResult(
                    success=False,
                    filled_fields=filled,
                    missing_selectors=[],
                    message="Interrompu par l'utilisateur (arret d'urgence) juste avant la validation.",
                    interrupted=True,
                )

            if submit_selector:
                page.locator(submit_selector).first.click(timeout=timeout_ms)

            if success_selector:
                page.locator(success_selector).first.wait_for(
                    state="visible", timeout=timeout_ms
                )

            return WebFormResult(
                success=True,
                filled_fields=filled,
                missing_selectors=[],
                message="Formulaire rempli et soumis avec succes.",
            )
        finally:
            if not interrupted:
                self.close_page(page)
