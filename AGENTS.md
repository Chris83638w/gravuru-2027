# Gravuru 2027 – Arbeitsregeln

Zuerst `START_HERE.md`, danach das aktive Paket in `UMSETZUNGSPAKETE.md` lesen. Detailanforderungen stehen im `NEUE-WERKSTATT-PLAN.md`; die aktuelle Entscheidung gilt vor historischen Quelltexten und Bildprompts.

- Eigenständige neue App; vorhandenen Kundeneditor und Ressourcen gezielt wiederverwenden. Die ZIPs enthalten eingefrorene Referenzen, keine fertige neue App. `legacy-reference/` unverändert zum Vergleich halten; aktive Änderungen in klar benannten neuen Modulen.
- Ein Arbeitspaket mit überprüfbarem Ergebnis nach dem anderen. Keine neue Komplettplanung bei jeder Fortsetzung. Passende Quelldateien gezielt lesen; große Motiv-/Fontsegmente nicht als Text in den Kontext laden.
- **Verbindliche Masterbegriffe (Nutzer, 04.10.2026):** „Motiv“ bezeichnet ein einzelnes hinzufügbares Element. „Design“ bezeichnet die gesamte Gestaltung einer Platte/eines Acrylglases einschließlich Foto, Texten und Motiven. Diese Unterscheidung gilt für Kommunikation, Oberfläche, Dokumentation und neue fachliche Benennungen. Bestehende technische Bezeichner nicht allein deshalb ungeprüft migrieren.
- Nur 2D. AR ist vertagt. Neue Technikwahl begründen, ohne bereits beantwortete Produktfragen zu wiederholen.
- Maße in mm, Preise in ganzen Cent. Vorschau, Preis, Variantenprüfung und Produktion beziehen sich auf denselben versionierten Produktstand. Keine zweite Preis-/Geometrielogik für Import oder Shopify.
- Endgültige Schriften und echte Produktionsprofile nicht erfinden. Vorliegende Materialbilder können gestaltete Muster sein. `MATERIALREFERENZEN.md` beachten, besonders Edelstahl v4 und unbestätigte Musterstärken.
- Produktionsdateien getrennt von Szene, Sockel, Bediengriffen und Fotohinweis. Schriftpfade, Originalbilder, Konturen, Weiß und Spiegelung anhand der Abnahmekriterien prüfen. Keine angeblich verlustfreie Vektorisierung eines flachen Fotos.
- Fertige Funktionen, synthetische Tests, historische Nachweise und offene Voraussetzungen ausdrücklich unterscheiden. Eine passende Oberfläche allein belegt keine funktionierende Bestellstrecke.
- Geeignete Tests und sichtbare Bedienprüfung je Änderung; bei Fehlern Ursache beheben statt Sollwerte an fehlerhaftes Verhalten anzupassen. Nach bestandener Abnahme nicht ohne Anlass denselben Testlauf wiederholen.
- Geheimnisse, Kunden-/Bestelldaten und lokale Datenbanken gehören nicht ins Repository. Bestehendes Vergleichsprojekt nicht überschreiben. Veröffentlichte Bestellstände sind unveränderlich.
- Für Implementierung eigenen Aufgabenbranch verwenden. Keine fremden Änderungen zurücksetzen. Repositoryzugriff und bestehenden Stand zuerst prüfen; keine pauschalen Veröffentlichungs-/Berechtigungsänderungen als Umweg.
- Nach jedem Paket `STATUS.md` knapp fortschreiben: Dateien/Commit, ausgeführte Prüfungen, offene Grenzen, genau nächster Schritt. Kurze deutsche Updates, nutzbare Links und sichtbare Ergebnisse für Mikail.

Diese Regeln beantragen keine selbstständigen Parallelagenten und ändern keine Modellwahl. Der Nutzer legt fest, welches Modell arbeitet.

## Design-Master (Chris, 29.10.2026)

**Jedes Design und jeder Design-Auftrag – auch künftige und für jede KI – folgt dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) im Katalog-Repo:** Katalog-Vorlage 1:1 übernehmen, wenn sie zur Größe passt, sonst als sehr starke Referenz; 1–3 Schriften je Design aus allen 84 freigegebenen und innerhalb einer Serie variieren; das Motiv nie verlieren, austauschen oder verzerren (bei Platzmangel weicht der Text); Anordnung frei und nicht automatisch mittig, Ziel ist ein schönes Gesamtbild; Abnahme per Kontaktbogen mit Screenshots 1:1 aus dem echten Konfi, Vorlage daneben. Jeder neue Auftrag in `docs/handoffs/` verweist auf den Master.

## Code-Prüfung (Chris, 29.10.2026)

