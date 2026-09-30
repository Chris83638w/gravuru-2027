# Gravuru 2027

Die neue Master-Version für den Gravuru-Konfigurator und die Werkstattverwaltung: Shopify, personalisierbare Produkte, Druck, Gravur und Stapelverarbeitung.

**Projektstart: 30. September 2026 · Status: erste getrennte Kundenoberfläche lokal lauffähig und geprüft.**

Lokal öffnen: http://127.0.0.1:8961/?model=acryl · [Startanleitung](LOKAL-STARTEN.md) · [Prüfergebnisse](G27-01-PRUEFUNG.md). Keine Live-Shopify-App; Verwaltung, Bestellung und Produktion folgen.

**GitHub-Transport:** Solange der direkte Git-Zugriff fehlt, liegt die komplette aktive Anwendung im Übergabearchiv `GRAVURU-2027-G27-01.zip`. Dieses in einen neuen Ordner entpacken; darin liegen `app/`, `package.json` und die Startanleitung. Das Archiv stammt vom lokalen Commit `51d555e`; ein frisch daraus ausgeführter Build war erfolgreich. Dies ist kein gepushter Quellbaum. [Transportnachweis](G27-01-UEBERGABE.md).

## Hier beginnen

1. [Start und Übergabe für die nächste KI](START_HERE.md)
2. [Aktueller Stand und nächster Schritt](STATUS.md)
3. [Startauftrag für GPT-6.1 Sol](UEBERGABE-SOL-6.1.md)
4. [Kleine Umsetzungspakete mit Abnahme](UMSETZUNGSPAKETE.md)
5. [Quellenpakete, Prüfnachweise und Start](QUELLEN-UND-START.md)
6. [Materialreferenzen: Edelstahl, Leder, Holz, Schiefer und Acryl](MATERIALREFERENZEN.md)

Details: [Master-Bauplan](NEUE-WERKSTATT-PLAN.md), [Wettbewerbsvergleich](KONFI-VERGLEICH-UND-AR.md), [Arbeitsregeln](AGENTS.md).

## Aktuelle Entscheidungen

- Eigenständiges Projekt **Gravuru 2027** im Repository `Chris83638w/gravuru-2027`.
- Geeignete Bausteine aus dem [bisherigen Projekt](https://github.com/Chris83638w/gravuru-shopify) nach Prüfung übernehmen und gezielt verbessern.
- Hochwertige **2D-Vorschau** genügt zunächst. Ein Wandbild im eigenen Raum darzustellen ist die gewünschte Richtung; AR wird auf später verschoben.
- Materialdatenbank, freie Konturen, Größen, Befestigungen, Designs und Profile gemeinsam verwalten.
- Einzelanlage und Stapelverarbeitung verwenden dieselben Regeln. PDF/SVG, Excel-Zuordnungen und später Drive/KI unterstützen.
- Jede Konfiguration bekommt eine stabile ID. Bestellungen bewahren ihren eigenen unveränderlichen Produktionsstand.

## Umsetzungsstand

Die aktive Anwendung liegt unter `app/`: ein Acrylprodukt, sechs Sockel, Größen/Preise, Texte, Farben und Fotoersatz. 57 aktuelle Tests bestanden, zusätzliche Prüfung durch Astra und reale Desktop-/Mobilbedienung. Der gesamte alte Shopify-/Werkstattstand ist nicht migriert. Bauplan, Übergabe und vier eingefrorene Referenzarchive mit 294 Dateien bleiben als Herkunft erhalten.

Nächster Umsetzungsschritt: G27-02, gemeinsames Material-/Form-/Variantenmodell mit Datenbank und Revisionen. Nur 2D, AR später. Konkrete Grenzen und Ablagestatus in `STATUS.md` beachten.
