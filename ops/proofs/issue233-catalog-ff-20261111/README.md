# Issue 233: gepinnter Katalog-Fast-Forward

## Nachtrag v2 – 11.11.2026

Der erste Server-Inspect wurde laut Root **ohne Katalogänderung** bei `git check-attr` mit `ENOBUFS` gestoppt. Bei `-z --stdin` müssen mehrere Eingabepfade ebenfalls NUL-getrennt sein. Der neue, getrennte `catalog-ff-v2.cjs` korrigiert ausschließlich `join(\'\n\')`/Zeilenende zu NUL-Trennung. Der v1-Runner bleibt als Nachweis unverändert und darf nicht mehr ausgeführt werden. **Es wurde kein Fast-Forward vorgenommen; die Übergabe an Astra 1 ist jetzt maßgeblich.**

V2: 15.887 Bytes, SHA256 `7104c52f22138ffae40d1f1a774674fe3ab7bc44a5d82c167955198a47001935`. Bundle und Manifest unverändert. Das vorhandene ZIP enthält v1; die v2-Datei muss separat und hashgeprüft daneben übertragen werden. Neuer erster Befehl: `node <privater Paketpfad>/catalog-ff-v2.cjs --inspect`. Noch keine v2-Serverabnahme.

Die kleine Testsuite ist mit v2 erneut **8/8 grün**, keine Skips. Der neue Test beobachtet die tatsächliche Git-Eingabe und Ausgabe: NUL-getrennte Dateinamen, exakt zwei Attributzeilen je einzelnem Pfad. FF/Erhalt lokaler Änderungen/erzwungener Rollback bleiben grün. Test-Fixtures liegen jetzt unter einem kanonischen temporären Pfad, um Windows-Git-Pfadlängen und 8.3-Aliasnamen zu vermeiden; keine Produktionspfadregel geändert.


Stand 11.11.2026, Codex-Unteragent. **Lokal vorbereitet, nicht auf dem Server ausgeführt.** Die bestehende Suchfeld-Vorschau auf `http://127.0.0.1:8240/steel` bleibt unverändert.

## Paket und feste Grenzen

- Katalog: `/var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-katalog-20261102` (durch Root per tatsächlichem `git rev-parse --show-toplevel` bestätigt).
- Branch: `issue139-catalog-20261102`.
- Ausgang: `b5d8f28bc1b634412e628c2967fde587a92ff2fb`.
- Ziel: `8236b8bfab7322447ec46661c116fa526331af3d`.
- 552 Änderungen: 168 neue, 384 geänderte, 0 gelöschte Dateien; Zielinhalt dieser Dateien 44.654.866 Bytes.
- Keine App-, Theme-, DB-, Shopify-, Pfadumschalt- oder Neustartaktion.
- Lokales Quellrepo `work/gravuru-katalog`: ausschließlich Git-Objektbefehle; kein Checkout/Reset. Nur eigener Ref `refs/heads/mika-catalog-ff-20261111` ergänzt.

| Datei | Bytes | SHA256 |
|---|---:|---|
| `catalog-8236b8bfa.bundle` | 19969680 | `f8c43ef7977be31b6d50f6800c8f3f89a23b0762c5430dc67fafe6097d207a5a` |
| `manifest.json` | 552885 | `5cca0332016c40d99ecbf2aaf93e9897c81d4e4fbaa39df83dc2635b5b414b3f` |
| `catalog-ff.cjs` | 15887 | `5a2a5e9893eb0bf4870c2541062a1a6f8bfdc21df265dc8fe2b213442ab569ff` |

Das Bundle enthält genau einen Zielref und setzt nur den Ausgangscommit voraus. `git bundle verify` war im vorhandenen lokalen Katalog erfolgreich. Alle drei Dateien gemeinsam in einen privaten Paketordner übertragen und die Hashes prüfen.

## Erst nur prüfen

```sh
node /ABSOLUTER/PRIVATER/PAKETPFAD/catalog-ff.cjs --inspect
```

Dieser Modus schreibt weder Katalogdateien noch Git-Refs/Index. Er prüft feste Pfade, Branch/HEAD, Bundle, genau die drei gemeldeten schmutzigen Dateien, alle 552 betroffenen Ausgangsdateien und ausstehende native Schreibsperren/Journaldateien. Unerwartete lokale/stagierte/unversionierte Dateien, Umwandlungsfilter, Symlinks, Hardlinks oder Hashabweichungen führen zum Stopp. Er berechnet den konkreten lokalen Dreiwege-Merge; Erfolg wurde noch **nicht** auf den tatsächlichen drei Serverdateien belegt.

