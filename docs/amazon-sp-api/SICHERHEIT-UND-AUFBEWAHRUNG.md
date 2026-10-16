# Sicherheit und Aufbewahrung

Prüfgrundlage: aktuelle offizielle Amazon-Unterlagen und deutsche Gesetzesquellen, recherchiert am 16.10.2026. Diese Dokumentation bestätigt keinen produktiven Compliance-Audit. Cloudkonfiguration, tatsächliche Benutzerverwaltung und produktive Speichersicherheit wurden nicht technisch abgenommen.

## Umgesetzt im lokalen Integrationsstand

- Feste HTTPS-APIhosts, abgewiesene Redirects, Zeit-/Antwortgrößenlimits; keine beliebige Basis-URL.
- Sandbox als Vorgabe; der integrierte Service lehnt Produktionsclients ab. HTTP-Eingaben können die Umgebung nicht freigeben.
- Zugangsdaten ausschließlich serverseitig außerhalb des Repositorys. Der geprüfte Windows-Sandboxspeicher ist mit DPAPI `CurrentUser` verschlüsselt; Dateizugriff wurde auf Benutzer und SYSTEM begrenzt.
- Zugriffstoken nur im Arbeitsspeicher, Ablaufpuffer und eine gemeinsame laufende Erneuerung. Keine Token-/Secretwerte in Auditereignissen.
- Begrenzte Wiederholungen bei 429 und vorübergehenden Serverfehlern mit Backoff/Jitter; `Retry-After` wird beachtet. Eine kontrollierte Erneuerung bei 401; keine Wiederholungsschleife bei 403.
- Explizite Projektion der Orders-Antworten vor Speicherung/Weitergabe. Keine Käufer-/Empfängerinformationen oder Custom-URLs. Der Fixturetest wird ebenso vor Rückgabe reduziert.
- Eigene lokale Testdatenbank; synthetische, Sandbox- und spätere Datenherkunft werden kenntlich gehalten. Der vorhandene produktive Datenbestand wird nicht für Tests verwendet.
- Custom-Musterprüfung mit Archivgrößen-, Dateizahl-, Entpack- und Pfadgrenzen; keine Netzwerkaufrufe, Dateiextraktion oder automatische Ausführung/Rendern von Inhalten.
- Reine Aufbewahrungsvorschau. Das Modul besitzt keine Löschfunktion und keinen Löschscheduler.

Der eigenständige Client besitzt für spätere serverseitige Verwendung einen ausdrücklichen Runtime-Guard für produktive Leseaufrufe. Der derzeit integrierte Service und die Vorschau akzeptieren ausschließlich Sandbox. Eine spätere Änderung dieser Grenze benötigt eine konkrete fachliche und technische Freigabe; sie darf nicht durch eine vom Browser übermittelte Option erfolgen.

## Aktuelle Richtlinienbasis und noch offene Betriebsnachweise

