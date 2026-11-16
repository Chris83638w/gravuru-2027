# Unabhängige Prüfung der sieben nativen v9-Pläne

11.11.2026 · search_preview · ausschließlich lesend. Ergebnis: **GRÜN für den vorbereiteten lokalen Planstand**, keine Bestätigung, Ausführung, Serveränderung oder Shopify-Aktion.

Geprüft wurden `work/product-plans-run-v9` gegen den eingefrorenen v8-Stand, die SQLite-Datensätze, Originalpreisakten, Katalog `8236b8bfab7322447ec46661c116fa526331af3d` und Code `64e026e8fd15b129a16cc97189b28506aa9e8ac2`. Der inzwischen neue Dokumentations-HEAD wurde nicht mit einer Runtimeänderung verwechselt: die verwendeten Vertrags-, Modul-, Produkt-, Plan- und Mengenstaffeldateien stimmen inhaltlich mit dem gepinnten Code überein.

| Prüfpunkt | Ergebnis |
|---|---|
| Neue native Pläne | 7/7 `valid:true`, keine Planfehler |
| Plan-IDs/Hashes | JSON, Paar und gespeicherter kanonischer Planhash stimmen für alle sieben überein |
| Quellen/Vorlagen | jeweils Revision 2; aktuelle Datenbankköpfe und gepinnte Revisionen stimmen |
| Bestandszählung | 7 Quellen, 14 Quellrevisionen, 14 Pläne = 7 historische v8 + 7 neue v9 |
| Unausgeführt | 0 Bestätigungen, 0 Ausführungen; `published:false`, `shopifyWrites:0` |
| Preise | 823/823 Kombinationen unabhängig gegen Originalextraktion abgeglichen; keine Abweichung oder doppelte Kombination |
| Quelldokumente / kompilierte Produkte | kanonisch identisch zu v8; auch Variantenreview und Original-XLSX identisch |
| Neue Metadaten | JSON = SQLite; Entscheidungshash überall `730168634964272693b514e3efd742975bd56af30a96a7ae751a2aed7fe71a64` |
| Steuer | bestätigte Bruttobeträge/DE/19 % nur in Entscheidungs-/Revisionsmetadaten; kein erfundenes Steuerfeld im Produktvertrag |
| Staffel | 3/5/10 Stück → 5/10/15 %, `complete-unit`; Source, compiled, Metadaten und Manifest identisch. Schwellen und kaufmännische Cent-Rundung am echten Mengenvertrag geprüft |
| Uploads | Hauptacryl Foto + SVG-Logo AN; alle sechs kleinen Produkte AUS; native Fähigkeiten, tatsächliche Vertrag-/UI-Funktionen und Preise passend |
| Modulprofile | alle cmp-IDs/Revisionen/Hashes gegen Datenbank; Pins unverändert zu v8; Kompilierung entspricht Quelle plus gepinntem Profil |
| Motive | separate Profilrevision 1, exakt 13 bestätigte IDs, Datenbank-/Dokumenthash und sechs Metadatenauswahlen passend; Originalressourcen unverändert |
| Geometrie / Reihenfolge | neun vorhandene Fit-Ausnahmen weiterhin ausgeschlossen, zwei versteckte IDs weiterhin nicht verfügbar; Rang 0 vor 1, doppeltes D34 nur einmal |
| Entfernte Fragen | exakt 15 dokumentierte Freitextfragen; Templateinhalt sonst nur durch Quellrevision 1→2 geändert |
| Historischer Schutz | sämtliche in v8-preservation.json gepinnten v8-Dateien erneut gehasht und unverändert |

Die Mengenstaffel ist als bestehende Entscheidung in `ENTSCHEIDUNGEN.md` 4.16 und `docs/plans/STAFFEL-SHOP-BESTAND-20261019.md` „Entscheidung 20.10.2026“ belegt. Die neue Steuerbestätigung und Beibehaltung der Starts sind im Entscheidungsmanifest dokumentiert. Der bekannte Geometriehinweis wurde aus den offenen Fragen genommen, ohne eines der ausgeschlossenen Designs freizugeben oder eine Toleranz zu ändern.

Die Motivbibliothek ist weiterhin separat gepinnt: der native Produktgruppenplan erzwingt deren Revision nicht automatisch. Bei späterer Bestätigung/Ausführung sind diese externen Profilpins zusätzlich zu Quelle/Template/cmp zu prüfen. Technische Gültigkeit belegt weder eine Livebindung noch Warenkorb, Bestellung oder Fertigung. Die von catalog_review separat geprüften v9-Excel-Nachträge wurden durch diesen Native-Review nicht verändert.

Belege in diesem Ordner:

- `review-v9-persisted.json`: native Plan-/Quellen-/Template-/Modul-DB-Prüfung.
- `review-v9-details.json`: 823 Originalpreise, Ressourcen, Rangfolge und 13 Motive.
- `review-v9-uploads.json`: tatsächliche Vertrags-/UI-Funktionen für Foto und SVG.
- `review-v9-finalization.json`: Revisions-/Metadaten-/Tier-/v8-Schutzprüfung mit allen Ergebnissen.
- `review-v9-finalization.mjs`: reproduzierbarer zusätzlicher Read-only-Prüfer.

Die erste zusätzliche Prüferversion nahm irrtümlich `shopifyWrites:false` statt des nativen Zählers `0` an und verwendete für den separaten Motivpin einen kanonischen statt des dokumentierten Roh-JSON-Hashes. Beides wurde anhand des unveränderten Vertrags und der tatsächlichen Profilbytes berichtigt; keine Produkt-, Plan-, Datenbank- oder Sollpreisdaten wurden geändert. Der finale Lauf ist vollständig grün.

Reproduktion ab Workspacewurzel:

```sh
node work/search-preview/review-persisted-plans.mjs work/product-plans-run-v9 NEUER_REVIEW_PERSISTED.json work/search-material-final
node work/search-preview/review-final-details.mjs work/product-plans-run-v9 work/product-plans-catalog work/search-material-final work/product-plans-run-v8 NEUER_REVIEW_DETAILS.json
node work/search-preview/review-upload-decision.mjs work/product-plans-run-v9 work/search-material-final NEUER_REVIEW_UPLOADS.json
node work/restabschluss/review-v9-finalization.mjs work/product-plans-run-v9 work/product-plans-run-v8 work/search-material-final NEUER_REVIEW_FINALIZATION.json
```

Neue Ausgabedateinamen verwenden; die gespeicherten Pakete bleiben schreibgeschützt behandelt. Die drei allgemeinen Prüfer sind dieselben lesenden Prüfer aus dem früheren unabhängigen Review; der neue Prüfer ergänzt nur die v9-Änderungen.
