# OpenAI in der Werkstatt aktiviert · 11.10.2026

Die direkte OpenAI-Anbindung ist auf dem Händlerhost **https://app-2027.gravuru-designwerkstatt.de** aktiviert. Installierter Quellstand bleibt `060a10b9d9238574d05feb4e28e7f72077199fa1`; keine Änderung des geprüften Codes oder ZIPs nötig. Aufgabenbranch `task/openai-designer-20261011`, verwaltete Cloud unter `/workspace/gravuru-restored`, Repository `Chris83638w/gravuru-2027`. Vorheriger Dokumentationsstand `4fae1bb`; Arbeitsbaum zu Beginn sauber.

Der Nutzer hat seinen Schlüssel selbst in der vorbereiteten privaten Datei gespeichert. Format, Eigentümerrechte und tatsächlicher Modellzugriff geprüft. Schlüssel bleibt ausschließlich in der geschützten Serverdatei und wird zur Authentifizierung an OpenAI verwendet; weder Chat-/Werkzeugausgabe noch GitHub oder Cloud-Kopie enthalten ihn.

## Tatsächliche Prüfung

- Authentifizierter, kostenfreier Modellabruf mit HTTP 200 bestätigt `gpt-4.1-2025-04-14`.
- **Genau ein echter Gestaltungsauftrag** über die installierte Responses-Anbindung. Rückgabe hat die vorhandene Produktprüfung bestanden: ausschließlich die angeforderte Textposition der Lebensdaten um 1 mm nach unten verschoben; Text, vollständige Schrift, Original-Fotomaske, Musterfoto, Kontur, Material, Preise und Kundenrechte erhalten.
- Verbrauch **1.194 Eingabetokens und 102 Ausgabetokens**. Nach konservativer EUR-Bewertung **1 Cent** im Werkstattbudget verbucht; zuvor reservierte 426 Cent entsprechend verrechnet. Verfügbar danach **99,99 EUR**. Das ist die Werkstattbewertung mit Puffer, keine Rechnungssumme von OpenAI.
- Vorschlag und Verbrauch dauerhaft in der echten privaten Werkstattdatenbank gespeichert. **Keine Produktübernahme live:** Gedenktafel bleibt unverändert Revision 5. Der Vorschlag steht im KI-Verlauf zur Prüfung bereit.
- Tatsächlichen Vorschlag in einer getrennten privaten Datenkopie übernommen: neue Revision 6 korrekt, Originalrevision 5 erhalten, wiederholte Übernahme ohne doppelte Revision. Wiederholte identische Anfrage liefert denselben Auftrag und löst keinen zweiten Provideraufruf aus.
- Originale Vorher-/Nachher-SVGs über die bestehende Vorschau erzeugt und im isolierten Chromium sichtbar geprüft. Foto, Maske und übriges Design erhalten; keine externen Bildabrufe oder JavaScript-Fehler. Die Darstellung per allgemeinem SVG-Konverter ignorierte eingebettete SVG-Bilder und wurde deshalb nicht als visuelle Abnahme gezählt. Tatsächliche Bilder/Designinhalte bleiben außerhalb GitHub.
- Vier HTTPS-Prüfungen nach Einrichtung: Werkstatt mit Shopify-Kontext, unverändertes KI-Modul, 401 für anonyme KI-/Produkt-API. Bestehende JWT-/CSRF-Grenzen bleiben unverändert.
- Aktiver Händlerprozess nach Seitenaufruf nachgewiesen: Start **12:46:35 UTC**, also nach Konfigurationsänderung. Geschützte Konfiguration ist aktiv; genau eine Händler-Datensperre. Keine andere Shopify-Einstellung geändert. Eine frühere Prozessprüfung fand keinen passenden laufenden Prozess und wurde nicht als erfolgreicher Neustart gewertet; nach erneutem Seitenaufruf wurde der neue Prozess konkret bestätigt.

Ein zusätzlicher Prüfhelfer installierte seinen Netzwerkzähler erst nach Erzeugung des Providers. Die echte Antwort wurde gespeichert und korrekt mit 1 Cent verbucht, der nachträgliche Zähler zeigte jedoch null. Der Helfer hielt deshalb vor der Konfigurationsübernahme an. Die Folgeprüfung verwendete ausschließlich den gespeicherten Vorschlag, sperrte neue Provideraufrufe ausdrücklich und bestand. Es wurde keine fehlgeschlagene KI-Anfrage unverändert wiederholt.

Die Prüfung der echten API ist serverseitig. Eine erneute echte Shopify-Nutzeranmeldung und ein Klickablauf mit realer API durch die angemeldete Benutzeroberfläche werden nicht behauptet. Der identische UI-Ablauf wurde im vorausgegangenen Release synthetisch geprüft. Keine erneute Zahlung oder Bestellung ausgelöst.

## Konfiguration und Kosten

Die private Händlerkonfiguration wurde vor Änderung gesichert und ausschließlich um `GRAVURU_AI_CONFIG_FILE` ergänzt. Eigenständige private KI-Konfiguration und Schlüsseldatei mit Modus 0600 im Verzeichnis 0700. App neu laden → Produkt → Designs & Elemente → **Mit KI gestalten**. Änderungen vorher speichern, Auftrag formulieren, Vorschlag prüfen und bewusst als neue Version übernehmen.

Monatslimit **100 EUR**, Europe/Berlin, ausschließlich für Anfragen dieser Werkstatt. Fester Modelltarif und Sicherheitspuffer aus dem geprüften Code. Aktuelle Tarif-/Kostenfreigabe endet am **10.11.2026 um 12:38:17 UTC**. Danach werden neue KI-Aufträge bis zur erneuten Prüfung der Tarife/Freigabe gesperrt. [Kostenverfahren und Einrichtung](../../../../ops/plesk/AI-DESIGN.md). Keine automatische Verlängerung oder Zusage über Ausgaben anderer Anwendungen im OpenAI-Konto.

## Sicherung

Alle historischen Zeilen in **47 Tabellen** nach Aktivierung erhalten. Hinzugefügt wurde genau der geprüfte KI-Auftrag; bestehende Produktrevisionen, Bestellungen, Profile und Ressourcen bleiben unverändert. Alle drei Datenbanken nach dem Test konsistent auf dem Server gesichert; Integrität und Prüfsummen dokumentiert in `server-backup.json`. Alle drei Dateien zusätzlich privat in dieser Cloud gesichert: **42.905.600 Byte**. Größe, SHA-256 und SQLite-Integrität jeder Datei bestätigt (`private-backup-verified.json`). API-Schlüssel und tatsächliche Vorschaubilder bleiben privat, keine Schlüsselkopie im Repository oder in der Cloud-Datensicherung.

Code-/Paketbasis bleibt [das geprüfte Installationspaket](../../../../deliverables/merchant-ai-design-20261011/README.md). Geschützte Konfiguration und aktuelles Budgetjournal müssen bei Wiederherstellung erhalten bleiben; Datenbank-Rollback darf bereits angefallene API-Kosten nicht vergessen.

## Offen

Neue KI-Bilder/Motive erzeugen, Fotos bearbeiten und Stapel-KI sind weiterhin offen. Die aktive Funktion bearbeitet native Texte, Layout, Farben und vorhandene Motive. Öffentliche neue Kunden-/Checkout-Strecke, allgemeine Shopify-Produktübertragung, eigene Drive-Autorisierung und Material-/Maschinen-/ICC-Abnahme bleiben separate Arbeitspakete. Nicht erreichbare historische Cloud-/Windows-Dateien und Commit `c64c197` bleiben gemäß Herkunftsbericht ungesichert.
