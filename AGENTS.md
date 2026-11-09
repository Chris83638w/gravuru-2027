# Gravuru 2027 – Arbeitsregeln

## Neue Produkte: Module, Preise und Excel (Mikail, 09.11.2026)

**Vor jeder neuen Produktanlage [den verbindlichen Produktworkflow](docs/handoffs/2026-11-09-produktanlage-module-excel-workflow.md) lesen.** Mikail muss die konkret benannten Produkte einschließlich Module, Ausführungen, Standardwerte, Basispreise und aller Aufpreise bestätigen; neue Modulwünsche ausdrücklich abfragen. Je Produkt eine versionierte Excel als Referenz, mit denselben Daten wie der bestätigte Anlageplan. Vorhandene Gruppenfreigaben oder gespeicherte Profile ersetzen diese konkrete Bestätigung nicht. Vorlagen/Excel/Prüfplan dürfen vorher vorbereitet werden; keine unbestätigte Produktanlage. Bestehende Dienste per Skript/API verwenden, keinen Konfi pro Produkt kopieren. Kein Foto erlaubt → Foto-Funktion aus. Keine Bohrungen erlaubt → entsprechende Optionen aus; zulässige Alternativen erhalten. Gültigkeit je Material/Form/Größe prüfen, leere Auswahlbereiche ausblenden. Unbekannte Modulwünsche zunächst klären, keine neuen Vertragsfelder erfinden. Diese Regeln ändern selbst keine Runtime, Preise oder bestehenden Produktbindungen.

## Verbindliche Prio-Konfi-Regel (Mikail, 08.11.2026)

**Zuerst [PRIO-KONFI.md](PRIO-KONFI.md) lesen.** R15 ist die freigegebene gemeinsame Konfi-Basis. Gemeinsame Oberfläche, Werkzeuge, Kernlogik, Preis-/Checkout-Verhalten und Ressourcenänderungen ausschließlich durch Mika in Abstimmung mit Mikail. Andere KIs dürfen beim Anlegen von Produkten nur zuvor von Mikail bestätigte produktspezifische Options-/Ausführungsdaten bearbeiten. Keine eigenständige Optimierung, Ersetzung oder Veröffentlichung des gemeinsamen Konfis. Vorschläge zuerst vorlegen. Bestehende parallele Arbeiten getrennt halten.

Neuer Pilot: Edelstahl-Türschilder mit Form, Größe und Befestigung; alle acht Katalogformen berücksichtigen, konkrete Größen/Preise/Befestigungen und Fähigkeiten vor Anlage bestätigen lassen. Neue Gruppen nutzen denselben Konfi mit bestätigten Produktprofilen. Foto-/Logo-Verfügbarkeit passend zum Profil und serverseitig prüfen. Der gesicherte R15-Tag ist noch keine echte Galerie-/Shopify-Anbindung. Main-Referenzfreigabe, Runtimeintegration und Live-Aktivierung ausdrücklich unterscheiden. Diese aktuelle Nutzerentscheidung geht älteren anderslautenden Zuständigkeits-/UI-Plänen vor.

Zuerst `ENTSCHEIDUNGEN.md` (Entscheidungsregister Chris), dann `START_HERE.md`, danach das aktive Paket in `UMSETZUNGSPAKETE.md` lesen. Detailanforderungen stehen im `NEUE-WERKSTATT-PLAN.md`; die aktuelle Entscheidung gilt vor historischen Quelltexten und Bildprompts.

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

## Zusammenarbeit mehrerer Accounts (Chris, 23.10.2026)

Mehrere Claude- und ChatGPT-Accounts arbeiten am selben Projekt; der Operator-Account plant und baut, ein Upload-Account führt Shopify-/Matrixify-Schreibzugriffe aus, Codex-Läufe liefern lokale Ergebnisse. Damit sich alle verstehen:

- **Ein Stand:** `main` (Code) und `main` im Katalog-Repo sind die Wahrheit. Jede Arbeit auf einem eigenen Branch `dev/<thema>-<datum>`; Merge nach `main` nur mit grünen gezielten Tests und einem Absatz in `STATUS.md`. Lokale Arbeitskopien (Codex-Ordner, `work/…`) zählen nicht, bis sie committet sind – Ergebnisse immer in eines der beiden Repos bringen.
- **Übergaben** liegen in `docs/handoffs/<datum>-<thema>.md`: Zweck, Stand (Commit), was fertig/offen ist, genauer nächster Schritt, welche Freigaben von Chris fehlen. Ein neuer Chat liest zuerst die jüngste Übergabe, dann `STATUS.md`.
- **`STATUS.md` ist das Logbuch:** neuester Abschnitt oben, Datum + Account („Claude als Operator“, „Upload-Account“, „Codex“), Kommandos ohne Geheimnisse, Zähler, zitierte Freigaben.
- **Entscheidungen** von Chris als GitHub-Issue in `gravuru-2027` (Label `entscheidung`), Antwort dort oder im Chat – dann in die Übergabe übernehmen.
- **Rollen:** Live-Systeme (Shopify, Amazon, Plesk) werden vom Operator nur gelesen/exportiert; Uploads, Imports, Theme-/App-Versionen macht der Upload-Account nach ausdrücklicher Freigabe von Chris im selben Chat (mit Zählern). Nichts löschen ohne Ankündigung. Katalogdaten ändern sich nur im Katalog-Repo (JSON), nie durch Kopieren aus Shopify.
- **Dashboard-Bearbeitungen** (Design-Dashboard, Katalogseite) schreiben in den Arbeitsbaum des Katalog-Repos mit Protokoll (`_aenderungen.jsonl`); wer sie committet, baut danach `build-katalog.py` und nennt das im Commit.

## Fachlogik vor dem Programmieren prüfen (Chris, 29.10.2026)

Vor jedem Bau eines Pakets die fachlichen Regeln, die der Code festlegt (Rechte, Sperren, Preise, Maße, Pflichtfelder, Standardwerte), **mit Quelle** auflisten: Entscheidung von Chris (Issue/Datum), Preis-Excel oder Katalog. Was keine Quelle hat, wird **nicht** als Regel oder Sperre eingebaut, sondern als offen gemeldet und vorher erfragt. Bestehende Standardwerte im Code sind keine Entscheidung.
- Motive: **jedes Motiv ist löschbar und ersetzbar**; gesperrt sind nur ganze Druck-Designs, die als Einheit verkauft werden (z. B. Acrylglasbilder).
- Preise und Lochabstände: **nur die Preis-Excel** zählt.
- Bohrloch: Motive/Texte dürfen darüber; Export vollständig, nur die Vorschau zeigt Loch/Beschlag; Überlappungshinweis nur bei Gravur.