Amazon veröffentlichte ein seit **25.08.2026** geltendes Richtlinienupdate, unter anderem zu WAF bei öffentlich erreichbaren Endpunkten, Datenträger-/Secretverschlüsselung und verschärften Zugriffsschutz- und Prüfanforderungen. Das Update ist bei der tatsächlichen Betriebsabnahme zu berücksichtigen. [Amazon-Richtlinienupdate](https://developer.amazonservices.com/policy-update-for-sp-api).

Die DPP verlangt unter anderem MFA, geringste Rechte, regelmäßige Berechtigungsprüfung, zeitnahen Rechteentzug, TLS, Schlüsselverwaltung, getrennte Test-/Produktionsumgebungen, Sicherheitsprotokollierung und Vorfallmanagement. Der lokale API-Test beweist keine Umsetzung dieser organisatorischen und infrastrukturellen Kontrollen. Maßgeblich ist die aktuelle [Data Protection Policy](https://sellercentral.amazon.com/solution-provider/policy?policyType=DPP&locale=en_GB), ergänzt durch die [Acceptable Use Policy](https://sellercentral.amazon.com/solution-provider/policy?policyType=AUP&locale=en_GB).

Vor Echtdatenbetrieb werden mindestens folgende konkrete Nachweise benötigt:

| Bereich | Erforderlicher Nachweis | Stand |
|---|---|---|
| Hosting / Datenfluss | Anbieter, Region, Dienste, Zugriffe, tatsächliche externe Empfänger | Offen |
| Identitäten / RBAC | Personalisierte Konten, MFA, getrennte Werkstatt-/Versand-/Administrationsrechte, Review und Entzug | Offen für Produktion |
| Transport | Tatsächliche TLS-/Proxykonfiguration; keine deaktivierte Zertifikatsprüfung | APIclient verwendet HTTPS; Cloud offen |
| Ruhende Daten | Verschlüsselung von Datenbank, Assets, Backups und Secrets; getrennte Schlüsselrechte | DPAPI-Sandboxsecret geprüft; übrige Produktion offen |
| Netzschutz | WAF/Firewall, Segmentierung, Malware-/Schwachstellenprüfung, Überwachung | Offen |
| Protokolle | Zugriffsschutz, keine unnötigen Kundendaten, erforderliche Sicherheitslogfristen | Client-Allowlist vorhanden; Cloudbetrieb offen |
| Vorfälle | Verantwortliche Person, dokumentierter Melde-/Reaktionsprozess, aktuelle Amazon-Meldefrist | Offen |
| Wiederherstellung | Backupumfang/-frist, verschlüsselte Speicherung, Restore-Test, erneute Anwendung späterer Löschungen | Offen |

Profilantworten über vorhandene Sicherheitsmaßnahmen sind Selbstauskünfte. Sie werden erst mit den Nachweisen oben als technisch bestätigt behandelt. Pauschale Angaben wie „keine externen Empfänger“ müssen mit Hosting, Carriern, Backups und eventuell eingesetzten externen Diensten abgeglichen werden.

## Warum „ab Versand plus sieben Tage“ keine allgemeine Regel ist

Amazon nennt für operative personenbezogene Daten grundsätzlich höchstens **30 Tage nach Zustellung**, soweit die Daten für den zulässigen Zweck benötigt werden; eine längere Speicherung muss sich auf tatsächlich notwendige gesetzliche Pflichten stützen. Die DPP enthält außerdem Pflichten bei Autorisierungsentzug bzw. Vertragsende. Versandbestätigung, Labelkauf und Zustellung sind unterschiedliche Zeitpunkte. [DPP](https://sellercentral.amazon.com/solution-provider/policy?policyType=DPP&locale=en_GB), [Amazon-Aufbewahrungsleitfaden](https://developer-docs.amazon/sp-api/lang-en_en/docs/protecting-amazon-api-applications-data-encryption-and-recovery).

Die vorgeschlagene kurze Frist nach Versand kann für einzelne nicht mehr benötigte operative Daten geeignet sein. Sie darf weder eine längere zwecklose Speicherung erlauben noch gesetzlich benötigte Rechnungen pauschal löschen. Fehlende Zustellinformation berechtigt nicht zu unbegrenzter Aufbewahrung. Die konkrete Regel muss je Datenklasse fachlich geprüft und versioniert werden.

| Datenklasse | Regelmäßige Grundlage / Abgrenzung |
|---|---|
| Operative Empfänger- und Custom-Daten | Zweckende, Datenminimierung und Amazon-Obergrenze; frühere Löschung prüfen |
| Rechnungen | Regelmäßig acht Jahre ab Ende des Ausstellungsjahres; Sonderfälle beachten. [§14b UStG](https://www.gesetze-im-internet.de/ustg_1980/__14b.html) |
| Buchungsbelege | Regelmäßig acht Jahre. [§147 AO](https://www.gesetze-im-internet.de/ao_1977/__147.html), [§257 HGB](https://www.gesetze-im-internet.de/hgb/__257.html) |
| Bücher, Inventare, Bilanzen | Regelmäßig zehn Jahre. [§257 HGB](https://www.gesetze-im-internet.de/hgb/__257.html) |
| Geschäfts-/Handelsbriefe | Regelmäßig sechs Jahre; genaue Dokumentklasse prüfen. [§147 AO](https://www.gesetze-im-internet.de/ao_1977/__147.html) |
| Fotos, Namen, Logos, Gravur-/Druckdateien | Keine pauschale achtjährige Aufbewahrung allein wegen einer Bestellung. [DSGVO Art. 5, 6, 17](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679) |

Steuerverfahren und andere gesetzliche Besonderheiten können Fristen beeinflussen. Ein Rechnungsbeleg und das komplette Custom-Archiv sind getrennte Datenobjekte. Für die Fristenentscheidung sind konkrete Dokumente und notwendige Felder maßgeblich, keine pauschale Verlängerung aller Produktionsdaten.

## Verhalten der implementierten Vorschau

`planAmazonRetention()` arbeitet ohne Speicherzugriff. Das Ergebnis enthält `dryRun:true` und `deletionEnabled:false`. Ohne geprüfte Policy mit Versionsangabe entsteht Prüfbedarf. Eine optionale interne Versandfrist von null bis sieben Tagen wird nur aus einer ausdrücklich geprüften Policy übernommen; sie ist keine fest einprogrammierte Amazon-Vorschrift.

Berücksichtigt werden getrennte Datenklassen, Zweckende, Versand-/Zustellzeit, explizite Frist und Autorisierungsentzug. Widersprüchliche Zeitpunkte werden abgewiesen. Gesetzliche Ausnahmen benötigen konkrete Rechtsgrundlage, Dokumentklasse, Frist und Prüfangaben. Fehlende Frist oder unvollständige Ausnahme führt zur Prüfung. Ein `delete_candidate` ist ein Vorschlag, keine ausgeführte Löschung.

Vor späterem Einschalten tatsächlicher Löschung müssen Originale, Vorschauen, abgeleitete Druckdaten, temporäre Dateien, Suchindizes, Objektversionen und Backups berücksichtigt werden. Eine Wiederherstellung darf bereits fällig gelöschte operative Daten nicht erneut allgemein verfügbar machen. Backupfristen und Löschmarkierungen sind gesondert zu testen. Eine Amazon-Bestellnummer ist nicht automatisch anonym, nur weil der Name entfernt wurde.

## Spätere Custom-Downloads

Der Testdatei-Inspektor anonymisiert keine Daten. Seine Zulassung verlangt eine ausdrückliche Klassifikation als synthetisch oder bereits anonymisiert; das ist eine Betreiberbestätigung und keine automatische Inhaltsgarantie. Auch Dateinamen und Feldpfade müssen frei von personenbezogenen Angaben sein. HTTP und CLI zeigen keine Kandidatenwerte; die interne reine Prüffunktion stellt diese ausschließlich für spätere kontrollierte Verarbeitung bereit. Aktuell wird keine vollständige Custom-Gestaltung in einen Produktionsauftrag übertragen.

Der aktuelle Stand hat keinen Netzwerkausgang für Custom-Dateien. Eine spätere Implementierung braucht zusätzlich zur DTC-Rolle eine nachgewiesene App-Autorisierung, Datenfreigabe und sicheren Speicher. Downloads benötigen eine begrenzte HTTPS-Ursprungsliste, Schutz vor internen Netzwerkzielen und Redirects, Inhalts-/Zeitlimits sowie isolierte Verarbeitung. LWA-/Carrier-Token dürfen niemals an Dateihosts weitergereicht werden. Externe KI- oder Designservices erhalten keine Amazon-Kundeninhalte aus diesem Teststand.
