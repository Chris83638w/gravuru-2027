# Sechs ausgeführte Kleinprodukte – Abschlussakten vom 12.11.2026

Die sechs neuen Excel-Versionen in **akten/** ergänzen die unveränderten Vorgängerakten um **Ausfuehrung** und **Shopzuordnung**. Dies ist ausschließlich ein Abschlussnachweis. Kein neuer Import oder Reimport wird dadurch ausgelöst; die creationKeys bleiben an die ursprünglichen Preisakten gebunden.

Ausführung autorisiert durch „Ja, Gesamtpaket ausführen“ ([Freigabe #168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6829898414)). Tatsächlicher Operatorbericht: [Ergebnis #168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6830922986), Commit f33942d9. Erhalten wurde die kompakte Ergebnisdatei mit 6.081 Bytes, SHA256 9033e653ec7eb6472a110d8468f3fc516b2c64205461503174d9f60ecd78cc23; ihr Git-Blob wurde unabhängig nachgerechnet. Der darin genannte volle Serverbeleg (32.256 Bytes, SHA256 3661f669a36c07b20950245e31c2aff9c2687422356f12a4c5a1cdd87d4d17f3) wurde nicht mitgeliefert.

| Gruppe | Neue Aktenversion | Tatsächliche Shopify-ID | Varianten |
|---|---|---:|---:|
| Acryl 5 × 2 cm | v6 | 16203675074940 | 10 |
| Acryl 6 × 2 cm | v6 | 16203715281276 | 10 |
| Acryl 8 × 2 cm | v6 | 16203716100476 | 10 |
| Edelstahl 5 × 2 cm | v5 | 16203716854140 | 5 |
| Edelstahl 6 × 2 cm | v5 | 16203717804412 | 5 |
| Edelstahl 8 × 2 cm | v5 | 16203718459772 | 5 |

Alle sechs Produkte sind DRAFT, publishedAt ist null, templateSuffix ist konfi und die Einstieg-ID entspricht jeweils der tatsächlichen nativen cfg-Identität, Revision 1. Die unabhängigen Connector-Lesedateien enthalten alle 45 Varianten ohne Folgeseite. **45/45 Preise und vollständige Optionskombinationen entsprechen exakt den bestätigten Sollzeilen.** Alle sechs haben derzeit keine Produktbilder. Die tatsächlich erstellten Shop-IDs fehlen im zuvor gesicherten historischen Gesamtinventar; dessen SHA steht in Review.json, der gesamte Fremdkatalog wird nicht erneut ausgeliefert.

Die sechs tatsächlichen Pläne, Bestätigungs-IDs und erzeugten cfg-IDs sind vollständig in Review.json und den Akten zugeordnet. Vorbereitungsquellen und durch execute erzeugte Zielprodukte sind getrennt. Kopienplan-IDs bleiben als Historie gekennzeichnet. Die Planpins stimmen zwischen den gelieferten 2a- und 2b-Dateien; ohne vollständige aktuelle Planrecords wurden ihre nativen Planhashes hier nicht erneut berechnet.

Der Operator meldet 14/14 erfolgreiche Reconcile-Prüfungen, insgesamt sechs native Bestätigungen/Ausführungen und sechs Shop-Neuanlagen (eine im Erstlauf, fünf beim Reconcile). Er meldet 45 neue Bindungen/Preisverträge und sechs Katalogfreigaben/Transfers. Das separate Eigentümer-App-Preisfeld ist über den unabhängigen Connector nicht auflösbar; dessen null gilt ausdrücklich nicht als Abwesenheitsbeweis. Für dieses Feld und die einzelnen nativen Bindungen ist der gelieferte Operatorbericht die Belegquelle.

## Aktenprüfung

- 3.711 Originalzellen sowie 6.552 Zellen/Formeln der vorherigen sechs Akten sind unverändert.
- Je Akte bleiben 25 bisherige Paketdateien bytegleich, darunter sämtliche bisherigen Worksheet-, Tabellen- und Relationsdateien. Nur Paketverzeichnis, Blattregister und gemeinsame Styles werden für die neuen Blätter ergänzt.
- Alle 1.044 beim Artifact-Reimport verglichenen neuen Zellwerte stimmen. Alle 18 Reimportbilder wurden einzeln gelesen: vollständige IDs/Hashes, Preise und Quellenhinweise sind sichtbar.
- Build und ZIP-Graft endeten mit Exit 0. Der Reimport schrieb alle sechs erfolgreichen Inhaltsprüfungen, alle 18 PNGs und den Abschlussbericht, endete danach jedoch mit **Exit 3221226505**. Das ist kein sauberer Runtime-Prozessabschluss; die Ursache wurde nicht festgestellt und der Lauf nicht wiederholt. Automatischer Bericht und separate manuelle Sichtprüfung bleiben unverändert getrennt.

Root hat zusätzlich drei bestehende Reimportbilder unabhängig angesehen: Acryl 5 × 2 Ausfuehrung-1, Acryl 8 × 2 Shopzuordnung-1 und Edelstahl 6 × 2 Ausfuehrung-2. Texte, IDs, Preiszeilen und Beleggrenzen sind in diesen Ausschnitten lesbar; keine Überlagerung oder Abschneidung wurde festgestellt. Das ist eine begrenzte unabhängige Sichtstichprobe, getrennt von der vollständigen 18-Bilder-Sichtprüfung des Autors.

**Review.json** bündelt Scope, Zuordnung und Grenzen. **manifest.json** versiegelt ausschließlich die explizit gelieferten Dateien. **belege/Manifest.json** bindet die sechs XLSX an ihre Vorgänger und Quellen. **repro/** enthält den verwendeten Ablauf und die bestehenden Graft-/Lesefunktionen; keine neue Produktausführung.

Die geschützten 16 alten ACTIVE-Produkte werden von Root gesondert verglichen. Dieses Paket behauptet keinen abschließenden Metadatenvergleich dieser Produkte und keinen Browser-, Warenkorb- oder Produktionslauf. Die Hauptproduktakte v7 bleibt SHA256 65d706e1a99cc599ba7a1c577de028208a5efd356f97bd997f68be3f899cde29 unverändert; ihr Ausführungsabschluss folgt separat.
