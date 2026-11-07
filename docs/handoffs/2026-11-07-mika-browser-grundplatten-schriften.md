# Mika · Grundplatten und Schriften im Browser nach Bedarf

Stand 07.11.2026. Eigener Branch `dev/mika-browser-ressourcen-20261107` auf Draft-PR #190, Ausgangscommit `6f859471603c74948dc441db85131b477ab2e8bc`. Getrennte Arbeit ohne Astra-Kontakt, ohne Main-Merge und ohne Online-/Shopumschaltung.

## Auftrag und Grenzen

Mikail bestätigt mit „ok, mach das“ den vorgeschlagenen nächsten Schritt: die bereits gemeinsam gespeicherten Grundplatten und Schriften auch beim Laden im Browser wiederverwenden. Seine Vorgaben bleiben: vorher sichern, Designs unverändert, eigene Arbeit, Astra nicht stören, Live-Shop nicht ändern. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert. Dieses Paket definiert keine neuen Preise, Maße, Befestigungen, Optionen oder Freigaben und gestaltet keine Oberfläche um.

## Umsetzung

- Private Galerie: der Browser fordert den schlanken Vertrag mit `X-Gravuru-Resources: lazy-v1` an. Alte Aufrufer erhalten weiterhin das vollständige Modell. Der volle Editor und das Rückspeichern in dieselbe Galerievorlage bleiben bestehen.
- Lokale Konfi-Vorschau: derselbe Vertrag beim Abruf von `models.json`. Der eingebettete Shopify-Adminhost und der Online-Shop werden nicht umgestellt.
- Identische vollständige Schriftobjekte und native Grundplattenbilder erhalten je privater Serverinstanz dieselbe Inhaltsadresse. Der zufällige Namensraum trennt Instanzen; der Browser darf die Inhalte privat zwischenspeichern. Keine öffentliche Poolabfrage und keine Datenbankänderung.
- Der Browser prüft SHA-256 über die tatsächlich empfangenen Bytes. Grundplatten werden vor dem bestehenden Renderer exakt als ursprüngliche Data-URL wiederhergestellt. Kein PNG/WebP-Tausch und keine neue Maske. Fonts enthalten weiterhin sämtliche Zeichen, Varianten und Metadaten; keine Kürzung auf Vorlagentext.
- Der bestehende Schriftlader lädt die für die angezeigten Designs nötigen Schriften. Weitere private Produktschriften warten bis Schriftwahl, Textanlage oder Entwurfswiederherstellung. Eigene Schriften gewinnen weiterhin gegenüber gleichnamigen Bibliotheksschriften.
- Cache und Wiederherstellungsbeschreibungen sind begrenzt. Eine verdrängte Datei wird aus der fest gepinnten Revision erneut hergestellt und auf denselben Hash geprüft. Nicht exakt rekonstruierbare Zusatzschriften aus aktuell geänderten Profilen, lange Schriftkennungen und überzählige Indexeinträge bleiben vollständig inline. Die bestehenden fachlichen Grenzen werden nicht erweitert.
- Fehler bleiben sichtbar; sie erzeugen keine Ersatzschrift oder falsche Grundplatte. Wird auch die begrenzte Wiederherstellungsbeschreibung verdrängt, wird die alte Adresse abgewiesen; erneutes Öffnen des Modells stellt den Bezug wieder her.

## Sicherung

Privater Ordner: `work/checkpoints/browser-ressourcen-20261107`. Vor den Änderungen Codearchiv und vollständige eigene Edelstahl-, Schiefer- und Foto-Prüfkopien einschließlich SQLite-Sicherungen angelegt. 34 manifestierte Dateien, 439.694.495 Bytes. Alle 34 nach den Arbeiten erneut hashgleich.

- `code-6f859471-before.zip`: SHA-256 `3478b6a3be34e058e20b6f784aa3079f1be5f7b48c90133073038b9abf231ef9`; 4.458 ZIP-Einträge, Integrität geprüft.
- `BACKUP.json`: SHA-256 `682a73717977b302ca2f54ac4ab6c66643fb05df90ff69b7578d8383a0edd8e4`.
- Keine privaten Datenbanken, Fotos, Tokens oder Zugangsdaten in Git. Dies ist ausdrücklich keine neue Sicherung des laufenden Plesk-Servers.

Rückweg: nur das neue Browserpaket entfernen bzw. den Stand #190 starten. Es gibt durch diesen Schritt keine Datenmigration und keine Änderung an gespeicherten Designs. Die Rückwege der V5-Ablage stehen separat in der Übergabe zu #190.

## Nachweise

