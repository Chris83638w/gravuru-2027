# Aktuelles Dashboard ansehen und Excel herunterladen

Stand 06.10.2026. Branch `docs/dashboard-review-pack-20261006`, unveränderter Produktcode `f9f1fba6bb5560183c25ddc15b7d97f898eb5290`. Aufnahmen der echten Cloud-Laufzeit mit neu angelegten synthetischen Prüfprodukten. Kein privater Bestand und keine echte Bestellung.

## Direkt öffnen

- [Sichtprüfung als PDF, sechs Seiten](sichtpruefung-20261006/Gravuru-Dashboard-Sichtpruefung.pdf)
- [Durchblätterbare HTML-Sichtprüfung, alle Bilder enthalten](sichtpruefung-20261006/Gravuru-Dashboard-Sichtpruefung.html)
- [Excel: Produktserie](sichtpruefung-20261006/Gravuru-Produktserie.xlsx)
- [Excel: Ausführungen](sichtpruefung-20261006/Gravuru-Ausfuehrungen.xlsx)

HTML herunterladen und öffnen; sie enthält ausschließlich Bildschirmaufnahmen mit Navigation. **PDF und HTML sind keine bedienbare Werkstatt.** Vorhandene Buttons in den Bildern sind Teile der Aufnahme. Für eine Oberflächenentscheidung lassen sich die sechs Bereiche einzeln ansehen. Das gezeigte Gravurprodukt und blaue Foto sind synthetisch; das separat gesicherte Muster „Pia & Rafael“ wurde nicht ersetzt.

## Tatsächlich geprüft

`PYTHONPATH=.local-data/python python3 scripts/capture-dashboard-review.py` am 06.10.2026, 11:20:31–11:20:35 Uhr Europe/Berlin. Bestehendes Backend aus frischer markierter temporärer Datenbank gestartet. Produktübersicht, Produkteditor, Serienimport und Prüfstand geöffnet, Bild-/Gravurpanel aufgenommen. Beide Excel-Vorlagen über die echten Downloadrouten abgerufen und XLSX-Container samt Arbeitsmappe geprüft. Keine JavaScript-Fehler, Build 76 Ressourcen/1 Modell. [Bericht](sichtpruefung-20261006/report.json).

Die generierte PDF wurde als sechsseitiges Dokument mit je einer Aufnahme geprüft. Nur Aufnahmeskript, Dokumentation und synthetische Nachweise ergänzt; Produktcode unverändert. Die **289 Tests** des vorangehenden Pakets bleiben der letzte Gesamttest; hier nicht erneut ausgeführt. Die temporäre Vorschau wird nach der Aufnahme beendet.

## Bestehender Muster-Link und Zugriffslücke

Sites am 06.10.2026 nur lesend geprüft: Site `appgprj_6ac29c8cd604819197cc8af2da80d6f4`, Titel „Muster Acrylglasbild“, aktiv, aktueller Nutzer Eigentümer, Version 12. Native URL: https://gravuru-design-test-mika.gravur4you-cy.chatgpt.site . Keine aktuelle Preview-URL. Zugriffskonfiguration oder Inhalt nicht geändert. Dieser Link enthält laut gesicherter Referenz den statischen Konfigurator, kein laufendes Werkstatt-Backend.

Das aktuelle Dashboard verwendet Node, SQLite und Python-Unterprozesse. Der dokumentierte Sites-Serverbetrieb benötigt Workers-kompatible Ausgabe und ist kein unmittelbarer Laufzeit-Ersatz. Die Werkstatt akzeptiert ausschließlich Loopback-Hosts sowie passende Origin-/CSRF-Werte. Diese Schutzprüfung darf nicht für einen scheinbar funktionierenden Link abgeschaltet werden.

**Konkret fehlt für einen von Mikail bedienbaren Link eine authentifizierte Browser-/Portfreigabe der bestehenden Cloud-Laufzeit.** Die verfügbaren Werkzeuge weisen dafür hier keinen unterstützten Einstieg aus. `open_in_codex` öffnet Dateien/URLs, richtet aber keine solche Freigabe ein. Keine neue Umgebung, kein Serverkauf und keine heimliche Portweiterleitung. Der nächste ausführbare Schritt hier ist die Sichtprüfung des vorhandenen Ergebnisses anhand der bereitgestellten Dateien; eine interaktive Abnahme bleibt ausdrücklich offen.

Kein Sites-Deploy, keine Freigabeänderung, keine Shopify-/Plesk-Mutation, keine Secrets oder Datenbanken in Git. Für Veröffentlichung und echte Bestellungen bleiben App-/Store-Anbindung sowie Maschinen-/ICC-Abnahme getrennte Voraussetzungen.
