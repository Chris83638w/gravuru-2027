# DTC: Antwort- und Nachweismatrix der Sicherheitsfragen

Stand: 16.10.2026. Grundlage ist der bereinigte Mitschrieb der tatsächlichen Sicherheitsfelder im Amazon Solution Provider Portal nach Auswahl der DTC-Rolle. Die nachfolgenden Fragen sind wortgetreu wiedergegeben; doppelte Darstellungstexte des Portals wurden entfernt. Kontaktblöcke und Zugangsdaten sind nicht übernommen.

**Aktualisierung nach vollständiger Freitextbearbeitung:** Alle 19 Freitexte wurden ausgefüllt und exakt zurückgelesen, einschließlich des vom Nutzer bestätigten Sicherheitskontakts. Die [aktuellen Portaltexte](DTC-PORTAL-FREITEXTE.md) sind maßgeblich; die früheren Statusantworten unten bleiben als Verlauf gekennzeichnet. Die abschließende Livekontrolle zeigt 15 ausgewählte Ja-Antworten und „weniger als 31 Tage nach Versand“. In diesem Schritt wurden nur Freitexte geändert; die Auswahlfelder wurden nicht gesetzt. Ihre betriebliche Richtigkeit ist weiter ungeprüft. Vertragszustimmung ist unmarkiert, Antrag ungesendet.

**Der Nutzer hat die Antragstellung ausdrücklich autorisiert. Es fehlt keine weitere pauschale Einreichungszustimmung. Der Antrag ist dennoch noch nicht wahrheitsgemäß abschließbar:** Die Maßnahmen wurden vom Nutzer als bisher geplant bzw. unsicher eingeordnet. Vorhandene Ja-Häkchen sind kein Umsetzungsnachweis. Geplante Maßnahmen werden nicht als bereits bestehend bestätigt.

