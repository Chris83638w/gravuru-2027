# Konkreter Einbaupatch für private Fotowiederöffnung

Dieser Bereich enthält einen ausführbaren Store-Baustein und einen **noch nicht eingebauten oder veröffentlichten** Patch für `Chris83638w/gravuru-2027@bf5c059f13e0868d7c554616b7c35ff7a328ae62`. Der vorhandene Konfigurator und alle Live-Daten bleiben unverändert.

## Einbauumfang

`native-photo-persistence.patch` enthält genau sieben Zielpfade:

1. `app/workshop/acrylic-review.mjs`: friert die übermittelte Eingabe vor Validierung und erster asynchroner Arbeit ein und legt deren kanonischen SHA-256 im serverseitig erzeugten und archivierten Manifest ab.
2. `app/workshop/acrylic-draft-store.mjs`: erweitert die bestehende `BEGIN IMMEDIATE`-Transaktion um das optionale private Fotopaket; bestehende Token-, Mandanten- und Revisionsprüfung bleiben bestehen. Ein bereits mit Fotopaket gespeicherter Entwurf darf dieses bei späteren Revisionen nicht still verlieren.
3. `app/workshop/http.mjs`: ergänzt ausschließlich den bestehenden nativen Entwurfspfad. Der vorhandene `prepareAcrylicReview`-Aufruf, Bilddecoder, Sitzung/CSRF, Jobschutz und das Requestlimit von 100 MiB bleiben erhalten. Der ergänzte Import dient nur der Transport-Deduplizierung.
4. `app/workshop/photo-persistence/photo-reopening.mjs`: geprüfter Paket-Codec.
5. `app/workshop/photo-persistence/photo-reopening-transport.mjs`: deduplizierter Transport und Wiederauflösung.
6. `app/workshop/photo-persistence/server/native-photo-reopening-store.mjs`: private Persistenz in **einer zusätzlichen Tabelle derselben DatabaseSync-Verbindung**.
7. `app/workshop/photo-persistence/server/native-input-binding.mjs`: gemeinsamer kanonischer Input-Digest und unveränderlicher Eingabestand.

Kein zweiter Server, keine zweite Datenbank, kein neuer öffentlicher Dateipfad und keine Änderung an Shopify. Die bisherigen Tabellen und Datensätze bleiben erhalten. Die neue Tabelle enthält vollständiges Paket und nativen Input je unveränderlicher privater Entwurfsrevision. Originalfotos und weitere Bearbeitungsfassungen gehören dadurch auch in die bestehenden privaten Datenbanksicherungen.

## Verwendbarer Vertrag

Clientseitig erstellt `capturePhotoReopening` den vollständigen privaten Stand. `encodePhotoReopeningTransport({packet,input,expectedRevision?})` erzeugt **einmal** `serializedBody`; genau diese unveränderliche Zeichenfolge ist später zu übertragen. Sie enthält `{input,reopening}` beziehungsweise zusätzlich `expectedRevision`. `reopening` hat die Transportversion `gravuru-photo-reopening-wire/v1`.

Original-/Ergebnisbytes, die bereits im nativen `input.media` stehen, werden im Transportpaket durch eng begrenzte `{mediaIndex,field}`-Verweise ersetzt. Nur zusätzliche Zwischenfassungen oder versteckte Bilder erhalten zusätzliche Base64-Daten. Der Server löst diese Referenzen vor der vollständigen Prüfung wieder auf. Im privaten Speicher bleibt das Paket vollständig und eigenständig. Keine Datei wird dafür kleiner gerechnet.

Der Encoder prüft die Größe des gesamten serialisierten HTTP-Bodys einschließlich Vorschau und erwarteter Revision. Obergrenze bleibt 100 MiB; der Aufrufer darf sie nur herabsetzen. Vier synthetische Maximaldateien zu je 15 MiB wurden als Grenzfall geprüft: etwa 80 MiB übertragene Bildkodierung plus Metadaten, keine weitere Kopie derselben Bytes im Sidecar. Zusätzliche Bearbeitungsfassungen unterliegen weiterhin der ausdrücklich dokumentierten Gesamtgrenze von 60 MiB für das private Paket. Ein darüber liegender Stand wird vor dem Versand gesperrt. Request- oder RAM-Limits wurden nicht angehoben; dies ist kein Lasttest des Plesk-Limits.

Nach dem Patch sind folgende Aufrufe im bestehenden geschützten Bereich vorgesehen:

