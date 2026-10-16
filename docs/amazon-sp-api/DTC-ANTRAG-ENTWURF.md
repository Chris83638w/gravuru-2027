# Antrag auf Direct-to-Consumer Shipping – Entwurf

**Nicht eingereicht. Noch nicht einreichungsreif.** Stand 16.10.2026. Die ausdrückliche Antragsautorisierung liegt vor; alle 19 Freitexte wurden im ungesendeten Portalentwurf ergänzt und exakt zurückgelesen. Der bestätigte Sicherheitskontakt ist eingetragen. Hauptzweck ist der Import von Custom-ZIPs mit Personalisierungen in die Designwerkstatt. Die tatsächlich eingetragenen [Portal-Freitexte](DTC-PORTAL-FREITEXTE.md) ersetzen die allgemeinen Textvorschläge unten. Es fehlen wahrheitsgemäße Sicherheits- und Betriebsnachweise, keine weitere pauschale Einreichungserlaubnis. [Aktueller Antragsstand](DTC-ANTRAGSSTAND.md).

## Ausgangslage

Fall 21853960501 ist im Portal beantwortet. Die Teilbewilligung vom 07.10.2026 umfasst die berücksichtigten Nonrestricted-Rollen; DTC wurde nicht in diese Prüfung einbezogen. Neun Rollen sind im Profil ausgewählt. AMZ_GRAVURU_01 existiert als Sandbox-App, deren LWA- und statischer Orders-Abruf erfolgreich getestet wurden. Das beweist keine produktive Custom-Berechtigung. Die ältere Supportnachricht vom 08.10.2026 beweist keine inzwischen laufende oder abgeschlossene neue DTC-Prüfung. Einzelheiten: [Berechtigungsbericht](BERECHTIGUNGEN.md).

