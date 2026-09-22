"""Interface graphique minimale (Tkinter, inclus avec Python, aucune install
supplementaire) pour lancer l'agent sans ligne de commande.
"""
from __future__ import annotations

import logging
import queue
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, scrolledtext, simpledialog, ttk

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai.ollama_client import OllamaClient  # noqa: E402
from config import DEFAULT_CONFIG_PATH, EXAMPLE_CONFIG_PATH, load_config  # noqa: E402
from config_writer import update_job_url, update_paths  # noqa: E402
from forms.validation import validate_fields  # noqa: E402
from main import (  # noqa: E402
    DocumentAnalysis,
    analyze_document,
    apply_document,
    archive_source_if_needed,
    process_job,
    run_watch_forever,
)
from utils.files import find_matching_files  # noqa: E402
from utils.state import daily_limit_reached, get_daily_count  # noqa: E402


class QueueLogHandler(logging.Handler):
    def __init__(self, log_queue: queue.Queue):
        super().__init__()
        self.log_queue = log_queue

    def emit(self, record: logging.LogRecord) -> None:
        self.log_queue.put(self.format(record))


class AgentGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Agent de remplissage de formulaires")
        self.root.geometry("780x720")
        self.root.minsize(780, 620)

        self.log_queue: queue.Queue[str] = queue.Queue()
        self.config = None
        self.config_error = None
        self._load_config()

        self.run_stop_event: threading.Event | None = None
        self.run_thread: threading.Thread | None = None

        self.watch_stop_event: threading.Event | None = None
        self.watch_thread: threading.Thread | None = None

        # Mode pas-a-pas
        self.step_queue: queue.Queue = queue.Queue()
        self.step_files: list[Path] = []
        self.step_pos: int = 0
        self.step_current: DocumentAnalysis | None = None
        self.step_client: OllamaClient | None = None
        self.step_job = None
        self.step_running = False
        self.step_stop_event: threading.Event | None = None
        # Pause de verification (formulaire web) entre remplissage et envoi
        self.pending_confirm_event: threading.Event | None = None
        self.pending_confirm_decision: list | None = None

        self._build_widgets()
        self._poll_log_queue()
        self._poll_step_queue()
        self._refresh_daily_status()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _load_config(self) -> None:
        try:
            self.config = load_config()
        except Exception as exc:  # noqa: BLE001
            self.config_error = str(exc)

    def _build_widgets(self) -> None:
        # Chaque ligne ne combine qu'un texte long avec un seul bouton (ou
        # rien) : ca evite qu'une fenetre etroite tronque un libelle, ce
        # qu'un simple pack() cote a cote ne gere pas tout seul.
        settings_row = ttk.Frame(self.root, padding=(10, 10, 10, 0))
        settings_row.pack(fill=tk.X)

        self.settings_button = ttk.Button(
            settings_row, text="Parametres (dossiers, URL du formulaire)", command=self._open_settings_dialog
        )
        self.settings_button.pack(side=tk.RIGHT)

        job_row = ttk.Frame(self.root, padding=(10, 8, 10, 4))
        job_row.pack(fill=tk.X)

        ttk.Label(job_row, text="Job a executer :").pack(side=tk.LEFT)

        job_names = [j.name for j in self.config.jobs] if self.config else []
        self.job_var = tk.StringVar(value="(tous les jobs)")
        self.job_combo = ttk.Combobox(
            job_row,
            textvariable=self.job_var,
            values=["(tous les jobs)"] + job_names,
            state="readonly",
            width=35,
        )
        self.job_combo.pack(side=tk.LEFT, padx=8)

        self.run_button = ttk.Button(job_row, text="Lancer une fois", command=self._on_run)
        self.run_button.pack(side=tk.RIGHT)

        options_row = ttk.Frame(self.root, padding=(10, 0, 10, 4))
        options_row.pack(fill=tk.X)

        self.dry_run_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            options_row, text="Mode test (analyse sans remplir/soumettre)", variable=self.dry_run_var
        ).pack(side=tk.LEFT)

        limit_row = ttk.Frame(self.root, padding=(10, 0, 10, 4))
        limit_row.pack(fill=tk.X)

        ttk.Label(limit_row, text="Limite de documents par jour (vide = illimite) :").pack(side=tk.LEFT)
        initial_limit = str(self.config.daily_limit) if self.config and self.config.daily_limit else ""
        self.daily_limit_var = tk.StringVar(value=initial_limit)
        ttk.Entry(limit_row, textvariable=self.daily_limit_var, width=8).pack(side=tk.LEFT, padx=8)

        status_row = ttk.Frame(self.root, padding=(10, 0, 10, 4))
        status_row.pack(fill=tk.X)

        self.daily_status_var = tk.StringVar(value="")
        ttk.Label(status_row, textvariable=self.daily_status_var).pack(side=tk.LEFT)

        watch_status_row = ttk.Frame(self.root, padding=(10, 4, 10, 0))
        watch_status_row.pack(fill=tk.X)

        interval = self.config.watch.interval_seconds if self.config else 30
        self.watch_status_var = tk.StringVar(
            value=f"Mode automatique en chaine : arrete (verification toutes les {interval}s une fois demarre)"
        )
        ttk.Label(watch_status_row, textvariable=self.watch_status_var, wraplength=680).pack(side=tk.LEFT)

        watch_frame = ttk.Frame(self.root, padding=(10, 0, 10, 10))
        watch_frame.pack(fill=tk.X)

        self.watch_button = ttk.Button(
            watch_frame, text="Demarrer la surveillance continue", command=self._on_toggle_watch
        )
        self.watch_button.pack(side=tk.RIGHT)

        # --- Mode pas-a-pas -------------------------------------------------
        step_outer = ttk.LabelFrame(
            self.root,
            text="Mode pas-a-pas (un document a la fois, avec verification avant remplissage)",
            padding=10,
        )
        step_outer.pack(fill=tk.X, padx=10, pady=(0, 10))

        step_status_row = ttk.Frame(step_outer)
        step_status_row.pack(fill=tk.X)

        self.step_status_var = tk.StringVar(value="Aucun document charge.")
        ttk.Label(step_status_row, textvariable=self.step_status_var, wraplength=700).pack(side=tk.LEFT)

        step_controls = ttk.Frame(step_outer)
        step_controls.pack(fill=tk.X, pady=(4, 0))

        self.step_start_button = ttk.Button(
            step_controls, text="Charger et analyser le 1er document", command=self._on_step_start
        )
        self.step_start_button.pack(side=tk.RIGHT)

        columns = ("champ", "valeur", "statut")
        self.step_tree = ttk.Treeview(step_outer, columns=columns, show="headings", height=6)
        self.step_tree.heading("champ", text="Champ")
        self.step_tree.heading("valeur", text="Valeur extraite par l'IA")
        self.step_tree.heading("statut", text="Statut")
        self.step_tree.column("champ", width=160)
        self.step_tree.column("valeur", width=320)
        self.step_tree.column("statut", width=200)
        self.step_tree.pack(fill=tk.X, pady=8)
        self.step_tree.bind("<Double-1>", self._on_step_tree_double_click)

        ttk.Label(
            step_outer,
            text="Astuce : double-clique sur une valeur pour la corriger si l'IA s'est trompee "
            "-- la correction sera memorisee pour aider l'IA sur des documents similaires.",
            foreground="#555555",
        ).pack(fill=tk.X)

        step_actions = ttk.Frame(step_outer)
        step_actions.pack(fill=tk.X)

        self.step_fill_button = ttk.Button(
            step_actions, text="Remplir ce document", command=self._on_step_fill, state="disabled"
        )
        self.step_fill_button.pack(side=tk.LEFT)

        self.step_skip_button = ttk.Button(
            step_actions, text="Ignorer ce document", command=self._on_step_skip, state="disabled"
        )
        self.step_skip_button.pack(side=tk.LEFT, padx=8)

        self.step_stop_button = ttk.Button(
            step_actions, text="Arreter le mode pas-a-pas", command=self._on_step_stop, state="disabled"
        )
        self.step_stop_button.pack(side=tk.RIGHT)

        # Pause de verification (formulaire web) : apparait une fois les
        # champs remplis sur la vraie page, avant l'envoi definitif.
        step_confirm_row = ttk.Frame(step_outer, padding=(0, 8, 0, 0))
        step_confirm_row.pack(fill=tk.X)

        self.step_confirm_status_var = tk.StringVar(value="")
        ttk.Label(
            step_confirm_row, textvariable=self.step_confirm_status_var, foreground="#a05a00"
        ).pack(anchor=tk.W)

        step_confirm_buttons = ttk.Frame(step_outer)
        step_confirm_buttons.pack(fill=tk.X, pady=(2, 0))

        self.step_confirm_submit_button = ttk.Button(
            step_confirm_buttons,
            text="Confirmer l'envoi",
            command=self._on_confirm_submit,
            state="disabled",
        )
        self.step_confirm_submit_button.pack(side=tk.LEFT)

        self.step_cancel_submit_button = ttk.Button(
            step_confirm_buttons,
            text="Annuler l'envoi",
            command=self._on_cancel_submit,
            state="disabled",
        )
        self.step_cancel_submit_button.pack(side=tk.LEFT, padx=8)

        self.log_widget = scrolledtext.ScrolledText(self.root, state="disabled", height=14)
        self.log_widget.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        if self.config_error:
            self._append_log(f"[ERREUR] Configuration invalide : {self.config_error}")
            self._append_log("Copie 'config.example.yaml' vers 'config.yaml' et adapte-le, puis relance l'application.")
            self.run_button.state(["disabled"])
            self.watch_button.state(["disabled"])
            self.step_start_button.state(["disabled"])
            self.settings_button.state(["disabled"])

    def _append_log(self, message: str) -> None:
        self.log_widget.configure(state="normal")
        self.log_widget.insert(tk.END, message + "\n")
        self.log_widget.see(tk.END)
        self.log_widget.configure(state="disabled")

    def _poll_log_queue(self) -> None:
        try:
            while True:
                message = self.log_queue.get_nowait()
                self._append_log(message)
        except queue.Empty:
            pass
        self.root.after(200, self._poll_log_queue)

    def _make_client(self) -> OllamaClient:
        return OllamaClient(
            host=self.config.ollama.host,
            text_model=self.config.ollama.text_model,
            vision_model=self.config.ollama.vision_model,
            timeout_seconds=self.config.ollama.timeout_seconds,
        )

    def _selected_jobs(self) -> list:
        selected = self.job_var.get()
        if selected == "(tous les jobs)":
            return list(self.config.jobs)
        return [j for j in self.config.jobs if j.name == selected]

    def _apply_daily_limit_from_ui(self) -> None:
        """Reporte la valeur saisie dans le champ 'Limite par jour' sur la config,
        avant de demarrer un traitement (lancer une fois / surveillance / pas-a-pas)."""
        text = self.daily_limit_var.get().strip()
        if not text:
            self.config.daily_limit = None
            return
        try:
            self.config.daily_limit = max(0, int(text))
        except ValueError:
            self._append_log(f"[ERREUR] Limite quotidienne invalide : '{text}' (nombre entier attendu).")

    def _refresh_daily_status(self) -> None:
        if self.config is not None:
            count = get_daily_count()
            if self.config.daily_limit:
                self.daily_status_var.set(f"Documents remplis aujourd'hui : {count}/{self.config.daily_limit}")
            else:
                self.daily_status_var.set(f"Documents remplis aujourd'hui : {count} (illimite)")
        self.root.after(2000, self._refresh_daily_status)

    # --- Parametres (dossiers, URL) -------------------------------------------
    #
    # Les dossiers (documents a traiter / copies remplies / documents deja
    # traites) et l'URL du formulaire web peuvent changer avec le temps :
    # ce panneau permet de les modifier sans editer config.yaml a la main.
    # La sauvegarde reecrit config.yaml en conservant ses commentaires
    # (voir config_writer.py).

    def _is_busy(self) -> bool:
        return (
            (self.run_thread is not None and self.run_thread.is_alive())
            or (self.watch_thread is not None and self.watch_thread.is_alive())
            or self.step_running
        )

    def _open_settings_dialog(self) -> None:
        if self._is_busy():
            self._append_log(
                "[ERREUR] Arrete le traitement en cours avant de changer les parametres "
                "(dossiers/URL peuvent changer les resultats en plein milieu d'un traitement)."
            )
            return

        if not DEFAULT_CONFIG_PATH.exists():
            import shutil

            shutil.copy(EXAMPLE_CONFIG_PATH, DEFAULT_CONFIG_PATH)
            self._append_log(f"'{DEFAULT_CONFIG_PATH.name}' cree a partir de l'exemple fourni.")

        dialog = tk.Toplevel(self.root)
        dialog.title("Parametres")
        dialog.transient(self.root)
        dialog.grab_set()

        def add_folder_row(label_text: str, initial_value: str) -> tk.StringVar:
            row = ttk.Frame(dialog, padding=(10, 6, 10, 0))
            row.pack(fill=tk.X)
            ttk.Label(row, text=label_text).pack(anchor=tk.W)

            sub_row = ttk.Frame(row)
            sub_row.pack(fill=tk.X, pady=(2, 0))
            var = tk.StringVar(value=initial_value)
            entry = ttk.Entry(sub_row, textvariable=var, width=55)
            entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

            def browse() -> None:
                chosen = filedialog.askdirectory(parent=dialog, initialdir=var.get() or str(DEFAULT_CONFIG_PATH.parent))
                if chosen:
                    var.set(chosen)

            ttk.Button(sub_row, text="Parcourir...", command=browse).pack(side=tk.LEFT, padx=(6, 0))
            return var

        source_var = add_folder_row("Dossier source (documents a traiter) :", self.config.source_folder)
        output_var = add_folder_row("Dossier de sortie (copies remplies PDF/Word/Excel) :", self.config.output_folder)
        archive_var = add_folder_row(
            "Dossier d'archive (documents deja traites, vide = ne jamais deplacer) :",
            self.config.archive_folder or "",
        )

        ttk.Separator(dialog, orient="horizontal").pack(fill=tk.X, padx=10, pady=10)

        url_section = ttk.Frame(dialog, padding=(10, 0, 10, 0))
        url_section.pack(fill=tk.X)
        ttk.Label(url_section, text="URL du formulaire web, pour un job donne :").pack(anchor=tk.W)

        job_row = ttk.Frame(dialog, padding=(10, 4, 10, 0))
        job_row.pack(fill=tk.X)
        job_names = [j.name for j in self.config.jobs]
        settings_job_var = tk.StringVar(value=job_names[0] if job_names else "")
        job_combo = ttk.Combobox(job_row, textvariable=settings_job_var, values=job_names, state="readonly", width=40)
        job_combo.pack(side=tk.LEFT)

        url_row = ttk.Frame(dialog, padding=(10, 6, 10, 0))
        url_row.pack(fill=tk.X)
        url_var = tk.StringVar(value="")
        url_entry = ttk.Entry(url_row, textvariable=url_var, width=55)
        url_entry.pack(fill=tk.X)

        def refresh_url_field(*_args) -> None:
            job = next((j for j in self.config.jobs if j.name == settings_job_var.get()), None)
            if job is None:
                return
            if job.target.type == "web_form":
                url_var.set(job.target.url or "")
                url_entry.state(["!disabled"])
            else:
                url_var.set(f"(ce job n'a pas d'URL -- cible : {job.target.type})")
                url_entry.state(["disabled"])

        settings_job_var.trace_add("write", refresh_url_field)
        refresh_url_field()

        button_row = ttk.Frame(dialog, padding=10)
        button_row.pack(fill=tk.X)

        def on_save() -> None:
            try:
                update_paths(
                    source_folder=source_var.get().strip(),
                    output_folder=output_var.get().strip(),
                    archive_folder=archive_var.get().strip(),
                )
                job = next((j for j in self.config.jobs if j.name == settings_job_var.get()), None)
                if job is not None and job.target.type == "web_form":
                    update_job_url(job.name, url_var.get().strip())

                self.config = load_config()
                self._append_log("Parametres enregistres dans config.yaml.")
                dialog.destroy()
            except Exception as exc:  # noqa: BLE001
                self._append_log(f"[ERREUR] Echec de l'enregistrement des parametres : {exc}")

        ttk.Button(button_row, text="Annuler", command=dialog.destroy).pack(side=tk.RIGHT)
        ttk.Button(button_row, text="Enregistrer", command=on_save).pack(side=tk.RIGHT, padx=(0, 8))

    # --- Traitement unique (tous les documents d'un coup) -------------------

    def _on_run(self) -> None:
        if self.run_thread is not None and self.run_thread.is_alive():
            self._append_log("Arret d'urgence demande : le document en cours sera interrompu immediatement.")
            if self.run_stop_event is not None:
                self.run_stop_event.set()
            return

        self._apply_daily_limit_from_ui()
        self.run_button.configure(text="Arret d'urgence")
        self.watch_button.state(["disabled"])
        self.step_start_button.state(["disabled"])

        self.run_stop_event = threading.Event()
        self.run_thread = threading.Thread(target=self._run_agent, daemon=True)
        self.run_thread.start()

    def _run_agent(self) -> None:
        handler = QueueLogHandler(self.log_queue)
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.INFO)

        try:
            client = self._make_client()
            if not client.is_available():
                self.log_queue.put(
                    f"[ERREUR] Ollama injoignable sur {self.config.ollama.host}. "
                    "Installe/lance Ollama (https://ollama.com) et telecharge un modele."
                )
                return

            for job in self._selected_jobs():
                process_job(self.config, job, client, dry_run=self.dry_run_var.get(), stop_event=self.run_stop_event)

            self.log_queue.put("Traitement termine.")
        except Exception as exc:  # noqa: BLE001
            self.log_queue.put(f"[ERREUR] {exc}")
        finally:
            root_logger.removeHandler(handler)
            self.root.after(0, self._reset_run_ui)

    def _reset_run_ui(self) -> None:
        self.run_button.configure(text="Lancer une fois")
        self.watch_button.state(["!disabled"])
        self.step_start_button.state(["!disabled"])
        self.run_thread = None
        self.run_stop_event = None

    # --- Surveillance continue -----------------------------------------------

    def _on_toggle_watch(self) -> None:
        if self.watch_thread is not None and self.watch_thread.is_alive():
            self._stop_watch()
        else:
            self._start_watch()

    def _start_watch(self) -> None:
        self._apply_daily_limit_from_ui()
        self.run_button.state(["disabled"])
        self.step_start_button.state(["disabled"])
        self.watch_button.configure(text="Arreter la surveillance")
        self.watch_status_var.set("Mode automatique en chaine : en cours, dossier surveille en continu...")

        self.watch_stop_event = threading.Event()
        self.watch_thread = threading.Thread(target=self._run_watch, daemon=True)
        self.watch_thread.start()

    def _stop_watch(self) -> None:
        self.watch_status_var.set("Mode automatique en chaine : arret en cours...")
        if self.watch_stop_event is not None:
            self.watch_stop_event.set()

    def _run_watch(self) -> None:
        handler = QueueLogHandler(self.log_queue)
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.INFO)

        try:
            client = self._make_client()
            if not client.is_available():
                self.log_queue.put(
                    f"[ERREUR] Ollama injoignable sur {self.config.ollama.host}. "
                    "Installe/lance Ollama (https://ollama.com) et telecharge un modele."
                )
                return

            run_watch_forever(
                self.config,
                client,
                self._selected_jobs(),
                dry_run=self.dry_run_var.get(),
                stop_event=self.watch_stop_event,
            )
        except Exception as exc:  # noqa: BLE001
            self.log_queue.put(f"[ERREUR] {exc}")
        finally:
            root_logger.removeHandler(handler)
            self.log_queue.put("Surveillance arretee.")
            self.root.after(0, self._reset_watch_ui)

    def _reset_watch_ui(self) -> None:
        self.watch_button.configure(text="Demarrer la surveillance continue")
        self.run_button.state(["!disabled"])
        self.step_start_button.state(["!disabled"])
        interval = self.config.watch.interval_seconds if self.config else 30
        self.watch_status_var.set(
            f"Mode automatique en chaine : arrete (verification toutes les {interval}s une fois demarre)"
        )
        self.watch_thread = None
        self.watch_stop_event = None

    # --- Mode pas-a-pas -------------------------------------------------------
    #
    # Traite un seul document a la fois : les valeurs extraites par l'IA sont
    # affichees avant tout remplissage, pour reperer une erreur (format,
    # champ manquant, etc.) avant de passer au document suivant.

    def _poll_step_queue(self) -> None:
        try:
            while True:
                kind, payload = self.step_queue.get_nowait()
                if kind == "analysis":
                    self._show_step_analysis(payload)
                elif kind == "applied":
                    self._append_log(f"Document rempli : {payload}")
                    self._advance_step()
                elif kind == "error":
                    self._append_log(f"[ERREUR] {payload}")
                    self._finish_step_mode()
                elif kind == "interrupted":
                    self._append_log(
                        f"Traitement de {payload} interrompu (arret d'urgence ou envoi annule apres "
                        "verification). La page/fenetre a ete laissee ouverte, verifie-la avant de continuer."
                    )
                    self._finish_step_mode()
                elif kind == "await_confirmation":
                    self.step_confirm_status_var.set(
                        "Champs remplis sur la page reelle -- verifie-la, puis confirme ou annule l'envoi ci-dessous."
                    )
                    self.step_confirm_submit_button.state(["!disabled"])
                    self.step_cancel_submit_button.state(["!disabled"])
                elif kind == "done":
                    self.step_status_var.set("Mode pas-a-pas termine : tous les documents ont ete traites.")
                    self._finish_step_mode()
        except queue.Empty:
            pass
        self.root.after(200, self._poll_step_queue)

    def _on_step_start(self) -> None:
        self._apply_daily_limit_from_ui()
        jobs = self._selected_jobs()
        if len(jobs) != 1:
            self._append_log(
                "[ERREUR] Choisis un seul job precis (pas '(tous les jobs)') pour le mode pas-a-pas."
            )
            return

        self.step_job = jobs[0]
        self.step_stop_event = threading.Event()
        self.step_start_button.state(["disabled"])
        self.run_button.state(["disabled"])
        self.watch_button.state(["disabled"])
        self.step_status_var.set("Recherche des documents...")

        threading.Thread(target=self._init_step_mode, daemon=True).start()

    def _init_step_mode(self) -> None:
        try:
            self.step_client = self._make_client()
            if not self.step_client.is_available():
                self.step_queue.put((
                    "error",
                    f"Ollama injoignable sur {self.config.ollama.host}. Installe/lance Ollama et telecharge un modele.",
                ))
                return

            self.step_files = find_matching_files(self.config.source_folder, self.step_job.source_pattern)
            self.step_pos = 0
            self.step_running = True

            if not self.step_files:
                self.step_queue.put(("error", f"Aucun document trouve pour le job '{self.step_job.name}'."))
                return

            self._run_step_analysis()
        except Exception as exc:  # noqa: BLE001
            self.step_queue.put(("error", str(exc)))

    def _run_step_analysis(self) -> None:
        source_path = self.step_files[self.step_pos]
        analysis = analyze_document(self.config, self.step_job, self.step_client, source_path)
        self.step_queue.put(("analysis", analysis))

    def _show_step_analysis(self, analysis: DocumentAnalysis) -> None:
        self.step_current = analysis
        for row in self.step_tree.get_children():
            self.step_tree.delete(row)

        position = f"Document {self.step_pos + 1}/{len(self.step_files)} : {analysis.source_path.name}"

        if analysis.error is not None:
            self.step_tree.insert("", tk.END, iid="_error_", values=("(lecture/IA)", "", f"Erreur : {analysis.error}"))
            self.step_status_var.set(f"{position} -- echec de l'analyse")
            self.step_fill_button.state(["disabled"])
        else:
            errors_by_field = {e.field_name: e.reason for e in (analysis.validation.errors if analysis.validation else [])}
            for field in analysis.job.fields:
                value = analysis.values.get(field.name, "")
                if field.name in errors_by_field:
                    statut = f"Erreur : {errors_by_field[field.name]}"
                elif field.name in analysis.corrected_fields:
                    statut = "OK (corrige manuellement)"
                else:
                    statut = "OK"
                self.step_tree.insert("", tk.END, iid=field.name, values=(field.name, value, statut))

            if not analysis.can_apply:
                self.step_status_var.set(f"{position} -- erreurs detectees, corrige le document source ou ignore-le")
                self.step_fill_button.state(["disabled"])
            elif daily_limit_reached(self.config.daily_limit):
                self.step_status_var.set(
                    f"{position} -- limite quotidienne de {self.config.daily_limit} documents atteinte, "
                    "remplissage bloque jusqu'a demain"
                )
                self.step_fill_button.state(["disabled"])
            else:
                self.step_status_var.set(f"{position} -- valeurs valides, pret a remplir")
                self.step_fill_button.state(["!disabled"])

        self.step_skip_button.state(["!disabled"])
        self.step_stop_button.state(["!disabled"])

    def _on_step_tree_double_click(self, event) -> None:
        """Double-clic sur une valeur du tableau : permet de la corriger a la
        main si l'IA s'est trompee. La correction est memorisee et servira
        d'exemple pour l'IA sur des documents similaires (voir
        utils/examples.py)."""
        if self.step_current is None or self.step_current.error is not None:
            return
        if self.step_tree.identify("region", event.x, event.y) != "cell":
            return
        if self.step_tree.identify_column(event.x) != "#2":  # colonne "valeur"
            return

        field_name = self.step_tree.identify_row(event.y)
        if not field_name:
            return

        current_value = self.step_current.values.get(field_name, "")
        new_value = simpledialog.askstring(
            "Corriger la valeur",
            f"Valeur correcte pour '{field_name}' :",
            initialvalue=current_value,
            parent=self.root,
        )
        if new_value is None or new_value == current_value:
            return

        self.step_current.values[field_name] = new_value
        self.step_current.corrected_fields.add(field_name)
        self.step_current.validation = validate_fields(self.step_current.job.fields, self.step_current.values)
        self._append_log(f"Valeur corrigee pour '{field_name}' : '{current_value}' -> '{new_value}'")
        self._show_step_analysis(self.step_current)

    def _on_step_fill(self) -> None:
        if self.step_current is None or not self.step_current.can_apply:
            return
        self.step_fill_button.state(["disabled"])
        self.step_skip_button.state(["disabled"])
        threading.Thread(target=self._do_step_fill, daemon=True).start()

    def _do_step_fill(self) -> None:
        # Pour un formulaire web, on marque une pause entre le remplissage et
        # l'envoi : l'utilisateur regarde la vraie page, puis confirme ou
        # annule depuis le programme (voir _on_confirm_submit/_on_cancel_submit).
        is_web_form = self.step_current.job.target.type == "web_form"
        confirm_event = threading.Event() if is_web_form else None
        confirm_decision: list = [None] if is_web_form else None
        if is_web_form:
            self.pending_confirm_event = confirm_event
            self.pending_confirm_decision = confirm_decision

        def on_ready_for_review() -> None:
            self.step_queue.put(("await_confirmation", None))

        try:
            outcome = apply_document(
                self.config,
                self.step_current,
                stop_event=self.step_stop_event,
                confirm_event=confirm_event,
                confirm_decision=confirm_decision,
                on_ready_for_review=on_ready_for_review if is_web_form else None,
            )
            if outcome == "interrompu":
                self.step_queue.put(("interrupted", self.step_current.source_path.name))
                return
            archive_source_if_needed(self.config, self.step_job, self.step_current.source_path, outcome)
            self.step_pos += 1
            self.step_queue.put(("applied", f"{self.step_current.source_path.name} ({outcome})"))
        except Exception as exc:  # noqa: BLE001
            self.step_queue.put(("error", str(exc)))
        finally:
            self.pending_confirm_event = None
            self.pending_confirm_decision = None

    def _on_confirm_submit(self) -> None:
        if self.pending_confirm_event is None or self.pending_confirm_decision is None:
            return
        self._append_log("Envoi confirme apres verification.")
        self.pending_confirm_decision[0] = "confirm"
        self.pending_confirm_event.set()
        self._reset_confirm_buttons("Envoi en cours...")

    def _on_cancel_submit(self) -> None:
        if self.pending_confirm_event is None or self.pending_confirm_decision is None:
            return
        self._append_log("Envoi annule apres verification -- page laissee ouverte, rien n'a ete soumis.")
        self.pending_confirm_decision[0] = "cancel"
        self.pending_confirm_event.set()
        self._reset_confirm_buttons("Annulation en cours...")

    def _reset_confirm_buttons(self, status_text: str = "") -> None:
        self.step_confirm_status_var.set(status_text)
        self.step_confirm_submit_button.state(["disabled"])
        self.step_cancel_submit_button.state(["disabled"])

    def _on_step_skip(self) -> None:
        self._append_log(f"Document ignore : {self.step_current.source_path.name}")
        self.step_pos += 1
        self._advance_step()

    def _advance_step(self) -> None:
        if not self.step_running:
            return
        if self.step_pos >= len(self.step_files):
            self.step_queue.put(("done", None))
            return
        self.step_fill_button.state(["disabled"])
        self.step_skip_button.state(["disabled"])
        self.step_status_var.set("Analyse du document suivant...")
        threading.Thread(target=self._run_step_analysis, daemon=True).start()

    def _on_step_stop(self) -> None:
        self._append_log("Mode pas-a-pas arrete par l'utilisateur (arret d'urgence si un remplissage etait en cours).")
        if self.step_stop_event is not None:
            self.step_stop_event.set()
        if self.pending_confirm_event is not None:
            # Un remplissage web est en pause en attente de confirmation :
            # on la debloque en "annule" pour ne pas la laisser bloquee.
            self.pending_confirm_decision[0] = "cancel"
            self.pending_confirm_event.set()
        self._finish_step_mode()

    def _finish_step_mode(self) -> None:
        self.step_running = False
        self.step_current = None
        self.step_stop_event = None
        self.pending_confirm_event = None
        self.pending_confirm_decision = None
        self.step_fill_button.state(["disabled"])
        self.step_skip_button.state(["disabled"])
        self.step_stop_button.state(["disabled"])
        self._reset_confirm_buttons("")
        self.step_start_button.state(["!disabled"])
        self.run_button.state(["!disabled"])
        self.watch_button.state(["!disabled"])

    def _on_close(self) -> None:
        if self.run_stop_event is not None:
            self.run_stop_event.set()
        if self.watch_stop_event is not None:
            self.watch_stop_event.set()
        if self.step_stop_event is not None:
            self.step_stop_event.set()
        if self.pending_confirm_event is not None:
            self.pending_confirm_decision[0] = "cancel"
            self.pending_confirm_event.set()
        self.step_running = False
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    AgentGUI(root)
    try:
        root.mainloop()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
