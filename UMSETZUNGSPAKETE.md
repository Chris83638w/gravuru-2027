# Umsetzungspakete – Gravuru 2027

Stand 30.09.2026. Ein Paket kann mehrere kleine Commits benötigen. Die Reihenfolge ist ein Arbeitsvorschlag; bestätigte Anforderungen bleiben im Master-Bauplan. Keine geschätzten Zeitversprechen und kein neues Framework ohne begründeten Bedarf.

## G27-00 · Übergabe vorbereiten

Quell-/Ressourcenarchive, Materialzuordnung, ausgewählte UI-Bilder, SHA-256-Manifest, Startanleitung, Prüfstand und diese Arbeitspakete sichern. Ergebnis siehe `STATUS.md` und `QUELLEN-UND-START.md`. Die vollständige neue App wird dadurch nicht als fertig bezeichnet.

## G27-01 · Getrennte lauffähige Grundlage

**Startpaket für Sol 6.1.** Referenzarchive prüfen und separat auspacken. Bestehende Build-/Teststrecke ausführen, soweit der dokumentierte aktuelle Prüfnachweis nicht bereits denselben Dateistand abdeckt. Geeignete Kundenmodule und ihre Ressourcen in einen klar abgegrenzten neuen Arbeitsbereich übernehmen. Werkstatt-/Shopify-Quellen gezielt mit dem alten Repository abgleichen; fehlende Admin-Dateien nicht mit unpassenden Altversionen auffüllen.

Abnahme: reproduzierbarer Start in eigener Testumgebung; Acrylvorlage mit Musterfoto und allen sechs Sockeln erreichbar; Text, Farbe, Fotoersatz, Größe und Preis bedienbar; bestehender Vergleich bleibt erreichbar. Gemeinsame Quelle von übernommenen und geänderten Teilen dokumentiert. Noch keine neue Live-Shopify-App behaupten. Nach dem lauffähigen Stand `STATUS.md` aktualisieren.

## G27-02 · Gemeinsames Produkt- und Variantenmodell

Material, Oberfläche/Stärke, Kontur, Bohrbild, Größe, Zubehör, Design, Kundenfelder, Profile, Szene, Konfiguration und Revision verbinden. Stabile Konfigurations-ID von Shopify-Produkt-/Varianten-ID trennen. Explizite gültige Kombinationen und Standarddesign je Variante. Inhalte/Farbe/Ersetzen/Verschieben/Skalieren/Löschen als getrennte Elementrechte. Datenbankspeicherung braucht Transaktionen, Migrationen, Versionskonflikte und unveränderliche Revisionen; Technik anhand der vorhandenen Quellen und Betriebsumgebung entscheiden und begründen.

Abnahme: gleiches aufgelöstes Modell für Einzelanlage, Vorschau, Preisprüfung und spätere Stapelanlage; Rechte auch serverseitig; keine stillen Fotozuordnungen bei wechselnden semantischen Feld-IDs. Ausdrücklich leer, geerbt und überschrieben bleiben bei Profilen unterscheidbar. Mehrfachkategorien erzeugen keine zufällige Profilwahl.

**Feste Prüfdaten:** Acryl 150 × 200 × 3 mm = 1499 Cent; 200 × 266,7 × 3 mm = 1999 Cent. Kleine Sockel: Buche 899, Eiche 999, Nussbaum 1099, klar 399, satiniert 499, flach Nussbaumoptik 599. Große Sockel jeweils +100; ohne Sockel immer +0. Wandhalterung zusätzlich +599 in beiden Größen. Alle 28 Kombinationen aus 2 Größen × 7 Sockelauswahlen × Wandhalterung ja/nein prüfen. Beispiel groß/Eiche/Wand = 3697 Cent.

## G27-03 · Material und freie Formen

Vorhandene Materialreferenzen zuordnen, Herkunft und Referenzstatus erhalten. Materialbild ist keine Außenkontur und keine Lieferantenspezifikation. PDF/SVG als Form von Design-Upload unterscheiden. Geschlossene Pfade einschließlich Innenkonturen importieren; physische PDF-Maße aus Kontur und Koordinatentransformationen bestimmen, keine Seitenweißräume als Schildgröße. SVG-Einheiten und viewBox prüfen. Form muss sich in 2D mit Materialtiefe, Kanten und passender Szene darstellen lassen.

Abnahme: Rechteck/Oval/Quadrat sowie ein realer importierter freier Pfad; gleiche Geometrie in Vorschau und Export. Bohrungen in 120 × 80 mm, Ø4, Mitte 8 mm vom Rand: zwei bei (8,40)/(112,40), vier bei (8,8)/(112,8)/(8,72)/(112,72). Durchmesser/Randabstand bei Variantenwechsel erhalten; Loch komplett in der Form. Vorhandene PDF-Löcher nicht zusätzlich duplizieren. Unzulässige Geometrie erklärt ablehnen. Reale Materialstärken nicht aus Dateinamen ableiten.

## G27-04 · Vollständige Werkstattverwaltung

Ausgewählte Produktübersicht und Bearbeitungsansicht aus `design-reference/` als visuelle Grundlage. Konfigurationen suchen, öffnen, anlegen, kopieren, ersetzen, archivieren, als Master nutzen und wiederfinden. Wiederverwendbare Schrift-, Motiv-, Bestseller-, Farb-, Szenen- und Produktionsprofile. PDF/SVG-Design ersetzt das gewählte Design; editierbare Felder bei fehlender Semantik verständlich zuordnen, nie Erkennung vortäuschen. Transparenz als aktivierbarer, einfärbbarer Bereich; Weißregel davon getrennt.

