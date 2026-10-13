# Gravuru · wiederverwendbares Designrezept · Version 1

**Für jeden neuen Gestaltungsauftrag zuerst diese Datei lesen.** Danach nur die gewählte Referenz und den kurzen Variantenauftrag laden. Keine komplette Projektgeschichte und keine Base64-Bilddaten in den Modellkontext übernehmen.

## Verbindliche Regeln

- Gestaltung ausschließlich mit **Product Design**. Keine eigenen OpenAI-/Bild-API-Aufrufe, kein zusätzliches Modelltraining. Das Plugin nutzt Kontext und Referenzen; es erlernt diese Regeln nicht durch dauerhaft veränderte Modellgewichte.
- **Festgelegter Umfang (13.10.2026): Hier nur Designs erstellen.** Material, Produktgrößen, Formvarianten, Befestigung, Bohrbilder, Zubehör und Preise werden im Produktkonfigurator hinterlegt. Die gewählten Maße, Kontur und bekannten Bohrpositionen dienen beim Gestalten als Vorgabe. Löcher nicht als Motiv oder Druckelement in das Design zeichnen; technische Hilfen getrennt halten. Ein Design kann mehrere passende Produktausführungen bedienen. Keine automatische Produktanlage, Werkstattänderung oder Veröffentlichung als Nebenwirkung eines Designauftrags.
- „Design“ = gesamte Gestaltung eines Produkts; „Motiv“ = einzelnes Element.
- Bearbeitbare SVG als Grundlage, physische Maße in **mm**, `viewBox="0 0 Breite Höhe"`. Maßhaltigkeit entsteht durch Koordinaten und Prüfung, nicht durch die Pixel eines generierten Musterbilds.
- Produktkontur, Fotomaske und Motiv sind verschieden. Rechteck, gerundetes Rechteck, Kreis, Ellipse und Bogen sind mögliche Produktformen. Formwechsel erfordert bewusste Layoutanpassung; keine automatische Verzerrung, kein stilles Abschneiden.
- Fotos, Texte und Motive bleiben getrennte benannte Ebenen. Foto austauschbar, Texte als Text bearbeitbar. Vorhandene vollständige Schriften verwenden; fehlende Schriften nicht ersetzen, ohne die Abweichung zu nennen.
- Ein **echtes Musterfoto** bleibt sichtbar. Der Hinweis „Hier eigenes Foto hochladen“ gehört zur Konfigurator-Bedienung, nicht in die Druckgrafik. Rechte für Händlerbearbeitung und Kundenbearbeitung getrennt behandeln.
- Originaldateien unverändert behalten. Unveränderte Bilder bytegleich wiederverwenden. Nur die im Auftrag genannten Ebenen oder Ressourcen bearbeiten. Eine neue Variante als neue Arbeitskopie beginnen.
- Neue Bildmotive bei Bedarf gezielt mit Product Design erstellen. Kein erneutes vollständiges Produktbild erzeugen, wenn nur Text, Farbe, Position oder ein Motiv geändert werden soll. Generierte Bilder sind keine editierbaren Texte oder fertigen Schnittkonturen.
- Kein pauschaler zusätzlicher Sicherheitsrand. Angegebene Kontur, bestätigte Produktionsvorgaben und bestehende Importprüfung gelten. Import-Skalierung sichtbar ausweisen, nicht als 1:1 ausgeben.
- Szene, Materialfoto, Sockel, Hilfslinien und Bedienhinweise gehören nicht zur Produktionsgrafik. Keine Freigabe von Druckprofilen, Schnitt, Weiß oder Maschinenparametern aus einem Vorschaubild ableiten.

## Kurzer Ablauf für den ausführenden Assistenten

1. Referenz aus `references.json` wählen; bekannte Maße/Schriften/Felder übernehmen. Nur tatsächlich fehlende Angaben erfragen. Standard bei einer bloßen Textänderung: Größe, Form und alle anderen Elemente erhalten.
2. `scripts/product-design-session.py start` legt eine private Arbeitskopie, wiederverwendbare Bilddateien, `BRIEF.md` und eine maßhaltige Konturreferenz an. Im Auftrag nur gewünschte Ebenen zur Änderung freigeben. Der Helfer ruft keine KI und keinen Server auf.
3. In Product Design die **Arbeitskopie** gestalten. Zunächst `BRIEF.md`, Kontur und die benötigte sichtbare Referenz verwenden. Vorhandene Bilddateien referenzieren; keine eingebetteten Bilddaten lesen oder neu erzeugen. Änderungen über die bestehende SVG-Struktur ausführen.
4. `check` prüft Maße, Ebenen, Kundenfelder, Schriftzuordnung sowie unveränderte Teile und Bilder. Danach visuell prüfen: Lesbarkeit, Proportionen, Fotomaske, Überlagerungen und Platzierung in der Kontur. Der technische Check allein beweist diese Punkte nicht.
5. Geprüfte Variante samt Vorschau zeigen. Übernahme in die Werkstatt nur als gesonderter Auftrag über den **bestehenden Importer**. Für den bekannten Bogenfoto-Typ existiert `scripts/prepare-layered-design.py`; andere Fotomasken/Produktformen nicht ungeprüft als kompatibel behaupten.

## Beispiel für den Nutzer

> Product Design: Neues Acrylglasbild nach dem Gravuru-Rezept. Grundlage Muster 18, rund mit 200 mm Durchmesser, Thema Hochzeit. Foto austauschbar, Namen und Datum bearbeitbar. Vorhandene Motive zunächst wiederverwenden.

Der Assistent übersetzt diesen Satz in den Variantenauftrag. Der Nutzer muss keine JSON-Dateien oder Skriptparameter pflegen. Eine Referenz mit bekannten Abweichungen bleibt als solche gekennzeichnet.

Für einen neuen Chat: [kopierfertiger Startauftrag](NEUER-CHAT.md).
