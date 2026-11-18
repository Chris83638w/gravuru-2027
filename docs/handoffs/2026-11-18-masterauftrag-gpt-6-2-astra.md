# MASTER-AUFTRAG: gravuru 2027 – GPT-6.2 Astra

**Stand:** 18.11.2026  
**Zweck:** Unabhängige Gesamtkonzeption, Benchmark von Fancy Product Designer und Zakeke, vollständige Bestandsaufnahme einschließlich **Prio Konfi**, anschließend Vergleich, Optimierung und Umsetzungsfahrplan.  
**Status:** Analyse- und Planungsauftrag. **Keine Freigabe für Codeänderungen, Shopänderungen oder Live-Veröffentlichungen.**

## 1. Deine Rolle und die wichtigste Regel

Du arbeitest als unabhängiger CTO, Softwarearchitekt, Senior-Full-Stack-Entwickler, Shopify-Plus-Experte und UX-/Produktdesigner für die gravuru GmbH.

Du sollst **nicht** sofort an unserem bestehenden Konfigurator weiterprogrammieren. Du sollst erst unsere tatsächlichen Geschäftsanforderungen verstehen, **FPD und Zakeke intensiv analysieren**, daraus **deinen eigenen Lösungsansatz auf der grünen Wiese** entwickeln und ihn **unverändert dokumentieren**. **Erst danach** analysierst du die technische Umsetzung unseres bestehenden Systems und vergleichst beide Ansätze.

**Die Kernfrage lautet:** *Wenn du heute mit den Anforderungen von gravuru, aber ohne unsere bisherige technische Implementierung starten würdest – wie würdest du Designwerkstatt, Shopify-Konfigurator, Produktanlage und Produktionsanbindung selbst entwickeln, in welcher Reihenfolge und warum genau so?*

Du hast die ausdrückliche Erlaubnis, bestehende Architekturentscheidungen kritisch infrage zu stellen und bessere Lösungen vorzuschlagen. Es geht weder um die Rechtfertigung unseres bisherigen Wegs noch um eine pauschale Neuentwicklung. Die beste, wirtschaftlich vertretbare Lösung zählt.

## 2. Verbindlicher Ablauf

1. **Geschäftsmodell und Anforderungen:** Verstehe Produkte, Mitarbeiterabläufe, Kundenerlebnis, Fertigung und Geschäftsziele. Trenne Geschäftsanforderungen von früheren Implementierungsentscheidungen.
2. **Wettbewerbsanalyse:** Untersuche **Fancy Product Designer (FPD)** und **Zakeke** in der Tiefe – insbesondere deren Backends, Design- und Produktverwaltung.
3. **Unabhängiges Greenfield-Konzept:** Entwirf aus Anforderungen und Benchmark-Erkenntnissen deine eigene Architektur und Entwicklungsreihenfolge. **Halte diese Fassung als unveränderliches Konzept V1 fest.** Noch keine Bewertung des Prio-Konfi-Codes.
4. **Ist-Analyse:** Untersuche sämtliche relevanten vorhandenen Projektstände, Repositories, Dokumentationen und Quellkomponenten. Primärer Referenzstand ist der **Prio Konfi**, nicht Variante M oder C.
5. **Vergleich und Kritik:** Vergleiche dein dokumentiertes Konzept V1, FPD, Zakeke, den Prio Konfi und unsere Werkstatt; bewerte Übernahme, Verbesserung, Umbau, Neubau oder Entfall.
6. **Optimierte Zielarchitektur:** Entwickle den bestmöglichen, konsistenten Gesamtansatz und die zugehörigen Oberflächen und Workflows.
7. **Priorisierte Roadmap und Freigabepunkt:** Lege einen konkreten, testbaren Plan vor. **Warte auf Chris' ausdrückliches Go, bevor du etwas implementierst oder veröffentlichst.**

Arbeite die Phasen gründlich und nachvollziehbar ab. Erzeuge pro Phase ein überprüfbares Zwischenergebnis. Wenn Informationen fehlen, nenne die Lücke und stelle gebündelte, gezielte Fragen. Bearbeite nicht davon abhängige Punkte selbstständig weiter.

## 3. Geschäftsmodell und tatsächlicher Bedarf

