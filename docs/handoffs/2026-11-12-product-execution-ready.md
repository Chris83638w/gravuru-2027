# Sieben Produktentwürfe: technische Vorarbeiten abgeschlossen

**STATUS: Ausführungsfreigabe des Nutzers noch offen. Keine Produktänderung durch diese Übergabe.** 12.11.2026 · Astra / Claude · #168, #230, #233.

Der Nutzer hat die eigene Shopify-Zugangserneuerung mit „fertig“ bestätigt. Claude hat den erneuerten Zugang tatsächlich verwendet und die erwartete aktive Version zweimal frisch vom Host gelesen. Es werden keine Zugangsdaten übernommen oder veröffentlicht.

Der [unabhängige Callback-Quellreview](../reviews/2026-11-12-functioncallback/README.md) ist abgeschlossen: kein offener konkreter Quellbefund. Originale und maschinenlesbare Checks liegen dort bytegleich bei. Dies ist die technische Grundlage für die einzelne Produktausführungsfrage, keine bereits erteilte Zustimmung.

| Anschluss | Vorhandener Nachweis | Grenze |
|---|---|---|
| Sechs DRAFTs | 15/15 vom Operator gemeldet; Quellen-/Empfangsreview | Native Serverkopie, synthetischer Shopify-Transport |
| Mainoperator v2 | 20/20 vom Operator gemeldet; Quellen-/Empfangsreview | Native Serverkopie, synthetischer Shopify-/Functionanteil |
| Echter R1-Ausgangsstand | 10/10 von Claude gemeldet, empfangene Dateien bytegeprüft | Native R1-/808- und Shopify-Lesung, kein R2, kein Produktwrite; voller privater Lesebeleg nicht geliefert |
| Frischer Functioncallback | 9/9 von Claude gemeldet, echter `createMainFunctionProbe`, zwei echte Lesungen | Über Probe nachgewiesen; finale `createConnections`-Verdrahtung folgt im autorisierten Lauf |

Die Kopienläufe und R1-Rückfragen sind in `fed1d31`, `8ba0aa1` und den dort verlinkten Reviews dokumentiert. [Callbackbeleg von Claude](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6829636214), Quelle [08cab5ee](https://github.com/Chris83638w/gravuru-2027/tree/08cab5ee/ops/plesk/functioncallback-20261112): unveränderter Reader `2a4ddc33fa888c458312ee0d9d0623b082c7dad72bdeb3fcfaf7488379a57d83`, unveränderter Mainoperator `de182709cb4c004d338f666186cfa2785b755a708605adcf4d58b0c25721f416`.

Aktive Version `gid://shopify/Version/1199363391489`, erwarteter Tag vom 08.11.; Snapshot `gid://shopify/Release/1189458739201` ist eine andere Kennung. Echte Beobachtungen 16:33:57.899Z und 16:35:02.807Z; Wiederverwendung innerhalb 60 Sekunden und erneute Lesung nach Ablauf sind belegt. Der WASM-SHA wird weiterhin aus dem bereits geprüften unveränderlichen Build zugeordnet, nicht als neu heruntergeladener Hash ausgegeben. Der Main-Preisbody mit 3.898 Bytes ist v2; seine sechs benötigten Formate sind belegt. v3 wird nicht benötigt und darf abgewiesen werden.

## Einmalig freizugebender Ausführungsumfang

- Bestehendes Acryl-Hauptprodukt `16190784602492`: alle 808 Shopifyvarianten-IDs und H1 erhalten; native R1→R2-Vorbereitung/Update, 778 Zielvarianten mit neuem Stand, 30 alte aktive R1-Varianten mit altem Preisvertrag. 158 Preissenkungen und 30 Größenbeschriftungskorrekturen ergeben 182 unterschiedliche Shopifyvarianten-Updates. Hauptpreisfeld auf den geprüften 3.898-Byte-Inhalt bringen, alte Verträge vollständig erhalten, neue bepreiste Bindungen und Katalogfreigaben anlegen.
- Sechs neue Shopify-DRAFTs: Acrylglas 3 mm und Edelstahl 1,5 mm jeweils 5×2, 6×2, 8×2 cm, insgesamt 45 Varianten. Tatsächliche native Produktpläne bestätigen/ausführen, tatsächliche cfg- und Shopify-IDs verwenden, Preisverträge/Bindings/Katalogfreigaben und Einstieg nach vorhandenem Ablauf herstellen. Die 16 aktiven Altprodukte bleiben unverändert.
- Alle sieben Shopifyprodukte bleiben DRAFT. Keine Veröffentlichung, Löschung, Bestellung, neue Appumschaltung oder Main-Merge. Bereits bestätigte Preise einschließlich 19 % MwSt., Aufpreise, Mengenrabatte, Designs, Starts, Uploadoptionen und H1 bleiben maßgeblich.

## Ablauf nach dem Ja

Claude sichert den konkreten Ausgangsstand und koordiniert das bereits geprüfte enge Main-Schreibfenster bei weiterlaufender App. Die finale Verbindung verwendet dieselben geprüften nativen Komponenten und den echten frischen Callback. Der R2-Plan kann erst nach dem dann autorisierten nativen Update erzeugt werden; er wird vor nachfolgenden Shopify-/Bindingaktionen gegen die festen Pins und den aktuellen Ausgangsstand geprüft. Neue IDs der sechs Produkte werden aus tatsächlichen Ergebnissen übernommen, nicht erfunden. Journal/CAS und vorhandene Wiederaufnahmeprüfungen gelten unverändert. Bei einer Abweichung den betroffenen Schritt anhalten und den tatsächlichen Stand klären; keine blinde Wiederholung.

Ergebnisse vollständig zurücklesen: Main 808 ursprüngliche IDs, 778 R2 + 30 aktive R1, 808 historische R1-Verträge; Main-Preisfeld und 182 Variantenänderungen; sechs neue DRAFTs/45 Varianten mit richtigen Preisen, Bindungen, Katalogzuordnung und Einstiegsmetafeldern. Neue Kennungen, Nachweise und tatsächliche Produktakten zentral in #168 und #233 übergeben. Quellreview und Nutzerfreigabe ersetzen keinen späteren tatsächlichen Ausführungs-/Readbackbeleg.
