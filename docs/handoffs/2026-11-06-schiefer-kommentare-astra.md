# Kommentare in der Schiefer-Vorlagengalerie

Quelle: Chris, 06.11.2026, „kannst du ein kommentarfeld dazu machen ?“. Die bestehenden Einzel-OKs im Chat bleiben davon getrennt.

Unter jeder der 180 Originalvorlagen gibt es jetzt ein mehrzeiliges Kommentarfeld mit **Kommentar speichern** und sichtbarem Speicherstatus. Auch die noch nicht vorbereiteten Druckoriginale können kommentiert werden. Ein Kommentar gehört zur Original-ID und damit zur gemeinsamen Vorlagenkarte; wenn er nur eine Größe betrifft, diese im Text nennen. Kommentare bleiben beim erneuten Öffnen erhalten und sind keine Bildfreigabe.

Einstieg: http://127.0.0.1:8996/originale/. Die Galerie ist weiter mit Paket `work/slate-original-package-v4-drucksterne` und den vorhandenen Daten unter `work/slate-original-review-v3` gestartet. Kein erneuter Produktimport.

Die Kommentare liegen separat in `work/slate-original-review-v3/review-comments.sqlite` (Pfad relativ zu `C:/Users/Christopher Koch/Documents/ChatGPT/Shopify Import/`). Jede Änderung erhält eine Revision; auch beim Leeren bleibt die Vorgeschichte erhalten. Die Datenbank gehört nicht ins Repository und muss zusammen mit den übrigen lokalen Prüfdaten gesichert werden. Ein neues Paket mit derselben Datenablage behält die Kommentare. Für die spätere Auswertung liefert `GET /originale/comments` die aktuellen Texte mit Original-ID, Revision und Zeit. Kein automatischer Versand an GitHub oder externe Dienste.

Neue Module: `scripts/lib/slate-review-comments.mjs` (SQLite), `slate-review-comments-ui.js` (Bedienung). Anbindung nur im lokalen Galeriehandler und Prüfserver. Speichern verlangt den Token der Galerie und die gleiche lokale Herkunft; unbekannte IDs, falsche Revisionen und ungültige Eingaben werden abgelehnt. Die technische Eingabegrenze beträgt 10.000 Zeichen. Bei Netzwerkfehler oder Speicherkonflikt bleibt die Texteingabe stehen; vor dem Verlassen mit ungespeichertem Text warnt der Browser. Texte werden als Text angezeigt, nicht als HTML ausgeführt.

Validierung: `node --test scripts/slate-review-gallery.test.mjs scripts/slate-review-comments.test.mjs` — **7/7 bestanden**. Nachgewiesen: Speicherung und erneutes Öffnen der Datenbank, Trennung nach ID, erhaltene Historie nach Leeren, Konflikt statt Überschreiben, abgewiesene fremde Herkunft/ungültiger Token, sichere Textdarstellung, unveränderte Paket- und Importdefinitionen. Die bisherige Vorschaulink-Prüfung wurde auf URL-Parameter präzisiert, da Kommentare nun ein eigenes `data-revision`-Attribut haben; Vorschaulinks bleiben weiterhin ohne feste Produktrevision.

Echter Browser: D2-Kommentar mit Umlaut, Größenangabe und Zeilenumbruch gespeichert, Seite neu geladen und identischen Text zurückgelesen. Alle 180 Kommentarfelder vorhanden. Testtext danach wieder geleert und gespeichert; keine Nutzernotiz überschrieben. Bildnachweis unter `docs/reviews/2026-11-06-schiefer-kommentare/`.

Vorlagen, Originaldateien, Produktstände, Preise und Abnahmeregister unverändert. 0 neue Bildfreigaben. Eigener PR #180; kein main-Merge, Hostimport, Shopify-Schreibzugriff oder Livegang. Nächster Schritt: Chris kommentiert die gewünschten Vorlagen, danach Kommentare nach Original-ID auswerten und die konkreten Korrekturen vor der Einzelabnahme umsetzen.