Die **gravuru GmbH** fertigt in Bielefeld personalisierte Produkte durch Lasergravur, Laserschneiden und UV-Druck. Verkaufskanäle sind vor allem Amazon und der eigene, im Aufbau befindliche **Shopify-Plus-Shop**. Langfristig sind mehrere Themenbereiche beziehungsweise Shops und weitere Sprachen vorgesehen: Rund ums Haus, Andenken, Rund ums Tier, Fotogeschenke, Kinder, Hochzeit/Taufe sowie ein B2B-Angebot.

Produktgruppen umfassen Edelstahl-Türschilder, Hausnummern, Briefkastenschilder, Funkklingelschilder, Familien- und Namensschilder, Schiefer-Gedenktafeln (mit/ohne Foto), Tiergedenktafeln, Acrylprodukte, Fotogeschenke, Holzprodukte, Kinderartikel und Schlüsselanhänger.

Produkte unterscheiden sich in Material, Form, Größe, Herstellungsverfahren, Design, Motiv, Texten, Schriften, Fotos, Beschlägen und Befestigung. Keine neue Produktfamilie soll einen vollständig neu programmierten Konfigurator benötigen.

**Zentrales Geschäftsziel:** Eine kleine Anzahl Mitarbeitender soll neue individualisierbare Produkte und Serien wesentlich schneller entwickeln, Varianten und Bilder erstellen, Shopify-Daten vorbereiten und Produktionsdateien sicher erzeugen können. Dabei müssen Designqualität, Fehlerfreiheit, Freigaben und Wirtschaftlichkeit erhalten bleiben.

Untersuche insbesondere diese zusammenhängenden Prozesse:

- **Designwerkstatt:** Produktfamilien/Serien, Vorlagen, Motive, Schriften, Versionen, Produktzuordnung, Designvarianten, Freigabe, Import, visuelle Bearbeitung und Wiederverwendung.
- **Produktanlage:** Material, Form, Maße, Ausführungen, Optionen, Preise, Artikel-/SKU-Zuordnung, Designauswahl und Eignungsregeln.
- **Medien:** Haupt-, Größen-, Anwendungs- und USP-Bilder, Text/SEO, Keywords und Alt-Texte.
- **Kundenkonfigurator:** Texte, Motive, Schriften, Fotos, Positionierung, Live-Vorschau, Mobilbedienung, Speichern/Laden, Preis-/Warenkorb-Anbindung.
- **Shopify:** Produkte, Varianten, Metaobjects/Metafelder, Medien, Warenkorb, Bestellungen, Preisregeln, Synchronisation und Rückübertragung.
- **Produktion:** SVG/PDF/Vektor- und Fotodaten, echte Maße, Schriften, Ebenen, Druck-/Gravurprofile, überprüfbare Revisionen und unveränderliche Bestellstände.
- **KI-Automatisierung:** Designvorschläge, Motivvarianten, Layoutanpassungen, Medienerstellung, SEO, Stapelverarbeitung und Qualitätsprüfung mit klaren menschlichen Freigaben.

Unterscheide strikt zwischen **Motiv** (ein einzelnes hinzufügbares Element) und **Design** (die gesamte Gestaltung eines Produkts aus Texten, Fotos und Motiven). Maße sind in Millimetern zu führen, Preise in Cent. Echte Produktpreise, Bohrlochabstände, Produktionsprofile und Rechte dürfen nicht erfunden werden.

## 4. Phase 2: FPD und Zakeke tiefgehend analysieren

### Offizielle Ausgangspunkte

- **Fancy Product Designer:** https://fancyproductdesigner.com/
- **FPD-Wissensdatenbank:** https://support.fancyproductdesigner.com/
- **Zakeke:** https://www.zakeke.com/
- **Zakeke in Shopify:** https://apps.shopify.com/zakeke-interactive-product-designer

Nutze aktuelle Primärquellen, Dokumentation, Admin-/Produkt-Demos, Videos, Entwickler- und API-Dokumentation. Falls ein berechtigter Test- oder angemeldeter Zugang verfügbar ist, prüfe tatsächliche Abläufe **nur lesend** beziehungsweise in einer sicheren Demo. Frage nach einem Zugang, wenn er entscheidend fehlt. Unterscheide konsequent zwischen **selbst beobachtet**, **offiziell dokumentiert** und **vermutet**. Belege wichtige Erkenntnisse mit Links und, soweit erlaubt, Screenshots.

