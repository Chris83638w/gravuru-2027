# Fortsetzung in der bereits funktionierenden Cloud-Aufgabe

Stand: 07.10.2026, Zeitzone für Nutzerangaben Europe/Berlin. Nutzerauftrag: den aktuellen Neuaufbau sichern und in der bereits vorhandenen funktionierenden Aufgabe fortsetzen. Keine neue Umgebung, keine Wiederherstellung der alten Pipeline, kein Laptopzugriff.

## Gesicherter Stand

- Repository: `Chris83638w/gravuru-2027`.
- Sicherungsbranch: `test/dashboard-print-acceptance-20261007`.
- **Bestätigter Remote-Commit: `d1bc7ffbf61b708899fee1c9a74cc15c9fb6f746`.** GitHub-Vergleich zum Branch am 07.10.2026: `identical`, 0 voraus, 0 zurück.
- Git-Baum: `3533dce4ab42e36a7e5df070d0c7e01ea333c798`. Exakt derselbe Dateiinhalt wie der lokale Prüfcommit `2d56516e998bf58534369343a06e6432cb313778`. Die Commit-IDs unterscheiden sich, weil über den GitHub-Connector auf dem bestätigten Remote-Elterncommit gesichert wurde.
- Direkter Remote-Elterncommit / unveränderter Produktcode: `f28dfc032c6d374d7d0967fe8eb8f37895d2a8f2` (`task/profile-impact-preview-20261006`). Die Sicherung ergänzt sieben Test-/Dokumentationsdateien; sie setzt den Produktstand nicht zurück.
- Die vorher nur lokal bestätigten Prüfdateien vom 06.10. bleiben zusätzlich erhalten. Keine privaten Datenbanken, Kundenbilder oder Zugangsdaten übertragen. ZIP-Integrität und typische Secretmuster wurden vor dem Upload geprüft, ohne Fund.
- Übergabebranch: `task/cloud-runtime-handoff-20261007`. Er ergänzt nur diese Übergabe und Hinweise in `START_HERE.md`/`STATUS.md` zum gesicherten Stand.

## Richtige vorhandene Aufgabe und Ursache des Zugriffsunterschieds

Quelle: **Gravuru 2027 – Cloud – Mikail**, Chat `01a101bb-342f-750b-b481-82c3c3a5c072`.
Ziel nach ausdrücklicher Nutzerbenennung: **gravuru-2027 NEU**, Chat **`01a115b2-0173-7419-9c03-1af745f5c07c`**, angepinnt. Titel und Verlauf wurden aus der Quellaufgabe direkt gelesen. Der zuvor identifizierte erfolgreiche Netzwerktest gegen 11:26 Uhr MESZ stammt aus dem separaten Chat `01a115ae-dc41-74a2-b560-df5c06f55056` (damals „gravuru-2027 bearbeiten“); er ist nicht das nun gewählte Übergabeziel. Auch **gravuru-2027 NEU** enthält eigene erfolgreiche HTTPS-Tests.

Beide verwenden die Konfiguration `16de3a2f-12b3-4882-b5d7-afb410207d93~cecfg_6ac0eabed9e081a182773b56699e0905`, aber unterschiedliche Instanzen und Versionen:

| | Quellaufgabe, zuletzt direkt geprüft | Zielaufgabe, belegter Testbericht |
|---|---|---|
| Instanz | `ccarenv_b64_Y2NhcmVudl81ZDliZDA5YTEwM2M4MTkxOWUwMDBlZjJmYjM2YmMzZg` | `ccarenv_b64_Y2NhcmVudl9jMmZkZDgzY2VkNzg4MTkxODZlOWExMWNiZWEzNjA3ZA` |
| Versionssuffix | `cecfgver_6ac0f225193481a19fa2d9fc8f259eb6` | `cecfgver_6ac610fe42dc81a18ea9058be7b8001a` |
| HTTP/HTTPS | `restricted`, `enforced`, nur `package_managers`, keine zusätzlichen Hosts | `unrestricted`; Revision 6 `enforced`, später Revision 7 `unknown`; tatsächliche HTTPS-Tests erfolgreich |
| Verbindungstest | curl Exit 7: Verbindung zu Proxy Port 8080 scheitert | GitHub und `gravuru-design.myshopify.com`: HTTP 200, TLS erfolgreich; Werkstatt HTTP 401 (erreichbar, Anmeldung erforderlich) |

