# Issue #48 – Nachrichten 12 und 13

Stand: 29.10.2026, Codex/Astra, PR #58. Erst Nachricht 12, danach 13. Keine Bereitstellung, keine Live-Datenänderung. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt für Gestaltung weiter; die ausdrücklich bestellte Kundenbedienung folgt Nachricht 13.

## Regeln und Quellen (vor der Implementierung)

| Regel | Quelle |
| --- | --- |
| Der Shop-Einstieg lädt ohne Editor-Vertrag; seine gesamte Importkette muss über die wirkliche Händlerhost-Auslieferung erreichbar sein. | [Nachricht 12](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6499938817), 29.10.2026 |
| Gewählte Ausführung und Menge bleiben beim Designwechsel erhalten. Kein stiller Rückfall auf eine andere Befestigung; bisherige Gestaltung und Foto bleiben bei Fehlern erhalten. Vollständige Prüfung und Preisberechnung im Editor/Server bleiben maßgeblich. | Teil D1 in Issue #48, präzisiert durch Nachricht 12 |
| Jedes einzelne Motiv ist löschbar und ersetzbar, unabhängig von seiner Verschiebbarkeit. | [Chris, Nachricht 13](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6499962726), 29.10.2026 |
| Nur ausdrücklich als Einheit verkaufte ganze Druck-Designs dürfen gesperrt sein; ein Code-Standardwert oder ein beliebiger Dateiimport ist keine solche Entscheidung. | Nachricht 13 und [Nachricht 14 / AGENTS.md](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6499988217) |
| D8 erhält einen vorbereiteten neuen Produktstand; alte Bestellungen und veröffentlichte Revisionen bleiben unverändert. Kein Live-Schreiben ohne Chris. | Nachricht 13 |
| Preise und Lochabstände werden hier nicht geändert; ihre Quelle bleibt die Preis-Excel. Keine neue Pflicht, kein neues Maß oder Sperrkriterium aus bisherigen Code-Standardwerten ableiten. | AGENTS.md, main `2717da5`; Chris in Issue #48 |

## Nachweise und offene Punkte

### Nachricht 12

- Shop-Einstieg verwendet `shop-selection-transfer.mjs` ohne weitere Importe. Nur Ausführung/Menge werden kopiert und unbekannte Gruppen/Befestigungen früh abgelehnt. Keine Standardwerte, Preisauflösung oder Rechte aus dem Editor werden hier geladen.
- Die vollständige Prüfung bleibt in `product-design-transfer.mjs` im Editor. Ein mitgegebenes, im Ziel unsichtbares Optionsfeld wird dort weiterhin abgelehnt; es wird nicht still verworfen. Alter Editor, Foto und Warenkorbkontext bleiben bei Fehlern erhalten.
- `shop-entry.test.mjs` verfolgt ab `shop-entry-page.mjs` alle statischen und literalen dynamischen Importe durch `createShopEntry.matches/handle`, genau die vorgeschaltete Auslieferung des Zwei-Store-Händlerhosts. Keine frei zugänglichen Editor-/Werkstattpfade hinzugefügt. Der Test scheiterte vor dem Fix am Import `product-design-transfer.mjs`; danach grün.
- **73/73 gezielte Tests bestanden**, keine Fehler/Skips: `shop-entry`, `shop-design-switch`, `acryl-host-routing`, `product-design-transfer`, `ui-event-regressions`. Kein erneuter Vollauf.
- Noch offen: 1:1 mit diesem neuen Code auf der echten Shopseite (Schraubenwahl, Schriftoptionen, durchgehendes Tippen) und echtes Safari. Die hier verfügbare Browsersteuerung bietet keine lokale Antwortüberschreibung der Live-Seite. Claudes genannter kombinierter Prüfbranch war beim Abruf nicht als Remote-Ref vorhanden. Keine Bereitstellung als Testumweg.

### Nachricht 13

Audit und Vorbereitung folgen nach dem Shop-Einstiegsfix. Vollauf und Live-Abnahme werden nicht aus einem lokalen Test abgeleitet.
