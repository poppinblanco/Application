"""Automatisation de formulaires web via Playwright.

Navigateurs supportes : Chromium, Google Chrome, Microsoft Edge, Firefox.

Internet Explorer n'est PAS supporte : Microsoft l'a retire le 15 juin 2022,
il ne recoit plus de mises a jour de securite et aucun outil d'automatisation
moderne (Playwright, Selenium 4+) ne le pilote plus. Utilise Chrome, Edge ou
Firefox a la place (ou le mode "Internet Explorer" d'Edge si un vieux site
interne l'exige vraiment, mais ce n'est pas gere ici).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from playwright.sync_api import Browser, Page, sync_playwright

logger = logging.getLogger(__name__)


@dataclass
class WebFormResult:
    success: bool
    filled_fields: list[str]
    missing_selectors: list[str]
    message: str


class BrowserSession:
    """Represente une session navigateur : peut ouvrir/fermer plusieurs pages."""

    def __init__(self, channel: str = "msedge", headless: bool = False):
        self.channel = channel
        self.headless = headless
        self._playwright = None
        self._browser: Browser | None = None

    def __enter__(self) -> "BrowserSession":
        self._playwright = sync_playwright().start()
        if self.channel == "firefox":
            self._browser = self._playwright.firefox.launch(headless=self.headless)
        elif self.channel == "chromium":
            self._browser = self._playwright.chromium.launch(headless=self.headless)
        else:
            # "chrome" ou "msedge" : utilise le vrai navigateur installe sur la machine.
            self._browser = self._playwright.chromium.launch(
                headless=self.headless, channel=self.channel
            )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def close(self) -> None:
        if self._browser is not None:
            self._browser.close()
            self._browser = None
        if self._playwright is not None:
            self._playwright.stop()
            self._playwright = None

    def open_page(self, url: str) -> Page:
        """Ouvre une nouvelle page (onglet) sur l'URL donnee."""
        assert self._browser is not None, "Le navigateur n'est pas demarre (utiliser 'with BrowserSession(...) as s:')"
        page = self._browser.new_page()
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
    ) -> WebFormResult:
        """Ouvre une page, remplit les champs indiques, soumet, valide, ferme la page."""
        page = self.open_page(url)
        filled: list[str] = []
        missing: list[str] = []

        try:
            for field_name, selector in field_selectors.items():
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
            self.close_page(page)
