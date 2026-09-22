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
from tkinter import messagebox, scrolledtext, ttk

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai.ollama_client import OllamaClient  # noqa: E402
from config import load_config  # noqa: E402
from main import process_job, run_watch_forever  # noqa: E402


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
        self.root.geometry("720x480")

        self.log_queue: queue.Queue[str] = queue.Queue()
        self.config = None
        self.config_error = None
        self._load_config()

        self.watch_stop_event: threading.Event | None = None
        self.watch_thread: threading.Thread | None = None

        self._build_widgets()
        self._poll_log_queue()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _load_config(self) -> None:
        try:
            self.config = load_config()
        except Exception as exc:  # noqa: BLE001
            self.config_error = str(exc)

    def _build_widgets(self) -> None:
        top_frame = ttk.Frame(self.root, padding=10)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="Job a executer :").pack(side=tk.LEFT)

        job_names = [j.name for j in self.config.jobs] if self.config else []
        self.job_var = tk.StringVar(value="(tous les jobs)")
        self.job_combo = ttk.Combobox(
            top_frame,
            textvariable=self.job_var,
            values=["(tous les jobs)"] + job_names,
            state="readonly",
            width=40,
        )
        self.job_combo.pack(side=tk.LEFT, padx=8)

        self.dry_run_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            top_frame, text="Mode test (analyse sans remplir/soumettre)", variable=self.dry_run_var
        ).pack(side=tk.LEFT, padx=8)

        self.run_button = ttk.Button(top_frame, text="Lancer une fois", command=self._on_run)
        self.run_button.pack(side=tk.RIGHT)

        watch_frame = ttk.Frame(self.root, padding=(10, 0, 10, 10))
        watch_frame.pack(fill=tk.X)

        interval = self.config.watch.interval_seconds if self.config else 30
        self.watch_status_var = tk.StringVar(
            value=f"Mode automatique : arrete (dossier verifie toutes les {interval}s une fois demarre)"
        )
        ttk.Label(watch_frame, textvariable=self.watch_status_var).pack(side=tk.LEFT)

        self.watch_button = ttk.Button(
            watch_frame, text="Demarrer la surveillance continue", command=self._on_toggle_watch
        )
        self.watch_button.pack(side=tk.RIGHT)

        self.log_widget = scrolledtext.ScrolledText(self.root, state="disabled", height=22)
        self.log_widget.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        if self.config_error:
            self._append_log(f"[ERREUR] Configuration invalide : {self.config_error}")
            self._append_log("Copie 'config.example.yaml' vers 'config.yaml' et adapte-le, puis relance l'application.")
            self.run_button.state(["disabled"])
            self.watch_button.state(["disabled"])

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

    def _on_run(self) -> None:
        self.run_button.state(["disabled"])
        threading.Thread(target=self._run_agent, daemon=True).start()

    def _run_agent(self) -> None:
        handler = QueueLogHandler(self.log_queue)
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.INFO)

        try:
            client = OllamaClient(
                host=self.config.ollama.host,
                text_model=self.config.ollama.text_model,
                vision_model=self.config.ollama.vision_model,
                timeout_seconds=self.config.ollama.timeout_seconds,
            )
            if not client.is_available():
                self.log_queue.put(
                    f"[ERREUR] Ollama injoignable sur {self.config.ollama.host}. "
                    "Installe/lance Ollama (https://ollama.com) et telecharge un modele."
                )
                return

            selected = self.job_var.get()
            jobs = self.config.jobs if selected == "(tous les jobs)" else [
                j for j in self.config.jobs if j.name == selected
            ]

            for job in jobs:
                process_job(self.config, job, client, dry_run=self.dry_run_var.get())

            self.log_queue.put("Traitement termine.")
        except Exception as exc:  # noqa: BLE001
            self.log_queue.put(f"[ERREUR] {exc}")
        finally:
            root_logger.removeHandler(handler)
            self.root.after(0, lambda: self.run_button.state(["!disabled"]))

    def _on_toggle_watch(self) -> None:
        if self.watch_thread is not None and self.watch_thread.is_alive():
            self._stop_watch()
        else:
            self._start_watch()

    def _start_watch(self) -> None:
        self.run_button.state(["disabled"])
        self.watch_button.configure(text="Arreter la surveillance")
        self.watch_status_var.set("Mode automatique : en cours, dossier surveille en continu...")

        self.watch_stop_event = threading.Event()
        self.watch_thread = threading.Thread(target=self._run_watch, daemon=True)
        self.watch_thread.start()

    def _stop_watch(self) -> None:
        self.watch_status_var.set("Mode automatique : arret en cours...")
        if self.watch_stop_event is not None:
            self.watch_stop_event.set()

    def _run_watch(self) -> None:
        handler = QueueLogHandler(self.log_queue)
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.INFO)

        try:
            client = OllamaClient(
                host=self.config.ollama.host,
                text_model=self.config.ollama.text_model,
                vision_model=self.config.ollama.vision_model,
                timeout_seconds=self.config.ollama.timeout_seconds,
            )
            if not client.is_available():
                self.log_queue.put(
                    f"[ERREUR] Ollama injoignable sur {self.config.ollama.host}. "
                    "Installe/lance Ollama (https://ollama.com) et telecharge un modele."
                )
                return

            selected = self.job_var.get()
            jobs = self.config.jobs if selected == "(tous les jobs)" else [
                j for j in self.config.jobs if j.name == selected
            ]

            run_watch_forever(
                self.config,
                client,
                jobs,
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
        interval = self.config.watch.interval_seconds if self.config else 30
        self.watch_status_var.set(
            f"Mode automatique : arrete (dossier verifie toutes les {interval}s une fois demarre)"
        )
        self.watch_thread = None
        self.watch_stop_event = None

    def _on_close(self) -> None:
        if self.watch_stop_event is not None:
            self.watch_stop_event.set()
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    app = AgentGUI(root)
    try:
        root.mainloop()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