Die aktuelle Webanwendung ist unter [app-2027.gravuru-designwerkstatt.de/werkstatt/](https://app-2027.gravuru-designwerkstatt.de/werkstatt/) erreichbar: HTTP 200, Seitentitel „Gravuru 2027 · Werkstatt“, 16.336 Byte bei der Prüfung. Eine zuvor an der Rootadresse beobachtete Plesk-Standardseite widerlegt diese laufende Anwendung nicht. Betreiber, Hostingregion, interne Datenflüsse, Authentisierung, Schlüsselverwaltung und wirksame Produktionskontrollen sind weiterhin nicht technisch verifiziert.

## Entscheidungsregel

„Nicht belegt“ bedeutet weder sicher vorhanden noch sicher nicht vorhanden. Wo das Portal nur Ja/Nein erlaubt, wird kein unbelegtes Ja versendet. Bei bestätigtem Fehlen ist Nein die sachliche Antwort; bei Ungewissheit muss die tatsächliche Konfiguration geprüft werden. Ein erklärender Freitext ersetzt keine verpflichtende Kontrolle. Die Entwurfsantworten unten beschreiben den heutigen Wissensstand; sie behaupten nicht, damit sei eine DTC-Genehmigung erreichbar.

Die vorliegenden lokalen Nachweise umfassen eine getrennte Sandbox-/Testdatenbank, getesteten LWA-/Orders-Sandboxzugang, serverseitige Tokenverwaltung, verschlüsseltes Windows-Sandboxsecret, Datenprojektion und automatisierte Modultests. Sie bestätigen keine unternehmensweite oder produktive Umsetzung.

## Sieben bereits mit Ja markierte Ausgangsfragen

| ID | Tatsächliche Portalfrage | Heutige Einordnung | Für eine belastbare Ja-Antwort nötig |
|---|---|---|---|
| G01 | Implementiert deine Organisation die folgenden Netzwerksicherheitskontrollen: Firewalls, IDS/IPS, Antiviren-/Antimalware-Software und Netzwerksegmentierung? | Ja vorgefunden; Umsetzung nicht belegt | Tatsächlicher Netzplan, Firewallregeln, IDS/IPS-Konfiguration und Alarmnachweis, Geräteschutz, getrennte Netze/Zugriffswege; alle genannten Kontrollen abdecken |
| G02 | Beschränkt deine Organisation den Zugriff auf Amazon-Informationen basierend auf den Aufgaben oder geschäftlichen Funktionen der Nutzer? | Ja vorgefunden; produktive Rechte nicht geprüft | Konten-/Rollenmatrix, produktive Rollenprüfung, Rechtevergabe und Entzug mit Nachweis; Auftrags-, Design-, Versand- und Adminrechte abgrenzen |
| G03 | Verschlüsselt deine Organisation Amazon-Informationen während der Übertragung? | HTTPS der Webadresse und des APIclients beobachtet; übrige Datenwege offen | TLS für App, Backend, Datenbank, Assets, Backup und interne Übertragungen prüfen; Zertifikatsprüfung und unsichere Alternativwege berücksichtigen |
| G04 | Verfügt deine Organisation über einen Vorfallsreaktionsplan mit definierten Rollen, halbjährlichen Überprüfungen und Verfahren zur Vorfallsmeldung innerhalb von 24 Stunden? | Ja vorgefunden; Plan und Überprüfungen nicht belegt | Freigegebener Plan, Rollen/Vertretung, Eskalation, Datum halbjährlicher Überprüfung, Übungs-/Reaktionsnachweis und Meldeweg |
| G05 | Beinhaltet der Vorfallsreaktionsplan deiner Organisation die Verpflichtung, Sicherheitsvorfälle, die Amazon-Informationen betreffen, innerhalb von 24 Stunden nach ihrer Entdeckung an security@amazon.com zu melden? | Ja vorgefunden; verbindliche Regel nicht belegt | Explizite Frist und Adresse im tatsächlichen Plan, zuständige Person/Vertretung und Erreichbarkeit; kein Versand einer Meldung durch diesen Auftrag |
| G06 | Erzwingt deine Organisation Passwortanforderungen einschließlich einer Mindestlänge von 12 Zeichen mit Sonderzeichen, Multi-Faktor-Authentifizierung (MFA), 365-tägigem Ablauf und jährlicher Rotation? | Ja vorgefunden; systemweite Durchsetzung nicht belegt | Wirksame Einstellungen aller betroffenen Systeme; Länge, Komplexität, MFA, Ablauf/Rotation und Ausnahmen getrennt nachweisen |
| G07 | Werden Anmeldedaten (Passwörter, Verschlüsselungsschlüssel, geheime Zugriffsschlüssel) sicher gespeichert? Mit anderen Worten: Vermeidet deine Organisation es, Anmeldedaten in öffentlichen Repositories zu speichern, Anmeldedaten weiterzugeben oder Anmeldedaten fest in Anwendungen zu codieren? | Lokaler Sandboxspeicher nachgewiesen; umfassende Aussage nicht belegt | Inventar produktiver Secrets, privater Speicher, Rechte, Rotation, Repository-/Logprüfung und Umgang mit Schlüsselmaterial |

Keines dieser sieben bisherigen Häkchen wird allein aus dem Altprofil als technisch bestätigt übernommen. Der belegte lokale Schutz ist bei G03/G07 ein begrenzter Teilnachweis.

## Zusätzliche DTC-Fragen

### Aufbewahrungsauswahl

Portalfrage: **„Wie lange speichern Sie personenbezogene Daten?“** Die angebotenen Antworten lauten:

- „Weniger als 31 Tage nach Versand der Bestellung“
- „31 bis 90 Tage nach Versand der Bestellung“
- „91 bis 180 Tage nach Versand der Bestellung“
- „Mehr als 180 Tage nach Versand der Bestellung“

**Noch keine sachlich belastbare Auswahl:** Der tatsächliche Datenbestand und Löschbetrieb sind ungeprüft. Das Formular bezieht sich ausdrücklich auf **Versand**. Der aktuelle Amazon-Leitfaden zur PII-Aufbewahrung bezieht seine Obergrenze auf **Zustellung**. Diese Bezugszeitpunkte werden nicht still gleichgesetzt. Die Auswahl muss den wirklichen Betrieb nach Datenklassen abbilden; gesetzlich notwendige Rechnungsbelege und operative Custom-Dateien dürfen nicht pauschal vermischt werden. Unklare Zuordnung der gesetzlichen Ausnahme zur Portaloption ist vor Abschluss mit der aktuellen Amazon-Erläuterung abzugleichen. [Amazon-Aufbewahrungsleitfaden](https://developer-docs.amazon/sp-api/lang-en_en/docs/protecting-amazon-api-applications-data-encryption-and-recovery), [DPP](https://sellercentral.amazon.com/solution-provider/policy?policyType=DPP&locale=en_GB).

Erforderlich sind tatsächliche Datentypen/Speicherorte, Fristbeginn, operative Löschfrist, gesetzliche Ausnahme, Löschlauf und Backupbehandlung. Die vorhandene Vorschaufunktion löscht nichts und beweist keinen etablierten Löschbetrieb. „Versand plus maximal sieben Tage“ ist bisher kein überprüfter unternehmensweiter Prozess.

### Acht Ja/Nein-Fragen

| ID | Tatsächliche Portalfrage | Heutige Einordnung | Nötiger Nachweis |
|---|---|---|---|
| D01 | Verfügt deine Organisation über dokumentierte Richtlinien zur Datenverarbeitung, Klassifizierung und zum Datenschutz mit Verarbeitungsnachweisen? | Dokumentationsentwürfe vorhanden; verbindlicher betrieblicher Stand nicht belegt | Freigegebene Richtlinien mit Version/Verantwortung, Datenklassen, Verarbeitungstätigkeiten, Empfängern und Umsetzungsnachweisen |
| D02 | Verschlüsselt deine Organisation personenbezogene Daten (PII) im RUHEZUSTAND mit AES-128/RSA-2048 (oder besser) und betreibt ein Schlüsselverwaltungssystem? | DPAPI-Sandboxsecret ist kein Nachweis für alle PII | Tatsächliche Datenbank-/Datei-/Backupverschlüsselung und Schlüsselverwaltung, getrennte Rechte, Rotation und Recovery prüfen |
| D03 | Verwendet deine Organisation fein abgestufte Zugriffskontrollen, um den Zugriff auf personenbezogene Daten einzuschränken? | Produktives PII-RBAC ungeprüft | Rechte bis zu erforderlichen Daten/Funktionen; negative Zugriffsprüfungen, Kontenbindung und Rollenentzug |
| D04 | Verwendet deine Organisation Prüfprotokolle, um Sicherheitsvorfälle zu erkennen, mit mindestens zweiwöchentlichen Überprüfungen und einer Aufbewahrungsdauer von mindestens 12 Monaten? | Reduzierte Clientlogs vorhanden; Betrieb/Frist nicht belegt | Geschützter Logsammelpunkt, relevante Ereignisse, mindestens zweiwöchentliche dokumentierte Prüfung, Alarmierung und zwölfmonatige Aufbewahrung ohne unnötige PII |
| D05 | Werden Anwendungsänderungen in einer dedizierten Testumgebung untersucht, bevor sie in die Produktion gehen? | Separate lokale Amazon-Tests belegt; allgemeiner Releaseprozess offen | Trennung sämtlicher betroffener Test-/Produktionssysteme und verpflichtender Test-/Freigabeprozess für jede produktive Änderung |
| D06 | Führt deine Organisation alle 30 Tage Schwachstellenscans sowie jährliche Penetrationstests durch und behebt kritische Ergebnisse innerhalb der geforderten Fristen (7 Tage bei kritisch, 30 Tage bei hoch) in allen Systemen, die Amazon-Informationen verarbeiten? | Kein Scan-/Pentest-/Fristbetrieb nachgewiesen | Vollständiger Systemumfang, Scanberichte im 30-Tage-Takt, jährlicher Pentest, Zuständigkeit, Befundtracking sowie Nachtest kritischer/hoher Befunde innerhalb 7/30 Tagen |
| D07 | Überprüft deine Organisation den Anwendungscode vor jeder Veröffentlichung auf Schwachstellen? | Aktuelle Entwicklungstests vorhanden; verbindliche Prüfung jeder Veröffentlichung nicht belegt | Sicherheitsreview-/Scanregeln, Zuständige, Artefakte und technische Releasesperre bzw. dokumentierter Gateprozess |
| D08 | Hat deine Organisation einen formalen Change-Management-Prozess, der die Verantwortlichkeiten für das Testen, Überprüfen und Genehmigen von Änderungen definiert und den Zugriff darauf beschränkt, wer diese Aktionen durchführen darf? | Arbeitsregeln und Branch vorhanden; formaler organisationsweiter Prozess nicht belegt | Freigegebener Prozess, getrennte Verantwortungen/Rechte, Freigabe- und Rollbacknachweise sowie Zugriffskontrollen |

Diese Werte sind der aktuelle **Portalwortlaut**. Sie dürfen nicht zu einer allgemeinen Behauptung vereinfacht werden, jede Amazon-Richtlinie habe überall exakt dieselben Formulierungen. Vor Abschluss gilt die aktuelle verlinkte Richtlinie zusammen mit den tatsächlichen Formularanforderungen.

## Zwei bereits vorhandene Freitexte außerhalb der DTC-Zusatzfragen

| ID | Tatsächliche Portalfrage | Vorhandene Aussage | Erforderliche Klärung |
|---|---|---|---|
| E01 | Führe alle externen Parteien auf, mit denen deine Organisation Amazon-Informationen teilt. Beschreibe, wie deine Organisation diese Informationen weitergibt. | Keine externen Parteien; nur autorisierte Mitarbeiter | Hostingbetreiber, Backupdienste, Carrier und weitere Dienste mit tatsächlichem Zugriff erfassen. Eine laufende Webapp beweist nicht, dass nur interne Mitarbeiter technisch Zugriff haben. Keine pauschale „Keine“-Antwort ohne Datenflussprüfung |
| E02 | Liste alle externen (nicht von Amazon stammenden) Quellen auf, aus denen deine Organisation Amazon-Informationen bezieht. | Ausschließlich Seller Central bzw. SP-API | Tatsächliche Fremdquellen prüfen. Helium 10/Ads nicht automatisch als bereits angebunden darstellen; manuelle Seller-Central-Dateien bleiben ein direkter Amazon-Ursprung. Quellen und Empfänger nicht verwechseln |

Beide Felder haben **500 Zeichen**. Ein genehmigter Dienstleister und eine tatsächlich eingesetzte Datenquelle sind zu benennen, sobald verifiziert; keine erfundenen Anbieter ergänzen.

## Vierzehn DTC-Freitextfragen mit Nachweisbedarf

| ID | Tatsächliche Portalfrage | Zeichenlimit | Tatsachen, die für die endgültige Antwort fehlen |
|---|---|---|---|
| F01 | Beschreiben Sie die Netzwerkschutzkontrollen, die von Ihrem Unternehmen verwendet werden, um den öffentlichen Zugriff auf Datenbanken, Dateiserver und Desktop-/Entwicklerendpunkte einzuschränken. | 500 | Betreiber/Netzplan; öffentliche und private Endpunkte; tatsächliche Firewall-/WAF-/IDS-Regeln; Geräteschutz und verantwortliche Administration |
| F02 | Beschreibe, wie deine Organisation Mitarbeiter mit Zugriff auf Amazon-Informationen individuell identifiziert. Erläutere, wie es den Zugriff der Mitarbeiter auf Amazon-Informationen einschränkt, je nachdem, was sie wissen müssen. | 500 | Identitätsanbieter oder tatsächliche Benutzerverwaltung; individuelle Konten; Rollen; Genehmigung/Entzug; aktuelle Rechteprüfung |
| F03 | Beschreibe den Überwachungsmechanismus, den deine Organisation einsetzt, um zu verhindern, dass Mitarbeiter von privaten Geräten (USB-Sticks, Mobiltelefonen) auf Amazon-Informationen zugreifen. Gib an, wie deine Organisation bei solchen Vorfällen gewarnt wird. | 500 | BYOD-/USB-Regel, technische Sperre bzw. Geräteverwaltung, Alarmziel, Verantwortliche und erprobte Erkennung; bloßes Verbot reicht als technischer Nachweis nicht |
| F04 | Geben Sie die Datenschutz- und Datenverarbeitungsrichtlinien Ihres Unternehmens an, um zu beschreiben, wie Amazon-Daten erhoben, verarbeitet, gespeichert, verwendet, weitergegeben und vernichtet werden. Sie können hierzu die URL einer öffentlichen Website angeben. | 1000 | Freigegebene aktuelle Richtlinie, Datenflüsse, Zwecke, Empfänger, Speicher-/Löschfristen; tatsächlich passende öffentliche Richtlinien-URL falls vorhanden |
| F05 | Beschreibe, wie deine Organisation Amazon-Informationen im Ruhezustand speichert, einschließlich: (a) Verschlüsselungsmethoden (AES-128, RSA-2048 usw.) und (b) Schlüsselverwaltungssysteme. | 500 | Technischer Speicher-/Verschlüsselungsnachweis für Produktion, Schlüsselbesitzer/-rechte, Rotation, Trennung von Schlüsseln und Daten |
| F06 | Beschreibe, wie dein Unternehmen verschlüsselte Backups/Archive von Amazon-Informationen speichert, einschließlich: (a) geografisch getrennter Sicherungsspeicherort und (b) Wiederherstellungsverfahren (RTO/RPO). | 500 | Tatsächlicher Backupstandort/-betreiber, Verschlüsselung, Fristen, gemessener Restore, zulässige Ausfallzeit RTO und Datenverlustspanne RPO; keine Zielwerte erfinden |
| F07 | Beschreibe deine Sicherheitsprotokollierungs- und Überwachungssystem, einschließlich der Überwachungsmechanismen für verdächtige Aktivitäten und der Verfahren zur Untersuchung von Vorfällen. | 500 | Logquellen/-schutz, Aufbewahrung, Alarmregeln, Prüfturnus, Verantwortliche, Untersuchungsprozess und Nachweise |
| F08 | Fassen Sie die Schritte zusammen, die im Vorfallreaktionsplan Ihres Unternehmens enthalten sind, um mit Datenbankhacks, unbefugtem Zugriff und Datenlecks umzugehen. | 500 | Freigegebener echter Plan, Eindämmung, Beweissicherung, Bewertung/Meldung, Behebung, Wiederherstellung, Nachbereitung und geübte Zuständigkeit |
| F09 | Wie setzt du die Passwortverwaltungspraktiken für alle Systeme durch, die Amazon-Informationen in deinem Unternehmen verarbeiten, hinsichtlich der erforderlichen Länge, Komplexität und Ablaufdauer? | 500 | Tatsächliche Systemrichtlinien und Durchsetzung, MFA, Rotation/Ablauf, Ausnahmen, Servicekonten und überprüfte Reichweite |
| F10 | Wie werden personenbezogene Daten (PII) während Tests geschützt? | 500 | Lokaler Stand belegt; zusätzlich Schutz aller übrigen Testsysteme, sichere Anonymisierung und verbindlicher Übernahmeprozess vor organisationsweiter Aussage |
| F11 | Welche Maßnahmen werden ergriffen, um die Offenlegung von Anmeldeinformationen zu verhindern? | 500 | Lokaler Stand belegt; produktiver Secretspeicher, Rechte, Rotation, Pipeline-/Log-/Repositoryschutz und Schlüsselverwaltung offen |
| F12 | Wie verfolgt dein Unternehmen den Fortschritt der Behebung von Mängeln, die bei Schwachstellenscans und Penetrationstests festgestellt wurden? | 500 | Tatsächliches Befundregister/Ticketsystem, Besitzer, Schweregrad, Frist, Eskalation und dokumentierter Nachtest; kein bestimmtes Tool belegt |
| F13 | Wie gehen Sie mit Code-Schwachstellen um, die im Entwicklungszyklus und während der Laufzeit identifiziert wurden? | 500 | Durchgängiger Prozess für Meldung, Bewertung, gesicherte Korrektur, Review/Test, Freigabe, Deployment und Nachprüfung einschließlich laufender Produktion |
| F14 | Gib den Namen und die E-Mail-Adresse des Incident Management Point of Contact (IMPOC) an, an den du dich im Falle eines Vorfalls, z. B. eines Datenlecks oder einer Sicherheitsverletzung, wenden kannst. | 500 | Verbindlich benannte erreichbare Person, dienstliche Adresse und Vertretung; keine Person oder Adresse ohne Bestätigung einsetzen |

## Frühere Statusantworten vor der vollständigen Freitextbearbeitung

Die folgenden älteren Texte dokumentieren den Zwischenstand vor der vollständigen Eingabe. Sie sind **Arbeitsentwürfe mit offenem Nachweisbedarf**, keine Behauptung erfüllter Sicherheitsanforderungen. Sie wurden inzwischen durch die [19 ausgefüllten Portaltexte](DTC-PORTAL-FREITEXTE.md) ersetzt. Die damals fehlende Kontaktangabe F14 wurde mittlerweile vom Nutzer bestätigt und eingetragen.

| ID | Statusantwort |
|---|---|
| F01 | Die Werkstatt ist unter einer festen HTTPS-Adresse erreichbar. Die tatsächlichen Netzwerkschutzkontrollen für Hosting, Datenbank, Dateispeicher und Arbeitsgeräte sind noch nicht technisch dokumentiert. Firewall, IDS/IPS, Segmentierung und Schutz vor öffentlichem Datenzugriff werden daher derzeit nicht als vollständig umgesetzt bestätigt. |
| F02 | Die produktive Benutzerverwaltung und die tatsächlich vergebenen Rechte sind noch zu prüfen. Individuelle Identitäten, eine Rollenmatrix für Auftrag, Gestaltung, Versand und Administration sowie nachvollziehbare Rechtevergabe und Entziehung sind vorgesehen, werden hier aber noch nicht als durchgängig umgesetzt bestätigt. |
| F03 | Eine technisch wirksame Kontrolle privater Geräte und USB-Medien einschließlich Alarmierung ist bisher nicht nachgewiesen. Gerätebestand, erlaubte Zugriffe, Sperrmechanismen, Überwachung und zuständige Empfänger müssen für die tatsächlich verwendeten Arbeitsgeräte dokumentiert und geprüft werden. |
| F04 | Die Verarbeitung soll ausschließlich der Herstellung und Erfüllung eigener Amazon-Bestellungen sowie erforderlichen gesetzlichen Pflichten dienen. Für operative PII, Custom-Dateien und gesetzliche Belege wird eine getrennte Aufbewahrungsmatrix vorbereitet. Datenempfänger, Speicherorte, tatsächliche Löschung und Backupbehandlung müssen noch anhand der Betriebsumgebung bestätigt werden. Die vorliegenden Dokumente sind Entwicklungsentwürfe; eine verbindlich freigegebene vollständige Unternehmensrichtlinie wird damit noch nicht bestätigt. |
| F05 | Das lokale Windows-Sandboxsecret ist außerhalb des Repositorys mit DPAPI CurrentUser verschlüsselt und durch Dateirechte begrenzt. Dies belegt keine Verschlüsselung aller Amazon-Informationen. Produktive Datenbank-, Datei- und Backupverschlüsselung sowie Schlüsselverwaltung, Rotation und Wiederherstellung müssen noch technisch nachgewiesen werden. |
| F06 | Ein geografisch getrenntes, verschlüsseltes Backup- und Archivverfahren der tatsächlichen Betriebsumgebung ist noch nicht belegt. Speicherorte, Zugriffsschutz, Sicherungsrhythmus, Aufbewahrung und Wiederherstellung müssen geprüft werden. Verbindliche RTO/RPO-Werte können erst nach Festlegung der Anforderungen und einem dokumentierten Wiederherstellungstest angegeben werden. |
| F07 | Der lokale APIclient protokolliert nur begrenzte technische Angaben ohne Token oder vollständige Kundendaten. Ein produktives zentrales Sicherheitslogging mit Alarmierung, dokumentierten zweiwöchentlichen Prüfungen und mindestens zwölf Monaten Aufbewahrung ist noch nicht nachgewiesen. Zuständigkeit und Untersuchungsablauf müssen ergänzt werden. |
| F08 | Ein freigegebener Vorfallsreaktionsplan ist noch nicht nachgewiesen. Vorgesehen sind Erkennung, Eindämmung, Beweissicherung, Bewertung, erforderliche Meldung, Behebung, Wiederherstellung und Nachbereitung. Rollen, Vertretung, halbjährliche Überprüfung und Meldung betroffener Amazon-Vorfälle binnen 24 Stunden an security@amazon.com müssen verbindlich festgelegt und geprüft werden. |
| F09 | Die tatsächlich erzwungenen Passwort- und MFA-Einstellungen aller Systeme mit Amazon-Informationen sind noch nicht geprüft. Mindestlänge, Komplexität, Ablauf und Rotation sowie Regeln für administrative und technische Konten müssen anhand der aktiven Benutzerverwaltung und Systeme belegt werden. Eine vollständige Durchsetzung wird derzeit nicht bestätigt. |
| F10 | Die neue Amazon-Anbindung wird in einer getrennten lokalen Testdatenbank ausschließlich mit synthetischen Daten, statischen Amazon-Sandboxantworten oder ausdrücklich als anonymisiert bestätigten Mustern geprüft. Produktive Amazon-Clients sind in dieser Laufzeit gesperrt. Der Custom-Dateiimport prüft Typ, Größe und Archivpfade. Echte Kundendaten dürfen vor geprüfter Betriebsumgebung und Freigabe nicht in die Testumgebung übernommen werden. |
| F11 | Im geprüften lokalen Amazon-Teststand liegen Sandbox-Zugangsdaten außerhalb des Git-Repositorys, unter Windows mit DPAPI CurrentUser verschlüsselt und mit begrenzten Dateirechten. Kurzlebige Zugriffstoken bleiben im Arbeitsspeicher. Antworten und Fehlerprotokolle geben keine Secrets aus. Der produktive Secret-Speicher und dessen Schlüsselverwaltung müssen für die tatsächliche Betriebsumgebung noch nachgewiesen werden. |
| F12 | Ein betrieblicher Ablauf für Scan- und Penetrationstestbefunde ist noch nicht belegt. Benötigt werden ein Befundregister mit Verantwortlichen, Schweregrad, Fälligkeit, Eskalation, Korrektur und Nachtest sowie nachvollziehbare Einhaltung von sieben Tagen bei kritischen und 30 Tagen bei hohen Befunden. Vorhandene Entwicklungstests ersetzen diesen Prozess nicht. |
| F13 | Im Entwicklungsstand werden Fehler korrigiert und mit automatisierten Tests geprüft. Ein verbindlicher Sicherheitsprozess für alle Veröffentlichungen und Laufzeitbefunde ist noch nicht vollständig nachgewiesen. Er muss Erfassung, Risikobewertung, Verantwortliche, Review, Test, genehmigte Bereitstellung, Nachprüfung und gegebenenfalls Incident-Eskalation abdecken. |
| F14 | Ein verantwortlicher Incident Management Point of Contact mit bestätigtem Namen, dienstlicher E-Mail-Adresse und Vertretung muss noch verbindlich benannt werden. Es wird keine unbestätigte Kontaktperson eingesetzt. |

## Konkrete Abschlussbedingungen

1. Betreiber und technische Administration der erreichbaren Werkstatt identifizieren; aktive Konfiguration und Datenflüsse lesen, ohne ungeprüfte Änderungen an Produktion vorzunehmen.
2. Tatsächlichen Zustand jeder Kontrolle belegen. Geplantes bleibt geplant; Lücken erhalten Verantwortliche und einen Umsetzungsnachweis, bevor eine positive Antwort entsteht.
3. Tatsächliche Aufbewahrung einschließlich gesetzlicher Ausnahmen und Backupbehandlung auf die konkrete Portalfrage abbilden. Keine Retention-Kategorie allein für einen erfolgreichen Antrag auswählen.
4. Datenschutz-/Verarbeitungsrichtlinie und Incident-Prozess verbindlich festlegen; der bestätigte IMPOC ist eingetragen, Vertretung und Erreichbarkeit bleiben festzulegen. Tatsächliche Dienstleister verifizieren.
5. Sicherheitsfelder, aktuell 15 ausgewählte Ja-Antworten und externe Empfänger/Quellen widerspruchsfrei abgleichen. Die bereits vorhandene Antragsautorisierung erlaubt keine unwahren Zusagen.
6. Die am Formularende verlangte Zustimmung zu den aktuellen Vertrags-/Richtlinientexten gesondert anhand der erteilten Autorisierung behandeln; eine erforderliche rechtliche Zustimmung nicht aus einem Sicherheitsnachweis ableiten. In diesem Dokument wurden weder Checkbox noch Registrieren betätigt.

Die fehlenden sachlichen Nachweise sind der aktuelle Abschlussblocker. Eine weitere allgemeine Bitte um Erlaubnis zur Antragstellung würde diesen Blocker nicht lösen.

## Maßgebliche Quellen

- Aktueller bereinigter Portalwortlaut vom 16.10.2026, im laufenden Auftrag tatsächlich ausgelesen; [Entwicklerprofil im Solution Provider Portal](https://solutionproviderportal.amazon.com/developer/register). Die oben dokumentierten Fragen stammen aus diesem Kontobefund, nicht aus einer erfundenen allgemeinen Checkliste.
- [Amazon Data Protection Policy](https://sellercentral.amazon.com/solution-provider/policy?policyType=DPP&locale=en_GB) und [Acceptable Use Policy](https://sellercentral.amazon.com/solution-provider/policy?policyType=AUP&locale=en_GB).
- [Amazon-Richtlinienupdate mit Wirksamkeit 25.08.2026](https://developer.amazonservices.com/policy-update-for-sp-api).
- [PII-Zugriff der Orders API](https://developer-docs.amazon/sp-api/docs/access-orders-pii): Rolle und technische Autorisierung sind unabhängig vom Nachweis betrieblicher Sicherheitsmaßnahmen.
- [Sicherheit und Aufbewahrung dieses Branches](SICHERHEIT-UND-AUFBEWAHRUNG.md) und [DTC-Antragsentwurf](DTC-ANTRAG-ENTWURF.md). Bei älteren Formulierungen über noch fehlende allgemeine Antragserlaubnis gilt die hier dokumentierte spätere ausdrückliche Autorisierung; die Sicherheitsnachweise bleiben offen.