**84 gezielte Tests bestanden.** Backend-/Browser-Roundtrip, SHA-Fehler und Retry, Cacheverdrängung, gleichnamige unterschiedliche Fonts, Konturschriften, Entwürfe/Fotos, geschützte HTTP-Auslieferung, unveränderte Alt-API, Bundling, Galerie-Rückspeichern, Speicherkonflikte, Freigabestatus, Shop-Startprojektion und V5-Speicherung. Zwei bereits im Ausgangsstand fehlschlagende Lazy-Test-Hilfen an den bestehenden Foto-Wiederherstellungsablauf angepasst; `ux.mjs` nicht geändert.

```text
node --test --test-concurrency=1 app/workshop/browser-model-resources.test.mjs app/configurator/variant-m/browser-model-resources.test.mjs app/configurator/variant-m/lazy-resources.test.mjs app/configurator/variant-m/preload-queue.test.mjs app/configurator/variant-m/bundle-build.test.mjs app/workshop/gallery-editor.test.mjs app/workshop/gallery-editor-http.test.mjs app/workshop/shop-model-slim.test.mjs app/workshop/shop-start-model.test.mjs app/workshop/repository-resources.test.mjs
node scripts/check-browser-resource-parity.mjs --isolated-copy --data COPY --out NEW_REPORT.json
```

Windows: Buildtests nacheinander ausführen; native Fontprüfungen brauchen den dokumentierten Python-Laufzeitpfad und die bereits vorhandenen Audit-Abhängigkeiten. Das zweite Werkzeug liest nur explizite Testkopien, niemals den Sicherungsordner. Vollständiger Konfi-Build vorher vorhanden.

78 Modelle mit 236 Designs aus den vorhandenen eigenen Prüfbeständen nach vollständigem Nachladen **inhaltlich exakt gleich**, einschließlich Bilddaten, kompletter Fonts, Optionen, Maße und Fotoreferenzen. 74 Modelle im Edelstahl-Prüfordner (73 Edelstahlgruppen plus vorhandenes Referenzprodukt), zwei Schiefermodelle und zwei im Foto-Prüfordner. Relevante Dokumente während der Prüfung unverändert.

Konkreter Galerieabruf Schiefer D1000 / 30 × 20 cm: bisher 21.379.825 unkomprimierte Modellbytes. Jetzt 8.159.002 Modellbytes plus 1.509.184 Bytes für Grundplatte und drei benötigte Produktschriften; **3 von 30 Schriften beim Start**, insgesamt 9.668.186 statt 21.379.825 Bytes für diese Daten. Editor-/Bibliotheksdateien nicht eingerechnet; keine gemessene Ladezeit oder pauschale Netzwertersparnis behauptet. Beim nächsten Design können identische Ressourcen aus dem privaten Browsercache kommen.

Die sichtbare Browserabnahme ist **offen**: Die Browsersteuerung hält beim Test auf Port 8207 die Dokumentantwort des Editor-Iframes an. Der Elternrahmen meldet `about:blank`, keine Skripte und keine CSP-Verletzung; auch die Browserdiagnose meldet eine pausierte Dokumentantwort. Kein erfolgreicher Desktop-/Handytest dieses Pakets behauptet. Der bestehende sichere Zustand sperrt Speichern, solange der Editor nicht bereit ist. Keine Produktänderung zur Umgehung dieses Browserproblems vorgenommen.

[Bereinigte Prüfergebnisse](../reviews/2026-11-07-browser-ressourcen/verification.json), [Edelstahl](../reviews/2026-11-07-browser-ressourcen/steel-parity.json), [Schiefer](../reviews/2026-11-07-browser-ressourcen/slate-parity.json), [Foto](../reviews/2026-11-07-browser-ressourcen/photo-parity.json), [Galerieabruf](../reviews/2026-11-07-browser-ressourcen/gallery-network.json).

## Nächster Schritt und Optimierungsvorschlag

Vor Übernahme: sichtbare Abnahme des vollständigen Editors auf Desktop und Handy, Schriftwechsel, Speichern/Rücksprung/erneutes Öffnen. Danach gegen Astras dann aktuellen Stand integrieren. Eine Onlineübernahme benötigt eine frische Hostsicherung und einen eigenen Abnahmeschritt. Der private Plesk-Proxy reicht den neuen Header derzeit nicht weiter und setzt `no-store`; er bleibt in diesem Paket unverändert und darf nicht als bereits angeschlossen bezeichnet werden.

Nur vorgeschlagen, nicht umgesetzt: auch die großen Motivdaten gezielt nachladen. Sie machen beim gemessenen Schiefermodell noch einen erheblichen Teil des verbleibenden Modells aus. Das wäre ein eigenes Paket mit unveränderten Originalmotiven und eigener Paritätsprüfung.
