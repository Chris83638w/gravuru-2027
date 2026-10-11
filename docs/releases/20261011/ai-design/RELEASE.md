# Bearbeitbare KI-Gestaltung · 11.10.2026

Erster begrenzter OpenAI-Anschluss für vorhandene Werkstattdesigns: native Texte, Positionen, Farben und Bibliotheksmotive. Vorschläge bleiben getrennt, bis der Händler Vorher/Nachher prüft und sie als neue Revision übernimmt. Keine zweite Preis- oder Geometrielogik. Product Design dient der Entwicklungsarbeit; es wird nicht als Laufzeit-Plugin eingebaut.

Aufgabenbranch `task/openai-designer-20261011`, Ausgangspunkt `bc2f54d`; neuere Änderungen und Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` bleiben erhalten. Verwaltete Cloud unter `/workspace/gravuru-restored`. Keine fremden Änderungen zurückgesetzt.

## Bedienung und Kosten

Produkt → Designs & Elemente → **Mit KI gestalten**. Änderungen vorher speichern. Text-/Schrifterhalt und unveränderte Fotofelder sind voreingestellt. Vorschläge erzeugen einzeln bearbeitbare Elemente; vorhandene Preise, technische Konturen und Rechte werden geschützt. PDF-Schriftpfade zuerst mit der bestehenden Aufbereitung in Werkstatttext umwandeln. Neue KI-Bilder, Fotobearbeitung und Stapel-KI sind noch nicht Bestandteil dieses Pakets.

Bis zu **100 EUR/Monat für die Werkstatt**, konservative Tokenbewertung, atomare Reservierung von 4,26 EUR je Anfrage, tatsächliche Tokenabrechnung nach bestätigter Antwort. Keine automatische kostenpflichtige Wiederholung. Unklare Kosten bleiben reserviert; fehlende Verbrauchsbelege sperren neue Generierungen. Tariffreigabe höchstens 31 Tage. Die Grenze ist keine Zusage über die gesamte OpenAI-Kontorechnung.

**Echte OpenAI-Nutzung bleibt deaktiviert:** Es liegt kein geschützter API-Schlüssel vor. Keine kostenpflichtige Anfrage ausgeführt; Modellantwortqualität noch nicht real geprüft. [Einrichtung, Datenschutzumfang und Kostenverfahren](../../../../ops/plesk/AI-DESIGN.md).

## Prüfung

- 49 gezielte Tests bestanden; zusätzlich 9 Laufzeittests nach Erweiterung der AI-Anmelde-/CSRF-Prüfung. Überschneidende Teilmengen, keine Addition als unabhängige Gesamttests.
- 17 fachliche KI-Tests: native Änderungen, komplette Schriften, Text-/Fotomaske, geschützte Originale, Grenzwerte, doppelte Anfragen, Kostenreserve, Abbruch/Neustart, Konflikte und absturzsichere einmalige Übernahme.
- KI-Browser: Vorher/Nachher, mobile Breite, Übernahme und Wiederöffnen, persistente Historie sowie Abbruch mit verbleibender Reserve. Synthetische Identität und Provider, kein OpenAI-Aufruf; siehe `ai-browser.json` und Bilder.
- Bestehender vollständiger Händlerablauf bestanden; Schriftupload/Gruppen, Masteranlage, Materialwechsel, Auswahl/Verschieben, eigene Motive, bearbeitbarer PDF-Text/Foto, Kundenansicht und Speichern/Wiederöffnen; siehe `merchant-browser.json`.
- Bei der Browserprüfung korrigiert: Größenvorgaben nur für das äußere Vorschau-SVG; KI-Knopf während des Produktladens gesperrt, statt einen Klick scheinbar zu ignorieren. Antworten eines vorher geöffneten Produkts überschreiben kein neu geöffnetes KI-Fenster.
- **671 Regressionstests bestanden, 0 Fehler, 0 übersprungen**, Node-Testisolation ausdrücklich deaktiviert, Laufzeit 481,6 Sekunden. Paket-/Veröffentlichungsnachweise werden nach Abschluss ergänzt.

## Sicherung und Grenzen

Aufträge und Budget liegen ausschließlich in der privaten `workshop.sqlite`; neue Tabelle `ai_design_jobs`, Übernahmejournal in vorhandenem `import_items`. API-Schlüssel außerhalb Git, Paket und Webverzeichnis. Keine Bestellungen oder Bildbytes werden an OpenAI übertragen; Texte können personenbezogene Angaben enthalten.

Die geprüfte Shopify-Testbestellung aus dem Vorgängerrelease wird nicht erneut ausgelöst. Öffentliche neue Kunden-/Checkout-Strecke, allgemeine Produktveröffentlichung, eigene Drive-Autorisierung samt Ordner sowie reale Maschinen-/Material-/ICC-Abnahme bleiben offene Anschlüsse. Historische nicht erreichbare Cloud-/Windows-Dateien und Commit `c64c197` werden weiterhin nicht als gesichert dargestellt; siehe Herkunftsbericht unter `recovery/2026-10-10/`.
