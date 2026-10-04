# Design QA – Kundenfeldbearbeitung, 04.10.2026

final result: passed

Geltungsbereich: das neue Teilstück „Kundenfelder festlegen“, nicht das gesamte Dashboard und keine pixelgleiche M02-Neuimplementierung. Der Nutzer beauftragt Wiederverwendung der bestehenden App. M02 gibt die bestätigte räumliche Aufteilung vor; zusätzlich gelten E08/E09 (mm/runde Farben), E15/E16 (Rechte/semantische Namen) und E21 (explizite Kundenfelder).

Original M02 und aktuelle Chromium-Aufnahmen wurden geöffnet und visuell verglichen. Links Elementauswahl, mittig große Gestaltung, rechts Eigenschaften; bestehende grüne Werkstattfarben wiederverwendet. Der Vorlagenrahmen ist ein synthetischer Testfall. Die fotografische Gesamtgestaltung aus M02 bleibt eine gesonderte, noch offene Umsetzung.

Geprüft: Desktop 1512×1080 und schmale Ansicht 390×844; Vorschau/Speichern/Abbrechen erreichbar; Eigenschaften und Elementliste bedienbar; schmaler Dialog ohne horizontalen Überlauf. Nach erster Aufnahme wurden die Speicheraktionen dauerhaft sichtbar gehalten, statt sie unterhalb der langen Eigenschaften zu verstecken. Danach erneut aufgenommen und geprüft.

Bilder: [Desktop](docs/dashboard-20261004/customer-fields-desktop.png), [schmal](docs/dashboard-20261004/customer-fields-mobile.png), [Kundenansicht](docs/dashboard-20261004/customer-preview.png). Vorhandene Szene im Konfigurator weiterverwendet. Felder nach Neuladen erhalten, Namen editierbar, Schriftgröße gesperrt; Fotos im zugeordneten Feld austauschbar. Farben als echte runde 30×30-Pixel-Buttons geprüft.

Offene Folgearbeiten außerhalb dieses Teilstücks: vollständige M01-Kartenansicht, durchgehende M02-Produktbearbeitung und direkte visuelle Platzierung per Ziehen. Feldpositionen werden aktuell über mm-Eingaben gesetzt. Kein unbestätigtes Stapellayout ausgewählt. Die beim Laden des übernommenen Kundeneditors beobachteten /undefined-Anfragen sind im Prüfbericht genannt.
