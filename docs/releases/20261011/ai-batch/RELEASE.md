# KI-Stapelgestaltung · 11.10.2026

Mehrere passende Produkte in der Übersicht auswählen → **Auswahl mit KI gestalten**. Design je Produkt wählen, einen gemeinsamen Auftrag formulieren und Layout, neues Motiv oder Musterfotobearbeitung starten. Für Fotos das konkrete Musterfotofeld je Produkt ausdrücklich auswählen. **KI-Stapel** in der Produktübersicht öffnet gespeicherte Aufträge auch nach Neuladen.

Bis zu 100 Produkte mit übereinstimmendem Material einschließlich Stärke, vollständiger Designgeometrie und Fertigungsverfahren. Freie Formprodukte ohne native Designs werden vor dem Start verständlich abgewiesen. Keine stillschweigende Konvertierung flacher PDF-/Bildvorlagen. Die Einzel-KI bleibt im Produkteditor verfügbar.

## Verhalten und Sicherungen

- Der Server prüft alle Zuordnungen und Ausgangsrevisionen vor dem Start. Jeder Auftrag erhält eine dauerhafte Kennung; identische Wiederholung startet keine weiteren KI-Anfragen.
- Die Warteschlange erstellt je Produkt einen Vorschlag nacheinander. Vor jeder Anfrage gelten dieselbe OpenAI-Anbindung, befristete Preisfreigabe und gemeinsame 100-EUR-Monatsgrenze wie für Einzelaufträge. Bis zu 426 Cent werden jeweils reserviert; bestätigte Kosten ersetzen diese Reserve. Nicht gestartete Produkte kosten nichts. Ein weiterer Stapel wartet, bis der laufende beendet oder abgebrochen wurde.
- Zwischenzeitlich geänderte Produkte werden nicht überschrieben. Fehler bleiben je Produkt sichtbar, andere gültige Entwürfe bleiben erhalten. Eine unbestätigte Antwort oder Kostenabrechnung hält den Stapel an. Bei unbestätigter Kostenabrechnung sind weitere KI-Anfragen bis zur Klärung gesperrt.
- Nach Neustart bleibt der Stapel angehalten. **Verbleibende Produkte fortsetzen** sendet nur noch nicht gestartete Aufträge. Bereits gesendete Anfragen werden niemals automatisch wiederholt.
- Abbrechen verhindert ausstehende Anfragen, erhält fertige Vorschläge und behält die Reserve einer bereits gesendeten Anfrage. Vorher/Nachher und Übernahme sind je Produkt einzeln. Die bestehende idempotente Versionsspeicherung prüft nochmals den aktuellen Produktstand.
- Originale, Material, technische Konturen, Preise, Kundenrechte und alte Versionen bleiben erhalten. Keine automatische Shopify-Veröffentlichung, Bestellung oder Produktionsauslösung.
- Neue Tabellen `ai_design_batches` und `ai_design_batch_items` liegen ausschließlich in der privaten Werkstattdatenbank. Anbieter, Kostenjournal, Medienablage und Übernahmejournal werden wiederverwendet.

## Prüfung

Gezielte Warteschlangentests: drei Produkte mit einzeln prüfbaren Entwürfen; 100 Produkte mit drei parallelen manuellen Änderungen ergeben 97 Entwürfe und drei Fehler; Wiederholung ohne Duplikate; Budgetpause, Abbruch, Neustart, unbestätigte Kosten, getrennte Übernahme und Versionskonflikt.

Die erste Browserprüfung fand eine fehlende statische Modulroute, die zweite eine nicht passende JSON-Struktur am tatsächlichen API-Eingang. Beide Ursachen wurden korrigiert, nicht durch Testausnahmen umgangen. 597 unterschiedliche Regressionstests bestanden, einschließlich neun neuer Warteschlangentests. Ein fehlerhafter Testaufruf in der erweiterten Zugriffskontrolle wurde korrigiert; die neun Händlerlaufzeittests danach gezielt bestanden. Browserabschluss: 68 API-Aufrufe, alle Layout-/Motiv-/Fotoabläufe, Desktop und Mobil, keine JavaScript-Fehler. Beim Browserabbau meldete Playwright zwei abgebrochene Thumbnail-Routen; alle Bedienassertionen bestanden. Siehe `tests.json`, `browser.json` und synthetische Screenshots. Isolierte ZIP-Installation und Start bestanden: 411 Manifestdateien geprüft, Build/Konfiguration gültig, anonyme API abgewiesen. Derselbe unveränderte ZIP-Stand wurde auf dem Zielserver separat aufgebaut. Installationsquellstand `0b64e8751d51e04560490825a610df9674de79d3`, Version `0.1.0-recovery.20261010+0b64e8751d51`. [Paket und Prüfsumme](../../../../deliverables/merchant-ai-batch-20261011/README.md).

