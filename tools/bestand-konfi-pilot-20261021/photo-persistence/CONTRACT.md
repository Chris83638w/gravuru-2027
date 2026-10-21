# Verlustfreie Fotowiederöffnung – lokaler Baustein und Servervorschlag

Stand: 21.10.2026. Der bestehende Serververtrag wurde auf `Chris83638w/gravuru-2027`, Branch `dev/konfi-neu-20261019`, Commit `bf5c059f13e0868d7c554616b7c35ff7a328ae62` geprüft. Dort nimmt `app/workshop/acrylic-review.mjs` für Medien nur `id`, `original`, `edited` an. Dieses neue Paket ist **kein dort bereits unterstütztes Eingabefeld**. Es wird weder an den Server gesendet noch in den unveränderten Konfigurator eingebaut.

## Was implementiert ist

`photo-reopening.mjs` stellt drei einbaubare, netzwerkfreie Funktionen bereit:

```js
const {packet, gates} = await capturePhotoReopening({
  model, draft, editorState, files, nativeInput
});

const checked = await validatePhotoReopening({packet, model, nativeInput});

const restored = await restorePhotoReopening({
  packet, model, nativeInput,
  createObjectURL: blob => URL.createObjectURL(blob),
  revokeObjectURL: url => URL.revokeObjectURL(url)
});
// restored.files: Map im Format des vorhandenen Fotoeditors
// restored.candidateEditorState: vollständig, aber noch nicht zur Anwendung freigegeben
// restored.dispose(): alle von dieser Wiederherstellung erzeugten Blob-URLs freigeben
```

`model` muss aus der vorhandenen, vertrauenswürdigen Produktabfrage stammen. `draft` ist der echte September-Entwurf. `editorState` ist der vollständige Zustand **vor** `customerDraft`/`cleanObject`; andernfalls sind zuvor entfernte unbekannte Felder nicht rekonstruierbar. Beide Zustände müssen in Objektfolge, gemeinsamen Objektfeldern und Optionen übereinstimmen. Unterschiedliche Maße werden abgelehnt. Dateien und Metadaten werden vor asynchroner Kodierung eingefroren.

`files` ist die bestehende Map mit `file`, optional `blob`, `photoEdit`, Abmessungen und lokalen URLs. Die Suche nach einer älteren Bearbeitungsquelle verwendet ausschließlich dort vorhandene URL-zu-Blob-Beziehungen. Wenn eine frühere Zwischenfassung nicht mehr in der Map steht, kann der Aufrufer deren tatsächlich vorhandenen Blob explizit als `editSourceBlob` bereitstellen. Eine URL allein genügt nicht; es gibt keinen Download und keinen Ersatz durch eine andere Fassung.

Der portable Prüfer kann später in einem privaten Server-Speicherweg verwendet werden. Er prüft Struktur, Produktbindung, Referenzen und Prüfsummen, dekodiert Bilder aber nicht als Pixel und erteilt keine Berechtigungen. Die Bilddekodierung des vorhandenen Servers bleibt erforderlich. Die Wiederherstellungsfunktion erzeugt lokale Blob-URLs erst nach erfolgreicher Prüfung und räumt sie bei einem Teilausfall wieder auf.

## Paket `gravuru-photo-reopening/v1`

| Feld | Inhalt |
| --- | --- |
| `schema` | Fest `gravuru-photo-reopening/v1`; andere Versionen werden abgelehnt. |
| `binding` | Exakte cfg_-ID, Produktrevision, Profilrevision und Design-ID. |
| `documents.draft` | Unveränderter September-Entwurf (`v2` oder universelles `v1`). |
| `documents.editorState` | Vollständiger JSON-Zustand einschließlich der von alter Whitelist ausgelassenen nativen Felder. |
| `documents.templateObjects` | Unveränderte Vorlagenobjekte der gebundenen Produktrevision; beim Lesen Abgleich mit dem vertrauenswürdigen aktuellen Modell dieser Revision. |
| `media[]` | Upload-ID, zugehörige Objekt-IDs, Original-, Ergebnis- und tatsächliche Bearbeitungsquellreferenz sowie vollständige Dateimetadaten. |
| `blobs` | Nach SHA-256 adressierte Bildbytes mit MIME-Typ, Dateigröße und kanonischem Base64. Gleiche Bytes werden einmal gespeichert. |
| `nativeInputSha256` | Optional für lokale Sicherungen; für die vorgeschlagene Serveranbindung verpflichtend. Bindet exakt den zugehörigen nativen Input. Produkt, Design, Objektinhalt und explizite Optionen müssen bereits bei Erzeugung übereinstimmen. |
| `integrity` | SHA-256 über das gesamte kanonisch sortierte Paket ohne dieses Feld. |

