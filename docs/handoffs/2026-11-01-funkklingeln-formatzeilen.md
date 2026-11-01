# Funkklingeln: schmale Formatzeilen

Auftrag vom 01.11.2026 im Funkklingel-Chat: alle Formate untereinander in schmalen Blöcken, optisch passend zu „Rahmen & Farbe“.

Regeln vor Umsetzung: ein Format je Zeile über die verfügbare Breite, vorhandenes Bild links, Bezeichnung/Maß daneben, vorhandener Preis rechts. Format- und Positionsgruppen ohne zusätzliche äußere Karte; Auswahl bleibt bebildert und bedienbar. Quelle: aktueller Nutzerauftrag und vorhandene Darstellung unter „Rahmen & Farbe“. Nur produktspezifisches CSS, keine Änderung fachlicher Regeln, Preise, Geometrie oder Master-Funktionen. Keine Designs bearbeitet; der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

Eigener Branch `dev/funkklingeln-formatzeilen-20261101-astra` auf main `273aaba`. Prüfung und Bereitstellung werden unten dokumentiert.

## Geprüfte Umsetzung

Nur CSS in `doorbell-presentation.mjs`: Format und Position einspaltig, schmale Zeilen (48 px Mindesthöhe, im Desktop 50,14 px tatsächlich), kompaktere Bilder/Abstände, ohne äußere Gruppenkarte. Platz für den Auswahlhaken neben dem Preis. Rahmen/Farbe, Befestigung sowie sämtliche Master-Funktionen unverändert.

5/5 vorhandene gezielte Tests bestanden; Build erfolgreich (76 geprüfte Ressourcen). Browserprüfung Desktop und 390×844: alle drei Formate in einer Spalte, keine horizontale Textüberbreite. Formatwechsel 35×18 → 24×20 → 35×18 mit bestehendem Silikon 74,98 → 64,98 → 74,98 EUR bestätigt. Für diese reine CSS-Änderung keine neuen Tests oder erneuter Warenkorb-/Datenbankvollauf nötig.

[Desktop](assets/2026-11-01-formatzeilen/desktop.png) · [Mobil](assets/2026-11-01-formatzeilen/mobil.png)

Bereitstellung: vorhandene Live-Freigabe gilt; Plesk-Anmeldung am 01.11. erneuert. Nur dieses Modul in eine Kopie der aktuell aktiven Laufzeit übernehmen und neu bauen. So bleiben gegebenenfalls jüngere Master-Funktionen erhalten. Live-Nachweis folgt.