Abnahme: speichern, neu laden und Version wiederherstellen; konkurrierendes Speichern zeigt Konflikt; stabile IDs bleiben erhalten; aktive Revision und Entwurf getrennt; Designersatz ändert weder Preis noch Außenform/Shopify-Bindung ungewollt. Weitere Produktbindungen möglich. Bildmockups nicht als implementierte Verwaltung ausgeben.

## G27-05 · Kundenkorrekturen vollständig übernehmen

Keine Designauswahl bei höchstens einem passenden Design; Kategorien/Kollektionen nur ausdrücklich aktiviert. Designs untereinander. Schriftgröße in mm mit Dezimalwerten, runde Farbbuttons, „Ausgewählte Farbe“, Presets und Farbwähler. Kein Druckbutton oder Einstecktiefenhinweis beim Kunden. Mobiles Doppeltippen öffnet direkte Texteingabe. Griffe vor Szene/Sockel. Zoom nur bei brauchbarer Funktion. Beispielbild mit auffälligem, höher platziertem Fotoersatz-Button bleibt sichtbar. Fixe Motive unbeweglich, freigegebene Inhalte/Farben bearbeitbar.

Abnahme: Desktop und Mobil in der normalen Produktansicht, nicht nur `review=1`. Tastatur/Fokus, Touch, Rückgängig und alle Sockel prüfen. Gestaltung bleibt außerhalb der Verdeckung sichtbar; Einsteckbereich 7/5 mm wird trotzdem bedruckt. Schrift-/Beleuchtungsabweichungen gegenüber Original sind laut vorhandener QA noch offen. Keine fotografische Echtheit ohne sichtbaren Vergleich behaupten.

## G27-06 · Bestellung und Produktion

Unveränderlichen Stand je Bestellung/Position sichern: Variantenwahl, Preise, Geometrie, Design/Kundenwerte, Originalmedien sowie Schrift- und Produktionsprofilrevisionen. Serverprüfungen aus G27-02 verwenden. Job für SVG/PDF mit Konturen, PNG, Originale, Vorschau, Manifest und ZIP; wiederholbar und mit Fehlerstatus.

Abnahme Druck: maßhaltig; Schrift als Pfade; Originalauflösung und Alpha erhalten; freigegebenes CMYK-Profil im Druckmaster; Roland `CutContour` und `RDG_WHITE`; Rückseite genau einmal gespiegelt; Weiß hinter nichttransparentem Druck, für Tönungen ausdrücklich festgelegte Regel. Szene/Sockel/Griffe/Hinweis nie in Separationen. PNG bleibt RGB-Zusatzdatei. SVG nicht als verbindlich CMYK-separiert ausgeben.

Abnahme Gravur: Verfahren passend für Material, Vektor-/Rasterausgabe getrennt von Schnittkontur; keine Druck-Weißebene erzwingen. Fehlende Schrift/zu kleines Foto/fehlendes Produktionsprofil nachvollziehbar melden. Export nach späterer Design-/Profiländerung reproduziert alten Bestellstand. Technische Tests und reale RIP-/Maschinenprobe getrennt berichten.

## G27-07 · Excel, PDF/SVG und Stapelverarbeitung

Echte Excel-Vorlage mit Stammdaten sowie separaten Kindtabellen für Varianten und Designzuordnungen erstellen. 30 Designs innerhalb einer Konfiguration sind kein 30-facher Produktimport. Dateiquellen über eindeutige IDs/Pfade/Ordner zuordnen; lokaler Pfad gibt gehosteter App keinen Zugriff. Originale mit Prüfsummen sichern. Vorschau/Dry-run, Fehler je Zeile, Jobs, Wiederaufnahme und gezieltes Aktualisieren anhand stabiler IDs/erwarteter Revisionen.

Abnahme: erst 3, dann 100 Produkte; 100 Zeilen mit 3 Fehlern ergeben 97 erhaltene Entwürfe und 3 konkrete Fehler. Wiederholung erzeugt keine Duplikate; parallel geänderte Produkte werden nicht überschrieben. 30 Designs korrekt nach Größe/Form filterbar. PDF/SVG-Design direkt ersetzt. Administrator-Stapel von Kundenbestellungen mit individuellen Namen getrennt halten.

## G27-08 · Shopify, Drive und KI

Shopify-Bindungen mit echten Varianten, SEO-Entwurf und Bildern; wiederholbare Übertragung mit Journal, keine Live-Veröffentlichung als Importnebenwirkung. Drive nur über eigene autorisierte App-Anbindung; Datei-IDs und revisionsgebundene Kopien. KI-Product-Designer als überprüfbare Erstellung/Änderung von Designs, auch stapelweise; Kostenrahmen, Abbruch, Fortschritt und Herkunft. Freigegebene Konturen, Elemente und Kundenfeldrechte erhalten.

Abnahme: vollständige Testbestellung bis Produktionspaket; Wiederholung nach Abbruch erzeugt kein zweites Shopify-Produkt. Designquelle darf historische Bestellungen nicht verändern. KI-Vorschlag als Entwurf, Importfehler nicht als Erfolg. Raumfoto-2D optional nach Kernstrecke; AR bleibt vertagt.

## Arbeitsabschluss je Paket

Geänderte Dateien/Commit, konkret ausgeführte Prüfungen, sichtbarer Ergebnislink bzw. Screenshot und verbleibende Grenzen kurz dokumentieren. Bei klarer Berechtigung und bestandener Abnahme mit dem nächsten Paket fortfahren; keine neue Grundsatzdiskussion. Bei fachlich fehlenden Daten nur betroffenen Teil aussetzen und unabhängig weiterarbeiten. Erst „fertig“, wenn die beschriebene Strecke tatsächlich geprüft ist.
