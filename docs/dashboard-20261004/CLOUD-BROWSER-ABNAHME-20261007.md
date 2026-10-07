# Geschützte lokale Browserabnahme in der Zielaufgabe

Am 07.10.2026 in der vorhandenen Cloud-Instanz tatsächlich ausgeführt, circa 11:49–11:51 Uhr Europe/Berlin. Übernommener und per `git ls-remote` bestätigter Remote-HEAD von `task/cloud-runtime-handoff-20261007`: **`8b2d3885e684425d43ccada3045b65ffabfb7806`**. Die gesicherte Basis `d1bc7ffbf61b708899fee1c9a74cc15c9fb6f746` ist Vorfahr; die Übergabe ergänzt gegenüber dieser Basis ausschließlich drei Dokumentationsdateien.

Der vorherige Checkout `work` auf `3ff2c2f8e7cb2565f60bd016f73a99ff6520152b` hatte keine lokalen, unversionierten oder ignorierten Änderungen. Er bleibt als Branch erhalten. Weiterarbeit auf **`test/cloud-browser-acceptance-20261007`**. Kein Neustart bei G27-01; keine Produktcodeänderung erforderlich.

## Umgebung und Schutz

- Dieselbe Instanz `ccarenv_b64_Y2NhcmVudl9jMmZkZDgzY2VkNzg4MTkxODZlOWExMWNiZWEzNjA3ZA`, veröffentlichte Versionskennung `cecfgver_6ac610fe42dc81a18ea9058be7b8001a`, beobachtete Laufzeitrevision 8.
- HTTP-Modus `unrestricted`; Status der Durchsetzung `unknown`. Git-Fetch und Remote-Abgleich erfolgreich. Keine Änderung der Netzwerkfreigabe.
- Loopback-Listener und System-Chromium funktionieren hier. Vorherige Listener-/Browserfehler der Quellaufgabe gelten nicht für diese Instanz.
- Ausschließlich temporäre, synthetische Datenbanken und Server auf `127.0.0.1`. Der bestehende `local-operator`-Modus nutzt Loopback-, Host-, Origin- und CSRF-Schutz; dies ist keine authentifizierte gehostete Shopify-Vorschau. Fremder Host, fremde Origin und Schreiben ohne CSRF wurden tatsächlich mit 403 abgewiesen.
- Node 24.19.0, Playwright 1.62.0, System-Chromium. Benötigte Python-Pakete aus den vorhandenen Requirements für Import, Druck, Fotos und Konturen in `.local-data/python` installiert; keine Abhängigkeitsdeklaration geändert. Keine vorhandene private Betriebsablage vorhanden/ersetzt. Testserver nach Abschluss beendet.

## Neu ausgeführte Browserprüfungen

Fünf verschiedene Browserabläufe bestanden, jeweils ohne JavaScript-Fehler. Dies ist keine neue vollständige Gesamtsuite und keine Addition historischer Testzahlen.

| Ablauf | Beobachtetes Ergebnis |
|---|---|
| `scripts/check-cloud-handoff.py` (neu) | Gespeicherte Stände vergleichen, schließen und Fokus zurückgeben; ungespeicherter Produktentwurf unverändert. Farbprofiländerung voranzeigen/abbrechen/speichern. Standard- und Kategoriezuordnung voranzeigen, per Escape abbrechen und bewusst speichern; Eingaben erhalten, Abbruch schreibt nichts. Versionsdialog zusätzlich per Touch-Emulation bei 390 Pixeln geöffnet/geschlossen. |
| `scripts/check-existing-konfi.py` | Dashboardtext speichern, genau Revision 2 im vorhandenen Acryl-Konfigurator öffnen. Revision 3 im Dashboard speichern; alter Kundenlink bleibt nach Reload bei Revision 2. |
| `scripts/check-photo-resolution.py` | Synthetisches Foto mit 4000 × 3000 Pixeln im bestehenden Acryl-Konfigurator hochladen, zuschneiden, verschieben und in Graustufen übernehmen. Bearbeitete Datei 2817 × 2400 Pixel, Vorschau maximal 1200 Pixel. Original bytegleich; erneutes Öffnen, Zurücksetzen und Rückgängig erhalten die gespeicherten Bilddaten. Gestaltung als unveränderlichen Prüfstand gesichert. |
| `scripts/check-customer-draft-loading.py` | Form-Konfigurator: Kundentext als privaten Entwurf sichern; verzögerter Reload sperrt Eingaben, veraltete Antwort überschreibt keinen neueren Stand. Fehler beim Designwechsel verändert keinen fremden Entwurf. |
| `scripts/check-dashboard-plate-preview.py` | PDF/300 dpi und getrennte Mimaki-Farb-/Weißdateien im Dashboard auswählen und herunterladen. ZIP und Einzeldateien identisch; Weiß-PDF mit Vektoren und Schnittkontur ohne Rasterbilder. Erneuter Download bytegleich. Ebenenvorschau entspricht den Download-Hashes; Wechsel des Auftrags entfernt alte Vorschau. Beide PDFs bestehen Ghostscript-Prüfung. |

