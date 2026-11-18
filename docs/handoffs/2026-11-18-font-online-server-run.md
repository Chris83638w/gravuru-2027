# Private Server-Sicherung und Wiederherstellungsprobe – 18.11.2026

Auftrag #254, PR #261; Gesamtübergabe #262. Chris hat das private Paket direkt bestätigt, Claude die konkreten Texte geprüft. Keine App-/Shopaktivierung. Werkzeug `cbb7f2c`, exakter Tool-SHA `e4268a0c3311e0d5d2bfc9f962cab0e9678d5b45aa2ee5c9dfcf7ac4f9cd96d1`.

## Tatsächlich ausgeführt

Fünf geprüfte Ablageschritte einmal ausgeführt, Werkzeug und Konfiguration zurückgelesen und gehasht. Vollständiger CLI-Vorabcheck der abgelegten Datei: Exit 0, 49 ms, keine Datenbank geöffnet / kein neuer Pfad. Nach Claudes Prüfung genau ein Capture-Start um 10:44:11 UTC (PID 4126327), später genau eine Restore-Konfigurationsablage und ein Restore-Start um 11:03:32 UTC (PID 4189794). Keine Wiederholungsstarts oder Löschungen.

| Messwert | Capture | Restore |
|---|---:|---:|
| Exit | 0 | 0 |
| Nutzdateien | 81.756 | 81.756 |
| Nutzbytes | 9.732.780.913 | 9.732.780.913 |
| Dauer laut Werkzeug | 875,772 s | 1.191,199 s |
| Spitzen-RSS | 243.609.600 B / 232,3 MiB | 202.313.728 B / 192,9 MiB |

Capture-Phasen: Inventur 118,976 s, offene Leser 98,835 s, gepinnte Transaktionen 98,833 s, Prüfung/Ressourcen 657,960 s. Gemeinsames Pin-Fenster 0,033 ms und dataVersions vor/nach gleich; kein Live-Laufzeitlock. 18 Zwischensynchronisierungen der großen privaten Ziel-DB bei 256 MiB Intervall, anschließend finale Synchronisierung. Größte WAL 37.953.472 Bytes.

Extern nachgerechneter Capture-Erfolgsbeleg: `fd476927108f2e382f9e96e3214fda06015742cacd78b542397691f562b014e6`. Restore-Konfiguration 1.282 Bytes, SHA `106a63bc3b990c61657e628e93d2dfa2dc948cbf94321037533b7c7da996b645`. Nach Restore denselben Erfolgsbeleg extern erneut gehasht, SHA identisch. Werkzeug hat exaktes Inventar, jede Dateigröße/Prüfsumme sowie DB-Integrität, Fremdschlüssel und Tabellenzähler vor und nach Kopie geprüft. Am Ende 332.784.226.304 Bytes Platte frei; beide ursprünglichen Einstiegshashes unverändert. Diese Abnahme ersetzt keine Messung der App-Prozessstartzeit.

## Messung während Wiederherstellung

11:14 UTC: bekannte Launcher-/Timeout-/Python-Prozesskette über exakt passende Argumente bestätigt. Python PID 4189796, rund 5,7 GB Schreibzähler, rund 25,8 GB logische Lesezähler (nicht exklusiver Plattenverkehr), momentaner RSS 124.020 KiB und bisheriger HWM 155.748 KiB. Diese Prozesskette und der Messprozess haben dieselbe Memory-cgroup-Kennung; nur deren Hash festgehalten. Gemessene Reserve 11.477.192.704 Bytes, Datei-LRU/dirty/writeback jeweils 0 in dieser Stichprobe. Das beweist weder dauerhafte Nullwerte noch die Gruppenzugehörigkeit des Kunden-Konfis. App-PID/-Startzeit und eigener App-RSS bleiben offen.

## Grenzen und nächster Schritt

Die Kopie enthält drei DBs, 81.750 Katalogdateien und drei kleine Einstieg-/Statusdateien. Shopify-Konfiguration nur als Hash, keine Zugangsdaten kopiert. Kunden-/Bestelldaten verbleiben ausschließlich im privaten Serverbereich. Snapshot ist eine Daten-/Ressourcenkopie, keine vollständige startfähige Appkopie.

Die Live-WAL-Metadaten blieben während des Laufs unverändert; tatsächliche gleichzeitige Kunden-Schreiblast ist damit nicht belegt. Synthetische Gleichzeitigkeitstests und echte Sperrwirkung am Server sind auseinanderzuhalten. Keine Aussage über neue P3-Kapazitäten, App-RSS-Verbesserung oder Geschwindigkeit des Kundenwegs.

Wiederherstellung erfolgreich; [Claude bestätigt die Abschlussbelege](https://github.com/Chris83638w/gravuru-2027/pull/261#issuecomment-6977231100). Nächster Schritt: gesonderte native Schriftgruppen-Generalprobe mit isoliertem Kandidatencode/Legacy-Daten. Unverändert kein Livewechsel ohne Chris.

## Belege

[Capture](../measurements/2026-11-18-font-online-capture-result.json), [Restore](../measurements/2026-11-18-font-online-restore-result.json), [belegte Schreibphase/Memory-cgroup](../measurements/2026-11-18-font-online-restore-during-write.json), [exakte Operatorquellen](2026-11-18-font-online-operator/README.md). Keine Datenbank und kein Kundeninhalt wurde aus dem privaten Serverbereich übertragen.

Abgrenzung: Die Differenz der freien Gesamtplatte (rund 20,97 GB) ist keine exklusiv gemessene Belegung unserer drei Verzeichnisse. Direkt erfasst sind je 9.732.780.913 Nutzbytes und der 17.313.390-Byte-Beleg; weitere Dateisystemkosten und andere Serveraktivität sind darin nicht getrennt. Die Memory-cgroup-Zuordnung gilt für die beobachtete Restore-Kette, nicht rückwirkend für Capture. Aus Nullwerten der Dateicache-Stichproben folgt keine allgemeine Nichtanrechnung von Dateicache.
