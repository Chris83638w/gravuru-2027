# OpenAI-Gestaltungshilfe

Die bestehende Werkstattlogik übernimmt weiterhin Geometrie, Schriften, Motive, Preise, Kundenrechte, Vorschau und Revisionen. Product Design ist ein Werkzeug für die Entwicklung in Codex; es wird nicht als fremdes Plugin in Shopify ausgeführt. Die Laufzeit spricht unmittelbar die OpenAI Responses API an.

## Bedienung und Umfang

Produkt öffnen → Designs & Elemente → beim ausgewählten Design **Mit KI gestalten**. Vorher Änderungen speichern. Auftrag eingeben; „Vorhandene Texte und Schriften erhalten“ und „Fotofelder unverändert lassen“ sind voreingestellt. Vorher/Nachher prüfen, dann ausdrücklich **Als neue Version übernehmen** oder verwerfen. Die Übernahme veröffentlicht kein Shopify-Produkt und schaltet keine neue Bestellrevision frei.

Diese erste Anbindung erstellt native, einzeln bearbeitbare Texte und Anordnungen, ändert Farben und verwendet vorhandene Bibliotheksmotive. Sie erzeugt keine neuen Bilder und bearbeitet keine Fotos. PDF-Schriftpfade sind zuerst mit der vorhandenen Aufbereitung und Textumwandlung bearbeitbar zu machen. Ein flaches Bild wird dadurch nicht automatisch zu einem semantisch bearbeitbaren Design. Technische Konturen bleiben geschützt.

An OpenAI gehen ausschließlich der Auftrag, ausgewählte Texte/Elementmaße, Geometrie und Bezeichnungen vorhandener Schriften/Motive. Keine Bildbytes, Schriftdateien, Bestellungen, Preise oder Zugangsdaten aus dem Produkt. Texte können persönliche Angaben enthalten; die Oberfläche informiert vor dem Absenden darüber. API-Schlüssel werden nur im serverseitigen Authorization-Header verwendet. `store:false`, keine Werkzeuge, keine Weiterleitungen, keine automatischen Wiederholungen.

## Kostenkontrolle

Voreingestellte Obergrenze: **100 EUR pro Kalendermonat, Europe/Berlin, für diese Werkstatt**. Ein kleineres Limit ist möglich; ein höheres wird abgewiesen. Ein eigener OpenAI-Projektschlüssel trennt andere API-Nutzung. ChatGPT-Abonnement und API-Abrechnung sind getrennt. OpenAI-Projektwarnungen allein sind keine garantierte Ausgabensperre.

Fixiertes Modell `gpt-4.1-2025-04-14`. Geprüfter Tarif am 11.10.2026: 2 USD/Million Eingabetokens, 8 USD/Million Ausgabetokens; maximal 4.096 Ausgabetokens pro Auftrag. Die Werkstatt bewertet jeden USD vorsichtig mit 200 EUR-Cent einschließlich Puffer. Das ist kein tatsächlicher Wechselkurs und keine Vorhersage der Rechnung. Caching-Rabatte werden nicht vorausgesetzt.

Vor einem Auftrag werden atomar **426 Cent** reserviert, berechnet sogar für das gesamte veröffentlichte Kontextfenster von 1.047.576 Eingabetokens. Bei bestätigter Antwort werden die tatsächlich gemeldeten Tokens mit dem Sicherheitsansatz verbucht und die übrige Reserve freigegeben. Auch ein fachlich ungültiger oder verworfener Vorschlag kostet Tokens. Offene Reserven zählen vollständig gegen das Limit. Die Grenze betrifft den Monat des Auftragsbeginns und die Anfragen dieser Installation, nicht das gesamte OpenAI-Konto oder dessen Rechnung.

Die Tarifprüfung gilt höchstens 31 Tage. Danach stoppt die Werkstatt neue Anfragen, bis der Betreiber Modelltarif und Sicherheitsansatz erneut geprüft und das Gültigkeitsdatum erneuert hat. Es gibt keine automatische Freigabe. Bei Modell-/Tarifänderung muss die feste Kostenberechnung im Code überprüft werden.

