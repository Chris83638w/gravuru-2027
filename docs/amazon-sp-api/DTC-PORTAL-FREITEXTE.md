# Amazon-DTC-Antrag: ausgefüllte Freitexte

Stand: 16.10.2026. **Alle 19 Freitexte im Amazon-Portal ausgefüllt und exakt zurückgelesen; nicht eingereicht.** Alle Texte halten die angezeigten Zeichenlimits ein. Schwerpunkt ist der automatische Import von Amazon-Custom-Personalisierungen in die vorhandene gravuru-Designwerkstatt.

Die Sicherheitsmaßnahmen sind als zugesagter Zielbetrieb gekennzeichnet. Ihre produktive Umsetzung ist nicht nachgewiesen. Bei der abschließenden Livekontrolle sind 15 Sicherheitsfragen mit Ja und die Aufbewahrung mit „weniger als 31 Tage nach Versand“ ausgewählt. Diese Auswahl ist kein Nachweis der tatsächlichen Umsetzung. In diesem Bearbeitungsschritt wurden ausschließlich Freitexte geändert; Sicherheits- und Aufbewahrungsoptionen wurden nicht gesetzt. Die sachliche Prüfung dieser Angaben bleibt offen. Die Vertragszustimmung ist nicht gesetzt; Registrieren wurde nicht ausgelöst. Das Ausfüllen belegt keinen serverseitig gespeicherten Antrag und keine neue Amazon-Prüfung.

## Grundlage des Custom-Antrags

