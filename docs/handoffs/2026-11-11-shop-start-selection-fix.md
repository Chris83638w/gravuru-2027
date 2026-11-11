# Shop-Einstieg: gewählte Variante vollständig erhalten

Die Shopseite kann bei Produkten mit mehr als 250 Varianten nur eine Teilliste an den Embed liefern. Bisher ersetzte der Embed eine dort fehlende, aber tatsächlich gewählte Variante durch den ersten Eintrag. Beim Acryl-Hauptprodukt war die konkrete betroffene Variante `58104626479484` (AB 12 × 8 cm, Schwarz, ohne Bohrung; Position 331) damit beim Start falsch vorausgewählt. Der bisherige Rückfall gehörte sogar zu den 30 nicht im v9-Hauptumfang geplanten Kleinvarianten.

Die Korrektur erhält die ausdrücklich von Liquid gelieferte aktuelle ID. Änderungen aus eindeutig eigenen Produktformularen bleiben ebenfalls erhalten. Die tatsächliche Themefassung liefert dafür `product-info[data-product-id]`; schon sicher zugeordnete Formularinstanzen werden wiedererkannt. Explizit fremde Produktmarker haben stets Vorrang vor einer alten Zuordnung. Bei widersprüchlichen Hauptformularen bleibt der letzte eindeutige Stand. Unbekannte Formularinstanzen, beliebige URL-Werte oder direkte Funktionsargumente erweitern die Auswahl nicht. Der R15-Edelstahlweg behält sein vollständiges, begrenztes Variantenmanifest.

## Umfang und Prüfung

- Genau eine Runtime-Datei: `app/workshop/ui/shop-embed.mjs`, SHA-256 **`ace194434dab6e124175a4ac3319248e1e6a6e4c86e8b3d65722baa0c1e3b8a2`**. Eine vorhandene Testdatei ergänzt. Keine Preise, Geometrie, Produktstände, Datenbank- oder Serverregeln geändert.
- 18 gezielte Autorenprüfungen bestanden: 15 Präsentations-/R15-Fälle, eine bestehende globale Embed-Prüfung, zwei echte Server-Negativfälle zu unbekannten/mehrdeutigen Bindungen. Zusätzlich echte vorhandene ID 331 als Eingabe mit direkter Vorauswahl und Formularwechsel geprüft; Liste weiterhin 250.
- Nach Anwendung im gemeinsamen Kandidaten nochmals die 16 betroffenen Frontendprüfungen bestanden, Syntax und Diffprüfung sauber. Keine breite Suite wiederholt; keine doppelte Addition dieser Prüfzähler.
- [Unabhängiger Review ohne verbleibenden Befund](../reviews/2026-11-11-shop-start-selection-fix/over250-independent-review.md). Tatsächliche Sticky-/Hauptformularstrukturen im aktiven Theme gezielt gegengeprüft.
- [Logs, Patch, Dateihashes und Integrationsbeleg](../reviews/2026-11-11-shop-start-selection-fix). Die Autorenübergabe darin hält den damaligen Scratchzustand fest; dieser Folgecommit integriert den Patch jetzt tatsächlich.

## An Claude

Dieser kleine Folgecommit ergänzt deinen bereits angelegten af6-Serverkandidaten. Bitte nur diese Codeänderung samt Test auf dem isolierten Kandidaten nachvollziehen; kein erneuter Abgleich der unveränderten 19 Serverdeltas nötig. Der Editorbundle-Code ist unverändert; der separat ausgelieferte Embed muss die neue Quelle benutzen. Ein durch den privaten Host ersetztes `__PROXY_PATH__`/`__EDITOR_ORIGIN__` verändert erwartbar die ausgelieferten Bytes, daher Quellhash und tatsächliche Routenzuordnung getrennt belegen.

Gezielt Linux prüfen:

```sh
node --test app/workshop/shop-product-presentation.test.mjs
node --test --test-name-pattern='global shop embed' app/workshop/shop-entry-client.test.mjs
```

Anschließend im tatsächlichen Shop-Piloten gewählte Variante, Startlink und Modellvorauswahl für `58104626479484` vergleichen; nach Wechsel im Konfigurator gespeicherte Auswahl und native Warenkorbzuordnung prüfen. Die bisherige 403-Grenze des anonymen JS-Abrufs sowie der private Hostresolver sind keine schon erfolgte Live-Abnahme. Veröffentlichung oder Variantenlöschung werden aus diesem Fix nicht abgeleitet. Der [tatsächliche Zielvergleich](2026-11-11-main-target-pilot-review.md) bleibt maßgeblich; aktueller nativer Profil-/Bindingabgleich auf der Kopie folgt separat.
