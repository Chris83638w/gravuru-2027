# Unabhängiger Review des nativen Ressourcenpin-Lesers

**Ergebnis: kein offener Quell- oder Belegbefund im geprüften engen Umfang.** Rein lesender Review; keine eigenen Tests, Host-/DB-Konstruktion, Operator-/Serverzugriffe oder Appänderungen. Geprüft: Paket `main-resource-pins-helper/ops/issue230-main-resource-pins-20261111/` gegen die tatsächlichen nativen Profil-/Fertigungsfunktionen und den bestehenden Update-Adapter.

Geprüfter Manifest-SHA256: `9cad9b767c1b7cc2968b91b04781a3a17252721036a407adcac1641df623940b`. Alle sieben darin aufgeführten Dateien stimmen in Länge und SHA256; das Manifest selbst ist die achte Paketdatei.

- Leser: `read-resource-pins.mjs`, SHA256 `18952021f08bd9643d905c446ac502c0739edd7d6ae692254158004211f946b8`.
- Finale Testquelle: `0ae284caddeab2579d610dd8a0a64d7ab87ba03ad43c6916cccf5986b954169d`.
- Unveränderte Adapterabhängigkeit: `6f68a00b590b6dedb5af29229fea816e31b4cab2bea5e937a67ed220a9fdd571`; ursprüngliches Adaptermanifest weiterhin `79eb9502ad36ba793f13e69e6b47572267549e21fb64f6d4d81c747ae0f8aa98`.

## Quellenabgleich

`profiles.settings()` liefert den aktuellen Settingsstand; `profiles.get(id)` liest bewusst den aktuellen Profilkopf, während `profiles.resolve(document)` die native Reihenfolge Defaults → geordnete Kategorien → Produkt und den Bestsellerfilter beibehält. Der Leser ersetzt diese Auflösung nicht durch eigene Auswahlregeln. Er erfasst auch später überlagerte Overrideprofile, die die native Funktion trotzdem lädt und prüft. Pro Durchgang müssen Settingsrevision und gewinnende Profilrevisionen zur Auflösung passen; anschließend werden zwei vollständige Sechsfeldprojektionen verglichen. Es gibt keinen Cache, Retry oder stillen Revisionswechsel.

Die sechs Felder entsprechen exakt dem bestehenden Adapter. Settings-/Profilinhalte lassen lediglich API-Zeitstempel weg und verwenden dessen rekursive Stringkanonisierung. Der gesamte native Auflösungssnapshot einschließlich Quellen und Warnungen wird ebenfalls gepinnt. Der Fertigungsstand kommt aus `productionProfiles.resolve(document)` mit expliziter historischer Revision; dessen gespeicherter JSON-Bytehash wird unverändert übernommen. Er wird nicht mit den anders definierten Hashes des SQL-Kategorienhelfers vermischt.

Der Leser importiert nur die vorhandene Digestfunktion und ruft ausschließlich die injizierten Lesefunktionen auf. Er erzeugt keine Datenbank, keinen Host, keine Registry, keine Produktrevision und keinen Netzwerktransport. Die tatsächliche Tenant-/Storezuordnung ist keine aus einer erfundenen API abgeleitete Behauptung: sie bleibt, wie im README benannt, Teil des Operatornachweises.

## Geprüfte Testbelege

Die Autorbelege zeigen sieben bestandene native Fälle und einen separat ausgeführten zusätzlichen achten Fall; kein behaupteter erneuter Gesamtlauf. Quellcode, beide Logs und die getrennte Erst-/Finalverifikation wurden gelesen und gehasht. Die Bibliotheken sind echt, Daten und Entscheidungen synthetisch.

Belegt sind geordnete Kategorien, Empty-/Overrideverhalten, Bestsellerfilter, unterlagerte Profile, historischer Fertigungsstand, Zeitstempelunabhängigkeit und Abbruch bei Settings-/Profiländerungen oder ungeeigneten Ressourcen. Der native Workshop-Kopienpilot führt eine Revision unter derselben Produkt-ID aus; Replay erzeugt keine weitere Revision, fremdes Produkt und Sicherungsdatei bleiben unverändert.

Der ergänzte achte Fall schließt eine konkrete Beleglücke: Er ändert ein **überlagertes** Defaultprofil während des tatsächlichen nativen Snapshotinserts. Der vollständige finale Metadatendigest bleibt ausdrücklich gleich. Dennoch bricht der zusätzliche Ressourcenpin-Guard mit `invalid_snapshot_metadata / snapshot_resources_changed` ab; Produktkopf bleibt Revision 1 und das Importjournal leer. Damit ist der zusätzliche Pinvergleich unabhängig vom bereits bestehenden Metadatenvergleich geprüft.

## Grenze

`beforeWrite` und der tatsächlich verdrahtete `snapshotMetadata`-Hook prüfen diese Pins erneut innerhalb der nativen Produkttransaktion. Das ist keine gemeinsame Transaktion über mehrere Datenbanken; eine separat vorgenommene Profiländerung wird nicht durch den Produktrollback rückgängig gemacht. README und Tests behaupten das auch nicht.

Das additive Paket ersetzt weder den echten Kategorien-/Identitätsbeleg noch den privaten Hostkontext, dessen vollständigen Validator, die richtige Auswahlbibliothek/Fontregistrierung oder die echte Zustimmung zum konkreten Update. Es erzeugt keinen produktiven Reviewhash und führt keinen Hauptproduktpilot aus. Claudes angekündigtes Kopienfenster wurde durch diesen Review nicht berührt.
