# Gravuru 2027 – Cloud-Übergabe, 01.10.2026

Aktueller Quellstand: lokal `5e2b219`, enthält Implementierung `c23137a`. 111 Tests bestanden, Build mit 76 Ressourcen und einem Modell. Kein fertiger Shopify-Livebetrieb. Die Pause wurde vom Nutzer aufgehoben; nächster Auftrag ist die Weiterarbeit unabhängig vom Laptop.

## Einmalige Vorbereitung

Cloud-Umgebung für `Chris83638w/gravuru-2027` auswählen; Aufgabenbranch `task/g27-02-cloud` verwenden. Node.js 24 oder neuer, Python 3 und Git bereitstellen. Kein npm install erforderlich.

```sh
python3 cloud_setup.py
cd runtime
npm test
npm run build
```

Die geprüfte Anwendung liegt danach in `runtime/app/`, die komplette Spezifikation in `runtime/NEUE-WERKSTATT-PLAN.md`. `runtime/AGENTS.md`, `runtime/START_HERE.md` und `runtime/STATUS.md` lesen. Ab jetzt den entpackten Quellbaum bearbeiten und bei der ersten Änderung mit einchecken, statt weitere ZIP-Versionen anzuhängen. Das Archiv bleibt als Transportnachweis erhalten. `cloud_setup.py` überschreibt kein bereits vorhandenes runtime-Verzeichnis. Vorhandene lokale .local-data-Datenbanken, Zugangsdaten und Kundendaten wurden nicht übertragen; der erste Start erzeugt den Acrylmaster neu. Die Referenzarchive im Repository-Stamm bleiben separate historische Quellen, nicht erneut blind migrieren.

## Konkreter nächster Auftrag

Vorhandene Werkstatt, SQLite-Revisionen, Profile, Einzelrechte und Excel-Stapelanlage weiterverwenden. Als nächste durchgängige Funktion SVG/PDF-Designersatz in der Werkstatt anschließen: Datei hochladen, Maße/Pfade prüfen, gewähltes Design ersetzen, passende editierbare Felder explizit zuordnen, speichern, Kundenansicht und Originalqualität prüfen. Ein flaches Rasterbild nicht als editierbare verlustfreie Vektoren ausgeben. Vorhandene Importmodule aus den Referenzquellen gezielt prüfen. Danach Material-/Form-/Bohrmodell und gemeinsame Variantenregeln ausbauen. Keine neue Komplettplanung oder zweite Konfiguratorkopie.

Weitere verbindliche Ziele: stabile Konfigurations-IDs und Shopify-Zuordnung; Einzel- und Stapelanlage aus Master, PDF/SVG und Excel; Kategorien und 30 Designs pro Produkt; Materialbibliothek und geschlossene freie Konturen/Bohrungen; hochwertige 2D-Szenen; versionierte Bestellungen; SVG/PDF mit Konturen, Schriftpfade, PNG und Originale; CMYK-Druckmaster, Roland CutContour/RDG_WHITE und Rückseitenspiegelung; Gravur getrennt; Shopify-Produktanlage/SEO und geprüfte Bestellstrecke. AR bleibt vertagt. Endgültige Fonts und Produktionsprofile nicht erfinden.

Für jede abgeschlossene Funktion passende Tests und echte Browserprüfung durchführen, Ergebnis/Limitierungen in STATUS.md festhalten und auf Aufgabenbranch committen. Keine Livefreigabe oder Maschinenfreigabe behaupten. Nutzer bevorzugt Astra mit hohem Denkaufwand; vorhandene parallele Aufgaben nur bei klarer Dateizuständigkeit aufteilen. Am Schluss PR zur Prüfung, kein Force-Push oder automatischer Merge.

## Transportprüfung

Datei: `GRAVURU-2027-G27-02.zip`, 24.080.163 Bytes.
SHA-256: `0869f8f74cb81c9dfacfcefada9662b930daa5a3a96fcc324962ed8e7e46391a`.

Cloud-Aufgabe gilt erst als gestartet, wenn die Cloud-Oberfläche den laufenden Auftrag bestätigt. Dieses Paket allein startet keine Hintergrundarbeit.