Originaldateiname und Änderungszeit werden erhalten, soweit das Original ein `File` ist. Die drei Rollen Original / Ergebnis / Bearbeitungsquelle dürfen auf dieselben oder verschiedene Binärdateien zeigen. `photoEdit` enthält unverändert `angle`, `flip`, `zoom`, `x`, `y`, `shape`, `color`; es wird nicht in das anders gemeinte `uxPhotoCrop` umgedeutet. `width`/`height` bleiben erhalten. Die Freistellwünsche `keep`/`remove` bleiben an den jeweiligen Objekten.

Alle momentan referenzierten Bilder werden gesichert, auch bei ausgeblendeten Objekten und Hilfsebenen. Sie werden beim Wiederöffnen nicht automatisch eingeblendet. Mehrere Objekte können ein Bild nutzen und verschiedene Freistellwünsche behalten. Nicht mehr referenzierte Bilder werden nur gelesen, soweit sie die tatsächliche Bearbeitungsquelle eines verwendeten Bildes liefern. Eine vollständige Undo-Historie sowie bereits gelöschte und nicht mehr referenzierte Bilder sind **nicht** Teil dieses Vertrags. Vorlagengrafiken, Motive und Materialdateien bleiben Ressourcen der gebundenen Produktrevision; sie werden nicht als Kundenfotos dupliziert.

Die Integritätsprüfung schützt vor Beschädigungen und vertauschten Dateien, **nicht vor absichtlicher Manipulation durch den Ersteller**. Ein Angreifer kann eigene Hashes berechnen. Deshalb gibt es keine Berechtigungsfreigabe aus einem gültigen Hash.

## Unveränderte Sicherheitsgrenze

Alle erfolgreichen Ergebnisse behalten:

```js
{
  localRoundtripComplete: true,
  serverPersistenceSupported: false,
  nativeSendAllowed: false,
  stateApplicationAllowed: false,
  requiresServerObjectRightsValidation: true,
  checkoutAllowed: false,
  productionAllowed: false
}
```

Der bestehende native Adapter bleibt ebenfalls unverändert gesperrt, wenn sein Vertrag Daten verlieren würde. Ein zusätzliches Paket hebt diese Sperren nicht auf. Angebliche Serverfähigkeiten aus einem Aufruferobjekt werden nicht als Freigabe angenommen.

Der wiederhergestellte Zustand heißt bewusst `candidateEditorState`. Die Funktion ersetzt weder `el.state` noch ein Serverprodukt. Feste Vorlagendaten werden beim Lesen gegen das echte Modell verglichen. Abweichungen bei unter anderem `customerEditable`, `technicalLocked`, `locked`, `role`, `surfaceId`, `acrylicFixed`, Masken und Asset-IDs erzeugen zusätzliche Sperrgründe. Auch ohne solche Abweichungen muss der Server die vollständigen Objektrechte prüfen. Unbekannte native Felder bleiben verlustfrei erhalten, erhalten dadurch aber keine Ausführungs- oder Berechtigungsautorität.

Grenzen: vier referenzierte Bilder, zwölf unterschiedliche Binärdateien, 15 MiB je Bild, 60 MiB Bildbytes insgesamt, 2 MiB Metadaten, 84 MiB serialisiertes JSON, maximale JSON-Tiefe 40. Die 60 MiB umfassen Originale, Ergebnisse und Zwischenquellen gemeinsam. Ein Paket darüber wird abgelehnt statt verkleinert. Diese Grenzen sind ein expliziter Vorschlag für die spätere private Persistenz; sie behaupten keine derzeitige HTTP-Serverkapazität.

