# gravuru Studio · Designprobe und Prüfergebnis

Stand 18. November 2026. Der eigenständige Pilot zeigt den Weg vom vorhandenen Heimathafen-Design über die Personalisierung bis zur digitalen Werkstattdatei einer lokalen Testbestellung. Die zwei bestehenden Motive sind das Hochzeitsschild mit Anker und das Familienschild mit Leuchtturm. Beide verwenden das Format 90 × 60 mm.

## Designprobe öffnen

[ZIP mit Offline-Editor, Beispiel-SVG, Beispiel-PDF und Einzelmessungen](2026-11-18-personalisierungsstudio-probe/Gravuru-Studio-Designprobe.zip) · [Muster-SVG](2026-11-18-personalisierungsstudio-probe/Heimathafen-Mueller.svg) · [Muster-PDF mit Schnittkontur](2026-11-18-personalisierungsstudio-probe/Heimathafen-Mueller.pdf)

Das ZIP entpacken und `Gravuru-Studio-Designprobe.html` in einem aktuellen Browser öffnen. Den Leuchtturm auswählen, den Familiennamen ändern und „SVG mit Kontur herunterladen“ wählen. Das heruntergeladene SVG enthält die eigene Eingabe. Das beiliegende PDF gehört zur fertigen Beispielgestaltung „Müller“. Die Probe läuft offline.

## Kundenweg und Ladezeit

Chromium im mobilen Format 390 × 844 CSS-Pixel, CPU vierfach gedrosselt. Das simulierte Mobilnetz hatte 150 ms Latenz, 1,6 Mbit/s Download und 0,75 Mbit/s Upload. Je Netzwerkprofil gab es fünf kalte und fünf warme Läufe. „Öffnen“ endet mit der ersten bedienbaren Vorschau. „Warenkorb“ endet mit der sichtbaren, korrekten Position im lokalen Shopify-Testgegenpart. Alle Tabellenwerte sind Mediane.

| Profil | Öffnen | Vorlage wechseln | Texteingabe anzeigen | Letzter Klick bis Warenkorb |
| --- | ---: | ---: | ---: | ---: |
| Lokal, kalt | 301 ms | 48 ms | 77 ms | 147 ms |
| Lokal, warm | 145 ms | 33 ms | 74 ms | 114 ms |
| Gedrosseltes Mobilnetz, kalt | 1.622 ms | 47 ms | 78 ms | 836 ms |
| Gedrosseltes Mobilnetz, warm | 467 ms | 45 ms | 61 ms | 815 ms |

Alle 20 Läufe erreichten die erwartete Position zu 10,99 € und die passenden Werkstattdateien. Vorlagenwechsel und Texteingabe benötigten bei der Probe jeweils null zusätzliche Netzanfragen. Bis zur bedienbaren Vorschau wurden im gedrosselten Profil im Median 240.218 Bytes kalt und 2.774 Bytes warm übertragen. [Einzelmessungen](../../app/personalisierungsstudio/tests/measurements-2026-11-18.json)

## Import, Bestellung und Fertigung

- Die zwei Bestandsdesigns enthalten zusammen sechs native Textfelder, vier Schriftschnitte aus drei Familien sowie die ursprünglichen Vektormotive. Eine ergänzende synthetische SVG-Probe prüft Innenloch und rechteckige Fotozone. Drei reale FPD-Proben wurden auf Ebenen und Bearbeitungsfelder geprüft. Die Fertigungsfreigabe für komplexe Foto- und Druckmasken ist noch offen.
- Die Pilotintegration ordnet die Revision eines Entwurfs seiner Bestellposition zu. Die Werkstatt kann diese Revision als SVG oder PDF abrufen. Acht Integrationstests bestanden. Der Abruf aus einer echten Shopify-Testbestellung steht aus.
- Im SVG und im PDF des Beispiels „Müller“ stimmen die Maße von 90 × 60 mm überein. 25 Vektorpfade bilden die Gestaltung. Das PDF verwendet für die geschlossene Außenkontur den überdruckenden Sonderfarbkanal `CutContour` mit 0,1 mm Strichbreite. Im Rastervergleich lag die mittlere absolute Abweichung im Innenbereich bei 0,418 von 255. Die Werkstattabnahme am RIP steht aus. [Prüfprogramm](../../app/personalisierungsstudio/tests/verify-print.py)

## Abgleich mit Shopify und nächste Abnahme

Im verbundenen Shop sind Fancy Product Designer und Zakeke Product Customiser 2D3D installiert. Variante C bietet das rechteckige Edelstahlschild mit 9 × 6 cm ohne Befestigung für 10,99 € an. Dieses Format ist der erste gemeinsame Prüffall. Die Zuordnung derselben Vorlage in beiden Anbieter-Apps und ein freigegebener isolierter Testshop sind noch zu bestätigen.

Im Testshop denselben Namen, dieselbe Vorlage, dieselbe Variante und Menge eins bei Studio, Variante C, Fancy und Zakeke verwenden. Pro System fünf kalte und fünf warme Läufe auf demselben Mobilprofil erfassen. Öffnen, Wechsel, Eingabe und sichtbare Warenkorbposition messen. Danach die Dateien der konkreten Testbestellposition über die Shopify Admin API abrufen und am Werkstatt-RIP öffnen. Anschließend folgt ein eigener Vergleich für einen größeren Artikel mit Foto. Für den Vertrieb als App sind Händlerinstallation, Zugriff und Löschung, Ressourcenrechte, Lastprüfung und Vertriebsfreigabe offen.

[Projekt-Issue #260](https://github.com/Chris83638w/gravuru-2027/issues/260) · [Entwurfs-PR #263](https://github.com/Chris83638w/gravuru-2027/pull/263)