Billbee liefert nach Nutzerangabe bereits Bestelldaten. Custom-ZIPs werden heute direkt aus Seller Central heruntergeladen. Amazon ordnet `orderItems.product.customization.customizedUrl` in der Orders API v2026-01-01 bei händlererfüllten Bestellungen der eingeschränkten DTC-Rolle zu: [Amazon: Zugriff auf Bestelldaten und PII](https://developer-docs.amazon/sp-api/docs/access-orders-pii).

Der manuelle JSON/ZIP-Testimport ist bereits implementiert und mit synthetischen Daten geprüft. Automatischer Abruf echter Custom-ZIPs und vollständige Übertragung von Fotos/Logos/Layouts sind noch nicht abgenommen.

## Unternehmen und Anwendung

Die gravuru GmbH fertigt und verkauft unter CHRISCK design und gravuru personalisierte Gravur- und Druckprodukte. gravuru 2027 ist unsere private Produktions- und Designwerkstatt. Hauptzweck der SP-API-Anbindung ist der Import von Amazon-Custom-Personalisierungen in die Fertigung. Zugriff ausschließlich für das eigene Verkäuferkonto; die Bestell- und Versandverwaltung über Billbee bleibt bestehen.

*400 von 500 Zeichen.*

## Anwendungsfall: automatischer Import der Amazon-Personalisierungen

Wir beantragen Direct-to-Consumer Shipping (Restricted) für unsere private Anwendung gravuru 2027. Wir verkaufen unter CHRISCK design und gravuru personalisierte Produkte aus Edelstahl, Schiefer, Acryl und Holz und erfüllen diese Bestellungen selbst.

Kernbedarf ist der automatisierte Import der Amazon-Custom-Personalisierungen. Bestellnummer, SKU und Menge allein genügen nicht zur Herstellung: Wir benötigen die vom Käufer für die konkrete Position übermittelten Gravurtexte, Fotos, Logos, Design- und Variantenwahlen sowie die in der Custom-Datei enthaltenen Positionierungs- und Gestaltungsinformationen. Diese Inhalte bestimmen das bestellte Einzelprodukt. Billbee liefert bereits unsere Bestelldaten; die Custom-ZIPs laden wir derzeit direkt aus Seller Central herunter. Der Antrag dient der sicheren Automatisierung dieses bestehenden Herstellungsschritts.

Die Anwendung soll bei eigenen händlererfüllten Bestellungen den von Amazon dokumentierten Verweis orderItems.product.customization.customizedUrl abrufen, die bereitgestellten Custom-Archive zeitnah herunterladen und anhand Amazon-Bestellnummer, Bestellposition und SKU eindeutig zuordnen. Originale erhalten eine Prüfsumme. Archive werden auf Größe, Dateityp und sichere Pfade geprüft. Tatsächlich gelieferte Texte, Bilder und Optionen werden in die bestehende Designwerkstatt übernommen; nicht eindeutig zuordenbare Inhalte stoppen die automatische Fertigungsübergabe und werden manuell geprüft. Es werden keine fehlenden Kundenvorgaben ergänzt oder erfunden.

Die fertige Gestaltung wird als unveränderlicher Auftragsstand mit Menge und Produktrevision gesichert. Interne A4/A5-Begleitscheine enthalten Bestell- und Positionsbarcodes. Produktion, Qualitätsprüfung und Versandvorbereitung werden nachvollziehbar erfasst. Notwendige Empfängerangaben dienen ausschließlich der Zustellung über die beauftragten Versanddienstleister. Die Nutzung bleibt auf Herstellung und Erfüllung der jeweiligen eigenen Amazon-Bestellung sowie gesetzliche Pflichten beschränkt; keine Werbung, Profilbildung, Weiterveräußerung oder Nutzung zum KI-Training.

Nachgewiesener Entwicklungsstand: LWA und statische Orders-Sandbox erfolgreich; 138 Amazon-Tests und 29 gezielte bestehende Regressionen bestanden. Positionsbezogener JSON/ZIP-Testimport mit unveränderten Originalen, Feldprüfung und Versionsschutz, A4/A5-Testbegleitscheine sowie interne Scanschritte sind implementiert. Echte Custom-Dateien, vollständige Layoutübernahme und produktiver PII-Betrieb sind noch nicht abgenommen.

Wir setzen die nachfolgend beschriebenen Schutzmaßnahmen vor dem produktiven PII-Zugriff um und weisen sie durch Konfiguration, Prüfprotokolle und Betriebsdokumentation nach. Diese Angaben beschreiben den zugesagten Zielbetrieb; noch nicht geprüfte Maßnahmen und im Formular vorhandene Ja-Angaben sind keine Bestätigung einer bereits vollständigen Umsetzung. Die Registrierung bzw. Rollenfreigabe ersetzt nicht die interne technische Sicherheitsabnahme.

*2990 von 5000 Zeichen.*

## Begründung der eingeschränkten Rolle

Wir beantragen Direct-to-Consumer Shipping (Restricted) zum automatisierten Import von Amazon-Custom-ZIPs für eigene, selbst versandte Bestellungen. Die enthaltenen Texte, Fotos, Logos und Gestaltungsangaben werden zur Herstellung des bestellten Produkts benötigt. Amazon ordnet customizedUrl dieser Rolle zu. Billbee-Bestelldaten ersetzen diese Produktionsdaten nicht. Zusätzlich werden nur die zur Zustellung erforderlichen Empfängerdaten verarbeitet.

*453 von 500 Zeichen.*

## Externe Empfänger

Bereits eingesetzt: Billbee für Bestell- und Versandverwaltung. DHL, DPD und Deutsche Post erhalten die für beauftragte Sendungen nötigen Angaben. Hosting-/Backupanbieter und deren tatsächlicher Zugriff werden vor PII-Aktivierung im Empfängerverzeichnis dokumentiert. Custom-Inhalte bleiben für die eigene Fertigung bestimmt; keine Weitergabe an externe KI-Dienste, Werbung oder Datenkäufer. Der neue Produktionsdatenfluss ist noch nicht aktiviert.

*448 von 500 Zeichen.*

## Externe Datenquellen

Amazon-Bestelldaten liegen bereits in Billbee vor; Billbee ist damit eine bestehende externe Datenquelle für die Auftragsabwicklung. Amazon-Custom-ZIPs werden derzeit direkt aus Seller Central heruntergeladen. Für gravuru ist der direkte Custom-Abruf über die SP-API vorgesehen. Helium 10 und Amazon Ads sind in der neuen Anbindung nicht autorisiert; sie werden hier nicht als bestehende Quellen dargestellt.

*408 von 500 Zeichen.*

## Netzwerkschutz

Umsetzungsplan vor PII-Betrieb: Datenbank und Custom-Dateispeicher ohne öffentlichen Zugriff; getrennte App-, Daten- und Verwaltungsnetze. Firewall mit standardmäßiger Sperre, nur erforderliche Verbindungen; HTTPS über WAF, Administration über VPN mit MFA. IDS/IPS und zentral verwalteter Malware-/Endpunktschutz alarmieren den Sicherheitskontakt. Regeln, Geräte und Erkennung werden dokumentiert und getestet. Produktionswirksamkeit noch nicht nachgewiesen.

*458 von 500 Zeichen.*

## Identitäten und Zugriffsrechte

Umsetzungsplan: persönliche Mitarbeiterkonten, MFA und getrennte Rollen für Auftragsbearbeitung, Design, Produktion, Versand und Administration. Jede Rolle erhält nur erforderliche Funktionen und Daten; keine Sammelkonten. Zugriffe werden genehmigt, protokolliert und vierteljährlich überprüft. Rollenwechsel und Austritt lösen sofortigen Rechteentzug aus. Systemkonten erhalten eigene minimale Rechte. Produktive Konfiguration und Negativtests folgen vor PII-Aktivierung.

*472 von 500 Zeichen.*

## Private Geräte und USB-Medien

Umsetzungsplan: Zugriff nur von inventarisierten, verwalteten Firmengeräten. Geräteprüfung und Zugriffsvorgaben sperren private Mobilgeräte und nicht zugelassene Endpunkte; USB-Massenspeicher und lokale Exporte werden technisch beschränkt. Geräte-/DLP-Ereignisse werden zentral erfasst; unerlaubte Kopier- und Zugriffsversuche alarmieren den Sicherheitskontakt. Sperren und Alarmwege werden vor PII-Betrieb getestet. Bisher noch kein Nachweis der flächendeckenden Umsetzung.

*474 von 500 Zeichen.*

## Datenschutz, Datenverarbeitung und Aufbewahrung

Zielrichtlinie für gravuru: Erhebung ausschließlich eigener Amazon-Auftragsdaten und der zur Herstellung erforderlichen Custom-Inhalte; Verwendung nur für Auftragsherstellung, Erfüllung und gesetzliche Pflichten. Einstufung als vertraulich/personenbezogen; Rollenrechte und Verschlüsselung für Verarbeitung, Übertragung, Speicher und Backups. Externe Empfänger und Verarbeitungstätigkeiten werden dokumentiert. Operative PII und Custom-Dateien werden nach Zweckende gelöscht, spätestens 30 Tage nach Zustellung; gesetzlich nötige Belege werden nach dokumentierter Rechtsgrundlage getrennt und zugriffsbeschränkt aufbewahrt. Löschregeln erfassen Dateien, Versionen, temporäre Kopien und Sicherungen; Wiederherstellung wendet Löschvermerke erneut an. Keine Kundendaten für Werbung, Datenverkauf oder KI-Training. Der Ansatz Versand plus sieben Tage wird erst nach Prüfung der Datenklassen konkretisiert. Dies ist der Umsetzungsplan; produktive Löschung und Aufbewahrung sind noch nicht abgenommen.

*995 von 1000 Zeichen.*

## Verschlüsselung und Schlüsselverwaltung

Umsetzungsplan: AES-256-Verschlüsselung für Datenbank, Custom-Originale, Ausgaben und Backups. Schlüssel in einem getrennten verwalteten KMS mit minimalen Dienstrechten; menschlicher Administrationszugriff nur mit MFA. Schlüsselzugriffe werden protokolliert, Rotation und Wiederherstellung getestet. Geheimnisse liegen getrennt von Daten und Quellcode. Lokal ist das Sandboxsecret mit Windows DPAPI geschützt; produktive PII-Verschlüsselung und KMS sind noch zu konfigurieren und nachzuweisen.

*493 von 500 Zeichen.*

## Backups und Wiederherstellung

Umsetzungsplan: verschlüsselte Sicherungen in einem zweiten geografisch getrennten EU-Standort mit getrennten Zugriffsrechten. Tägliche Vollsicherung und stündliche inkrementelle Sicherung; überwachte Sicherungsjobs und vierteljährlicher Restore-Test. Zielwerte, noch nicht gemessen: RPO höchstens 1 Stunde, RTO höchstens 8 Stunden. Fristen und Löschvermerke gelten auch für Sicherungen und Wiederherstellungen. Anbieter, Speicherorte und Wiederherstellung werden vor PII-Betrieb nachgewiesen.

*493 von 500 Zeichen.*

## Sicherheitslogging und Überwachung

Umsetzungsplan: zentrales, zugriffsgeschütztes Sicherheitslogging für Anmeldungen, Rollenänderungen, sensible Abrufe, Exporte, Löschungen und Administrationsaktionen. Keine Tokens, Custom-Inhalte oder unnötigen Kundendaten in Logs. Warnungen bei Fehlanmeldungen, ungewöhnlichen Abrufen und Rechteänderungen gehen an den Sicherheitskontakt. Dokumentierte Prüfung mindestens alle zwei Wochen; Sicherheitslogs mindestens 12 Monate. Alarm- und Untersuchungsablauf wird vor Produktivstart getestet.

*493 von 500 Zeichen.*

## Reaktion auf Sicherheitsvorfälle

Umsetzungsplan: Vorfall erkennen und einstufen; betroffene Zugänge/Systeme isolieren, Tokens sperren, Beweise geschützt sichern; Datenumfang und Betroffene bewerten. Amazon wird spätestens 24 Stunden nach Entdeckung eines Amazon-Daten betreffenden Vorfalls an security@amazon.com informiert. Ursache beheben, sauberen Stand wiederherstellen, Wirksamkeit prüfen und Vorfall nachbereiten. Christopher Koch koordiniert; Vertretung wird benannt. Plan halbjährlich prüfen und regelmäßig üben.

*487 von 500 Zeichen.*

## Passwortrichtlinien und MFA

Umsetzungsplan für alle betroffenen Systeme: persönliche Konten, mindestens 12 Zeichen mit Groß-/Kleinbuchstaben, Zahl und Sonderzeichen sowie MFA. Zentrale Richtlinien erzwingen Komplexität, Wiederverwendungsschutz, Sperre/Begrenzung von Fehlversuchen und Ablauf spätestens nach 365 Tagen; Änderung sofort bei Verdacht. Dienstgeheimnisse werden getrennt verwaltet und rotiert. Reichweite und technische Durchsetzung werden vor PII-Aktivierung systemweise geprüft; noch kein Betriebsnachweis.

*492 von 500 Zeichen.*

## Schutz personenbezogener Daten in Tests

Die neue Amazon-Anbindung wird in einer getrennten lokalen Testdatenbank mit synthetischen Daten, statischen Sandboxantworten oder ausdrücklich als anonymisiert bestätigten Mustern geprüft. Produktive Amazon-Clients sind dort gesperrt. JSON/ZIP-Import prüft Typ, Größe, Archivpfade, Positionszuordnung, Version und Hash. Zielprozess: keine echten PII in Entwicklung oder CI; geprüfte Anonymisierung vor Musterübernahme, getrennte Rechte und definierte Testdatenlöschung.

*470 von 500 Zeichen.*

## Schutz der Zugangsdaten

Bereits umgesetzt im lokalen Teststand: Sandboxsecret außerhalb von Git, mit Windows DPAPI und begrenzten Dateirechten; Zugriffstoken nur im Speicher, bereinigte Fehlerausgabe. Zielbetrieb: verwalteter Secret-Speicher, minimale Dienstrechte, protokollierte Zugriffe, Rotation und sofortiger Widerruf bei Verdacht; Secret-Scans in Code und CI. Keine Geheimnisse in Browsercode, Tickets oder Protokollen. Produktiver Secret-Speicher und Schlüsselverwaltung werden vor PII-Aktivierung abgenommen.

*493 von 500 Zeichen.*

## Schwachstellen und Nachverfolgung

Umsetzungsplan: zentrales Befundregister mit System, Schweregrad, Verantwortlichem, Frist, Korrektur und Nachtest. Scans aller Amazon-Daten verarbeitenden Systeme mindestens alle 30 Tage; unabhängiger Penetrationstest jährlich. Kritische Befunde innerhalb von 7 Tagen, hohe innerhalb von 30 Tagen beheben; Fristverletzungen an Christopher Koch eskalieren. Abschluss erst nach dokumentiertem Nachtest. Regelbetrieb und Scan-/Pentestnachweise werden vor PII-Aktivierung eingerichtet.

*481 von 500 Zeichen.*

## Codesicherheit und Freigabeprozess

Umsetzungsplan: Schwachstellen erfassen, Auswirkung und Priorität bewerten, betroffene Funktion absichern und Korrektur auf getrenntem Branch umsetzen. Jede Veröffentlichung erfordert Sicherheitsprüfung des Codes, Abhängigkeits-/Secret-Scan, Tests und dokumentierte Freigabe. Produktive Änderungen erfolgen mit Sicherung und Rückfallplan; danach Wirksamkeit prüfen. Kritische/hohe Befunde nach 7/30-Tage-Frist bearbeiten. Der durchgängige produktive Freigabeprozess ist noch einzurichten.

*488 von 500 Zeichen.*

## Sicherheitskontakt

Der Nutzer hat den verantwortlichen Ansprechpartner und die geschäftliche E-Mail-Adresse ausdrücklich benannt. Das Feld wurde im Portal ausgefüllt und zurückgelesen. Die Kontaktdaten werden nur im lokalen Antragsdokument und im Portal geführt. Vertretung und Alarmannahme außerhalb der Geschäftszeiten bleiben organisatorisch festzulegen.