Die vier bestehenden Skripte prüfen Desktop sowie Breiten 390/768 Pixel. Der neue Test ergänzt einen echten Chromium-Kontext mit `is_mobile` und `has_touch`, aber keinen physischen Smartphone-Test. Die lokalen Fixture-Builds melden jeweils **76 Ressourcen, 1 Modell, 461440 Editor-Bytes**.

Bei der Erstellung des neuen Tests wartete die erste Fassung nur auf einen deaktivierten Speicherbutton. Dieser ist bereits während des Speicherns deaktiviert; der Test las deshalb den alten Stand. Die Prüfung wartet jetzt auf die bestätigte neue Zuordnungsrevision. Danach vollständig bestanden; kein daraus abgeleiteter Produktfehler und keine Produktcodekorrektur.

Reproduzierbar vom Repository-Hauptordner mit `PYTHONPATH="$PWD/.local-data/python" python3 scripts/<Skriptname>`. Jeder Test erzeugt seine eigene temporäre Fixture und beendet den Server. Lokale Rohartefakte unter `.test-output/`; keine Zugangsdaten oder Datenbanken versioniert.

[Maschinenlesbare Ergebnisse und Bildprüfsummen](cloud-browser-acceptance-20261007/report.json)

Gesichtete Screenshots:

- [Auswirkung einer Profiländerung](cloud-browser-acceptance-20261007/profile-impact-desktop.png)
- [Versionsvergleich mit Touch-Emulation](cloud-browser-acceptance-20261007/revision-touch.png)
- [Bestehender Konfigurator mobil](cloud-browser-acceptance-20261007/konfigurator-mobile.png)
- [Fotozuschnitt mobil](cloud-browser-acceptance-20261007/photo-editor-mobile.png)
- [PDF-Weißebene und Downloads mobil](cloud-browser-acceptance-20261007/pdf-white-mobile.png)

## Aktuelle Grenzen und nächster Schritt

`npm run shopify:check` wurde ausgeführt und meldet `missing_fields`: `GRAVURU_SHOPIFY_CLIENT_SECRET`, `GRAVURU_SHOPIFY_APP_ORIGIN`, `GRAVURU_PRIVATE_DATA_DIR`. Der aktuelle Umgebungsstatus weist weiterhin keine Secret-/Identitätsbindungen aus. Keine echte Shopify-Anmeldung oder Testbestellung durchgeführt. Keine neue App, keine Plesk-/Shopify-Mutation, kein Main-Merge, keine Veröffentlichung und keine neue Umgebung.

Die hier verfügbaren Werkzeuge bieten keinen geschützten Vorschau-Link für Mikails Handy. Die Browserabnahme erfolgte in Chromium innerhalb dieser Instanz. Ein lokaler Loopback-Link wird nicht als extern erreichbarer Link ausgegeben.

Nächster konkreter Schritt: zusätzliche Nutzerübergabe einbeziehen und die vorhandene App-/Testshop-Verbindung sowie dauerhafte private Ablage über die vorgesehenen sicheren Bindungen verfügbar machen; anschließend echte authentifizierte App-/Testbestellstrecke prüfen. Physische Touch-Bedienung und Corel-/RIP-/Maschinen-/ICC-Abnahme bleiben gesondert offen. Technische PDF- und Browserprüfungen sind keine Fertigungsfreigabe.
