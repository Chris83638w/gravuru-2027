# #233: gesichertes Paket für den Katalog-Fast-Forward

Codex/Mika, 11.11.2026. **Vorbereitet und lokal geprüft; in dieser Übergabe keine Serverausführung behauptet.** Root/Operator überträgt das private Paket über Plesk. Kein Kundenaufbau, App-Code, Theme, DB oder Shopify wird durch dieses Paket geändert; kein Neustart vorgesehen.

## Festgehaltener Auftrag und Ausgang

Autorisiert ist ausschließlich der Katalog-Fast-Forward von `b5d8f28bc1b634412e628c2967fde587a92ff2fb` zu `8236b8bfab7322447ec46661c116fa526331af3d`, unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-katalog-20261102`, Branch `issue139-catalog-20261102`. Root hat den tatsächlichen Serverpfad per Git bestätigt und den Eingriff in [#233 angekündigt](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6791980087).

Drei lokale Änderungen bleiben erhalten: D20 `design.json`, `design.svg` und das zugehörige `_aenderungen.jsonl` unter `designs/edelstahl-gravur-oval-90x60/`. Ihre erwarteten SHA256 und die ursprünglichen Git-Bytes sind im festen Manifest enthalten. Das Ziel berührt JSON und Audit, nicht die lokale SVG. JSON-Blattkonflikte oder nicht append-only fortgeführte Audits führen zum Stopp.

## Gesicherte Dateien

- [Runner](../../ops/proofs/issue233-catalog-ff-20261111/catalog-ff.cjs), [Tests](../../ops/proofs/issue233-catalog-ff-20261111/catalog-ff.test.cjs), [Manifest](../../ops/proofs/issue233-catalog-ff-20261111/manifest.json), [Prüfnachweis](../../ops/proofs/issue233-catalog-ff-20261111/proof.json).
- [Vollständige Bedienung, Sicherung und Rücknahmegrenzen](../../ops/proofs/issue233-catalog-ff-20261111/README.md).
- Private Originalartefakte liegen lokal unter `outputs/issue233-catalog-ff-20261111/`. Die Git-Kopie des Runners und Manifests ist bytegleich dazu. Bundle und ZIP werden nicht in Git eingecheckt.

| Artefakt | Bytes | SHA256 |
|---|---:|---|
| `mika-catalog-ff-20261111-v1.zip` | 21314817 | `5875f5a93f4c704b25868b5e52cbc70f052e3a8c8faf79a9cffb8da587973a44` |
| `catalog-8236b8bfa.bundle` | 19969680 | `f8c43ef7977be31b6d50f6800c8f3f89a23b0762c5430dc67fafe6097d207a5a` |
| `manifest.json` | 552885 | `5cca0332016c40d99ecbf2aaf93e9897c81d4e4fbaa39df83dc2635b5b414b3f` |
| `catalog-ff.cjs` | 15887 | `5a2a5e9893eb0bf4870c2541062a1a6f8bfdc21df265dc8fe2b213442ab569ff` |

Das Bundle setzt ausschließlich den Ausgangscommit voraus. `git bundle verify` war lokal erfolgreich. Es umfasst den Git-Objektübergang mit einem eigenen Zielref; kein Checkout/Reset des absichtlich leeren lokalen Katalog-Arbeitsbaums wurde vorgenommen. Der Zielbaum ändert 552 Dateien: 168 neu, 384 geändert, keine gelöscht.

## Nachweise und nächster Schritt

Syntaxprüfung erfolgreich; sieben lokale Tests bestanden, keine Skips. Sie prüfen unabhängige/konkurrierende JSON-Änderungen, Audit-Präfixe, vollständigen Fast-Forward in einem neu angelegten Git-Testrepo, Erhaltung der drei lokalen Änderungen, exakten Rollback von HEAD/Index/Dateien nach einem absichtlichen Fehler und Stopp bei fremden Änderungen/Schreibsperren. `proof.json` ist eine Zusammenfassung des tatsächlich beobachteten Testlaufs, kein Rohprotokoll. Die kleine Suite wurde für die Git-Sicherung nicht nochmals wiederholt.

Zuerst führt Root **nur** `node <privater Paketpfad>/catalog-ff.cjs --inspect` aus. Erst damit wird der tatsächliche Server-JSON-/Audit-Merge belegt. Danach darf Root bei nachgewiesenem Stillstand aller unabhängigen Git-/Importer-Schreiber `--apply --writers-stopped` ausführen. Der Runner nimmt zusätzlich die native Dashboard-Schreibsperre.

Sicherung: exklusiver Zeit-/UUID-Ordner unter `private/mika-catalog-ff-20261111`, alle 553 betroffenen Pfade inklusive ihrer vorherigen Abwesenheit, Original-Index/HEAD, Prüfsummen und Base-Ref. Dies sichert den vollständigen **betroffenen** Zustand, erstellt aber keine weitere Kopie sämtlicher unveränderter Katalogdaten. Bekannte Fehler werden geprüft zurückgenommen; fremde Zwischenänderungen stoppen die Rücknahme. Bei Prozessabbruch bleibt eine Journalmarkierung, die native Schreiber bis zur manuellen Operatorprüfung blockiert.

Offen bleiben die tatsächliche Serverabnahme, ausreichend freier Speicher/Berechtigungen, der bestätigte Stillstand unabhängiger Schreiber und die Cachewirkung auf bereits laufende Leser. Keine Zeitgarantie. Keine automatische App-Neuladung oder Dashboard-Kaltabfrage. Der separate C-Suchfeldvorschlag bleibt unter `http://127.0.0.1:8240/steel` bestehen und ist nicht Bestandteil dieses Katalogeingriffs.