Prüfbefehle in Claude Code (geprüft an der offiziellen Doku [code-review-local](https://code.claude.com/docs/en/code-review-local), [ultrareview](https://code.claude.com/docs/en/ultrareview), [commands](https://code.claude.com/docs/en/commands), Stand 29.10.2026):

| Befehl | Was er macht |
|---|---|
| `/code-review high app/configurator` | prüft einen Ordner auf Fehler; Stufe `low` bis `max` (`low` = nur sichere Befunde, ab `medium` breiter). Reihenfolge: Stufe, Flags, Ziel. Ohne Stufe gilt die zuletzt getippte. |
| `/code-review high --fix` | prüft den aktuellen Branch samt nicht committeter Änderungen und schreibt die Korrekturen direkt in den Arbeitsstand. Läuft im Hintergrund – dann holt `/rewind` nichts zurück, nur git. |
| `/security-review` | sucht Sicherheitslücken (Injection, Anmeldung, offene Daten) im Unterschied zwischen aktuellem Branch und `main` auf `origin` |
| `/simplify` | räumt geänderten Code auf und **ändert ihn direkt** (Wiederverwendung, Vereinfachung, Effizienz); sucht keine Fehler |
| `/code-review ultra <PR-Nummer>` (= `/ultrareview`) | gründliche Prüfung durch mehrere Prüf-Agenten in der Cloud, jeder Befund wird nachgeprüft, ca. 15–25 Min. Ein **Branchname gilt als Vergleichsbasis**, nicht als Ziel: Branch auschecken, dann `/code-review ultra main`. Vorschau-Funktion; 3 Gratisläufe je Konto, danach ca. 5–25 USD je Lauf über Usage Credits – nur mit Freigabe von Chris. |
| `/engineering:tech-debt` | aus dem Engineering-Plugin: Liste der Altlasten im Projekt, nach Wichtigkeit sortiert |

Verbindliches Vorgehen – für jede KI, auch Codex mit seinem eigenen Prüfbefehl:

- **Erst nur prüfen, ohne `--fix`.** Ergebnis ist eine Befundliste (Datei:Zeile, Schwere, Begründung); dabei wird nichts geändert.
- **Ordnerweise, nicht das ganze Repo auf einmal** (Token-Kosten): zuerst `app/configurator`, dann `app/workshop`, danach die übrigen Ordner unter `app/`. Das gilt auch für `/engineering:tech-debt`.
- **Die Liste geht an den Operator (Claude).** Ablage als `docs/reviews/<datum>-code-review-<ordner>.md`. Der Operator sortiert, prüft die Befunde an der Quelle und verteilt die Aufgaben über die Postfach-Issues (Konfigurator: Astra 1, #48).
- **Umsetzung nur auf eigenem Branch** `dev/<thema>-<datum>` mit gezielten Tests und als Pull Request; Merge nach `main` macht der Operator.
- **Nie `--fix` oder `/simplify` direkt auf `main`** – sonst entstehen Änderungen, die niemand geprüft hat. Auch auf dem Aufgabenbranch nur für Befunde aus der freigegebenen Liste.

## Zusammenarbeit mehrerer Accounts (Chris, 23.10.2026)

Mehrere Claude- und ChatGPT-Accounts arbeiten am selben Projekt; der Operator-Account plant und baut, ein Upload-Account führt Shopify-/Matrixify-Schreibzugriffe aus, Codex-Läufe liefern lokale Ergebnisse. Damit sich alle verstehen:

- **Ein Stand:** `main` (Code) und `main` im Katalog-Repo sind die Wahrheit. Jede Arbeit auf einem eigenen Branch `dev/<thema>-<datum>`; Merge nach `main` nur mit grünen gezielten Tests und einem Absatz in `STATUS.md`. Lokale Arbeitskopien (Codex-Ordner, `work/…`) zählen nicht, bis sie committet sind – Ergebnisse immer in eines der beiden Repos bringen.
- **Übergaben** liegen in `docs/handoffs/<datum>-<thema>.md`: Zweck, Stand (Commit), was fertig/offen ist, genauer nächster Schritt, welche Freigaben von Chris fehlen. Ein neuer Chat liest zuerst die jüngste Übergabe, dann `STATUS.md`.
- **`STATUS.md` ist das Logbuch:** neuester Abschnitt oben, Datum + Account („Claude als Operator“, „Upload-Account“, „Codex“), Kommandos ohne Geheimnisse, Zähler, zitierte Freigaben.
- **Entscheidungen** von Chris als GitHub-Issue in `gravuru-2027` (Label `entscheidung`), Antwort dort oder im Chat – dann in die Übergabe übernehmen.
- **Rollen:** Live-Systeme (Shopify, Amazon, Plesk) werden vom Operator nur gelesen/exportiert; Uploads, Imports, Theme-/App-Versionen macht der Upload-Account nach ausdrücklicher Freigabe von Chris im selben Chat (mit Zählern). Nichts löschen ohne Ankündigung. Katalogdaten ändern sich nur im Katalog-Repo (JSON), nie durch Kopieren aus Shopify.
- **Dashboard-Bearbeitungen** (Design-Dashboard, Katalogseite) schreiben in den Arbeitsbaum des Katalog-Repos mit Protokoll (`_aenderungen.jsonl`); wer sie committet, baut danach `build-katalog.py` und nennt das im Commit.