**Wichtige Korrektur zum bisherigen Bericht des Zielchats:** Dort ist noch Branch `work` mit Commit `3ff2c2f8e7cb2565f60bd016f73a99ff6520152b` ausgecheckt, ohne lokale Änderungen laut seinem letzten Bericht. Seine Aussagen „neue App noch nicht implementiert“, „nur vier Referenzarchive“ und „nächstes Paket G27-01“ beziehen sich auf diesen alten Stand, nicht auf den hier gesicherten Neuaufbau. Den bestätigten Übergabestand übernehmen, vorhandene neuere Implementierung nutzen und keine erneute G27-01-Entwicklung beginnen. Angaben zu fehlenden Dateien/Variablennamen aus alten Archiven gegen den aktuellen Checkout prüfen. Die frühere HTTP-200-Prüfung allein belegt keinen aktuellen Codecheckout.

Kein nachgewiesener Berechtigungsfehler des Accounts chrisck1. Die Kontobezeichnung mika ist Nutzerangabe. Eine funktionierende HTTPS-Verbindung beweist weder Shopify-Adminrechte noch Plesk-Zugang. Keine Browser-Anmeldung oder privaten Dateien zwischen Aufgaben als automatisch verfügbar annehmen. Keine Geheimnisse aus fremden Prozessen/Chats suchen.

Die Quellaufgabe kann Chats lesen, besitzt hier jedoch kein Werkzeug zum Senden einer Nachricht an den Zielchat oder zum direkten Wechseln seiner Laufzeit. **Die Fortsetzung dort ist durch diese Datei vorbereitet, noch nicht als ausgeführt bestätigt.** Der Nutzer muss den untenstehenden Auftrag einmal im vorhandenen Zielchat senden. Keine weitere Prüf-Aufgabe anlegen.

## Bisheriger Funktions- und Prüfstand

Der Neuaufbau bleibt maßgeblich: Werkstatt/Dashboard mit Acryl- und Formprodukten, importierten Konturen und PDF-/SVG-Designs, Kundenfeldern, Profilen, Revisionen, Excel-/Stapelabläufen und Produktionsausgabe; den bestehenden Kunden-Konfigurator wiederverwenden. Die genaue Umsetzung und ihre Grenzen stehen oben in `START_HERE.md`, dann im Verlauf von `STATUS.md` und den referenzierten Nachweisen. Historische Angaben sind kein aktueller Gesamtabnahmestand.

Am 07.10. in der Quellaufgabe tatsächlich geprüft: **drei unterschiedliche Dashboard-/Konfigurator-bis-Druckdatei-Abläufe bestanden, 0 Fehler/Skips**. Den erweiterten Acrylfall danach nochmals gezielt bestanden; nicht als vierten unabhängigen Test addieren. Build: **76 Ressourcen, 1 Modell, 461440 Editor-Bytes**. Echte HTTP-Handler im Prozess, temporäre SQLite-Datenbanken und echte PDF-/SVG-Konverter; synthetische Testmedien. Keine reale Shopify-Bestellung und keine Browserautomation. Frühere 137 Tests sind historische Cloud-Abnahme, keine erneute Gesamtsuite vom 07.10.

Geprüft sind transparente Form mit Loch/Ausschnitt, Kundentext und Graustufenfoto; Vollflächendruck mit 1 mm Farbüberdruck und Spiegelung; bestehendes Acryl mit Fotoersatz, Eiche, Wandhalterung, zwei Stück und 7 mm Einsteckbereich. Gesicherte Ausgaben bleiben nach Produkt-/Profiländerung und Neustart unverändert. Auch eine nachträgliche Profiländerung auf 600 dpi/kein Weiß/Spiegelung verändert die zuvor gesicherte Produktion nicht.

