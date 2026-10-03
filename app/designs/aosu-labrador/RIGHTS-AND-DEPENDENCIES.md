# Ressourcen, Rechtebelege und verbleibende Abhängigkeiten

## Runtime-Paket

Katalogmanifest und 51 Katalog-/Schrift-/Motivsegmente sind byte-identische Auszüge aus dem vorhandenen Vollarchiv. Segmentprüfsummen wurden gegen `references/aosu-upgrade-2026-09-21/EXTERNAL-DEPENDENCIES.json` geprüft; das Katalogmanifest gegen den bereits dokumentierten Manifest-Hash. Das Vollarchiv bleibt unverändert und wird nicht mitgeliefert.

Die Dateien enthalten die vorhandenen 30 Schriftfamilien und Motivbibliotheken. Das Labrador-Paket ergänzt die bereits gespeicherten Michroma-Konturen und das bereits gespeicherte Labrador-Motiv. Die Gestaltung wurde nicht neu erzeugt.

## Bildressourcen

Die lokalen Dateien entsprechen den drei tatsächlich im bisherigen Aufbau referenzierten CDN-Bildern. Schraube und Edelstahltextur stimmen zusätzlich mit den Archivbytes überein. Beim AOSU-Bild unterscheiden sich CDN- und Archivbytes: für diese Vorschau wurde deshalb die unveränderte CDN-Antwort übernommen, nicht die abweichende Archivfassung. Beide Hashes sind dokumentiert. Die Downloadprüfung allein ist keine neue gestalterische Abnahme.

Die Bilder werden auf Nutzerauftrag im privaten Unternehmensrepository für den bestehenden Produktkonfigurator gesichert. Für Marken-/Modellfotos liegt im ausgewählten Paket keine separate öffentliche Weiterverbreitungslizenz vor; keine solche Lizenz behaupten. Nicht ohne Rechteklärung als öffentliche Stock-Bibliothek veröffentlichen.

Weitere Modellbilder anderer Klingeln sind für diesen Labrador/AOSU-Start nicht erforderlich und wurden nicht pauschal übernommen. Die schwarze/anthrazitfarbene Acrylwirkung wird im bestehenden Renderer erzeugt; keine weitere Acryl-Bitmap erforderlich. Keine neue Textur wurde gestaltet.

## Schrift- und Motivbelege

- Michroma: Original-TTF, OFL-Lizenz und Konturen unter `assets/`, offizielle Quelle bereits dokumentiert.
- Vorhandene Lizenztexte aus dem Archiv: `runtime/licenses/gravuru-font-licenses.json`, mit Dancing Script, Lora, Montserrat, Source Code Pro und Ubuntu.
- Für die 24 zusätzlichen Schriftfamilien wurden in der gezielt geprüften Archivauswahl keine separaten Lizenztexte gefunden. Diese fehlenden Nachweise sind offen; die Namen und Konturen sind in den bestehenden Segmenten enthalten. Keine pauschale Lizenzvollständigkeit behaupten.
- Für die bestehende Motivsammlung liegt hier keine individuelle Lizenzmatrix vor. Interne Herkunft ist dokumentiert, individuelle Rechteprüfung bleibt offen.
- Die separate Werkstatt-Quellreferenz enthält fflate 0.8.3 samt vorhandener MIT-Lizenz.

## Netzwerk nach Einrichtung

Für den lokalen Labrador-Start keine externen Runtime-Downloads erforderlich. Die Referenzdateien bleiben historisch unverändert; deren URLs werden nur in der generierten Prüfkopie auf lokale Ressourcen umgelegt. Optionale Shop-/Hilfe-/Bestellfunktionen sind keine lokal vollständigen Dienste und nicht abgenommen.

Die separat archivierten Werkstattquellen besitzen weiter Shopify-API-/Worker- und CDN-Abhängigkeiten. Sie werden von der Labrador-Vorschau nicht importiert. Siehe `continuation/werkstatt-source-20260923/README.md` für bewusst fehlende Infrastruktur und Versionsgrenzen.