### A. Design- und Vorlagenverwaltung – höchste Priorität

Untersuche Schritt für Schritt:

1. Wie wird ein neues Design erstellt, gespeichert, kopiert und geändert?
2. Wie funktionieren Vorlagen, Kategorien, Motive, Schriftbibliotheken und variable Textfelder?
3. Wie werden vorhandene Designs auf mehrere Produkte, Formen und Größen übertragen?
4. Wie trennt das System feste Elemente von kundenänderbaren Elementen?
5. Wie werden Druck-/Gestaltungsbereiche, Grenzen und Sperren definiert?
6. Wie werden Originaldesigns, Versionen, Zuordnungen und Vorschauen verwaltet?
7. Welche Stapel-/CSV-/API-Importe und automatisierten Zuweisungen existieren?
8. Wie viele Klicks beziehungsweise manuelle Schritte braucht ein Mitarbeiter tatsächlich?
9. Welche Probleme entstehen bei vielen Produktfamilien und Tausenden Designs?
10. Welche Abläufe wirken besonders schnell, verständlich oder fehleranfällig?

Die **internen Verwaltungsoberflächen** sind mindestens genauso wichtig wie der Kundenkonfigurator. Analysiere deren Informationsarchitektur und Bedienkonzept ausdrücklich.

### B. Neues Produkt von Anfang bis Ende

Dokumentiere in FPD und Zakeke möglichst praxisnah: Produkt anlegen → Maße/Form/Material → Bearbeitungsfläche → Designvorlage/Motivbibliothek → Personalisierungsregeln → Medien/Vorschau → Shop-Zuordnung → Testbestellung → Produktionsdatei.

### C. Kundeneditor

Vergleiche Desktop und Mobil: Texteingabe, Schriftwechsel, Motive, Fotoupload, Positionieren/Skalieren/Drehen, Vorlagenwechsel, Undo/Reset, Hilfslinien, Live-Vorschau, Warenkorb, Speichern und Performance. Beurteile auch, ob bei einfachen Türschildern geführte Formulare mit Vorschau besser wären als ein vollständig freier Editor.

### D. Produktionsausgabe

Prüfe SVG/PDF, Vektor-/Rasterdaten, Ebenen, Konturen, tatsächliche Abmessungen, Schriftpfade, Originalbilder, Weißdruck/Spiegelung, unterschiedliche Maschinenprofile, gesicherte Bestellrevisionen und Automatisierung. Grenzen und zusätzliche manuelle Nacharbeit ausdrücklich aufführen.

### E. API, Integration und Wirtschaftlichkeit

Prüfe aktuelle Shopify-Anbindung, API und Webhooks, Stapelimporte, Datenportabilität, Berechtigungen, Zuverlässigkeit, Anbieterabhängigkeit, Lizenz-/Transaktionskosten und Wartungsaufwand. Keine aktuellen Preisangaben ohne Quelle.

### F. Konkreter Praxisvergleich

Nutze **dieselbe repräsentative gravuru-Aufgabe** als Benchmark:

> Eine Produktserie aus **Schiefer-Gedenktafeln 30 × 20 cm** mit **20 Hundemotiven**, jeweils als Ausführung **mit Foto** und **ohne Foto**. Die Designs sollen später mit vertretbarem Aufwand für weitere Tiere und Größen wiederverwendbar sein.

Ermittle für FPD und Zakeke den Ablauf, die benötigten Schritte, Beschränkungen, Ergebnisse und die möglichen Automatisierungen. Falls Live-Tests mangels Zugang unmöglich sind, liefere eine klar als hypothetisch markierte Ablaufrekonstruktion anhand belegter Funktionen.

**Ergebnis:** Eine präzise Vergleichstabelle für Designverwaltung, Vorlagen, Produktanlage, Kundeneditor, Produktionsdateien, Shopify, Automatisierung, Bedienbarkeit, Kosten und Datenhoheit; zusätzlich eine priorisierte Liste **„Was gravuru übernehmen, verbessern oder bewusst anders lösen sollte“**. Kein Kopieren fremden Quellcodes oder geschützter Gestaltung.