- `GET /api/workshop/acrylic-drafts?capabilities=1`: versionierte Fähigkeit, vor vollständigem Anbindungsnachweis weiterhin `active:false`.
- `POST /api/workshop/acrylic-drafts`: vorhandene native Eingabe plus optionaler wire-Sidecar. Neue und bisherige Entwürfe bleiben möglich.
- `POST /api/workshop/acrylic-drafts/:id`: ebenso, mit bestehendem Entwurfstoken und `expectedRevision`.
- `GET /api/workshop/acrylic-drafts/:id?reopening=1`: vollständiges privates Paket und zugehöriger Input; das vorhandene Entwurfstoken bleibt erforderlich. Ohne diese explizite Abfrage bleibt die bisherige Antwortform erhalten.

Intern bereitet `preparePhotoReopening` alle Daten **vor** der SQLite-Transaktion vor. Jede Bildfassung muss durch den tatsächlich bereitgestellten `prepareCustomerPhoto`-Decoder laufen; eine MIME-Angabe reicht nicht. Das Ergebnis ist ein nicht serialisierbares internes Ticket. Ein Ticket gehört genau zu Storeinstanz/Mandant, Snapshot, Archivhash und dem vom nativen Review erzeugten Input-Digest. Text A im Prüfstand und Text B im Fotopaket werden auch bei identischem Produkt/Design/Revision abgelehnt. Auch nachträgliche Input-Mutation oder ein Altbundle ohne Digest wird abgelehnt.

Die anschließende Aufnahme läuft synchron auf derselben SQLite-Verbindung innerhalb der bereits vorhandenen Transaktion. Nachprüfbar sind native Archivzeile, Entwurfsrevision und Fotopaket entweder gemeinsam vorhanden oder gemeinsam zurückgerollt. Weder berechtigte Wiederöffnung noch gültige Prüfsummen geben Fertigungs-, Bestell- oder UI-Rechte frei. `candidateEditorState` bleibt bis zur vollständigen bestehenden Rechteprüfung ein Kandidat. Der Baustein ersetzt keine UI-Zustände selbstständig.

## Anwendung und Prüfung

Die folgenden Befehle sind für eine **gesonderte geprüfte Backend-Arbeitskopie** gedacht; in dieser Aufgabe wurden sie nur auf einer Wegwerfkopie der gepinnten Quellen ausgeführt:

```text
git -c core.autocrlf=false apply --check native-photo-persistence.patch
git -c core.autocrlf=false apply native-photo-persistence.patch
```

`core.autocrlf=false` erhält dabei die geprüften Dateibytes. Die drei Patchbuilder verweigern unbekannte Ausgangsdateien anhand ihrer SHA-256-Prüfsumme. `upstream/SOURCE-MANIFEST.json` dokumentiert die aus GitHub gelesenen Originalquellen einschließlich Git-Blob-SHA und SHA-256. Die Originaldateien sind unverändert.

Neu erzeugen aus dem Pilotordner:

```text
node photo-persistence/server/build-server-patch.mjs
node --test photo-persistence/*.test.mjs photo-persistence/server/*.test.mjs
```

Node.js 24; Git wird nur für die Patch-Erzeugung/-Anwendung benötigt. Der Prüflauf arbeitet mit temporären Testdatenbanken und synthetischen Bildern.

Tatsächlich geprüft: 40 Foto-/Transport-/Servertests, davon echte SQLite-Transaktionen mit gepatchtem **Original**-Draftstore, Datei-DB schließen/neu öffnen, zwei konkurrierende DB-Verbindungen, Archiv-/Fotoinsertfehler samt vollständigem Rollback, alte Revisionen, Fremdtoken/Mandant, nicht serialisierbare Tickets, Downgrade-Sperre, native Input-Bindung und die 4×15-MiB-Transportgrenze. Zusätzlich wurde der Gesamtpatch auf einer vollständigen Wegwerfkopie der betroffenen Quellen angewendet: alle sieben Zieldateien entsprechen exakt den Patchbuilder-Ergebnissen und bestehen `node --check`.

Offen bleiben die vollständige HTTP-Anwendungsprüfung mit realer Sitzung/CSRF sowie dem bestehenden Produkt-/Schrift-/Bildbestand und dem tatsächlichen Python/Pillow-Decoder, ein End-to-End-Lauf auf dem bestehenden Server und die explizite Integration in den Editor. Die SQLite-Tests nutzen einen klar bezeichneten kleinen Testdecoder, der die synthetischen PNGs inklusive CRC und Pixelstrom prüft; er wird **nicht** in den Produktivpatch aufgenommen. Der native Review-Baustein hat weitere bestehende Anwendungsabhängigkeiten; diese wurden nicht nachgebaut oder als geprüft ausgegeben. Die vorhandene Codec-/Transport-Sendefreigabe bleibt daher unverändert gesperrt.