[Aktuelles PDF-Testpaket](dashboard-print-acceptance-20261007.zip), neun PDFs plus Anleitung und Prüfbericht; SHA-256 `1198f5039c949db12ea5192e2e1b2683ae991ebcedd902f5be028f86173e9dc3`, 391713 Bytes. [Messwerte](dashboard-print-acceptance-20261007.json). Roland kombiniert; Mimaki Farbe/Kontur und separates Vektor-Weiß/Kontur, deckungsgleiche Konturen. Weiß-PDF ohne Rasterbilder, Texte als Pfade, CMYK-Raster. Drei PDF-Vorschauen angesehen; keine Maschinenfreigabe. Die Prüfbilder sind synthetisch, keine echten Kundenfotos.

Verbindliche Nutzerentscheidungen behalten: Motiv = einzelnes Element; Design = gesamte Plattengestaltung. Design standardmäßig gesperrt, Elementrechte im Backend steuerbar. Foto hinter der Maske ausrichten/beschneiden, Texte direkt bearbeiten, Schriftgröße in ganzen mm. Export standardmäßig PDF/300 dpi/CMYK, Weiß nur unter tatsächlich bedruckten Elementen; keine vollflächige Weißplatte in transparenten Bereichen. Zusätzlicher Farbüberdruck nur bei Randdruck/Vollfläche und ausdrücklicher Einstellung. RDG_WHITE als Vektoren; Mimaki zwei PDFs einschließlich Außenkontur. Keine Gruppierung durch Rasterung ersetzen. Neuere konkrete Nutzerfestlegungen gehen historischen Formulierungen vor.

## Nächster ausführbarer Schritt im Zielchat

1. `AGENTS.md`, den Anfang von `START_HERE.md` und diese Datei lesen. Vorhandenen Checkout, Remote, HEAD und ungesicherte Änderungen prüfen. Den aktuellen Remote-HEAD von `task/cloud-runtime-handoff-20261007` abrufen und die gesicherte Basis oben bestätigen. Nicht ungeprüft `main` oder den alten automatisch gestarteten Branch `work` als aktuellen Produktstand verwenden. Bestehende Änderungen erhalten; falls nötig eigener Worktree und eigener Aufgabenbranch vom bestätigten Übergabestand, ohne Reset oder Merge.
2. Vorhandene Cloud-Werkzeuge für eine **geschützte Bedienvorschau** prüfen und dort Dashboard sowie vorhandenen Konfigurator sichtbar abnehmen. Die vorherigen Listener-/Browserfehler stammen aus der alten Laufzeit; in dieser anderen Instanz nicht ungeprüft übernehmen. Keine öffentliche Ersatzveröffentlichung und keinen Browserzugriff versprechen, wenn er fehlt.
3. Zuerst Produkt/gespeicherten Stand öffnen, Profil-/Zuordnungsänderung voranzeigen und abbrechen, Kundenfoto/Text bearbeiten, Entwurf sichern und PDF-Auswahl prüfen. Synthetische Daten reichen dafür; Chris' private restaurierte Daten sind hierfür kein automatischer Blocker. Den Netzwerktest nicht nochmals als lange Setup-Schleife ausführen, fachliche Tests nur bei Änderungen/neuem Anlass.

Reproduzierbare Befehle aus dem Repository (nur nach Bedarf, keine hier behauptete neue Ausführung): Node >=24; Python-Anforderung `python3 -m pip install --target .local-data/python -r app/workshop/requirements-import.txt` (PyMuPDF 1.28.2). `PYTHONPATH="$PWD/.local-data/python" npm run build`; `PYTHONPATH="$PWD/.local-data/python" npm start` startet die Loopback-Vorschau auf 127.0.0.1:8961 (`/werkstatt`, `/?model=acryl`). Vor Start den bestehenden privaten Datenpfad prüfen; keine vorhandenen Daten ersetzen. `.local-data` bleibt privat und unversioniert. Eine Loopback-Adresse ist kein von Mikails Handy erreichbarer Vorschau-Link; dafür nur tatsächlich verfügbare geschützte Cloud-Vorschaufunktionen benutzen.