## 5. Phase 3: Dein eigenes Konzept – erst unabhängig entscheiden

Schreibe jetzt **Konzept V1 – Greenfield**. Bisherige Projektquellen dürfen für verbindliche Geschäfts-/Betriebsregeln gelesen worden sein, aber die **technische Ausgestaltung des vorhandenen Konfigurators** darf deine Architektur nicht vorgeben. Lies/bewerte den Implementierungscode erst in Phase 4.

Beantworte ausführlich und **in deiner eigenen fachlichen Reihenfolge**:

1. Mit welchem fachlichen und technischen Kern würdest du beginnen und warum?
2. Würdest du zuerst Designverwaltung, Produktmodell, Rendering/Produktionsausgabe oder Kundeneditor umsetzen?
3. Welche Komponenten gehören zusammen und welche müssen unabhängig bleiben?
4. Welches Datenmodell hält Designs, Vorlagen, Produkte, Varianten, Gestaltungsflächen und Revisionen konsistent?
5. Wie entsteht aus einer Vorlage dieselbe kundenseitige Vorschau und die korrekte Produktionsdatei?
6. Wie werden Formen, Maße, Produktfähigkeiten, Einschränkungen und Preise zentral statt doppelt definiert?
7. Wie soll eine Mitarbeiterin ohne Programmierkenntnisse eine Serie mit 20 Designs erzeugen und auf weitere Produkte übertragen?
8. Wie unterscheiden sich kundenseitige Bedienoberflächen sinnvoll je Produkttyp bei einem gemeinsamen Kern?
9. Wie sollte Shopify Plus angebunden werden (Produkte, Varianten, Metafelder/Metaobjects, Warenkorb, Bestellungsdaten)?
10. Wie sollen Uploads, Medien, Dateiversionen, Berechtigungen, Wiederherstellung und Migration funktionieren?
11. Welche KI-Funktionen sind zuverlässig automatisierbar, welche benötigen menschliche Freigabe?
12. Welche Architektur ist für eine mittelständische Fertigung mit künftig vielen Tausend Artikeln wirtschaftlich und wartbar?

Vergleiche mindestens **Eigenentwicklung**, **komplette SaaS-Nutzung** und **hybride Lösung**. Begründe Frontend, Backend, Datenhaltung, Renderer/Export, APIs, Hosting, Versionsmodell und Betriebskosten. Nutze existierende verlässliche Bibliotheken, wo sinnvoll. Vermeide unnötige Architekturkomplexität.

Entwirf außerdem den **idealen Mitarbeiter-Workflow** vom Serienauftrag bis zum freigegebenen Shopify-Listing und den **idealen Kunden-Workflow** vom Produktaufruf bis zur bestellbaren Konfiguration. Zeige bei Bedarf einfache Wireframes und ein verständliches Architekturdiagramm.

**Speichere Konzept V1 als eindeutig bezeichnetes, unverändert nachvollziehbares Dokument, bevor die technische Ist-Analyse beginnt.** Schreibe ausdrücklich, welche Annahmen gesichert beziehungsweise noch offen sind.

## 6. Phase 4: Vorhandenes System vollständig untersuchen

Nun analysierst du unseren bisherigen Entwicklungsstand anhand der **tatsächlich verfügbaren** Repositories, Dateien, offenen Issues, PRs, Übergaben, Testprotokolle und gegebenenfalls erreichbaren Testoberflächen.

### Repositories und Einstieg

- Aktuelles Gesamtprojekt: https://github.com/Chris83638w/gravuru-2027
- Früheres Projekt: https://github.com/Chris83638w/gravuru-shopify
- Separater Produkt-/Designkatalog: https://github.com/Chris83638w/gravuru-katalog.

**Der zuletzt freigegebene gemeinsame Konfigurator heißt „Prio Konfi“, R15.** Frühere Bezeichnungen wie **Variante M** und **Variante C** sind historische Entwicklungsstände und als Vergleich interessant, aber **nicht** automatisch der neueste Stand.

**Verbindliche Einstiegspunkte im aktuellen Repository:**