Bei Netzwerkabbruch, Benutzerabbruch oder Neustart bleibt die Reserve erhalten; kein automatischer zweiter kostenpflichtiger Aufruf. Eine bestätigte Antwort ohne auswertbare Tokenzahlen sperrt weitere Generierung als `cost_review`. Bestehende Produkte bleiben bearbeitbar. Solche Fälle erfordern Betreiberprüfung gegen OpenAI-Nachweise; keine pauschale Löschung oder Rücksetzung der Kostenzeilen. Eine automatische Kostenabstimmung oder Händler-Schaltfläche zum Freigeben unklarer Kosten gehört noch nicht zu diesem Paket. Ist keine Zuordnung möglich, bleibt die volle Reserve bestehen. Einen ungeklärten `cost_review` nicht durch Zurücksetzen der Datenbank umgehen.

## Geschützt einrichten

Die neue Version funktioniert ohne KI-Konfiguration; dann ist ausschließlich die Generierung deaktiviert. **Keinen Schlüssel im Chat, Repository, Browsercode oder öffentlichen Webverzeichnis ablegen.**

Auf dem Server im vorhandenen privaten Verzeichnis (Eigentümer wie Node-Laufzeit, Verzeichnis 0700) eine Datei `gravuru-openai-api-key.txt` mit dem eigenen OpenAI-Projektschlüssel anlegen, Modus 0600. Daneben `gravuru-openai-design.json`, ebenfalls 0600, mit folgendem Schema. Das Ablaufdatum nach tatsächlicher Tarifprüfung einsetzen, höchstens 31 Tage in der Zukunft:

```json
{
  "schema": 1,
  "purpose": "gravuru-openai-design",
  "enabled": true,
  "model": "gpt-4.1-2025-04-14",
  "monthlyLimitCents": 10000,
  "pricingValidUntil": "DATUM-DER-BEFRISTETEN-FREIGABE",
  "apiKeyFile": "/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-openai-api-key.txt"
}
```

In `values` der bestehenden privaten `gravuru-2027-merchant-shopify.json` zusätzlich `GRAVURU_AI_CONFIG_FILE` auf den absoluten Pfad dieser JSON-Datei setzen. Sonstige Werte vollständig erhalten; private Sicherung vorher. Nur Händler-Site 20 neu starten. Keine Änderung der Shopify-Zahlung, Kundenwerkstatt oder anderer Sites erforderlich. Fehlerhafte KI-Konfiguration deaktiviert die KI mit einer verständlichen Meldung; die Werkstatt läuft weiter.

Anschließend in der angemeldeten App den Verbindungsstatus prüfen, einen kleinen Auftrag senden, Kosten-/Vorher-Nachher-Anzeige und vollständige Bearbeitbarkeit prüfen. Erst dieser Schritt bestätigt die echte OpenAI-Verbindung und Antwortqualität. Synthetische Tests ersetzen ihn nicht.

## Speicherung, Sicherung und Wiederherstellung

Aufträge, Reserven, Kandidaten und Ergebnisse liegen in `ai_design_jobs` innerhalb der vorhandenen privaten `workshop.sqlite`. Die drei Datenbanken werden weiterhin zusammen gesichert; keine vierte Datenbank. Auftragskennungen verhindern doppelte Anfragen. Das atomare Übernahmejournal in `import_items` verhindert eine doppelte Revision auch bei Unterbrechung zwischen Produktspeicherung und Auftragsabschluss. Parallele Produktänderungen werden als Konflikt abgewiesen.

Keine Auftragsdaten in GitHub übernehmen. Datenbank-Rollbacks nach echten API-Aufrufen können die Kostenhistorie zurücksetzen; daher vor Rücksicherung Ausgaben und Reserven extern abgleichen und KI bis dahin deaktiviert lassen. Code-Rollback erhält die aktuelle private Datenbank einschließlich Budgethistorie.

## Vertrag und Preisquellen

- https://developers.openai.com/api/docs/models/gpt-4.1
- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/reference/resources/responses/methods/create
