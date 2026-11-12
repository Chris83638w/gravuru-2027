# Hauptprodukt: echte native Beobachtung und eindeutige sieben Zielwege

12.11.2026, Codex/Astra. Runtime bleibt `f85390b`; keine Aktivierung oder Produktänderung durch diesen Nachtrag.

## Tatsächlicher Hauptupdate-Review

[Claude hat die native Beobachtung geliefert](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817439434): neue Wegwerfkopie aus den drei gesicherten Acryl-Datenbanken, vollständiger tatsächlicher Validator, Ressourcen-/Asset-/Fertigungsauflösung, native Metadaten und Katalogprojektion. Ursprung: `dev/claude-db-sicherung-20261111` bei `ae9adb23`, `ops/plesk/update-beobachtung-20261112/`.

| Beleg | SHA-256 |
|---|---|
| observation.json | `4577f555e1ee270f225d60ef68ebfceca973246309b675022139dc7ef3d23ec3` |
| main-update-review.json | `d980417e45469b4d34f2fbd9abff746cf6cdbe7864e67b2f416fc2561f7ad8d8` |
| uo-beobachtung.mjs | `f540c4de1a8bc22ce2989da0d978b01a1d3d7cbdc69b897114da533eefa1bd5e` |
| Berechneter reviewHash | `8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d` |
| importFingerprint | `2872b28895453ec8fc3af89a293e7f3d144c56bdf03dbae6b09c5296fcb9e01f` |

Root hat alle drei Dateien bytegenau übernommen und den Review mit `verifyUpdateReview` gegen das tatsächliche erhaltene Zieldokument erneut erfolgreich geprüft; die eingebettete Observation entspricht der separaten Datei. Ein unabhängiger Quellenreview bestätigt sämtliche 15 im Anschluss gepinnten Dateien und die vollständige native Verdrahtung. [Belege](../reviews/2026-11-12-main-native-observation/).

Kopf bleibt Revision 1, draft, unveröffentlicht. Metadaten des Ziels `52476368aa083eebf168c30f1f2ea54415b18f1d6c02b53e41173fa58a2ef075`; beide Produktkategorien bleiben im Dokument. Ihre Zuordnungen sind nativ als nicht vorhanden bestätigt. Settings Revision 1 / `f13deb8f92a43f226fd0b7bc7b434f515dec2460201a53f2661b7efefb8a279b`, keine Ressourcenprofil-Overrides; Auflösung `364ecd257e39248e9197f3a5be5e656928c22a5a4b6878ce68612e61957f52b3`. Kein zugewiesener Fertigungsprofilverweis; dies ist kein Fertigungsabnahmebeleg.

Der ältere Vergleichshelfer setzt `readyForImport:false` grundsätzlich. Sein fehlender serverseitiger cmp-Registerpin ist deshalb nicht kosmetisch zu entfernen: Der direkte Hauptupdatepfad validiert den vollständigen eingebetteten `config.moduleProfile`-Snapshot und braucht dafür keine Modulregisteranlage. Die sechs späteren Gruppenpläne benötigen dagegen echte serverbezogene Modul-/Quellpins. `resourcePins.profiles:[]` betrifft Fonts/Motive/Farben/Bestseller und ist keine Aussage über das cmp-Register.

Noch offen sind tatsächlicher Update-/Replay-/Driftabbruch auf einer weiteren Kopie und die konkrete produktive Zustimmung. Die neue v7-XLSX wird aus diesem echten Review erstellt, zunächst als Unterlage für den Kopienpilot. Keine künstliche Nutzerzustimmung und keine produktive Freigabedatei erzeugen. Eine ausdrücklich künstliche Testfixture darf ausschließlich im Speicher einer strikt auf neue Wegwerfpfade begrenzten Integrationstesthülle verwendet werden; native Schutzprüfungen bleiben unverändert. [Koordination und Testgrenze](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817507620).

## Korrektur: sechs Kleinprodukte werden neu aufgebaut

Die bisherige Formulierung „sechs Kleinproduktziele noch nicht ausgewählt“ war als Nutzerfrage zu weitgehend. Chris hat den [Neuaufbau ausdrücklich festgelegt](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768508409): alte Produkte nicht umhängen und nicht als Dublettengrund verwenden. Die [spätere Koordination](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6804936405) nennt sechs neue Gruppen mit 10/10/10 Acryl- und 5/5/5 Stahlvarianten. Der konkrete Registerabgleich für die bekannten Kandidaten und sechs Alias-/Herkunftsidentitäten ist inzwischen in beiden Stores erfolgt.

Damit lautet der Restauftrag: Hauptacryl identitätserhaltend aktualisieren; sechs neue DRAFT-Gruppen 5×2, 6×2, 8×2 in beiden Materialien technisch vorbereiten. Die 16 ACTIVE-Altartikel, 30 alten Acrylbindungen und 15 Stahlkleinformatvarianten bleiben erhalten. Keine erneute Auswahl unter alten Kleinartikeln verlangen. Offen sind die tatsächlichen serverbezogenen Plan-/Profilpins und die konkrete abschließende Ausführungsfreigabe, nicht Material-/Preis-/Designentscheidungen. [Unabhängige sieben Zielwege](../reviews/2026-11-12-main-native-observation/seven-products-targets.md).

H1 bleibt auf dem festgelegten Hauptprodukt `16190784602492`; die H1-Zustimmung ist keine pauschale Datenupdatefreigabe. Veröffentlichung, Altartikel-Auslistung und Bestell-/Produktionsabnahme sind nicht aus den vorbereiteten DRAFT-Zielen abgeleitet.

Nächster Schritt: echte v7-Datei prüfen und pinnen, Kopienpilot mit Claude abschließen, sechs serverbezogene Gruppenpläne konkretisieren und daraus die konkrete Gesamtausführung vorlegen. Die gesonderte erneute Programmumschaltung wartet weiterhin auf das von Claude verlangte neue Nutzer-Ja. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Designänderung.
