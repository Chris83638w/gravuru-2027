# Foto, Löschen und schmaler Überlagerungshinweis – Mika, 05.11.2026

Ausgang: `1095237b`, Branch `dev/mika-konfi-anschluss-20261105`, Draft-PR #178. Aktive Folgeauslieferung R6 um **21:01:55 UTC**, Hauptbundle **`editor-3e54d8a6ca1778ba.mjs`**. [Koordination vor Umsetzung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6669070565). Diese Übergabe gehört zum selben Commit wie die nachfolgend beschriebenen Korrekturen.

## Verbindliche Regeln und Quelle

Mikails ausdrückliche Chatkorrekturen vom 05.11.2026:

- „Mülleimer muss bei allen Elementen und Fotos vorhanden sein, dass ich es löschen kann“; konkret hinzugefügter Anker ohne Löschwirkung und Name „Tebby“ ohne Mülleimer.
- Hochgeladenes Foto vollständig zeigen; Beschnitt ausschließlich nach eigener Bearbeitung. Foto verschiebbar und löschbar, versehentliches Antippen darf keinen Upload öffnen.
- Fotogröße wie bereits freigegeben ausschließlich per Regler, auf Handy und PC. Diese Folgekorrektur macht den Regler direkt an der Vorschau erreichbar.
- Herz, Oval hochkant, Stern und Wolke ausdrücklich **als Zuschnittformat** in der Fotobearbeitung.
- Überlagerung: „einfach knapp unter dem Produkt im Canvas. Er darf aber nirgend stören und nur einmal kommen.“

Keine neue Kategoriegestaltung: Mikail möchte diese vorab besprechen. Preise, Ausführung, Originaldesigns und Suchauswertung sind nicht Gegenstand dieses Pakets. Technische Elemente und gesperrte ganze Druckdesigns bleiben geschützt. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt verbindlich; hier wurden keine Designs neu gestaltet.

## Korrektur und Ursache

`template-deletion.mjs` aktualisiert den deaktivierten Zustand bei jedem Elementwechsel und behandelt auch hinzugefügte Objekte. Zuvor blieb der Mülleimer nach Auswahl eines geschützten Vorlagentexts deaktiviert; der hinzugefügte Anker wurde außerdem vom Vorlagen-Löschweg nicht erfasst. Explizite Löschrechte gelten nun auch für als Pflichttext markierte Vorlagen. `direct-editing.mjs` und `refinements.mjs` halten den erlaubten Mülleimer sichtbar und innerhalb der Bühne. Die vorhandene Rückgängig-Funktion bleibt erhalten. `ux.mjs` und `contract.mjs` akzeptieren die erlaubte Entfernung auch bei Abschlussvalidierung; nicht gelöschte Pflichttexte müssen weiterhin ausgefüllt sein.

Der Katalog-Konverter erzeugt für nicht gesperrte editierbare Texte nun ein Löschrecht unabhängig von `required`. Die bereits veröffentlichten **beiden Prüfmodelle** und ihre Inline-Konfigurationen wurden gezielt mit `scripts/preview-delete-rights.mjs` angepasst: **43 Namensrechte je Größe**. Keine globale Migration gespeicherter Werkstattprodukte, keine Änderung veröffentlichter Bestellstände. Bei einem späteren Produktimport muss der aktuelle Konverter bzw. derselbe geprüfte Rechtebestand verwendet werden.

Der alte Foto-Klicklistener zum Dateiaustausch sowie der implizite Doppeltipp zum Bearbeiten sind entfernt. Ein bestehendes Foto wird ausgewählt oder verschoben; Ersetzen/Bearbeiten erfolgt über die sichtbaren Aktionen. Der proportionale Größenregler sitzt nun direkt unter der Vorschau. Fotos lassen sich weiterhin entfernen und rückgängig wiederherstellen. Ein freies rechteckiges Foto ohne bewussten Zuschnitt wird vollständig eingepasst, auch wenn ein älteres Fotofeld ein anderes Seitenverhältnis hat. Explizite Ausschnitte und feste Vorlagenmasken behalten ihre Bedeutung.

Die vier neuen Zuschnitte verwenden `photo-crop-shapes.mjs` gemeinsam für Editorvorschau und das übernommene transparente Bild. Originaldatei, Bearbeitung rückgängig und Original wiederherstellen bleiben erhalten. Bereits vom Kunden bewusst gespeicherte Ausschnitte werden nicht ungefragt zurückgesetzt.

