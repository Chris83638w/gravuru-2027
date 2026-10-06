# Shopify-Händlertest: Medien und konkreter Startvertrag

Stand 06.10.2026. Repository `Chris83638w/gravuru-2027`, Branch `task/merchant-runtime-20261006`. Remote-Basis `2104489fb9dea722081e847be60728e9ade6128c` vor Bearbeitung direkt auf GitHub bestätigt. Cloud-Laufzeit Revision 344 verbunden/laufend, eingeschränkte Paketmanager-Freigaben, keine bereitgestellten Secrets/Variablen/Identitäten. Konto „mika“ ist Nutzerangabe.

## Fertiger Codeumfang dieses Schritts

Private Vorschaubilder verwenden im eingebetteten Händlerbetrieb keine anonymen `src`-Anfragen mehr. Der gemeinsame Adapter lädt Produktkarten, Designkacheln, Formausführungen, Konturen und importierte SVG-Designvorschauen über den bestehenden `merchantRequest` mit frischem Sitzungstoken. Die identischen SVG-Bytes werden als lokale Blob-URL an `img` bzw. SVG-`image` übergeben, ohne Token in URLs oder Browserablagen. Der lokale Loopback-Modus behält direkte Bild-URLs.

Jeder Bildwechsel bricht den älteren Abruf ab; selbst bei ignoriertem Abbruch kann eine verspätete Antwort nicht die neuere Auswahl überschreiben. Entfernte Bilder und verlassene Seiten geben ihre Blob-URLs frei. Wiederholte Aktualisierung desselben Elements lädt dieselbe Quelle nicht mehrfach. Bereits als lazy gekennzeichnete Karten laden in Browsern mit IntersectionObserver erst in Nähe des sichtbaren Bereichs. Fehler werden über den vorhandenen Bildfehler-Hinweis gemeldet. HTTP-/JSON-/HTML-Fehler werden nicht als Bilder ausgegeben. Händler-Requests und private Designasset-Antworten verwenden `no-store`.

Die vorhandene Edelstahl-Vorschaustruktur ist im Testhost gezielt freigegeben; andere Dateien dieses Runtime-Pfads werden dadurch nicht freigegeben. Öffentliche Kundeneditoren/Modelle bleiben weiterhin gesperrt. Die bestehende Vorschau- und Exportberechnung, Preise und Produktionsdateien sind unverändert.

Der explizite neue Teststart baut die vorhandenen Ressourcen und erzeugt die reale Werkstatt mit Händler-Sitzungsprüfung und festem eingebetteten Testhost. Standardstart `npm start` bleibt unverändert. Der Teststart erzeugt keinen HTTPS-Host, keine App-Installation und keine Veröffentlichung. Er bindet nur an `127.0.0.1`, standardmäßig Port 8962; ein bereits bestätigter HTTPS-Anschluss muss den festgelegten Host weiterreichen.

## Öffentliche App-Zuordnung selbst geprüft

Nach Schema- und Queryvalidierung wurde Shopify ausschließlich lesend abgefragt:

- App `gid://shopify/App/423276544001`, Name **Gravuru Konfigurator**, `embedded: true`.
- Öffentliche Client-ID **`9640dd7a6907f0c73e7013ea8c24869b`**. Das ist kein geheimer Client-Schlüssel.
- Projektzuordnung zum bekannten Shop `gravuru-design.myshopify.com`; keine App eines anderen Projekts ausgewählt.

Diese öffentliche Identität ist im Laufzeitadapter hinterlegt. Falls entsprechende optionale Umgebungswerte gesetzt werden, müssen sie exakt dazu passen. Nutzer muss die öffentliche Client-ID nicht erneut heraussuchen. Browserlogin und Connector wurden nicht als Runtime-Admin-Token ausgegeben.

## Jetzt konkret fehlende sichere Bereitstellung

| Name | Wert/Herkunft | Status |
|---|---|---|
| `GRAVURU_SHOPIFY_CLIENT_SECRET` | Client-Schlüssel genau dieser bestehenden App, als geschützte **direkte** Prozessvariable; kein Wert im Chat/Repository/Befehlsargument | Fehlt |
| `GRAVURU_SHOPIFY_APP_ORIGIN` | Bestätigte HTTPS-Testadresse ohne Pfad/Slash; keine ungeprüfte Änderung der bestehenden Live-App-URL | Fehlt |
| `GRAVURU_PRIVATE_DATA_DIR` | In dieser Aufgabe ist `/workspace/gravuru-private/shopify-admin-test-20261006` leer mit Modus 0700 vorbereitet; als nicht geheimer Pfad an den Teststart übergeben | Verzeichnis vorbereitet, keine globale Runtime-Bindung gesetzt |
| `GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN` | Optionaler sicherer Admin-API-Zugriff für dieselbe App/Shop, `read_products` und `write_products`; für echten Entwurfsversand erforderlich | Fehlt; Entwurfsversand bleibt deaktiviert |
| `GRAVURU_SHOPIFY_TEST_PORT` | Optional, standardmäßig 8962 | Keine Anpassung erforderlich |

