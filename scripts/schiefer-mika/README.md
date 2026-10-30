# Reproduzierbarer lokaler Schiefer-Bau

Quelle/Anforderungen: docs/handoffs/2026-10-30-schiefer-hunde-katzen-alle-groessen.md und Design-Master des Katalog-Repos.

Windows-Projektstruktur wie im Neustart-Briefing: Produkte-Design/gravuru-2027-neu und Produkte-Design/gravuru-katalog-neu. GRAVURU_PROJECT_ROOT auf diesen Projektordner setzen. Python: fontTools, Pillow, openpyxl, pdfplumber, pikepdf; GRAVURU_PYTHON für den nativen Konfi-Test setzen. Die vorhandene projektlokale Python-Erweiterung verwenden. Node 24, Chromium/Playwright aus der vorhandenen Codex-Laufzeit. Keine geschützten Daten nötig.

Reihenfolge: build-schiefer-60.py → schiefer-shapes.py → build-schiefer-all.py → finalize-schiefer-vectors.py → audit-schiefer-all.py → check-schiefer-delivery.mjs → render-schiefer-all.cjs → package-schiefer-all.py. check-schiefer-60.mjs prüft die 22×14-Grundlage nativ; dessen bekannte Stroke-/Evenodd-Anzeigegrenze ist in der Übergabe erläutert.

Alle Ausgaben unter outputs/ im lokalen Projekt. Die Skripte verändern keine Quellkataloge, main oder Live-Systeme. Fehlende/vom Nutzer ausgesetzte Herz-Maße werden nicht vereinheitlicht; Kordel-Lochkoordinaten nicht erfunden.
