# Galerie-Lifecycle und vorbereitete Serverpakete: gesicherter Veröffentlichungskandidat

10.11.2026 · Codex/Mika · **lokal geprüft, keine Liveaktion dieses Autors**.

## Stand und Quellen

Quellcommit `3bfe6a3151517ffdfb78ba5e010ab55de0aeace0`, eigener Branch `dev/mika-performance-release-20261110`. Genau fünf Produktionsdateien: die zwei unveränderten Galeriequellen aus `6c310120d48daef12b16e9568916a62ecd278597` (Integration `8a067829`) plus die drei Serverquellen aus `333d77b4b98b4ce71fb2e4ae8b017d60b156d2d9`. Keine UI-, Preis-, Produkt-, Bindungs-, Profil- oder Datenbankänderung. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unangetastet.

- `app/configurator/variant-m/product-design-gallery.mjs`
- `app/workshop/ui/shop-design-switch.mjs`
- `app/configurator/variant-m/server.mjs`
- `app/workshop/acryl-employee-host.mjs`
- Neu: `app/workshop/prepared-editor-bundles.mjs`

Galerieabrufe pausieren während des Designwechsels; bereits vorhandene öffentliche Core-/R15-Bündel werden mit der bestehenden Acryl-Pfadumschreibung einmal im Serverspeicher vorbereitet. Host-/Origin-/Dateiprüfungen bleiben bestehen. Kein zweiter Renderer, Importer oder Preisweg.

## Installationsbeleg

Verbindliche Details und Vorher-/Nachherpins: [Paket-README](../../deliverables/r15-performance-followup-20261110/README.md), [Manifest](../../deliverables/r15-performance-followup-20261110/patch-manifest.json), [lokaler Build](../reviews/2026-11-10-performance-followup/local-build-proof.json), [neun Installerergebnisse](../reviews/2026-11-10-performance-followup/installer-verification.json).

Ausgangspunkt ist die gesicherte tatsächliche Runtime `767701ee59c14ef550b6b1c1468013869b8fe188` mit Wrapper-SHA `e679ca2dd1285c7925126bec3ef67bf1b775e080f6306e3210a996874b90d53c` und vorherigem HTML `c2cff8848d89b0a2260ed5a7f5d824e08b1837482241445d310606d4ee2545d4`. Alle 36 Styles, beide fremden aktiven Quellen und die bereits aktiven Server-/Trefferkorrekturen sind geschützt (51 Dateien insgesamt); zusätzlich Inventarvergleich der übrigen App.

Root meldete zunächst neue fremde UV-/Kontur-Veröffentlichungen. Sein frischer Read-only-Abgleich vom 10.11.2026, 05:46:19 UTC bestätigte für diese Runtime unveränderten Wrapper, vier genaue Vorherquellen, fehlenden neuen Helper und unverändertes HTML. **Der vollständige `--check` aller 51 Pins ist trotzdem Pflicht; keine Quellabweichung durch weichere Guards übergehen.** Die Serverprobe ist Roots Beleg, keine eigene Liveabnahme dieses Autors.

Installer und unabhängiger Review durch `module_backend`: kein belegter Blocker für exakt diese Baseline. Der Reviewer fand und verifizierte die eng behobene Publikationsreihenfolge: neuer Helper zuerst, dann Importer; bei Rücknahme Importer zuerst wiederherstellen, Helper zuletzt entfernen. Exklusive Erstellung verhindert Überschreiben einer inzwischen vorhandenen Datei. HTML wird atomar zuletzt ersetzt; alte Hashdateien bleiben durchgehend erhalten. Genau eine enge Sicherung, eigene Quittung, kein Wrapperwechsel und kein automatischer Neustart.

Neun lokale Prüfergebnisse auf echtem nativen Build: vollständig schreibfreies `--check`, falsche Quelle/geschützter Style/vorhandener Helper abgewiesen, neue Abhängigkeit vor Importern, Erfolg mit alten Hashdateien und gültigem OS-Gzip, Wiederholung gesperrt, Fehler vor HTML sowie nach HTML vollständig zurückgenommen. Linux-Festzielprüfung ausschließlich in isolierter Windows-VM-Fixture simuliert. Vier zusätzliche Transferfälle: Neuablage, identische Wiederholung ohne Write, abweichendes Gzip und abweichender Installer abgewiesen. Keine Testdopplung durch den Reviewer.

Frühere funktionale Belege bleiben getrennt: 24/24 Galerie-/Gatewayfälle, historische 12/12 synthetische lokale Browserfälle, 43 unterschiedliche vorbereitete-Bundle-/Hostfälle. Sie ersetzen keine aktuelle Kundenabnahme.

## Übertragung und nächster Schritt

Das [Archiv](../../deliverables/r15-performance-followup-20261110/r15-performance-followup-20261110.tar.gz) enthält genau fünf lesbare Kandidatenquellen, Installer/Gzip, Transfer und Belege. SHA-256 `74495e7bc443f74eb15019a29d6abf457a7496f29eb114f2d360ac29fb6501ea`, 84.992 Bytes. Installer `9aa96ac7f9cbbdc3a66a19c26e42b6621959134f1eb60b6ebe77f1cf02ab63b3` (29.452 Bytes), Gzip `964a211db4141d3c4df1695bdafd09c9590d579af517baaafcb69f122886a529` (16.208 Bytes). [Transfermanifest](../../deliverables/r15-performance-followup-20261110/transfer-manifest.json).

Einzelkommando [transfer-upload-command.txt](../../deliverables/r15-performance-followup-20261110/transfer-upload-command.txt) ist ausschließlich Übertragung: zwei Dateien exklusiv anlegen oder vorhandene identische Hashes akzeptieren; keine Installer-Ausführung. Alternative: elf Base64-Stücke bis 2100 Zeichen mit kumulativem Hash.

Erst anschließend führt Root den vollständigen lesenden Abgleich aus:

```sh
node /var/www/vhosts/gravuru-designwerkstatt.de/private/install-performance-followup-20261110.cjs --check
```

Nur bei exaktem Erfolg separat veröffentlichen. Erwarteter Kandidat: Core `editor-b9827ca8587a6c7b.mjs`, unverändertes R15 `editor-bf7d088b9bdf015e.mjs`; HTML `ddcdc1f39eabd95ea2d298d2940bc83f99df24b1fcf38b0cf8e7836c043d7993`. Neue enge Sicherung `pre-switch-backup/performance-followup-20261110-v1`, Quittung `performance-followup-20261110-receipt.json`. Beide dürfen vor Erstinstallation nicht existieren.

Danach gesonderter gezielter App-Neustart und echte Kundenprüfung: vollständiger Core-/Gzip-Abruf, Hostschutz, Produktstart, Designwechsel/Fehler/Zurück, Ladezeit. Der äußere Übertragungsengpass ist hiermit noch nicht als gelöst nachgewiesen. Browserabbruch garantiert keinen Abbruch bereits laufender serverseitiger Renderarbeit. Keine weitere Produkt-/Modulzuordnung als Nebenwirkung.
