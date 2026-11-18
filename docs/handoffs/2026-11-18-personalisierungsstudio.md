# Übergabe · Personalisierungsstudio für Shopify

Stand 18.11.2026, Codex. Ausgangsstand `72bf9bb2`, Aufgabenbranch `dev/personalisierungsstudio-20261118`. Chris hat im Chat Import vorhandener Designs, schnelles Gestalten, einen reibungsarmen Kaufweg und SVG sowie PDF mit Kontur priorisiert. Der gemeinsame Betriebseditor bleibt in der bisherigen Zuständigkeit. [Auftrag](https://github.com/Chris83638w/gravuru-2027/issues/260) · [Masterunterlagen](https://github.com/Chris83638w/gravuru-2027/pull/259) · [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md)

## Durchgängige Probe

Die Werkstatt prüft und importiert Originaldateien. Die beiden bestehenden 90-×-60-mm-Designs für Hochzeit und Hauseingang verwenden ihre ursprünglichen Positionen, vier Schriftfamilien sowie Anker und Leuchtturm. Auf der Produktseite können Kunden Text und Motiv bearbeiten. Die ersten beiden kompakten Vorlagen werden beim Einstieg gemeinsam geladen. Weitere Vorlagen und seltene Schriftzeichen werden bei Bedarf geladen. Die Bestellposition trägt eine private Entwurfs-ID. Die Werkstatt kann sie über die Shopify Admin API auflösen und ihre SVG- oder PDF-Datei herunterladen. Shop, Variante und Zeichnungsrevision sind miteinander verknüpft. [Bedienung, Formate und API](../../app/personalisierungsstudio/README.md) · [Bestandsquelle](../../app/designs/steel-heimathafen/source.json)

## Kundenweg im Browser

Chromium 157.0.8103.79, 390 × 844 CSS-Pixel, CPU vierfach gedrosselt. Je Profil fünf neue Browserkontexte. Jeder kalte Lauf wird von einem vollständigen warmen Lauf im selben Kontext gefolgt. Zwischen den Läufen wird die Probe-Bestellung abgeschlossen und der Testwarenkorb geleert. Das gedrosselte Netz hatte 150 ms Latenz, 1,6 Mbit/s Download und 0,75 Mbit/s Upload. Alle Zeiten sind Mediane in Millisekunden. Öffnen beginnt bei Navigation und endet nach einer gezeichneten, bedienbaren SVG-Vorschau. Der Warenkorbwert endet an der sichtbaren korrekten Position.

| Profil | Öffnen | Vorlagenwechsel | Textänderung | Letzter Klick bis Testwarenkorb |
| --- | ---: | ---: | ---: | ---: |
| Lokal, kalt | 301 | 48 | 77 | 147 |
| Lokal, warm | 145 | 33 | 74 | 114 |
| Gedrosseltes Mobilnetz, kalt | 1.622 | 47 | 78 | 836 |
| Gedrosseltes Mobilnetz, warm | 467 | 45 | 61 | 815 |

Alle 20 Läufe erreichten eine korrekte Position zu 10,99 Euro und die zugehörigen digitalen Werkstattdateien. Beim Vorlagenwechsel und bei „Müller“ wurden jeweils null Netzwerkanfragen beobachtet. Bis zur ersten nutzbaren Gestaltung wurden im gedrosselten Profil im Median 240.218 Bytes kalt und 2.774 Bytes warm übertragen. Erfasst ist die lokale Produktseite mit Shopify-Gegenpart. Der tatsächliche Shopify-Checkout und die fremden Plattformen wurden in dieser Reihe nicht durchlaufen. Der frühere C-Wert von ungefähr fünf Sekunden bezog sich auf einen anderen Desktop-Warenkorblauf. [Alle Einzelwerte](../../app/personalisierungsstudio/tests/measurements-2026-11-18.json) · [C-Referenz](2026-10-27-konfi-geschwindigkeit.md)

## Import und Fertigung

- Beide Heimathafen-Originale sind im Kundenweg mit sechs nativen Textfeldern geprüft. Ein separates SVG mit gerundeter Außenkontur, Innenloch, Originalschrift und rechteckiger Fotozone wurde importiert, personalisiert und als SVG/PDF ausgegeben. Dieser zusätzliche SVG-Test ist synthetisch.
- Drei echte FPD-Rohdateien wurden eingelesen. D1 (Schiefer) enthält sieben Bildebenen und eine Uploadzone, D2 (Schiefer) fünf Bildebenen ohne Uploadzone. D4 (Acryl) enthält zwei native Texte, neun Bildebenen und eine Uploadzone. Der FPD-Pfad liefert zunächst einen Zuordnungsbericht. Der D230-Corel-Datensatz meldet 300 × 200 mm, sechs Textdatensätze einschließlich zweier Bedienhinweise, zehn Motivgruppen und eine Fotodatei. Diese Vorprüfung ist noch keine Freigabe der Schiefer-Fertigung. [Private Katalogquelle D230](https://github.com/Chris83638w/gravuru-katalog./tree/8236b8bfab7322447ec46661c116fa526331af3d/designs/bestand/gedenktafeln/Tiere/Hund/gravur-rechteck-D230)
- Für die gekaufte Gestaltung „Müller“ stimmen SVG-Zeichenfläche und PDF-MediaBox auf 90 × 60 mm überein. Es sind 25 Artwork-Vektorpfade vorhanden. Der geschlossene Außenpfad ist im PDF mit Sonderfarbraum `/Separation /CutContour`, Überdrucken und 0,1 mm Strich bestätigt. Im Vergleich von SVG-Browserbild und PDF-Popplerraster auf 900 × 600 Pixel betrug die mittlere absolute Kanalabweichung im Innenbereich 0,418 von 255. SHA-256 für SVG `3a8e3ad7b13340464e5b34c2647143421d726d39cdea54725695f24c4181d7ef`, für PDF `130f3ef2f915b3d9ca287b771a40e13b935fa5b3e7fe864450979fea86f492fe`. [Unabhängige Druckprüfung](../../app/personalisierungsstudio/tests/verify-print.py)
- Acht Integrationstests decken unter anderem Bestandsübernahme, Ausgabewiederholung, Mandantentrennung, spätere Revisionen, Bestelländerungen, Fotoerhalt und Motivänderungen ab. Zusätzliche Browserwege prüfen den Händlerimport, das Übernehmen bestehender Formularfelder, Bestandserror und verlorene Hinzufügen-Antwort, den Wechsel während eines Fotouploads und das bytegleiche SVG aus der Offline-Probe. [Browserprüfung](../../app/personalisierungsstudio/tests/browser.mjs)

## Nächste Abnahme

Ein repräsentatives größeres Produkt mit gleicher Vorlage, gleichem Foto, gleicher Variante, leerem und warmem Cache und identischem Endpunkt auf Studio, Variante C, Fancy und Zakeke im freigegebenen Testshop messen. Danach die aus genau dieser Testbestellung abgerufene SVG/PDF am vorgesehenen RIP prüfen. Für eine öffentliche App sind Händlerinstallation und Zugangsverwaltung, Datenschutz- und Löschprozesse, Ressourcenrechte, Betrieb unter Last und die Vertriebsfreigabe offen. Für Einbau in ein Shop-Theme, eine Testshop-Bestellung und eine Maschinenprobe braucht es den jeweils benannten Zielbetrieb und die Freigabe des Operators.