Die erste geschützte Variable benötigt den tatsächlichen Wert im Prozess, weil die App HMAC-Sitzungssignaturen lokal prüft. Ein HTTPS-Secret-Platzhalter ist dafür ungeeignet. Keine nicht belegten Secretdatei-Mounts oder Vault-Verbindungen voraussetzen. In den vorhandenen Umgebungseinstellungen sind „Umgebungsvariablen → Verwalten“ und der persönliche geschützte Bereitstellungsweg zu verwenden; nur angeforderte Werte erreichen die Aufgabe. Dieser Arbeitschat besitzt ausschließlich das Runtime-Statuswerkzeug und kann keine Bindung speichern/veröffentlichen. Keine neuen Freigaben durch einen Chattext allein behaupten.

Die leere Testablage enthält noch keine Datenbanken oder privaten Kundenbestände. Sie ist temporäre Cloud-Ablage und ausdrücklich **keine bestätigte dauerhafte gemeinsame Datenbank**. Der Start verweigert relative/repositoryinterne Datenpfade, unsichere Verzeichnisrechte und Symlinks für Datenbankdateien oder SQLite-Nebendateien. Bestehende Verzeichnisse werden nicht automatisch angelegt, chmodifiziert oder gewählt; keine alten WAL-Bestände übernommen. Beim ausdrücklichen Start entstehen die normalen neuen Testdatenbanken im gewählten privaten Verzeichnis.

## Befehle nach sicherer Bereitstellung

```sh
npm run shopify:check
npm run shopify:test
```

`shopify:check` baut nichts, öffnet keine Datenbank und kontaktiert keinen Shop. Es zeigt ausschließlich fehlende Feldnamen bzw. strukturelle Konfigurationsbereitschaft. Auch bei gültiger Konfiguration bleiben `credentialsVerified`, `httpsHostVerified` und `privateStorageVerified` in diesem reinen Check ausdrücklich `false`. Erst echte Anschlussprüfungen dürfen diese offenen Punkte bestätigen.

In dieser Aufgabe tatsächlich ausgeführt, ausschließlich mit dem nicht geheimen vorbereiteten Pfad:

```sh
GRAVURU_PRIVATE_DATA_DIR=/workspace/gravuru-private/shopify-admin-test-20261006 npm run shopify:check
```

Ergebnis: Exit 1, `missing_fields`: **`GRAVURU_SHOPIFY_CLIENT_SECRET` und `GRAVURU_SHOPIFY_APP_ORIGIN`**. Das ist der aktuelle konkrete Anschlussblocker, kein fehlgeschlagener Anwendungstest. Kein echter Listener gestartet, keine App-URL geändert, keine Entwürfe im Shop erzeugt.

## Aktuelle Prüfergebnisse

Direkt mit `node app/workshop/<Datei>` ausgeführt:

| Datei | Bestanden |
|---|---:|
| `merchant-media.test.mjs` | 12 |
| `shopify-runtime-config.test.mjs` | 15 |
| `shopify-admin-host.test.mjs` | 11 |
| `merchant-request.test.mjs` | 3 |
| `customer-downloads.test.mjs` | 17 |

**58 bestanden, 0 Fehler/Skips.** Echte Produktkarten-Markuperzeugung, authentifizierter echter Preview-Requesthandler mit unveränderten SVG-Bytes, Abbruch/Reihenfolge/Entfernung, private Dateidownloads und echte Werkstattkonstruktion in isolierter temporärer SQLite-Ablage geprüft. DOM-Lebenszyklen sind mit Testelementen geprüft; kein neuer visueller Browsernachweis. Das tatsächliche IntersectionObserver-Verhalten und die vollständige Händlerbedienung sind noch im Browser abzunehmen.

`npm run build`: **76 Ressourcen, 1 Modell**, `editorBytes: 461440`. JavaScript-Syntax und `git diff --check` erfolgreich. Historische Testsummen wurden nicht als neue Gesamtsuite ausgegeben. Kein Restore, Merge, PR, Store- oder Serverdeployment.

## Nächster Schritt und unveränderte Gesamtgrenzen

Nach geschützter Schlüsselbereitstellung und bestätigter Testadresse: Konfiguration nochmals lesen, echten Händlerstart anschließen und die gesamte Oberfläche im Shopify-Kontext abnehmen. Keine bestehende App-URL ungeprüft umstellen. Danach mit gesondertem Admin-Zugang den Entwurfspfad am tatsächlichen Testprodukt prüfen. Für den Gesamtabschluss fehlen weiterhin öffentliche Kundenrouten/Kundenkonto-Erweiterung, vollständige Bestell-/Aufpreisstrecke, Produktbilder und Updates im Shop, Drive-/KI-Anwendungsdienste sowie die dokumentierten Material-/Maschinen-/ICC-Abnahmen. Fehlende Zugänge sind kein Beweis, dass diese übrigen Arbeiten bereits fertig sind.

Die vorübergehende allgemeine Domainfreigabe nach Einrichtung wieder auf benötigte Ziele begrenzen. Keine Schlüssel in Chat, Git oder veröffentlichten Snapshots.
