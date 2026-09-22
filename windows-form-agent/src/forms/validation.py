"""Moteur de validation generique des champs, independant du type de formulaire.

La validation est volontairement du code deterministe (pas d'IA) : c'est la
derniere barriere avant d'enregistrer/soumettre un formulaire, elle doit
rester previsible et auditable.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from config import FieldSpec


@dataclass
class FieldError:
    field_name: str
    reason: str


@dataclass
class ValidationResult:
    errors: list[FieldError]

    @property
    def is_valid(self) -> bool:
        return not self.errors

    def summary(self) -> str:
        if self.is_valid:
            return "Tous les champs sont valides."
        lines = [f"- {e.field_name}: {e.reason}" for e in self.errors]
        return "Champs invalides :\n" + "\n".join(lines)


def validate_fields(fields: list[FieldSpec], values: dict[str, str]) -> ValidationResult:
    errors: list[FieldError] = []

    for field in fields:
        value = (values.get(field.name) or "").strip()

        if field.required and not value:
            errors.append(FieldError(field.name, "champ obligatoire manquant"))
            continue

        if value and field.regex and not re.match(field.regex, value):
            errors.append(
                FieldError(
                    field.name,
                    f"valeur '{value}' ne respecte pas le format attendu ({field.regex})",
                )
            )

    return ValidationResult(errors=errors)