Amazon ordnet `orderItems.product.customization.customizedUrl` der eingeschränkten Rolle DTC für händlererfüllte Bestellungen zu. Die neue Orders API benötigt hierfür kein RDT; die Rolle bleibt erforderlich. Steuerrollen sind kein Ersatz. [Amazon: Access Orders PII](https://developer-docs.amazon/sp-api/docs/access-orders-pii).

## Vor Einreichung zu belegen

- Aktiver Hostingdienst, Region, Betreiber, Datenbank-, Asset- und Backupspeicher mit tatsächlichem Datenfluss.
- Benutzer-/Rollenverwaltung, MFA, Rechteprüfung und Entzug; keine geteilten Administrationskonten als alleiniger Zugang.
- TLS, Verschlüsselung ruhender Daten und Secrets, Schlüsselverwaltung und Wiederherstellung.
- Tatsächlicher WAF-/Firewall-, Malware- und Überwachungsschutz sowie dokumentierte Sicherheitsprüfungen.
- Incident-Verantwortung und Verfahren, Aufbewahrungsmatrix, dokumentierte gesetzliche Ausnahmen und getestete Lösch-/Restorebehandlung.
- Tatsächliche externe Empfänger: Hosting, beauftragte Carrier, Backups und andere eingesetzte Dienste. Die frühere pauschale Aussage „keine externen Empfänger/Quellen“ ist daran zu prüfen.

In Sicherheitsfragen darf eine Kontrolle nur als umgesetzt bestätigt werden, wenn dafür konkrete Nachweise existieren. Der Nutzer bezeichnete die Maßnahmen als geplant bzw. unsicher. Die abschließende Livekontrolle zeigt 15 ausgewählte, nicht technisch bestätigte Ja-Angaben. Der folgende Text bestätigt keine ungeprüften Produktionsmaßnahmen. Tatsächliche Fragen und Zeichenlimits stehen in der [Antwort-/Nachweismatrix](DTC-SICHERHEITSFRAGEN.md).

## Textvorschlag: Zweck und benötigte Rolle

> gravuru GmbH entwickelt eine private interne Anwendung innerhalb der bestehenden Verwaltungssoftware gravuru 2027. Wir stellen unter den Marken CHRISCK design und gravuru personalisierte Gravur- und Druckprodukte her und erfüllen die betreffenden Amazon-Bestellungen selbst. Für die Herstellung müssen wir die vom Käufer für genau diese Bestellung übermittelten Texte, Bilder, Logos und ausgewählten Gestaltungsoptionen abrufen und eindeutig der jeweiligen Bestellposition zuordnen. Anschließend benötigt unser Versandprozess die erforderlichen Empfängerangaben zur Zustellung.
>
> Wir beantragen deshalb die Rolle Direct-to-Consumer Shipping (Restricted). Die aktuelle Amazon-Dokumentation ordnet `orderItems.product.customization.customizedUrl` in der Orders API v2026-01-01 dieser Rolle für händlererfüllte Bestellungen zu. Unsere vorhandenen Nonrestricted-Rollen decken diesen notwendigen Custom-Abruf nicht ab. Die Verarbeitung soll ausschließlich für die Herstellung und Erfüllung der jeweiligen Amazon-Bestellung sowie anwendbare gesetzliche Pflichten erfolgen. Eine Verwendung für Marketing oder den Verkauf von Kundendaten ist nicht vorgesehen.
>
> Der eingeschränkte produktive Zugriff ist noch nicht aktiviert. Vor seiner Aktivierung werden die tatsächliche Betriebsumgebung, Sicherheitsmaßnahmen, Datenempfänger und Aufbewahrungsregeln vollständig dokumentiert und technisch überprüft. Bis dahin verwenden wir für die Entwicklung synthetische Testdaten.

## Textvorschlag: Architektur und Datenfluss

> Die Integration erweitert das vorhandene Projekt gravuru 2027 mit Node.js 24, SQLite, Bestellverwaltung und Designwerkstatt. Ein getrennter lokaler Entwicklungsstand wurde mit der statischen Amazon-Sandbox verbunden. Die bestehende Werkstatt ist unter einer festen HTTPS-Adresse erreichbar. Die dahinterliegende Betriebsumgebung wurde noch nicht technisch verifiziert. Wir bestätigen deshalb derzeit weder einen bestimmten aktiven Hostinganbieter oder eine Speicherregion noch die vollständige Umsetzung der Produktionskontrollen.
>
> Der geplante Datenfluss ist Amazon Orders → interne Auftragszuordnung → geschützte Verarbeitung erforderlicher Custom-Dateien in der Designwerkstatt → Produktion → autorisierter Versanddienstleister. An DHL, DPD oder Deutsche Post sollen nur die für die jeweils beauftragte Sendung notwendigen Daten übermittelt werden. Vor produktivem Start werden die tatsächlich verwendeten Dienste, Empfänger, Zugriffsmöglichkeiten und vertraglichen Grundlagen dokumentiert. Externe KI-/Designdienste erhalten aus diesem Entwicklungsstand keine Amazon-Kundendaten.

## Textvorschlag: Aufbewahrung und Schutzmaßnahmen

> Unser Aufbewahrungskonzept wird nach Datenklassen und Zwecken ausgestaltet. Operative personenbezogene Daten und Custom-Produktionsdateien sollen nur solange erforderlich verarbeitet werden; die Amazon-Grenze von grundsätzlich höchstens 30 Tagen nach Zustellung wird berücksichtigt. Gesetzlich erforderliche Rechnungs-/Buchungsbelege werden getrennt nach dokumentierter Rechtsgrundlage aufbewahrt. Die zuvor erwogene pauschale Löschung ab Versand mit maximal sieben Tagen Verlängerung wird nicht ungeprüft auf alle Unterlagen angewendet.
>
> Die Entwicklung berechnet derzeit nur Fälligkeiten, ohne Daten zu löschen. Tatsächliche Löschung, Backupbehandlung und Wiederherstellung sind vor Freigabe zu prüfen. Das lokale Sandboxsecret ist unter Windows mit DPAPI geschützt. Daraus wird keine Bestätigung der Cloudverschlüsselung abgeleitet. Technische Nachweise für MFA, Zugriffsrechte, Verschlüsselung, WAF/Netzschutz, Protokollierung, Vorfallmanagement und Sicherheitsprüfungen werden für die reale Betriebsumgebung vervollständigt.

## Nach einer möglichen Genehmigung

Die bewilligte Rolle muss anschließend zur passenden Anwendung und Verkäuferautorisierung passen. Erst nach geprüfter Umgebung und ausdrücklicher Echtdatenfreigabe folgt ein begrenzter Custom-Abruf. URL, Archivdownload, Dateiprüfung, Artikelzuordnung und Übereinstimmung der Gestaltung werden getrennt getestet. Ein neues Portalhäkchen allein macht keine Produktionsdatei fertig.

Die [Sicherheits- und Aufbewahrungsdokumentation](SICHERHEIT-UND-AUFBEWAHRUNG.md) beschreibt die verbleibenden Nachweise. Der bereits autorisierte Antrag wird erst nach sachlich zutreffender Vervollständigung abgeschlossen; ungeprüfte Ja-Angaben werden nicht eingereicht.
