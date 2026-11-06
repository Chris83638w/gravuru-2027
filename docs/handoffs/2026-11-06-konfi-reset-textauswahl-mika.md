# Konfi: Originalvorlage zurücksetzen und vereinbarte Auswahlkorrekturen

Stand 06.11.2026, Codex/Mika, Branch `dev/mika-konfi-anschluss-20261105`, Draft-PR #178. Aufbau auf `9c454dd7` (R8b). R9 seit 00:22:25 UTC / 01:22 Uhr Berlin aktiv: `editor-fac05aefb251603e.mjs`.

## Quellen und Umfang

Mikails Freigabe im Chat: „auch mittig das drehen. Und dann alles umsetzen“. Nur die zuvor benannten Korrekturen, keine neue Produktgestaltung. Präzisierungen:

- „Ja, nur Kategorie Grundmotive samt Inhalt entfernen“: übrige Motivauswahl und Motive in Originaldesigns bleiben erhalten.
- Zurücksetzen „auf gewählte originalversion, aber bestätigen lassen. Der Kunde muss es bestätigen“.
- Extra Designvorschau weglassen; Textsteuerung darunter ohne gezieltes Hochscrollen; langen Text vollständig erkennbar machen; Fotoaktionen und Drehen mittig; Fotogröße ohne mm-Anzeige; kurzer Hinweis auf 1,69 EUR je Motiv.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich. Keine Änderung der 43 Designvorlagen, Katalogdateien, Grundplatten, Produktoptionen oder Preisberechnung. Größe/Ausführung bleiben beim Reset erhalten; die vorhandene Rückgängig-Funktion bleibt nutzbar.

## Umsetzung

- `design-reset.mjs`: mittiger Button unter der Tafel, Dialog mit gewähltem Designnamen, Abbrechen und ausdrücklicher Bestätigung. Ruft den ursprünglichen Vorlagenlader mit `carry:false` auf; keine Übernahme bearbeiteter Texte. Uploadobjekte bleiben für Undo im Arbeitsspeicher.
- `text-fields.mjs` / `refinements.mjs`: Textfelder wachsen mit dem Inhalt und klappen auf Blur nicht auf eine Zeile zusammen. Beim Anklicken wird die Position vor dem Fokuswechsel erfasst; das Verschieben der gemeinsamen Schriftsteuerung wird über die vorhandenen Scrollcontainer ausgeglichen. Programmatische Auswahl darf weiterhin verdeckte Felder zeigen. An den Grenzen des verfügbaren Scrollbereichs begrenzt der Browser die Ausgleichsbewegung.
- `workflow.mjs` / `product-design-gallery.mjs`: zusätzliche Hover-/Vergrößerungsvorschau entfernt; direkt auswählbare Designbilder bleiben erhalten.
- `profile-selection.mjs`: Kategorie Grundmotive wird aus hinzufügbaren Motiven ausgeschlossen. Rendering-Ressourcen und Motive innerhalb vorhandener Vorlagen werden nicht gelöscht.
- `modern-motif-browser.mjs`: „Je Motiv 1,69 €.“; Berechnung unverändert.
- `photo-position.mjs`: mm-Ausgabe am Fotogrößenregler entfernt; Regler und Eckgriffe bleiben erhalten.
- `direct-editing.mjs`, `modern-mobile-navigation.mjs`, `modern-navigation.css`: kompakte Foto-/Motiv-/Logoaktionen mittig über dem Produkt, Reset mittig darunter. Platz für Aktionen/Reset im Vorschaucontainer berücksichtigt, damit der neue Button nicht abgeschnitten wird. Mobile Fotoansicht reserviert weiterhin Raum für Regler und Überlagerungshinweis.

## Prüfungen

**263/263 Tests lokal und 263/263 auf Linux**, null Fehler/übersprungene Tests, Build jeweils erfolgreich. Suites wie R8b plus Profilselektion und Reset-Dialog. Die vorhandenen UI-Testadapter wurden an die entfernte Textarea-Hilfsfunktion und die Scroll-Frame-Abbruchfunktion angepasst; keine fachlichen Sollwerte abgeschwächt.

Direkte Browserprüfung auf dem lokalen Prüfstand:

- Kalle gewählt, Name geändert, 30×20 cm + zwei goldene Abstandshalter: Abbrechen erhält die Änderung; Bestätigen stellt Kalle wieder her, Optionen bleiben bei 31,98 EUR. Undo stellt den Testnamen wieder her.
- Zusätzliches Motiv + synthetisches Testfoto: Reset entfernt beide, Ebenen 6 → 4; Undo stellt beide wieder her, Ebenen 4 → 6 und 43,66 EUR.
- Direkter Desktop-Klick zwischen offenen Textfeldern: Eingabeoberkante 320,59 → 320,79 px (Rundung). Mehrzeiliger Spruch vollständig sichtbar; kein Abschneiden nach Fokusverlust.
- Keine Kategorie Grundmotive; andere Kategorien auswählbar. Kein extra Design-Vergrößerungsknopf, 43 auswählbare Designs.
- Foto- und Motivaktionen mittig, Foto-Regler ohne mm-Ausgabe. Handyansicht 390×844 einschließlich Touch-Scroll und Textauswahl geprüft; Browseremulation, kein physisches Smartphone. An einem oberen Scrollanschlag kann das Umklappen eines vorherigen Panels weiterhin eine begrenzte natürliche Neuanordnung verursachen; der fokussierte Text bleibt sichtbar.

Öffentlicher Prüfstand:

- Beide Prüfseiten/Modelle und alle fünf Moduldateien HTTP 200; neue Version tatsächlich geladen.
- Beide Produktmodelle bytegleich: 43 Designs, Basispreise 1999/2499 Cent, Motivaufschlag 169 Cent.
- Reset-Dialog und Rückkehr zu Bruno/4 Ebenen/19,99 EUR, Preistext, fehlende Grundmotive und mittige Motivsteuerung im Live-Browser bestätigt.
- Serverwechsel erst nach erneut bestätigter Plesk-Anmeldung und Hashabgleich aller 16 betroffenen Dateien. Vorversion und Sicherung bleiben erhalten; keine Datenbankänderung.

Maschinenlesbare Prüfung: [Nachweis](2026-11-06-konfi-reset-textauswahl-nachweis.json). Keine neue Warenkorb-/Bestellstreckenabnahme, kein Produktlaunch oder Merge. Die Designfreigabe bleibt Mikails Sichtprüfung vorbehalten.

## Nächster Schritt

[Frischer Testlink](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html?fresh=1). Er beginnt bei jedem Neuladen mit der Originalvorlage. Die bestehenden Testtabs des Nutzers wurden nicht neu geladen. Issue #168 dokumentiert diesen Stand zur Abstimmung mit Astra.
