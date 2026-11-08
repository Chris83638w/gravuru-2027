# Flugpause: Sicherung und verbindlicher Wiederanlauf

Stand 08.11.2026, 17:52 Berlin, Codex/Mika. **Diesen Bericht zuerst lesen.** Er ersetzt den Zwischenstand von 17:05 Uhr als Einstieg. Nutzer: „du kannst jetzt aber eine komplette sicherung machen. Ich bin jetzt im Flugzeug“. Weitere Funktionsentwicklung angehalten; offene Agentenarbeiten wurden committet und gepusht.

## Aktuell online

- Freigegebener R15-Konfi, kein neuer Konfi je Produktgruppe. Aktueller Quellstand **e9c36ce12d38fcb36bcb4b4c57add458d1859af7**, Branch `dev/mika-r15-final-feedback-20261108`, [PR219](https://github.com/Chris83638w/gravuru-2027/pull/219). Kein Main-Merge in diesem Sicherungsschritt.
- Letzte Nutzerkorrektur: kompakte Funktionen **mittig in normaler Desktopansicht und Vollansicht**. Beide tatsächlichen Ansichten nach Veröffentlichung in 1440 × 900 geprüft. Kein neues Design, keine Preis-/Produktänderung. Normalansicht gruppiert Aktionen und Ansicht kompakt unter der linken Produktfläche; Vollansicht zentriert die Aktionsgruppe.
- Sonstige veröffentlichte Änderungen und Tests: [R15-Livebericht](2026-11-08-r15-final-feedback-live.md). SVG-Seitenverhältnisse werden korrekt normalisiert; native alte SVG-Ausgaben bleiben bytegleich. Erste Motivkarten/Schriften und drei Designkarten werden begrenzt vorbereitet. Das vollständige Vorladen von Designbildern bereits auf der Produktseite ist **noch offen**.
- Aktive Laufzeit: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-final-feedback-20261108-v1`.
- Kundenwrapper: `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-merchant/app.cjs`, SHA256 `8127113f65285489b5dfcde46dc9462159703cf43f6e6c5081f01a6a776e4dcf`.
- Bundle: `/_acryl-bundle/editor-9651e7f6d9a7a1f9.mjs`. Die später zentrierte Darstellungsdatei wird separat geladen: `app/configurator/mobile-demo/compact-controls.mjs`, SHA256 `07711729793fce1b8200a68e1b95247b04a0decfabde8ed3b50499c3e1031212`.
- Zentrierung atomar veröffentlicht am 08.11.2026 17:41:17 Berlin; Serverbeleg `centered-controls-receipt.json`, vorherige Datei `pre-switch-backup/compact-controls-before-center.mjs` in aktiver Laufzeit. Das ursprüngliche Releasepaket bei ad9b24a enthält diese spätere Zentrierung noch nicht: Paket und neuen Gitstand nicht verwechseln.

## Sicherung: getrennte Ebenen

### Vollständiger Plesk-Abonnementauftrag — läuft, noch kein Abschlussnachweis

**Auftrag 1158**, gestartet **08.11.2026 17:43:04 Berlin**, Abonnement `gravuru-designwerkstatt.de` (ID14). Plesk bestätigte „Der Backupvorgang hat begonnen“. Gewählt: **Vollständig**, Konfiguration, Benutzerdateien, Datenbanken und E-Mail-Nachrichten; keine Ausschlüsse und keine E-Mail-Benachrichtigung. Ziel ist der vorhandene Serverspeicher `/var/lib/psa/dumps`.

Zuletzt beobachtet um 17:50 Berlin: Detailsseite zeigt Auftrag aktiv, 0 %, keine fertige Sicherung. **Nicht als erfolgreich abgeschlossen oder wiederhergestellt bezeichnen.** Der native Serverauftrag läuft unabhängig vom offenen Browser weiter. [Auftragsdetails](https://gravuru.highspeed.cloud:8443/smb/backup/task-details/domainId/14?taskId=1158). Nach Wiederverbindung zuerst Ergebnis/Warnungen und Archivgröße im Backup-Manager prüfen. Die angezeigte Abonnementbelegung lag vor Start bei ca. 347.914 MB, daher keine kurze Fertigstellungszeit versprechen.

Das ist eine vollständige Sicherung dieses Plesk-Abonnements, **kein Image des gesamten Servers und kein Vollbackup der Shopify-Plattform**. Der Zielort liegt auf demselben Server; keine unabhängige externe Disaster-Recovery-Kopie behaupten.

### Lokale Projektsicherung

Privater Ordner außerhalb des Arbeitsverzeichnisses:
`C:/Users/Mikail Erdem/Documents/Codex/2026-11-04/lie-flight-backup-20261108-1750/`.

**Kopie abgeschlossen am 08.11.2026 um 18:00:49 Berlin:** 288.704 Dateien, ca. 33,082 GiB; Robocopy Exit1 (Dateien erfolgreich kopiert), 0 Fehler. Die zusätzliche SHA256-Prüfung aller Dateien läuft noch. `copy.log` und anschließend `backup-receipt.json` sind die Nachweise.

- `workspace-private/`: vollständige private Dateikopie der Arbeitsbäume einschließlich nicht committierter lokaler Dateien, vorhandener lokaler Gitobjekte, Projektstände, Checkpoints, Releasepakete, Screenshots und Gesprächsanhänge. Ausgenommen nur regenerierbare Verzeichnisse `node_modules`, `.venv`, `__pycache__`; Verzeichnislinks nicht verfolgt. Kein gesamtes Computer-/Betriebssystemsbackup.
- `gravuru-2027-all-refs.bundle`: vollständige lokale Code-Git-Historie einschließlich aller vorhandenen Branches/Referenzen bis e9c36ce; `git bundle verify` erfolgreich. Neuere lokale Dokumentationscommits befinden sich zusätzlich in der Dateikopie.
- Katalog: vorhandene lokale Arbeitsbäume und `.git` sind in der privaten Dateikopie enthalten. **Vollständiges Katalog-Git-Bundle nicht fertig:** partielle Arbeitskopie benötigt fehlende historische Remoteobjekte; nach Verbindungsverlust wurde ausschließlich dieser wartende Bundle-/Fetchauftrag angehalten. Das vorhandene GitHub-Katalogrepo bleibt unverändert. Nach Wiederverbindung fehlende Objekte laden und komplettes Bundle erzeugen.
- `worktree-checkpoints.json`: Branch, HEAD und Status aller gefundenen Arbeitskopien. Nur lokal, kann private Dateinamen enthalten.
- `workspace-manifest.json` und `backup-receipt.json`: nach Verifikation Dateihashes, Größen, Fehler und Abschluss. Ein bestehender Zielordner allein ist kein Nachweis der vollständigen Hashprüfung.
- `recent-user-screenshots/`: zusätzlich fünf ausdrücklich übergebene aktuelle PC-Screenshots aus dem temporären Ordner gesichert.
- `README.md`: Wiederanlauf, Umfang und Grenzen. Dateien mit `.partial` oder `.lock` sind **keine gültigen Sicherungen**. Die gültige vollständige Kopie ist der Ordner `workspace-private/`, kein ZIP-Archiv.

Private Archive, Datenbanken und Zugangsdaten niemals in GitHub hochladen. Dort liegen ausschließlich Quellstände und bereinigte Übergaben. Der PC konnte den lokalen Übergabecommit c7710dec wegen Internetverlust nicht pushen. Diese Übergabe wurde deshalb über den GitHub-Connector auf `backup/mika-flight-20261108` gesichert. Nach Wiederverbindung nicht force-pushen, sondern Dokumentation und lokalen Commit geordnet zusammenführen.

### Vorher-/Rücknahmesicherung

Unveränderte Quellsicherung von 17:11 Berlin: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-before-final-feedback-20261108-v1`, 1.439 Dateien, Manifest-SHA256 `d3fe988b33b512f75045b306be3b4b39541a3b15afb2109976e90133c1bdf1cf`. Sie ist nur der frühere Quell-/Wrapperstand; nicht mit dem vollständigen Plesk-Auftrag verwechseln. Alte Runtimeverzeichnisse und private Datenbanksicherungen bleiben erhalten.

## Gesicherte offene Arbeiten — nicht produktiv

| Arbeit | Gesicherter Stand | Nächster konkreter Schritt |
|---|---|---|
| Öffentliche, vorab erzeugte Designvorschauen auf Produktseite | `dev/mika-public-design-previews-20261108`, **6686e86** | Speicherbaustein integrieren, höchstens drei erlaubte Vorlagen für das konkrete Startprodukt vorbereiten, Tests für Neustart/Widerruf/Mandant/Rendererwechsel; nicht beim Kundenstart rendern. |
| Unabhängiger Vorschau-Review | `dev/mika-public-preview-review-20261108`, **04ef061** | Aktuelle Freigaben bei jedem neuen Abruf nachweisen; keine Kundentexte, Uploads oder Bestellbilder im öffentlichen Vorlagencache. Bisher keine Freigabe. |
| Gemeinsamer Kunden-Modulpatch | [PR217](https://github.com/Chris83638w/gravuru-2027/pull/217), **fd4d59a**, Produktionscode 61fcb3f | Engen Patch auf aktuellen R15-Stand übertragen, Root-Browserabnahme; 41 geschützte Dateien und aktuelle Zentrierung erhalten. Kein altes Gesamtpaket deployen. |
| Wiederaufnehmbare Profilaktivierung | [PR214](https://github.com/Chris83638w/gravuru-2027/pull/214), **57f6f70** | Nach Runtimeabnahme kontrolliert integrieren; keine stillen neuen Produktbindungen. |
| Private Modulverwaltung | [PR213](https://github.com/Chris83638w/gravuru-2027/pull/213), private V2 unter test-2027 | Zwei Profile mit/ohne Logo vorhanden; produktive Schreibschalter aus, keine Kundenprodukt-Zuweisung. Private Browserabnahme offen. |

Cache-Implementierung: [Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-public-design-previews-20261108/docs/handoffs/2026-11-08-public-design-preview-cache.md). Review: [Prüfstand](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-public-preview-review-20261108/docs/handoffs/2026-11-08-public-preview-review-checkpoint.md).

Öffentlicher, lesender Servertest liegt lokal unter `outputs/public-asset-performance-20261108/README.md`: vier anonyme Abrufe, HTTP200, TLS geprüft, gzip. Hauptbundle ca. 541 KB Transfer, 869 ms kalte Verbindung / 286 ms wiederverwendete Verbindung; kein Beweis für die gesamte Handy-Ladezeit. Authentifizierte Vorschauerzeugung, Warteschlange und Browserdarstellung getrennt messen. Der bereits festgestellte langsame Kundenablauf bleibt eine offene Performanceaufgabe.

## Verbindliche Entscheidungen erhalten

- Nur Mika in Abstimmung mit Mikail ändert den freigegebenen Konfi-Aufbau. Andere KIs dürfen produktbezogene bestätigte Ausführungs-/Modulprofile pflegen, nicht den Editor nebenbei umbauen.
- Ein Kern, aktivierbare Module für Text/Motive/Foto/Logo/Farbe und produktspezifische Ausführungen. Kein neuer Quellcode-Konfi je Türschild, Gedenktafel, UV-Produkt oder Funkklingel.
- Produktgruppenoptionen vor Neuanlage bestätigen lassen. Edelstahl-Türschilder: bestätigte 8 Formen/80 Größen, genaue Maße, zulässige Befestigungen aus geprüfter Tabelle; kein Foto, SVG-Logo 12,99 EUR. Bestehende 404 Varianten und 251 Vorlagen erhalten.
- Gemeinsame Grundplatten, Schriften und Design-Original-IDs; freigegebene Designs unverändert. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).
- Galerie als Bearbeitungsquelle; „Synchronisieren“ aktualisiert zugeordnete Shopprodukte kontrolliert und ohne Duplikate. Vorher Änderungsübersicht, Konfliktprüfung, Journal, Wiederaufnahme. „Werkstattprüfung sichern“ allein ist nicht die Rückspeicherung derselben Galerievorlage.
- Bei Designgruppen startet der Kundenkonfi mit der Vorlage des Hauptproduktbildes; nur passende freigegebene Designs anzeigen. Historische Bestellungen unveränderlich erhalten.
- Gespeicherte Kundenfotos/Masken und SVGs bei Wiederöffnen unverändert erhalten. Keine pauschale Datenbankrücknahme als UI-Rollback.

## Wiederanlauf nach dem Flug

1. Plesk-Auftrag1158 auf Abschluss/Warnungen prüfen; lokalen `backup-receipt.json` prüfen. Kein zweites großes Vollbackup blind starten.
2. Livewrapper/Helperhash und Gitstände abgleichen; Änderungen anderer Chats nur lesen, nichts überschreiben. Aktueller Einstieg ist dieser Bericht, danach R15-Livebericht und STATUS.md.
3. Cachearbeit6686e86 und unabhängigen Review04ef061 fortsetzen; neuere UI-Zentrierung e9c36ce erhalten. Messung über echte Produktseite, nicht ausschließlich direkten Konfi-Link.
4. Danach gemeinsamen Modulpatch, Profilverwaltung und Galerie-Synchronisierung getrennt mit Warenkorb-/Preis-/Historientests abnehmen. Kundentests sind keine bezahlte Bestellung.
5. Abschlüsse immer mit exakt live/vorbereitet/offen, Commit, Prüfnachweis und nächstem Schritt in dieser Übergabekette, STATUS.md und Issue168 festhalten.

Rücknahme: alte Wrapper-/Quelldateien nur nach Hashprüfung und auf isolierter Kopie verwenden. **Alten SVG-Worker nicht pauschal zurückspielen**, wenn seit dem Fix akzeptierte SVGs gespeichert wurden; sonst könnten diese beim Wiederöffnen abgewiesen werden. Eine volle Serverwiederherstellung würde neue Kundendaten seit Backup überschreiben und gehört nicht zur normalen UI-Rücknahme.

## Kundenlinks

- [Produktseite](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen)
- [Konfi](https://gravuru-design.myshopify.com/apps/konfigurator/start?product=16190784438652&variant=58104606556540&ui=prio-r15)

Keine signierten Sitzungstokens, privaten Datenbanken oder Zugangsdaten in diesen Bericht aufnehmen.

