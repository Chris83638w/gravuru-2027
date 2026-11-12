# Isolierter Vollhost: unabhängige Ergebnisbewertung

12.11.2026. Grundlage ist der frisch gelesene vollständige Text von [Claude #168 · 6817244215](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817244215), abgeglichen mit den zuvor geprüften Entry-/Worker-/Slimmerpfaden und dem angekündigten Prüfumfang. Kein eigener Serverzugriff, Testlauf oder Eingriff; die privaten Rohlogs und Testskripte wurden hier nicht erneut eingesehen.

**Der angekündigte isolierte Kundensitzungstest ist bestanden. Die Ergebnisse tragen den nächsten kontrollierten Schritt im bereits autorisierten Umfang „umschalten und prüfen“. Kein Anlass für einen weiteren gleichen Benchmark, eine vorsorgliche Speicheranhebung oder eine neue Produktfreigaberunde.**

| Tatsächlich gemeldeter Nachweis | Erststart | Neustart | Edelstahl |
|---|---:|---:|---:|
| Sitzungsdauer; letzte Modellantwort | 68 s; 200 | 67 s; 200 | 65 s; 200 |
| Host-RSS (einschließlich Kinder), MiB | 2.135 (**2.152**) | 1.025 (**1.042**) | 1.151 (**1.169**) |
| Konto-RSS-Spitze, MiB | 4.475 | 3.359 | 3.492 |
| Prozessende | Exit 0 | Exit 0 | Exit 0 |
| Galerie | alter v2 ungültig → Aufbau → gespeichert | Cachetreffer | Cachetreffer |

In allen drei Läufen: nativer Start 302, Modell/Vorschau/Designwechsel erfolgreich; fehlende Sitzung 403, fremde Origin 403 und falsche Signatur 401; kein Wächterereignis, Neustart oder geblockter Netzversuch. Die tatsächliche TTL blieb vier Stunden. Der kalte Aufbau umfasste 242 Produktstände, 16.680 Bindungen und 245.830 Karten. Die langsamste Halteantwort von 3.777 ms bleibt ausdrücklich Bestandteil des Ergebnisses; daraus folgt ohne vereinbarten Grenzwert kein zusätzlicher Abbruchgrund.

Der tatsächliche Zwei-Store-Konstruktor lief mit einer Kopie des älteren Legacy-Releases, beiden kopierten Dreierbeständen, den 13 echten Hostoptionen und vier Pfadumstellungen. Sicherungshashes blieben laut Operator unverändert; Live-Datenbanken wurden nicht geöffnet. Der vorab erklärte Vollhostrahmen von 4.000 MiB einschließlich Kinder / 8.000 MiB Kontosumme bei gemeldeten 12G ist eingehalten. Er ist ein anderer Umfang als der frühere einzelne 1.800-MiB-Galeriebenchmark.

## Verbleibende, eng abgegrenzte Prüfung

- **Echter Legacy-Einstieg und erforderliche Assets:** Der zweite Store wurde konstruiert, aber keine seiner neun Identitäten als Kundensitzung nachgewiesen. Das zusätzliche Edelstahlprodukt liegt nach dem vorhandenen Identitätsbeleg ebenfalls im Acryl-Store. Die bereits angefragte kleine Legacy-Probe und der echte Proxy-/iframe-/Assetpfad gehören zur anschließenden Umschaltprüfung; kein erneuter umfassender Testaufbau erforderlich. Ein Modell-200 allein beweist keine erfolgreich geladenen Lazy-Schriften.
- **Werkstatt-Arbeiter:** `katalog_worker_ready` belegt Bereitschaft, keine bearbeitete Mitarbeiter-Designliste. Eine normale authentifizierte Werkstattanfrage ist der noch fehlende Nachweis für diesen Pfad, falls dessen Funktion anschließend bestätigt wird. Der eigene 2.200-MiB-Wächter bleibt unverändert und unabhängig vom äußeren Hostrahmen. Aus der früheren Einzelmessung darf weder ein sicherer Ausfall noch ein sicherer Erfolg durch bloßes Addieren abgeleitet werden.
- **Realer Betrieb:** Passenger/LiteSpeed und der tatsächliche Shopify-Proxy waren absichtlich außerhalb des isolierten Laufs. Sie werden mit der vorhandenen Umschalterlaubnis und vorbereitetem Rückweg geprüft. Die Kopienprüfung ersetzt diese Beobachtung nicht, macht sie aber auch nicht zu einer unmöglichen Vorbedingung vor dem Umschalten.

Cart, Bestellungen, Uploads, Webhooks und die v9-Produktübernahme sind keine fehlenden Voraussetzungen dieser Programmumschaltung. Hauptacryl R1 mit einer Karte und 1.499 ct ist der geprüfte Iststand, kein Nachweis eines v9-Imports. Ebenso ergibt sich aus der erwähnten Migration der Wegwerfkopie noch kein eigener Statistik-Funktionsbeleg. Die aktuelle Nutzererlaubnis ist laut Root bereits übermittelt; dieser Review führt keine zusätzliche Zustimmungsschleife ein.

Die Aussage „Ausfall erklärt und weg“ wird hier enger gefasst: Der zuvor betroffene kalte Aufbau samt Kundensitzung ist mit den aktuellen Korrekturen und dem gemeldeten Kontorahmen erfolgreich reproduziert. Das belegt diesen Ablauf, nicht sämtliche bislang unbenutzten Hostpfade.

Nachtrag Root: Claude hat nach diesem technischen Review in #168 Kommentar 6817323556 eine neue Nutzerzustimmung für den erneuten Aktivierungsversuch verlangt. Die konkrete Frage ist beim Nutzer offen. Der technische Review ersetzt diese Zustimmung nicht; der Hauptprodukt-Kopienlauf geht unabhängig weiter.