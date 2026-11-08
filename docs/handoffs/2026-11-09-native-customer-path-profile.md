# Lokales Profil des nativen Kundenstarts – 09.11.2026

Die nächste lokal belegte Engstelle ist das wiederholte Lesen, Parsen, Kopieren und Hashen derselben rund 12 MB großen Produktrevision. Die eigentliche SVG-Erzeugung brauchte im gemessenen warmen Vorschaupfad nur 3,8 ms; beim zweiten Abruf wurde sie gar nicht ausgeführt. Daraus folgt ein enger Optimierungsvorschlag, noch keine Produktionsänderung.

## Gemessener Stand und Umfang

- Runtime: `b3e188f5bb65d621b9ad2bc202a2d5dc59d71e07`.
- Tatsächliches lokales r4-Dokument: 11.906.263 Bytes, SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`; 251 Designs, 80 Größen, 404 Kombinationen. Die Produktdatei bleibt privat.
- Native Werkstatt, Modellaufbereitung, Slimmer, HTTP-Handler und echte Registry-`resolve()` in einer eigenen temporären Datenbank. Eine synthetische Bindung für den Startfall wurde ausdrücklich nur für diesen Profilversuch eingesetzt; dies ist kein Nachweis einer Aktivierung oder aller 404 Zuordnungen.
- Katalogfreigabe im Versuch synthetisch. Deren produktive Datenbankkosten sind nicht gemessen. Kein Server-, Shopify-, Browser- oder Kundendatenzugriff durch diesen Profilversuch.
- Ein kalter Modellaufruf, danach je zwei warme Modell-, Galerie- und private Vorschauabrufe. Alle HTTP-Aufrufe erfolgreich. Keine breite Testsuite wiederholt.
- Die Messinstrumentierung entstand ausschließlich im geladenen Prozess; alle Produktionsdateien blieben unverändert. Temporäre Datenbank danach geschlossen und entfernt.

## Lokale Ergebnisse

| Gemessener Pfad | Dauer | Antwort |
| --- | ---: | ---: |
| Kaltes natives Modell | 699 ms | internes Modell |
| Warme native Modellabfrage | 151 ms | internes Modell |
| Einzelne native Bindungsauflösung | 215 ms | interne Bindung |
| Signierter Start mit vorbereiteten Bildern | 870 ms | 1.368 Bytes |
| HTTP-Modell | 1.140–1.367 ms | 322.368 Bytes |
| HTTP-Galerie | 1.159–1.248 ms | 27.079 Bytes, 21 Karten |
| Private Vorschau | 1.329–1.384 ms | 138.503 Bytes |

Beim HTTP-Modell wurden pro Anfrage zweimal vollständige Dokumenthashes berechnet (330–381 ms), vier Repository-Lesevorgänge ausgeführt (390–513 ms einschließlich JSON-Verarbeitung) und Kopien angelegt (137–181 ms). Der zusätzliche Modellhash des öffentlichen Vorschaucaches kostete 76–81 ms.

Die Galerie berechnete den Bindungs-Dokumenthash dreimal (431–460 ms), las viermal das Repository (353–380 ms) und hashte das Modell zusätzlich (71–77 ms). Im privaten Vorschaupfad waren es drei Dokumenthashes und sechs Repository-Lesevorgänge. Die SVG-Erzeugung lag bei 3,8 ms im ersten und null Aufrufen im zweiten Abruf.

In den warmen Messphasen wurden `buildModel`, `validateProductDocument` und `resolveProduct` nicht erneut aufgerufen. Wiederholte vollständige Produktvalidierung ist daher in diesem Versuch nicht die dominante Ursache. Der bestehende Modellcache allein vermeidet noch nicht das erneute Lesen des Produktdokuments und das Kopieren des Modells.

**Messgrenze:** inklusive Funktionszeiten überschneiden sich und dürfen nicht addiert werden. Laufzeiten enthalten Instrumentierungsaufwand und stammen von einem lokalen Rechner mit kleiner temporärer Datenbank. Sie sind keine Prognose für Server-CPU, Mobilfunk oder die Zeit bis zur Bedienbarkeit.

## Getrennte reale Browser-/Netzwerkbeobachtungen von Root

Root meldete nach dem veröffentlichten Cache-Identitätsfix:

- Erste drei Designbilder: etwa 5–45 ms und 0 übertragene Bytes; Startmotive, Startschrift und Editorbundle ebenfalls ohne erneuten Transfer.
- Verbleibende gemessene Abrufe: Modell 3,72 s, Galerie 2,03 s, weitere private Vorschau 4,45 s.
- Öffentliche Originalvorschau: HEAD 200 nach 1,49 s; komprimierter GET 200 mit 101.773 Bytes, TTFB 1,07 s und gesamt 2,36 s; unkomprimierter GET mit 139.106 Bytes, TTFB 1,50 s und gesamt 6,01 s.

Diese Einzelbeobachtungen belegen einen relevanten Übertragungsanteil; sie isolieren wegen unterschiedlicher Abrufe und Netzbedingungen keine kausale Einsparquote. Die lokale CPU-Messung erklärt nicht die gesamte Live-Latenz. Wiederverwendung im Browser und passende Übertragungskompression bleiben deshalb zusätzlich relevant.

## Engster nächster Reviewvorschlag

Innerhalb einer einzelnen synchronen, abgesicherten Anfragephase den bereits geprüften unveränderlichen Produktstand wiederverwenden: Dokument einmal lesen/parsen/hashen, anschließend dieselbe geprüfte Modell-, Karten- und Cacheidentität nutzen. Das ist vor einer Umsetzung gesondert zu prüfen; kein globaler Cache für beliebig veränderliche Objekte und keine pauschale Übernahme des Aktivierungsadapters.

Verbindlich beibehalten:

1. Aktuelle Bindung, Kopf-/Produktrevision, Mandant, archivierter/pausierter Zustand und Freigabe frisch prüfen.
2. Nach asynchronen Unterbrechungen die erforderlichen aktuellen Nachweise erneut prüfen; keine offene Datenbanktransaktion über Netzwerk-Wartezeiten.
3. Keine längeren Fristen, ausgelassenen Integritätsprüfungen oder veränderten Preis-/Rechteformeln.
4. Gezielte Regressionen für Mutation innerhalb der Phase, Bindungs-/Revisionswechsel, Entzug, fremden Mandanten, Folgeanfrage und Neustart. Native Preise, Optionen, historische Bestellstände und komplette 251er Bank müssen unverändert bleiben.
5. Danach denselben begrenzten lokalen Vergleich und echte Browsermessung ausführen. Erst dann Einsparung nennen.

Die drei vorab vorbereiteten Startbilder bleiben die bestehende Grenze. Dieser Befund begründet weder das Rendern aller Designs beim Kundenstart noch Änderungen am freigegebenen Konfiguratoraufbau.

## Nachweise und Wiederholung

- Rohmessung: [profile.json](../reviews/2026-11-09-native-customer-path/profile.json).
- Lokaler unveränderter Profilversuch: `outputs/native-customer-path-profile-20261109/profile-native.mjs`.
- Ausgeführt mit `node outputs/native-customer-path-profile-20261109/profile-native.mjs`; Exit 0.
- Der lokale Versuch setzt die private r4-Datei und den oben gepinnten Runtime-Arbeitsbaum voraus. Diese privaten Eingangsdaten wurden nicht eingecheckt.
- Gesichert werden nur Bericht und Messwerte. Keine produktive Codeänderung oder Veröffentlichung.