Die drei lokalen Ausgangs-SHAs sind im Manifest fest eingetragen. Der Zielcommit ändert beim D20-JSON lediglich `mindestFlaecheCm2: 54` und `mindestGroesse: "9 × 6 cm"`. JSON wird auf unabhängigen Blättern zusammengeführt, Arrays werden als Einheit behandelt; konkurrierende Werte/Entfernungen stoppen. Das Audit muss auf beiden Seiten bytegenau mit dem ursprünglichen Audit beginnen, aus vollständigen JSON-Zeilen bestehen und mit Zeilenumbruch enden. Ergebnis: Basishistorie, vier Zielzeilen, lokale Ergänzungen. Bestehende Auditzeilen werden nicht neu serialisiert oder sortiert. Die lokale SVG bleibt vollständig bytegleich; der Zielcommit darf sie nicht ändern.

## Gesicherte Übernahme nach grünem Prüfer

Nur der Operator führt dies aus, nachdem parallel schreibende Importer und Git-Prozesse nachweislich beendet sind. Der native Dashboard-Writer wird zusätzlich durch dessen vorhandene Sperre ausgeschlossen. Der Schalter ist eine ausdrückliche Operatorbestätigung, keine automatische Prozessprüfung.

```sh
node /ABSOLUTER/PRIVATER/PAKETPFAD/catalog-ff.cjs --apply --writers-stopped
```

Neue Sicherung: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-catalog-ff-20261111/<UTC-Zeit>-<UUID>/`.

Gesichert werden alle 553 möglicherweise betroffenen Dateipfade (552 Zieländerungen plus lokale SVG), vorhandene Bytes und Modi, Abwesenheit neuer Dateien, Original-Index/HEAD, Status und ein festgehaltener Base-Ref. Das ist eine vollständige Sicherung des **betroffenen Zustands**, keine neue Kopie aller unveränderten Katalogdateien. Jede Sicherungsdatei wird geprüft; bestehende Backups werden nie ersetzt.

Danach wird das Bundle in einen eigenen Ref geladen, alle Vorbedingungen nochmals geprüft, die drei lokalen Dateien kurz auf ihre gesicherte Basis gebracht, der exakte `--ff-only` durchgeführt und die drei vorbereiteten Ergebnisse atomar eingespielt. Der Endzustand prüft sämtliche betroffenen Bytes, Branch/HEAD und nur die erwarteten verbliebenen lokalen Unterschiede. Keine lokalen Änderungen werden committed oder gestasht.

`success.json` ist der Erfolgsbeleg. Ein abgefangener Fehler löst ausschließlich bei weiterhin bekannten HEAD-/Index-/Dateiwerten die verifizierte Wiederherstellung aus; `rollback.json` belegt sie. Fremde Änderungen werden nicht überschrieben. Ein Prozessabbruch oder nicht verifizierbarer Rollback lässt eine bewusst von nativen Schreibern nicht interpretierbare `.werkstatt-write-journal.json` zurück und erfordert manuelle Prüfung des genannten Backups. Die Markierung nicht blind löschen. Der Runner führt keinen automatischen zweiten Versuch aus.

## Lokale Nachweise und Grenze

`node --check catalog-ff.cjs` erfolgreich. `node --test catalog-ff.test.cjs`: **7/7 bestanden**, keine Skips. Echte, ausschließlich dafür neu erzeugte lokale Git-Repositories wurden verwendet:

1. Unabhängige JSON-Blätter, neue Schlüssel und lokale Löschung erhalten.
2. Konkurrierende Blätter/Arrays abgewiesen.
3. Beide Audit-Ergänzungen bytegenau erhalten; geänderter Präfix/unvollständige Zeile abgewiesen.
4. Inspect ohne HEAD-/Indexänderung; echter Fast-Forward mit drei erhaltenen lokalen Änderungen.
5. Erzwungener Fehler nach Fast-Forward: HEAD, Index, lokale Bytes und Abwesenheit neuer Datei exakt wiederhergestellt.
6. Zusätzliche lokale Datei und geänderte gepinnte SVG stoppen.
7. Native Sperre oder ausstehendes Journal stoppen.

Diese Tests beweisen nicht die Konfliktfreiheit der tatsächlichen Serverdateien. Dafür ist der oben genannte Inspect erforderlich. Die Laufzeit-/Cachewirkung eines Katalogupdates auf einen bereits laufenden Kundenprozess ist ausdrücklich nicht Teil dieses Pakets; keine App-Neustarts vorgenommen.