1. [`AGENTS.md`](https://github.com/Chris83638w/gravuru-2027/blob/main/AGENTS.md) – Arbeits-, Sicherheits- und Zuständigkeitsregeln
2. [`ENTSCHEIDUNGEN.md`](https://github.com/Chris83638w/gravuru-2027/blob/main/ENTSCHEIDUNGEN.md) – belegte Entscheidungen von Chris
3. [`PRIO-KONFI.md`](https://github.com/Chris83638w/gravuru-2027/blob/main/PRIO-KONFI.md) – R15-Freigabe, Grenzen, Zuständigkeiten und Anschlussplan
4. [`START_HERE.md`](https://github.com/Chris83638w/gravuru-2027/blob/main/START_HERE.md) und [`STATUS.md`](https://github.com/Chris83638w/gravuru-2027/blob/main/STATUS.md)
5. Aktuellste relevante Dateien unter `docs/handoffs/` sowie offene Issues und Pull Requests
6. Verbindlicher [Produktworkflow vom 09.11.2026](https://github.com/Chris83638w/gravuru-2027/blob/main/docs/handoffs/2026-11-09-produktanlage-module-excel-workflow.md)
7. Design-Master im Katalog-Repo, soweit zugänglich

**Wichtig zu Statusangaben:** Das Repository dokumentiert bereits einen Live-Stand vom **16.11.2026**. Ältere README- oder Übergabetexte dürfen nicht als aktueller Ist-Zustand ausgegeben werden. Ermittle neueste Commits, aktive Branches, freigegebene Versionen, tatsächlich installierte Laufzeit, gesicherte Produkt- und Datenbankstände sowie offene Integrationslücken. Ein GitHub-Commit ist nicht automatisch live.

**Zuständigkeit:** Laut Projektregeln dürfen gemeinsame R15-Oberfläche, Kernlogik, Preis-/Checkout-Verhalten und Ressourcen nicht eigenmächtig umgebaut oder veröffentlicht werden. Zuständig ist Mika in Abstimmung mit Mikail. Diese Analyse darf ausdrücklich Alternativen **empfehlen**, aber keine Umgehung der Freigaben oder eigenständige Änderung vornehmen. Neue Produktdaten und Preise benötigen eigene Bestätigungen.

Untersuche mindestens:

- Repo-/Branch-/Commit-Verlauf und relevante ältere Konfiguratorversionen
- Aktive Frontend-, Backend-, Datenbank-, Shop- und Werkstattmodule
- Designmodell, Galerie, Motivverwaltung, Vorlagen und Revisionen
- Produktprofile, Material-/Form-/Größenregeln und Versionierung
- Kundeneditor auf Desktop und Mobil, Speichern/Laden, Warenkorb, Preisberechnung
- Shopify-Integration: Metafelder, Produkt-/Varianten-IDs, Medien und Bestelleingang
- Produktionsdaten, Geometrie, Schrift- und Bildverarbeitung
- Tests, Performance, Sicherheitsgrenzen, Datenmigration, Rückweg und offene Risiken
- Noch vorhandene FPD-Abhängigkeiten beziehungsweise Checkout-/Transformationsreste
- Funktionen, die in Variante C/M existierten, im Prio Konfi aber verloren gingen
- Bereits gelöste Funktionen, deren Neubau überflüssig wäre

**„Alles durchlesen“ bedeutet:** Alle für die Architektur und Geschäftsabläufe relevanten Anforderungen, Entscheidungen und Quellkomponenten gründlich prüfen, nicht nur README-Dateien. Große generierte Assets, Abhängigkeiten und Binärbestände können als Inventar erfasst werden, ohne sie blind vollständig in den Kontext zu laden. Nenne die inspizierten Quellen, Commits, Tests und Grenzen. Behaupte keinen Zugang, den du nicht hast.

Führe nur sichere, nicht destruktive Prüfungen aus. Keine Live-Schreibzugriffe, keine unbestätigten Produktanlagen, keine Änderungen an Preisen, Berechtigungen oder veröffentlichten Designs.

## 7. Phase 5: Objektiver Vier-Wege-Vergleich

Vergleiche **(A) deine Greenfield-Version V1**, **(B) FPD**, **(C) Zakeke**, **(D) Prio Konfi + gravuru-Werkstatt**.

Erstelle eine Tabelle für mindestens:

| Bereich | Greenfield V1 | FPD | Zakeke | Aktueller gravuru-Stand | Empfehlung |
|---|---|---|---|---|---|
| Design- und Motivverwaltung | | | | | |
| Vorlagen und Wiederverwendung | | | | | |
| Serien-/Stapelanlage | | | | | |
| Produktprofile, Maße und Optionen | | | | | |
| Kundeneditor Desktop/Mobil | | | | | |
| Shopify und Preis-/Warenkorb | | | | | |
| Produktionsdateien | | | | | |
| Medien und SEO | | | | | |
| Automatisierung und KI | | | | | |
| Datenhoheit, Wartung, Kosten | | | | | |

Für jede wesentliche vorhandene Komponente entscheide mit Begründung: **Übernehmen / Verbessern / Umbauen / Neu entwickeln / Entfernen**. Unterscheide Fachnutzen, Entwicklungsaufwand, Betriebsrisiko und Abhängigkeiten. Eine Neuentwicklung nur empfehlen, wenn ihr Nutzen den Verlust bereits funktionierender Arbeit rechtfertigt.

Prüfe die echte Benchmark-Aufgabe aus Phase 2 erneut am Prio Konfi: **Schiefer 30 × 20 cm, 20 Hundemotive, mit/ohne Foto**, spätere Tier-/Größenvarianten. Welche Schritte kann unsere Werkstatt heute? Was fehlt wirklich? Wo wären Alternativen schneller oder sicherer?

## 8. Phase 6: Optimierte Zielarchitektur und UX

Kombiniere die stärksten Ergebnisse aus V1, Konkurrenzanalyse und geprüftem Ist-Stand. Dokumentiere:

1. **Architekturdiagramm** mit Komponenten, Schnittstellen, Datenflüssen und Verantwortlichkeiten.
2. **Gemeinsames Daten- und Revisionsmodell** für Produkt, Design, Motiv, Vorlage, Konfiguration und Auftrag.
3. **Designwerkstatt-UX** mit Dashboard, Serien- und Vorlagenverwaltung, Editor, Motivbibliothek, Stapelbearbeitung, Freigabe und Synchronisierung.
4. **Kundenkonfigurator-UX** mit klaren, ggf. produktspezifischen Werkzeugen, guter Handybedienung, sichtbarer Vorschau und zuverlässiger Speicherung.
5. **Produktanlage und Shopify-Workflow** inklusive Medien, SEO, Varianten, Metaobjects/Metafeldern, Preis-/Bestellintegration und kontrollierter Veröffentlichung.
6. **Produktionsworkflow** vom unveränderlichen Bestellstand bis zur maschinengerechten Datei.
7. **KI-/Agenten-Konzept** für passende Teilaufgaben mit Qualitätskontrolle, nachvollziehbarem Budget und Freigabepunkten.
8. **Betriebsmodell** für Berechtigungen, Backup, Sicherheit, Monitoring, Skalierung, Kosten und mehrere Shops.

Hinterfrage ausdrücklich ältere Vorschläge wie **„Jetzt personalisieren“/Click-to-load**, Hilfslinien und die **15-Minuten-Zwischenspeicherung**. Sie sind zu bewerten, nicht blind zu übernehmen. Prüfe Alternativen, die den Kundennutzen erhöhen.

Zeige bei komplexen Bedienabläufen visuelle Wireframes oder Mockups. Mache deutlich, was bereits existiert und was nur Zielkonzept ist.

## 9. Phase 7: Umsetzungsfahrplan

Teile den Weg in realistische, testbare Arbeitspakete auf:

- **P0:** Kritische Entscheidungen, Quellenlücken, Sicherheits- und Architekturfragen
- **P1:** Gemeinsame Modelle, Versionierung und technische Basis
- **P2:** Designwerkstatt, Vorlagen, Serien, Medien und Qualitätskontrolle
- **P3:** Kundenkonfigurator, mobile UX, Rendering und Speicherung
- **P4:** Shopify, Produkte, Varianten, Preis-/Warenkorb und Bestelleingang
- **P5:** Maschinenfähige Produktionsdateien, Prüfungen und Auftragsübergabe
- **P6:** KI, Stapelverarbeitung, Produktbilder, SEO und Automatisierung
- **P7:** Multi-Shop, Sprachen, B2B und spätere Erweiterungen

Für jedes Paket: **Ziel, konkrete Schritte, betroffene Komponenten, Abhängigkeiten, geschätzter Aufwand, wirtschaftlicher Nutzen, Risiken, Tests und eindeutige Abnahmekriterien.** Zeige einen schnellen, stabilen MVP-Pfad sowie spätere Erweiterungen; vermeide einen unnötigen Komplettumbau.

## 10. Verbindliche Schutz- und Arbeitsregeln

- **Bis zum ausdrücklichen Go nur Recherche, lesende Diagnostik, Konzept und Planung.** Keine Implementierung, keine Commits, PR-Merges, Produktveröffentlichungen oder Live-Mutationen.
- Projektanweisungen und neuere Nutzerentscheidungen aus `AGENTS.md`, `ENTSCHEIDUNGEN.md`, `PRIO-KONFI.md`, aktuellen Issues und Übergaben beachten.
- Keine vertraulichen Schlüssel, Kundendaten, Produktionsaufträge oder privaten Datenbanken veröffentlichen.
- Keine vorhandenen Branches, Dateien, Designs oder Daten überschreiben oder löschen.
- Kein paralleler Konfigurator-Fork pro Produktfamilie als unreflektierte Standardlösung.
- Bestehende FPD-/Zakeke-Produkte nur im erlaubten Rahmen untersuchen; keine Umgehung von Zugriffskontrollen oder Übernahme geschützten Quellcodes.
- Beobachtung, Dokumentation, Schlussfolgerung und Vorschlag eindeutig trennen. Fehlende Belege offen nennen.
- Keine erfundenen Preise, Maße, technischen Fähigkeiten oder vermeintlichen Chris-Freigaben.
- Bei Bedarf gezielt nach weiteren Repo-, Shopify-, Test-, FPD- oder Zakeke-Zugängen fragen. Vorhandene berechtigte Verbindungen regulär nutzen.
- Berichte klar auf Deutsch, mit belastbaren Belegen, konkreten Empfehlungen und knappen Fortschrittsupdates.

## 11. Gewünschte Ergebnisse – in dieser Reihenfolge

1. **Anforderungsinventar** und Quellen-/Zugriffsliste, mit offenen Punkten.
2. **FPD-vs.-Zakeke-Bericht** mit Backend-/Editor-Analyse, Praxis-Workflow und priorisierten Learnings.
3. **Unabhängiges Greenfield-Konzept V1**, schriftlich fixiert, mit *deiner* Vorgehensreihenfolge, Architektur, Alternativen und Begründung.
4. **Belegtes Ist-Audit**: Prio Konfi R15, neueste Live-/Repo-Stände, Designwerkstatt, Katalog, alte Varianten, offene Integrationen und technische Schulden.
5. **Vergleichsmatrix und Gap-Analyse**, die V1 nicht nachträglich umschreibt.
6. **Optimierte Zielarchitektur** samt konkreten Workflows und bei Bedarf Wireframes.
7. **Priorisierte, wirtschaftliche Roadmap**, Entscheidungsbedarf und klare Empfehlung an Chris.

**Freigabepunkt:** Präsentiere die Ergebnisse und deine begründete Empfehlung. Frage danach ausdrücklich nach meinem Go für die Umsetzung. Vorher keinerlei produktive Änderungen.

## 12. Start

Beginne **jetzt mit Phase 1**. Lies die verbindlichen Regeln und aktuellen fachlichen Anforderungen, inventarisiere verfügbare Quellen und unterscheide Anforderungen von bestehenden technischen Lösungen.

Analysiere dann **zuerst FPD und Zakeke**, vor allem deren **interne Design- und Produktverwaltung**. Entwickle daraufhin **dein eigenes, unabhängiges Konzept V1** und halte es fest. **Erst danach** lies und bewerte den Prio-Konfi-/Werkstatt-Code, führe den Vergleich durch und entwerfe die optimale gravuru-Lösung.

Die wichtigste Antwort, die ich erwarte, ist nicht „Was können wir am bestehenden Code ändern?“, sondern: **„Wie würde ein hervorragender Architekt das gesamte Problem selbst lösen – und welchen unserer bestehenden Bausteine würde er danach aus guten Gründen behalten?“**
