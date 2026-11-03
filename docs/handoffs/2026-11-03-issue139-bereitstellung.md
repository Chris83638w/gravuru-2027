# Issue 139 – PR 153 live und Schritt 1 gemessen

Auftrag: [Claude 6597574311](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6597574311), von Chris am 03.11. im Chat ausdrücklich zur Ausführung in dieser Reihenfolge übernommen. Claude prüfte den Head 3187c2a mit 246/246 Tests. Merge: **04d6f6bc0e1242f8b8b37f43fa2c050a3126bcfa**. Aktiv seit **03.11.2026, 07:25:41 UTC**.

1.330 Programmdateien geprüft; Runtime-Code bytegleich zum abgenommenen Head. Build, sechs private SQLite-Sicherungen mit Integrität/Prüfsummen und Laufzeit-Vorabprüfung bestanden. Öffentliche Editor-/Kern-/Gerätedateien: HTTP 200, genaue Hashes stimmen; Werkstatt 200; private Sitzung ohne Anmeldung 401. [Bereitstellung](2026-11-03-issue139-bereitstellung/release139-activate.json), [HTTP-Nachweis](2026-11-03-issue139-bereitstellung/release139-http.json).

## Vorgeschriebene Live-Messung

Unverändertes scripts/konfi-messen.cjs aus PR 153, nacheinander sechs frische Browserkontexte; Handy = CPU ×4. Keine parallelen Browserlasttests. [Rohprotokolle und Skript-Hash](2026-11-03-issue139-bereitstellung/messung/summary.json).

| Produkt | Desktop vorher → jetzt | Handy vorher → jetzt | Modell jetzt |
|---|---:|---:|---:|
| Edelstahl D8 12×8 | 14,1 → **22,9 s** | 44,0 → **11,9 s** | 150 KB |
| Acryl D8 12×8 | 14,4 → **12,8 s** | 46,8 → **9,5 s** | 24 KB |
| AOSU | 4,9 → **6,5 s** | 14,8 → **9,6 s** | 129 KB |

**Ziel ≤4 s Desktop / ≤6 s Handy nicht erreicht.** Das Modellbudget ≤600 KB wird in allen drei Fällen eingehalten, 0 eingebettete Schriften. Edelstahl Desktop war der erste Produktstart nach Bereitstellung; die Ursache der langsameren Messung ist damit noch nicht nachgewiesen. Keine Auswahl günstiger Wiederholungen als Abnahme. Im Stahllauf kamen die Produktdaten nach 12,9 s (Desktop) bzw. 7,1 s (Handy); bei Acryl Desktop nach 6,4 s. Diese Zeit liegt vor fertiger Bedienung und bleibt zu untersuchen. Die Modell-/Serverfreigaben wurden nicht umgangen.

[Bildfolge vom echten Klick bis bedienbar](2026-11-03-issue139-bereitstellung/START.html), [Edelstahl fertig](2026-11-03-issue139-bereitstellung/steel/bereit.png), [Acryl fertig](2026-11-03-issue139-bereitstellung/acryl/bereit.png), [AOSU fertig](2026-11-03-issue139-bereitstellung/doorbell/bereit.png). Filmaufzeichnung ist ein gesonderter Lauf; ihre Zeiten ersetzen nicht die Messreihe oben.

## Rückweg

Host-Verzeichnis: /var/www/vhosts/gravuru-designwerkstatt.de. Neue Laufzeit: private/issue139-release-20261103; vorherige Laufzeit: private/issue139-acryl-perf-20261102. Originaler Startweiterleiter und Sicherungen: private/issue139-release-20261103-nachweis. Rückwechsel:

    /opt/plesk/node/24/bin/node /var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-release-20261103-nachweis/release.mjs rollback

Der Rückweg prüft den aktuellen Startdatei-Hash und verweigert bei einer fremden zwischenzeitlichen Bereitstellung; er setzt ausschließlich den Weiterleiter zurück und fordert den üblichen Neustart an. Keine Datenbank wird dabei zurückgespielt. Der ursprüngliche Stand bleibt vollständig erhalten. Keine Plesk-Einstellung geändert.

Nächster Schritt nach Meldung dieser Ergebnisse in #139: **2. Gedenktafel und Grabstecker** als eigene Ausführung anbinden und je Screenshot; danach **3. bestehende Bulk-Pipeline** des Claude-Branches verwenden/erweitern. Keine neuen Produkte bei dieser Bereitstellung; bisherige Wellenzählung neu 2 / überarbeitet 8 / gesamt live 10 unverändert.
