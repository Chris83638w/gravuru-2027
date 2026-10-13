# Optionaler Entwicklungsauftrag: wiederverwendbarer Kontext

Dieser Auftrag ist vorbereitet, aber nicht gestartet. Er wird erst durch ausdrückliche Zuweisung an einen Entwicklungsagenten zum Implementierungsauftrag. Er ist keine Voraussetzung für die drei dateibasierten Designaufträge.

```text
Erweitere den vorhandenen Gravuru-Designablauf um einen versionierten
Kontextspeicher und einen kleinen Kontextabruf. Verwende den bestehenden
Repository-Stand mit design/product-design/START.md, references.json und
scripts/product-design-session.py. Lies AGENTS.md und die aktuelle Prüfung
PRUEFUNG-KONTEXT-DATENBANK-20261013.md, sofern bereitgestellt.

Arbeite in einem eigenen Branch und einer getrennten Arbeitskopie. Prüfe
neuere Commits; übernimm sie und setze nichts auf den alten Dokumentstand zurück.
Keine Live-Datenbank, Shopify-App oder laufende Design-Arbeitskopie verändern.

Speichere Produktfamilien als Verweise auf vorhandene Produktvorgaben,
Grundvorlagen mit Revisionen, Referenzen auf vorhandene Ressourcen sowie
bestätigte Regeln/Entscheidungen und konkrete Designaufträge. Trenne Vorschläge,
bestätigte Regeln und verworfene/ersetzte Regeln mit nachvollziehbarer Herkunft.
Vorhandene Produkt-, Profil- und Asset-Speicher gezielt wiederverwenden;
keine zweite Preis- oder Geometrielogik und keine unnötige Zusammenlegung.

Liefere einen kleinen Helfer für „Familie + Vorlage + Änderungswunsch →
kompaktes Briefing + Versionsmanifest + private Arbeitskopie“. Er soll den
bestehenden Arbeitskopie-/Prüfhelfer wiederverwenden. Kein Modelltraining,
keine eigenen Generierungs-API-Aufrufe und keine riesigen Chatprotokolle im
Briefing. Große Ressourcen über IDs/Prüfsummen referenzieren und nur benötigte
Dateien bereitstellen. Fehlende Zugriffe klar melden.

Erhalte Originale und alte Revisionen. Aktualisiere bestehende Produkte oder
Designaufträge nicht still bei einer Regeländerung. Beachte bei parallelen
Aufträgen eindeutige IDs, atomare Übernahme, Konflikterkennung und getrennte
Arbeitskopien. Private Daten und Datenbanken bleiben außerhalb Git.

Prüfe in einer getrennten Testumgebung mindestens:
- zwei Produktfamilien ohne Vermischung ihrer Regeln;
- zwei parallele Aufträge ohne gegenseitiges Überschreiben;
- Wiederholung derselben Auftrags-ID ohne Duplikat;
- veraltete Revision und fehlende Ressource mit verständlichem Ergebnis;
- bestehende Acrylvorlage einschließlich Bild-Prüfsummen unverändert;
- Regelvorschlag wird nicht automatisch zur bestätigten Nutzerregel;
- Sicherung und Wiederherstellung mit allen referenzierten Ressourcen.

Halte Oberfläche und Umfang klein. Keine Shopify-/Bohrbild-/Budget-Großpakete
als Voraussetzung vorziehen. Liefere konkrete Änderungen, Tests, Bedienbefehl
für den nächsten Designchat und benenne noch fehlende automatische Anbindungen.
```