## Grenzen

Synthetische Shopify-Identität im automatisierten Browser ist kein Nachweis einer echten Händleranmeldung. Echte OpenAI-Layout-, Motiv- und Fotoantworten wurden im vorherigen Release geprüft; diese Warteschlangenerweiterung verwendet denselben Anbieterweg. Keine zusätzlichen bezahlten API-Anfragen nur für den Stapeltest vorgesehen. Bilder bleiben Rasterelemente; es wird keine Vektorisierung oder unveränderte Gesichtsidentität zugesichert.

Öffentliche neue Kunden-/Checkout-Strecke, eigene Drive-Anbindung, allgemeine Shopify-Produktübertragung und echte Maschinen-/RIP-Abnahme bleiben separate Arbeitspakete. Frühere nicht erreichbare Cloud-/Windows-Dateien und Commit c64c197 werden durch dieses Release nicht als wiederhergestellt bezeichnet.

## Laufzeit und Bestand

Erreichbare Arbeitsumgebung: verwaltete Cloud (`provider: cloud`, Konfigurationsrevision 58), Arbeitsverzeichnis `/workspace/gravuru-restored`, Repository `Chris83638w/gravuru-2027`, Aufgabenbranch `task/ai-batch-20261011`. Zu Beginn sauberer Stand `5616e91`; Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` weiterhin Vorfahr. Quellcode, Ressourcen, vorhandene Berichte und historische Pakete sind erreichbar; private Sicherungen liegen getrennt unter `/workspace/recovery-private`. Keine erneute Behauptung, alte nicht erreichbare Aufgaben-Dateien seien vorhanden.

Live-Vorprüfung fand vier bisherige KI-Aufträge: zwei verworfene Bildtests, einen gültigen Layoutvorschlag und einen weiteren nicht übernehmbaren Vorschlag. Zusammen 34 Cent verbucht; keine laufende Anfrage. Der zusätzliche 1-Cent-Auftrag war bereits vor dieser Aktivierung vorhanden. Anbieterzugang, Preisfrist und übrige Händlerkonfiguration blieben unverändert.

## Live-Aktivierung

Quellstand **0b64e87** ist seit **11.10.2026, 17:47 Uhr (Europe/Berlin)** auf `https://app-2027.gravuru-designwerkstatt.de` aktiv. Der bestehende `start-r5.cjs`-Weiterleiter bleibt erhalten. Genau ein Händlerprozess nach der Aktivierung bestätigt; neue Warteschlangentabellen vorhanden, ohne künstliche Live-Stapel. Die ausgelieferte `ai-batch-ui.mjs` stimmt bytegenau mit dem Paket überein. HTTPS und Shopify-Seitenkontext geprüft; anonyme Produkt-/KI-/Stapel-APIs liefern 401. `activation.json`, `https.json` und `live-runtime.json` dokumentieren die Befunde. Dies ersetzt keine authentifizierte Browserabnahme mit einem echten Shopify-Händlerkonto.

Vor Aktivierung wurden drei Datenbanken mit SQLite-Prüfung, bisheriger Einstieg, private Händlerkonfiguration und bisherige Laufzeit privat unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-merchant-backup-20261011-0b64e87` gesichert. Die bisherige Kundenwerkstatt, Shopify-Daten, Zahlungen und Produktionsaufträge wurden durch dieses Release nicht geändert. Der OpenAI-Schlüssel wurde nicht aus dem Server kopiert.

Der Nachher-Abgleich gegen die letzte Bild-KI-Sicherung bestätigt alle historischen Zeilen in **47 Tabellen**. Ein zusätzlicher, bereits vor Aktivierung vorhandener 1-Cent-KI-Auftrag bleibt erhalten; Produkte, Revisionen, Bestellungen, Profile und Ressourcen stimmen überein. Neue Stapeltabellen sind leer. Drei konsistente Datenbanken, zusammen **42.934.272 Byte**, unter `/private/gravuru-merchant-after-ai-batch-20261011` auf dem Server und `/workspace/recovery-private/merchant-after-ai-batch-20261011` in dieser Cloud gesichert. SHA-256, Dateigrößen und SQLite-Integrität beider Kopien geprüft. Keine Datenbank oder privaten Medien in Git.

Code, Ressourcen, vorhandene Dokumentation, neue Prüfberichte und Installationspaket auf `task/ai-batch-20261011`, `backup/account-recovery-20261010` und `task/full-backup-install-20261010` gesichert. Genau nächster Schritt: allgemeine Shopify-Übertragung weiterer Werkstattprodukte als überprüfbare Entwürfe; kein automatisches Veröffentlichen.