## Noch notwendige Serveränderungen

1. **Versionierter Vertrag:** Neben dem unveränderten nativen `input` eine ausdrücklich definierte private Wiederöffnungsreferenz beziehungsweise ein solches Paket annehmen. Kein unbekanntes Feld in die heutigen strikten Medienobjekte einschleusen. Die konkrete Route und Antwortform müssen im Backend implementiert und anschließend geprüft werden.
2. **Authentifizierung und Besitzerbindung:** Bestehende Händlersitzung/Kundenbesitz, CSRF, Entwurfstoken und erwartete Entwurfsrevision weiterverwenden. Keine zusätzliche unabhängige Datenbank oder öffentliche Ablage. Die sidecar-Daten dürfen nicht über öffentliche Vorschaulinks ausgeliefert werden.
3. **Atomarer Speicherweg:** Native Eingabe, Paket-Hash, private Blobs und Entwurfsrevision zusammen sichern. Erst nach vollständiger Prüfung umschalten. Bei einem Fehler bleibt die vorherige Revision vollständig. Wiederholte Übermittlungen benötigen die bestehenden beziehungsweise neu geprüften Idempotenz-/Revisionsregeln.
4. **Vertragsprüfung:** Festes cfg_/Revision/Design, `nativeInputSha256`, Objekte, Optionen, jede Bildreferenz und jede Prüfsumme prüfen. Alle Blob-Bytes einschließlich versteckter Fotos und Zwischenfassungen mit dem bewährten Bilddecoder prüfen; MIME-Angabe allein ist kein Bildnachweis. Paket-/Requestlimits vor Speicherallokation durchsetzen.
5. **Rechte und Produktion:** Rechte, Sperren, feste Geometrie und Preise ausschließlich aus dem gebundenen Serverprodukt und der gültigen nativen Prüfung übernehmen. Unbekannte Felder nur für Wiederöffnung behalten, solange ihre Ausführung nicht ausdrücklich validiert wird. Versteckte Fotos bleiben im privaten Bearbeitungsbestand und werden dadurch nicht als aktive/zu berechnende Fotos behandelt.
6. **Private Rückgabe und Lebenszyklus:** Exakt denselben Wiederöffnungsstand per berechtigtem Entwurfsabruf zurückgeben. Wiederherstellung auf anderem Rechner prüfen. Aufbewahrung, Löschung und private Sicherungen müssen alle referenzierten Fassungen berücksichtigen; geteilte Hashes dürfen keine Besitzergrenzen aufheben.
7. **Nachweis statt Fähigkeitsbehauptung:** Erst nach realem Speichern, erneutem Abrufen, erneutem Öffnen/Bearbeiten und Revisionskonfliktprüfung darf eine neue serverseitige Fähigkeit als unterstützt gelten. Die aktuellen `false`-Gates werden in diesem Baustein nicht verändert.

## Tests und Grenzen des Nachweises

```text
node --test photo-persistence/photo-reopening.test.mjs
```

Node.js 24, keine Zusatzpakete. Die synthetischen Tests verwenden den bytegleich gesicherten originalen September-Serializer. Sie prüfen JSON-Roundtrip, verschiedene Bildfassungen, wiederholtes Öffnen, versteckte/gemeinsam verwendete Bilder, unbekannte native Felder, Freistellwünsche, Quellenverlust, Manipulation, Größenlimits, Rechteanhebung und Freigabe lokaler URLs. Sie sind keine Browser-Pixelprüfung, keine Bildqualitätsprüfung und kein erfolgreicher Server-/Shopify-Durchlauf.

Lokale Referenz für die Parametersemantik: unveränderter `work/konfigurator-update-bis-20261016/configurator/variant-m/photo-editor.mjs`, insbesondere Erzeugung des neuen Dateieintrags und Laden von `editSourceUrl`/`originalUrl`; native Vertragseinschränkungen aus dem oben genannten gepinnten Commit.

Ein tatsächlich erzeugtes Paket enthält private Bilddaten und gehört **nicht auf GitHub oder in öffentliche Protokolle**. Im Pilot liegen ausschließlich Quelltext, Vertragsbeschreibung und synthetische Testdaten.
