# Lokale Browserabnahme der Designsuche

11.11.2026, echter Chrome mit dem finalen lokalen Folgecode. Diese Belege stammen aus sieben unveränderten v8-Plänen und isolierten Prüfbindungen; sie belegen keine Serverinstallation oder Produktfreigabe. `local-v8-proof.json` pinnt die Pläne und den erfolgreichen Build.

- `Desktop-Haus.png`: öffentlicher Galeriepfad, Edelstahl 5×2, 1440×900, zwei Treffer.
- `Desktop-Keine-Treffer.png`: verständliche leere Ergebnisliste.
- `Mobil-D23.png`: öffentlicher Galeriepfad, 390×844, ein Treffer.
- `Mobil-Native-Acryl-D23.png`: nativer Vorschaupfad, 390×844, ein sichtbarer Treffer. Weitere 26 Karten: berechneter Stil `display:none`, Attribut `inert` vorhanden und `aria-hidden=true`.
- `Mobil-Native-Acryl-Geleert.txt`: 27 Karten wiederhergestellt, bestehende Aufteilung 23 + 4 weitere. DOM-Prüfung: 0 verbliebene Suchausschluss-/Inert-/ARIA-Marker.
- `Suchauswertung-Designs.png`: bestehende Auswertungsseite mit Suchart Designs und Herkunft Vorschau; gesetzte Filter nach Neuladen erhalten. Darin ausschließlich lokal erzeugte Testbegriffe und Zähler.

Die `.txt`-Dateien sind die zugehörigen sichtbaren DOM-Ausgaben. `HTTP-Suchpruefung-v8.json` belegt 35/35 gezielte Suchanfragen, `Suchdaten-Luecken.json` die fehlenden Motivnamen. Unveränderte bisherige v8-Beispielstarts in den Prüfbildern sind keine Zustimmung zu den vom Nutzer verworfenen Startvorschlägen. Die neue Auswahl wird gesondert in `../2026-11-11-issue230-start-alternatives/` gezeigt.

Keine Bestellung, kein Warenkorb, keine Shopify-Schreibaktion. Bildschirmgrößen nach Prüfung zurückgesetzt. Siehe [Abschlussübergabe](../../handoffs/2026-11-11-issue230-search-material-final.md).
