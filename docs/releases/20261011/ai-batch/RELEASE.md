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

Die erste Browserprüfung fand eine fehlende statische Modulroute, die zweite eine nicht passende JSON-Struktur am tatsächlichen API-Eingang. Beide Ursachen wurden korrigiert, nicht durch Testausnahmen umgangen. 597 unterschiedliche Regressionstests bestanden, einschließlich neun neuer Warteschlangentests. Ein fehlerhafter Testaufruf in der erweiterten Zugriffskontrolle wurde korrigiert; die neun Händlerlaufzeittests danach gezielt bestanden. Browserabschluss: 68 API-Aufrufe, alle Layout-/Motiv-/Fotoabläufe, Desktop und Mobil, keine JavaScript-Fehler. Beim Browserabbau meldete Playwright zwei abgebrochene Thumbnail-Routen; alle Bedienassertionen bestanden. Siehe `tests.json`, `browser.json` und synthetische Screenshots. Paketinstallation und Live-Nachweise folgen vor Freigabe.

## Grenzen

Synthetische Shopify-Identität im automatisierten Browser ist kein Nachweis einer echten Händleranmeldung. Echte OpenAI-Layout-, Motiv- und Fotoantworten wurden im vorherigen Release geprüft; diese Warteschlangenerweiterung verwendet denselben Anbieterweg. Keine zusätzlichen bezahlten API-Anfragen nur für den Stapeltest vorgesehen. Bilder bleiben Rasterelemente; es wird keine Vektorisierung oder unveränderte Gesichtsidentität zugesichert.

Öffentliche neue Kunden-/Checkout-Strecke, eigene Drive-Anbindung, allgemeine Shopify-Produktübertragung und echte Maschinen-/RIP-Abnahme bleiben separate Arbeitspakete. Frühere nicht erreichbare Cloud-/Windows-Dateien und Commit c64c197 werden durch dieses Release nicht als wiederhergestellt bezeichnet.