Der gezielte bestehende Integrationstest ist `node --test --test-isolation=none app/workshop/dashboard-print-flow.test.mjs` mit passendem PYTHONPATH; vollständige Tests `npm test`. Frühere Prüfungen hier nicht als neu ausgeführt ausgeben. Ein vollständiger Wiederholungslauf ist für die reine Übergabe nicht erforderlich.

## Shopify und verbleibende Grenzen

Bestehende App **Gravuru Konfigurator**, App-ID `423276544001`, Shop `gravuru-design.myshopify.com`; App-URL `https://gravuru-designwerkstatt.de/produktanlage.html`. Nicht mit dem Cloud-Chatnamen verwechseln. Keine neue App und keine Umleitung der laufenden App anlegen. `npm run shopify:check` prüft den vorhandenen Teststartvertrag, belegt aber noch keine echte Anmeldung.

Der aktuelle Code in `app/workshop/shopify-runtime-config.mjs` nennt erforderliche sichere Felder `GRAVURU_SHOPIFY_CLIENT_SECRET`, `GRAVURU_SHOPIFY_APP_ORIGIN`, `GRAVURU_PRIVATE_DATA_DIR`; optional `GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN` für Entwurfsübertragung. Dies sind **benötigte Namen**, keine Bestätigung ihrer Verfügbarkeit in der Zielaufgabe. Keine Werte in Chat, Befehlsargumente, Git, URLs oder Ausgaben. Vor realer Anbindung dort nur Metadaten/Readiness prüfen. Eine uneingeschränkte Domainfreigabe ersetzt diese Anbindung nicht. Ältere Anschlussdokumente können durch neuere Code-/Statusstände ergänzt worden sein; nicht bereits implementierte Adapter erneut entwickeln.

Offen bleiben sichtbare Dashboard-/Touch-Abnahme, echte App-/Testbestellstrecke und Kundenkontoanschluss, dauerhafte private Betriebsablage, die in STATUS dokumentierten restlichen Integrationen und reale Corel-/RIP-/Maschinen-/ICC-Abnahme. Roland LEF 200/MO 240 mit VersaWorks, Mimaki 2513 EX; die genaue Mimaki-RIP-Version ist nicht bestätigt. Generisches DeviceCMYK ist kein gemessenes Druckprofil. Keine neuen Prozent- oder Fertigversprechen aus Tests ableiten.

Keine Live-Veröffentlichung, Shopify-/Plesk-Mutation, Merge, Force-Push, neue Umgebung oder erneute Backup-Suche. Arbeit auf eigenem Branch sichern und Remote bestätigen. Die allgemeine Internetfreigabe später auf Paketmanager und benötigte Domains begrenzen lassen; jetzt nicht eigenmächtig ändern.

## Einmaliger Fortsetzungsauftrag

„Übernimm in dieser vorhandenen Cloud-Aufgabe den aktuellen Remote-Stand von `Chris83638w/gravuru-2027`, Branch `task/cloud-runtime-handoff-20261007`. Lies zuerst `AGENTS.md`, `START_HERE.md` und `docs/dashboard-20261004/CLOUD-FORTSETZUNG-20261007.md`. Erhalte vorhandene Änderungen. Bestätige den übernommenen vollständigen Commit und setze den dort beschriebenen nächsten Schritt – geschützte sichtbare Dashboard-/Konfigurator-Abnahme – fort. Kein Neustart des Projekts, keine neue Umgebung, keine Liveänderungen. Wenn ein benötigtes Werkzeug fehlt, benenne genau diese Grenze und arbeite an unabhängig möglichen Aufgaben weiter.“