`customer-tools.mjs` zeigt bei einer oder mehreren Überlagerungen genau eine Zeile **„Elemente überlagern sich.“** unter der Maßangabe im Canvas. Sie fängt keine Klicks ab, erzeugt keine weiteren Karten und verschwindet, wenn keine Überschneidung mehr erkannt wird. Die Zeile wird bei Größen-/Ansichtsänderung neu positioniert und bleibt von den Reglern getrennt. Befestigungsprobleme behalten ihre eigene Prüfung.

## Tatsächlich ausgeführte Prüfung

- **249/249 lokal und 249/249 auf Linux**, keine Fehler. Enthalten sind Rechte, erforderliche Texte, Löschung/Rückgängig, Foto-Geometrie, Upload/Wiederherstellung, neue Masken, mobile Navigation, Zoom, Größen-/Preisvertrag und Konverter. Beide Builds erfolgreich. Die bestehende serverspezifische `ui-event-regressions.test.mjs` wurde nicht durch die Windows-Fassung ersetzt.
- Isolierte lokale Browserprüfung mit einem künstlichen 400×600-Testbild: alle vier Ecken sichtbar, Fotogröße per Regler geändert, verschoben, gelöscht und nach Neuladen ohne Restfeld; kein Upload/Bearbeitungsdialog nach Doppelklick. Pflichtname gelöscht und per Rückgängig wiederhergestellt. Anker hinzugefügt/entfernt, Preis 19,99 → 21,68 → 19,99 EUR.
- Alle vier Masken im echten Browser angesehen; Wolke übernommen und wieder geöffnet, danach Original wiederhergestellt. Vier Masken einschließlich Reset und gemeinsamer Vorschau-/Ausgabegeometrie zusätzlich automatisiert geprüft.
- Veröffentlichte Vorschau im echten Chrome am Desktop und bei **390×844** geöffnet. Aktuelles Bundle, ein einzelner Hinweis direkt unter der Tafel, aktiver Mülleimer bei „Tebby“, Fotoauswahl mit erreichbarem Regler und neuem Zuschnittmenü sichtbar. Herz im Bearbeitungsdialog angesehen, anschließend **ohne Übernahme geschlossen**. Vorhandene Kundengestaltung nicht gelöscht oder umgestaltet. Kein Hardwaretest auf einem echten Smartphone behauptet.
- Öffentlich beide HTML-/JSON-Endpunkte und alle fünf referenzierten Bundles HTTP 200; **43 Designs je Modell, 19,99/24,99 EUR, Zusatzmotiv 1,69 EUR**, kein ungewollt gesperrter editierbarer Name. [Maschinenlesbarer Server-/HTTP-/Browsernachweis](2026-11-05-konfi-foto-loeschen-servernachweis.json).
- Bildschirmnachweise im Ausgabeordner dieses Chats: `konfi-hinweis-desktop-20261105.png`, `konfi-hinweis-mobil-20261105.png`, `konfi-fotoregler-mobil-20261105.png`, `konfi-herz-zuschnitt-20261105.png`. Keine Kundenfotos ins Repository kopiert.

## Auslieferung und nächster Schritt

Aktive Stage `private/mika-konfi-hundetest-r6-20261105`, auf Basis des vorherigen R5c-Stands einschließlich der bereits abgenommenen Suchauswertung. Vor Änderung wurden Startdatei, Quelldateien und vier öffentliche Prüfdateien gegen ihre Hashes geprüft. R6 enthält eine Sicherung unter `before-round6`; neue unveränderliche Bundles waren während des Neustarts auch für den alten Worker erreichbar. Die vollständigen Loader-Verweise einschließlich unveränderter Zusatzmodule wurden aus dem erfolgreichen Build übernommen. Zwei vorherige Aktivierungsversuche brachen an Pfad-/Loaderprüfungen **vor Änderung von Startdatei oder öffentlichen Prüfdateien** ab. Anschließend Aktivierung und unabhängiger HTTP-/Browsernachweis erfolgreich. Bestehende Datenbank unverändert weiterverwendet.

**Prüfvorschau, kein Produktlaunch und kein neuer Warenkorb-Erfolgsnachweis.** Für diese ausdrücklich bestellten Korrekturen ist keine weitere Freigabe offen. Nächster Schritt: Mikail prüft die aktuelle Vorschau; die 43 Designs brauchen weiterhin seine Sichtfreigabe. Produkt-/Preisbindung und echter Shopify-Warenkorbtest bleiben ein gesonderter Auftragsschritt. Astra darf für Folgearbeiten nicht auf R5c zurückgehen oder die neuen Rechte/Klickkorrekturen überschreiben.

[Prüfvorschau mit beiden Größen](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html) · [Issue 168](https://github.com/Chris83638w/gravuru-2027/issues/168) · [Draft-PR 178](https://github.com/Chris83638w/gravuru-2027/pull/178)
