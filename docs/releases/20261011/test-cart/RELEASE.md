# Händler-Testwarenkorb · 11.10.2026

Begrenzter Testweg für die Gedenktafel Revision 2. Anmeldung, CSRF und private Entwurfskennung sind erforderlich. Variante, Menge, Preise und Angebotskennung entstehen aus dem unveränderlich gespeicherten Stand. Wiederholungen verwenden dasselbe Angebot und Warenkorbjournal; unklare Antworten werden nicht automatisch wiederholt. Änderungen nach dem Sichern sperren den alten Checkout-Link.

Die Produktionsblocker bleiben im Prüfstand erhalten. Ein Testwarenkorb oder eine bezahlte Testbestellung erteilt weder Fertigungsfreigabe noch Kundendownload. Öffentlicher Checkout bleibt deaktiviert. Tokenlose Anfragen sind ausschließlich für diesen vom Server gestarteten Händlertest zugelassen; keine erfundene Käufer-IP.

Prüfungen: 65 gezielte Node-Tests; acht Händler-Laufzeitprüfungen einschließlich JWT/CSRF/Host/Entwurfszugriff; Desktop-/Mobilbedienung mit synthetischer Identität und simulierter Warenkorbantwort; alle neun tatsächlichen Produktvarianten in privater Kopie gegen erhaltene Preisfunktion und simulierte Shopify-Antworten. Testmengen überschneiden sich. Anfängliche Fehler im synthetischen Testaufbau und Browserselektor wurden korrigiert; ein widersprüchlicher Oberflächenhinweis wurde behoben.

Shopify-Produkt 16138083107196 im Vertriebskanal Onlineshop 291556688252 veröffentlicht und nachgelesen. Neun Varianten/Preise, Bestandsregeln und andere Vertriebskanäle unverändert. Bestandsverfolgung ist für alle neun Varianten deaktiviert. Nachweis: product-publication.json.

## Veröffentlichung und echter Testkauf

Installierter Quellstand **ffdd150c8cd983b1bdae553a378b8720b29dff79**, Version `0.1.0-recovery.20261010+ffdd150c8cd9`. Paket SHA-256 `d42efe985f031d245af4e18967c11fabea45038d4734d4d04e13a49fa3471b7a`. 392 Manifestdateien auf Plesk erneut geprüft. Installation, Start, wiederholbare Freischaltung und synthetischer Bestelleingang nach Neustart isoliert bestanden. Tatsächliche HTTPS-Seiten 200, anonyme Händler-API und unsignierter Webhook 401. Produktrevision 2, Cormorant Garamond und neun Bindungen unverändert bestätigt.

Vor Wechsel drei private Datenbanken mit SQLite-Backup und Integritätsprüfung, Konfiguration, Startdatei und alte Laufzeit gesichert. Plesk-Steueraufruf lief in ein Zeitlimit; nicht wiederholt. Unabhängige Prozess-/Dateiprüfung bestätigte den abgeschlossenen Wechsel samt Aktivierungsbeleg. Ein einmaliges Warenkorb-Prüfskript brach zunächst vor Netzwerkzugriff wegen fehlender Basiskonfiguration ab; leeres Protokoll geprüft, Skript korrigiert. Kein doppelter Shopify-Warenkorb.

**Tatsächlicher Testkauf am 11.10.2026 bestätigt:** eine Gedenktafel ohne Befestigung, neutrale TEST-Gestaltung, 22,99 EUR plus 4,99 EUR Versand = 27,98 EUR. Shopify-Antwort bestätigte Variante, Menge, Preis und Entwurfsattribute. Wiederholung desselben Entwurfs verwendete denselben Warenkorb ohne zweiten Netzwerkaufruf. Der echte Checkout zeigte das Test-Zahlungsgateway; Testkarte 1 verwendet. Nicht auflösbare synthetische Maildomain wurde abgewiesen und durch reservierte Beispieldomain ersetzt. Abschlussseite bestätigte die Bestellung.

Anschließend tatsächlicher signierter ORDERS_PAID-Eingang: genau eine zugeordnete Position. Unabhängiger Admin-API-Abruf bestätigte `test: true`, Gateway `bogus`, `PAID`, `UNFULFILLED`. Gespeicherter Produktstand/Preis und privater Entwurf stimmen überein. `productionReady: false`, `customerDownloadAllowed: false`. Keine reale Abbuchung. Keine Fertigungs-/Maschinenfreigabe. Testbestellung bleibt als Testnachweis unfulfilled; keine Produktion oder Erfüllungsaktion angestoßen.

Bestell-/Kundenkennungen, Checkout-URLs, private Entwürfe, Screenshots des echten Checkouts, Geheimnisse und Datenbanken bleiben außerhalb des Repositorys. Veröffentlichte JSON-Belege enthalten aggregierte Nachweise; Browserbilder im Repository stammen ausschließlich aus synthetischer lokaler Prüfung.

Nach dem tatsächlichen Testkauf erneut alle drei Datenbanken per SQLite-Online-Backup auf dem Server gesichert. Aktuelle private Cloud-Kopien gegen die Serverprüfsummen und SQLite-Integrität geprüft. Vollständiges Git-Bundle bis 6b8795f plus verifiziertes Ergänzungsbundle erhalten; alle neueren Commits seit Produktbasis a2af162 bleiben Vorfahren des Arbeitsstands.

## Grenzen und nächster Schritt

Der begrenzte Händler-Testweg ist live. Eine echte Anmeldung im angemeldeten Desktop-Browser wurde nicht automatisiert; lokale UI-Prüfung verwendet synthetische Identität, echte Bestellung den Shopify-Checkout. Die öffentliche neue Kundenstrecke ist weiterhin nicht freigeschaltet. Physische Gravur-/Maschinen- und Materialabnahmen sind offen. Die bisherige Kundenwerkstatt sowie Site 14/19 wurden nicht verändert. Alte verlorene Cloud-/Windows-Dateien, nicht angehängte Dateien früherer Aufgaben, historische Review-ZIPs und nicht erreichbarer Commit c64c197 bleiben entsprechend [Herkunftsbericht](../../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md) nicht verfügbar; keine Vollständigkeit über diese Grenze hinaus behaupten.

Nächster Schritt: öffentliche Kundenstrecke mit derselben unveränderlichen Entwurfs-/Preisbindung weiterführen; Fertigungsabnahme separat behandeln.
