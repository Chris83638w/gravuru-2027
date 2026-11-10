# Designsuche: Plan vor Freigabe; Katalogwechsel: technische Grenzen

Stand 10.11.2026, Codex/Mika. **Nur Prüfung und Plan**, keine Kundenfunktion gebaut, kein Serverzugriff, keine Daten- oder Shopifyänderung. Code gelesen auf `cd6fe65e6943bd722810af68e503ac8544fe3c44` (inklusive Operator-Basis `8e394cd0`); die drei geplanten Dashboarddateien zusätzlich aus `38dab40` gelesen. Katalogdateien per GitHub auf festem Ref `8236b8bfa` gelesen. Dies ist kein Nachweis vollständiger Gleichheit mit der gegenwärtigen gemischten Live-Laufzeit.

Auftrag: [#230 C](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772867984), [Rollenabgrenzung](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772914392). **Chris bestätigt die Suchfeld-Vorschau vor dem Einbau.** Codeinstallation A bleibt beim Operator. Es werden keine Designs neu gestaltet; bei späteren Designarbeiten gilt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## C: tatsächlicher Bestand

- `app/configurator/variant-m/layout.mjs:16` leert und versteckt das frühere `[data-c-search]` ausdrücklich. Es einfach sichtbar zu schalten würde die jetzige Produktgalerie nicht durchsuchen.
- `product-design-gallery.mjs` erzeugt die jetzige Galerie ohne Suchfeld. `shop-entry.mjs:549–553` akzeptiert am Galerie-Endpunkt nur Seite, Thema und bekannte Produktoptionen. `shop-design-gallery.mjs:208–227` prüft den zulässigen Bestand und paginiert anschließend mit 40 Treffern. Hier fehlt eine Suchabfrage.
- [Katalogliste auf 8236b8bfa](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfa/auftraege/2026-11-10-tuerschild-designs-namensschilder/designs.json): **1.298 Designs gesamt**, davon 751 eigene/rang 0 und 547 Ergänzungen/rang 1. Das Hauptprodukt umfasst 1.217; die drei getrennten Kleinformate jeweils 27. Diese Summe ist kein Anspruch, jede Vorlage in jeder Form/Größe anzubieten.
- Die Listenzeilen besitzen ID, Reihe, Form, Größen, Mindestfläche und Rang, aber nur die **Anzahl** der Motive. Im einzelnen `design.json` liegen `name`, `designNo`, `texts[].text`, `themes` und Motive. Beispiel [TRE-V2A-5x2-D23](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfa/designs/edelstahl-gravur-50x20/TRE-V2A-5x2-D23/design.json): Name „Vor- und Nachname mit Haus“, Nummer 23, Originaltexte Vanessa/Krüger; das Hausmotiv selbst enthält Konturen, keinen Motivnamen. Eine vollständige Motivnamensuche ist damit noch nicht überall belegt.

## Vorgeschlagene Suche

**Ein Feld „Design suchen“** mit Beispiel „z. B. Haus, Familie oder D23“. Mobil direkt im vorhandenen Designs-Menü unter dessen Kopfzeile, vor den Karten; auf dem PC an gleicher Stelle im rechten Werkzeugbereich. Kein zusätzliches Feld über der Platte und keine neue Navigation. Suchfeld, Löschen und Trefferzahl genügen; die bestehenden Karten bleiben.

| Suchinhalt | Verlässliche Quelle / Grenze |
|---|---|
| Designname und Designnummer | `name`, `designNo`, vollständige Katalog-ID; `D23` und vollständige ID gezielt behandeln |
| Thema | Gespeicherte Themen-IDs plus vorhandene deutsche Themenbezeichnungen |
| Text | Nur Originaltext der freigegebenen Vorlage, nicht Text aus einer Kundengestaltung |
| Motivname | Vorhandene explizite Namen/Schlagworte oder geprüfte Verbindung zur Motivbibliothek; keine Bilderkennung oder aus Konturen erfundenen Namen |

Normalisierte, begrenzte Textsuche, Groß-/Kleinschreibung und einfache Schreibweisen vergleichbar; keine KI-Suche nötig. Fehlende Motivschlagworte vorab zählen und separat benennen. Treffer aus Designnamen wie „… mit Haus“ funktionieren bereits mit vorhandenen Metadaten; das ist keine vollständige Motivverschlagwortung.

**Serverreihenfolge:** aktuelle Freigabe/Modul/Produktgruppe/Form/Größe/Mindestfläche prüfen → zulässige Designs durchsuchen → eigene Designs rang 0 vor rang 1, innerhalb derselben Stufe vorhandene Reihenfolge → erst danach Seite mit maximal 40 Treffern bilden. Die Suche darf eine bloße Themenvoreinstellung übersteuern, niemals die Produktberechtigung. Kein zusätzliches synchrones Öffnen des gesamten Dateikatalogs pro Tastendruck; der Suchindex gehört zur geprüften Produkt-/Galerierevision und muss bei Änderung verfallen.

Client-Abfrage nach kurzer Tippause, alte Abfrage abbrechen bzw. verspätete Antwort ignorieren. Suchbegriff gehört zur Galerie-/Seitenschlüsselbildung; Größen-/Themenwechsel und „Suche löschen“ setzen die Seite zurück. Bereits fertige Bilder und die bestehenden Grenzen von zwei gleichzeitigen Abrufen sowie höchstens drei vorgewärmten Startbildern beibehalten. Kein Vorladen aller 1.298 Bilder.

## Bestehende Suchauswertung erweitern

`motif-search-analytics.mjs` besitzt bereits eine entprellte, pro geöffnetem Editor deduplizierte Meldung an `/api/workshop/motif-search-events`. `motif-search-stats.mjs` aggregiert je Mandant, Tag, Produktgruppe, Begriff und Herkunft `shop|preview`; die Werkstatt-/Shopifyseite zeigt Topbegriffe und Suchen ohne Treffer.

Minimaler Anschluss: dieselbe Datenbank, derselbe Report und dieselbe Appseite bekommen die zusätzliche Dimension **Motiv / Design**. `source=shop|preview` bleibt Herkunft und wird dafür nicht zweckentfremdet. Bestehende Datensätze werden als Motiv interpretiert; die Schemaänderung muss die Primärschlüssel/Aggregation entsprechend erweitern. API bleibt zu alten Motivmeldungen kompatibel und akzeptiert nur geprüfte Suchart; Produktgruppe weiterhin serverseitig ableiten. Eine Designsuche zählt nach einem tatsächlich abgeschlossenen Suchergebnis, nicht jede Taste oder nachgeladene Seite.

Nur den bewusst eingegebenen Suchbegriff und die Gesamtzahl der zulässigen Treffer melden. Keine Namen, Lebensdaten, hochgeladenen Dateien oder bearbeiteten Texte automatisch aus dem Canvas übernehmen. Die vorhandene Begrenzung und der Filter für E-Mail/URL/telefonartige Eingaben bleiben; Designnummern separat prüfen, damit erlaubte IDs nicht unbeabsichtigt verworfen werden. Nulltreffer und Suche ohne Query nicht vermischen. Keine zweite Analytics-App.

## Aufwand nach Freigabe (Schätzung, keine Fertigstellungszusage)

| Arbeit | Stunden |
|---|---:|
| Metadaten prüfen, revisionierten Suchindex anbinden, fehlende Motivnamen ausweisen | 2–3 |
| Serverfilter vor Pagination, Rangfolge, Queryvertrag und Abbruchfälle | 2–3 |
| Vorhandene Galerie um das bestätigte Feld ergänzen, mobil/PC | 1–2 |
| Gemeinsame Auswertung mit kompatibler Datenmigration und Suchartfilter | 2–3 |
| Gezielte Rechte-, Paging-, Parallelitäts-, Analytics- und Mobil/PC-Prüfung | 4–5 |
| **Summe** | **11–16** |

Nicht enthalten: redaktionelle Nachverschlagwortung, zusätzliche gewünschte Kategorien, Kataloginstallation und eine erneute allgemeine Leistungsüberarbeitung. Kein UI-Einbau vor Chris' Bestätigung. Abnahme insbesondere mit Treffern erst hinter Seite 1, rang 0/1, D23/Original-ID, fehlenden Namen, 0 Treffern, schnellem Query-/Größenwechsel und widerrufener Freigabe.

## Quelle für Roots 1:1-Vorschau

Vorhandener **echter nativer** lokaler Prüfhost: `outputs/r15-resume-integration-20261108/local-browser-host-current.mjs`, Start aus Workspace `node outputs/r15-resume-integration-20261108/local-browser-host-current.mjs`, URL `http://127.0.0.1:8230/steel`, Identitätsbeleg `/__proof`. Er verwendet den realen r4-Datenstand `outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json` (SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`), native Renderer/Fonts/Motive und eine Arbeitsspeicher-Werkstatt. Shopify-/Produktwrites sind gesperrt.

**Nicht unverändert als heutiges Liveabbild ausgeben:** Der Host hat `work/r15-resume-integration-20261108` als feste Codequelle und verwendet einen älteren, separat gepinnten 36-CSS-Bestand sowie zwei bestätigte Quellenoverlays. Ein neuer Screenshot-Host muss eine eigene Kopie mit bestätigtem aktuellen Code/CSS bekommen, eigener Port, vorhandenen Prüfhost nicht überschreiben. Er enthält nicht die vollständige öffentliche Galerie-API. Deshalb belegt eine eingefügte Attrappe nur Ort/Größe des Felds, keine Suchfunktion. Root erstellt die beiden Screenshots; dieser Auftrag hat keine Browseraktion ausgeführt. Alternativ darf Root im tatsächlich aktuellen Konfi eine nur temporäre visuelle Feldvorschau darstellen und klar als Vorschlag kennzeichnen.

## #233: Katalogaktualisierung ohne Verlust bestehender Arbeit

Neuester gelesener Operatorstatus [6774478711](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6774478711): Codeinstallation nach langer Appblockade zurückgenommen, drei Dateien wieder auf Vorherstand; Fenster laut Operator wieder frei. **Werkstatt → Designs vorerst nicht öffnen**: der kalte Listenaufbau blockiert denselben Prozess wie den Kundenkonfi. Kein erneuter #231-Versuch ohne getrennte Messung. Das ist ein eigener Betriebsblocker; eine Katalogaktualisierung allein beseitigt ihn nicht.

[Reiner Operator-Lesebefund 6773746757](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6773746757): aktiver Katalog `private/issue139-katalog-20261102`, Git-HEAD `b5d8f28bc1`, kein Remote, Vorfahr von `8236b8bfa`; 552 unterschiedliche Dateien, davon 168 neu/384 geändert/0 gelöscht, etwa 44 MB. **Gitstatus war dabei nicht geprüft.** Dies ist keine Aussage über einen sauberen Arbeitsbaum oder einen abgeschlossenen Import. Root prüft den aktuellen Zustand separat.

Die tatsächlichen Pfadregeln:

- `katalog-source.mjs:katalogPath()` nimmt zuerst `--katalog=`, danach `GRAVURU_KATALOG`, jeweils absolut aufgelöst. Nicht nur eine Umgebungsvariable ändern, falls ein CLI-Override vorhanden ist.
- `openKatalog()` liest Familien, Linien, Themen, Schriften, Motive und Design-Metadaten; SVG-/Fontressourcen können über absolute Dateipfade später nachgeladen werden. Ein Austausch von Dateien unter einem laufenden Katalogobjekt kann alte Metadaten und neue Ressourcen mischen.
- `design-dashboard.mjs:katalogFor()` hält Katalogobjekte kurzzeitig pro Pfad; Zielprüfungen besitzen weitere Cache-/Dateistempel. `http.mjs` und `server.mjs` verwenden Katalogdaten teils bei Initialisierung. Ein kontrollierter Wechsel benötigt neue, zusammenpassende Instanzen, keinen ungeprüften In-place-Austausch im laufenden Betrieb.
- `katalog-transaction.mjs` schützt native Werkstattschreibvorgänge mit exklusivem Lock, Journal und atomaren Dateien. Ein externes `git pull` respektiert diesen Lock nicht automatisch. `design-dashboard.mjs`, `catalog-structure.mjs` und `katalog-writeback.mjs` schreiben Namen, Themen, Freigaben, Zuordnungen/Linien und Änderungsprotokolle tatsächlich in den Katalogarbeitsbaum. Deshalb ist die aktive Ablage derzeit keine schreibgeschützte Bibliothek.
- Importidentitäten aus Linie/Unterkategorie/Größe und Design-IDs sind nicht an den absoluten Root gebunden. Ein Pfadwechsel allein darf weder Produktrevisionen noch Bestellungen/Shopifyzuordnungen neu schreiben. Vorbereitete alte Pläne/Quellobjekte müssen nach dem Wechsel frisch aufgelöst und bestätigt werden.

**Bevorzugt:** gepinnte Ausgangskopie auf `8236b8bfa` in einem neuen privaten Ordner, davor vollständiger Status/Tracked-Diff/Untracked-Dateien/Audit-/Freigabedelta sichern. Aktuelle lokale Werkstattänderungen dreiseitig mit altem Gitstand und neuem Ziel vergleichen. Konflikte bei Freigabe, Ausblenden, Größen und Zuordnung ausdrücklich auflösen; keine automatische Überschreibung. Daraus eine versionierte aktive Arbeitskopie machen, nicht einen schreibgeschützten Ordner, der bestehende Dashboardaktionen bricht. Alle SVG/Fonts/Motive, Katalogbau, IDs, Rangfolge und Größenfilter prüfen. Erst bei beendetem Schreib-/Importjob den bestätigten Root umstellen und kontrolliert neu starten; alten Ordner unverändert behalten. Rücknahme über alten Root, nicht über Zurücksetzen von Bestellungen oder Datenbanken. Auch nach dem Wechsel entstandene Werkstattänderungen vor einer Rücknahme sichern.

**Wenn der Operator ausdrücklich den bisherigen Pfad per Fast-Forward erhalten will:** sauberer Stammbaum reicht nicht. Erst alle lokalen Änderungen einschließlich ignorierter/nicht versionierter fachlicher Dateien und `_aenderungen.jsonl` sichern, Write-/Importjobs ausschließen, vollständige Verzeichnis-Sicherung mit Hashes, anschließend ausschließlich `--ff-only` zum fest geprüften Objekt. Keine `reset --hard`-/Clean-Lösung. Die Feststellung „0 gelöschte Gitdateien“ schützt nicht vor Überschreiben der 384 veränderten Dateien oder vor verlorenen Werkstatteinträgen. Der konkrete Schritt bleibt Root/Operator nach frischem Zustand vorbehalten.

Historischer Nachweis in `docs/handoffs/2026-11-02-issue139-live.md:20`: am 02.11. neuer Katalogordner aktiviert, zwölf Werkstattänderungen vorher gesichert/abgeglichen, jüngere Freigaben erhalten, Altkatalog vollständig behalten. Dieser Beleg trägt die Sicherungs-/Abgleichstrategie; er nennt keinen nachweisbaren heutigen automatischen Installer oder Git-Pull-Job.

## Prüfgrenze und nächster Schritt

Ausgeführt: gezielte Quelllesung, Git-Identitätsprüfung, GitHub-Kommentare sowie zwei Katalogdateien auf festem Ref gelesen. Keine Funktionen geändert, keine Testausführung als Implementierungsnachweis, keine Screenshots oder Serverproben. Root zeigt mobil/PC den Feldvorschlag und holt Chris' Bestätigung ein. Katalogmutation bleibt ein getrenntes, gesichertes Operatorpaket; der Design-Dashboard-Blocker bleibt bis zu eigener Abnahme offen.
