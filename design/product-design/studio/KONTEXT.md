# Gravuru Designstudio · gemeinsamer Kontext · Version 2

## Ziel und aktuelle Grenze

Mehrere vollständig unterschiedliche Gravuru-Designs mit Product Design entwickeln, ohne bei jedem Auftrag die Produktlogik und vorhandenen Ressourcen neu zu erschließen. Der Nutzer hat ausdrücklich verlangt, einen getrennten Chat beziehungsweise ein getrenntes Projekt mit eingewiesenen Agenten vorzubereiten. Die neuen Designkonzepte sollen erst dort entstehen. Jetzt nur Arbeitsbereich, Rollen und Kontext vorbereiten.

## Bestätigte Nutzerregeln

| ID | Regel | Herkunft |
| --- | --- | --- |
| D-001 | Gestaltung über das Product-Design-Plugin; keine eigene Generierungs-API. | Direkte Nutzerentscheidung im bisherigen Chat |
| D-002 | Maße und Kontur bekannt übernehmen; Preise, Befestigungsoptionen, Größenangebote und Zubehör gehören in den Produktkonfigurator. | Direkte Nutzerentscheidung |
| D-003 | Bearbeitbare Texte, austauschbare Fotos und getrennte Motive; sichtbares echtes Musterfoto. Upload-Hinweis als Bedienoberfläche, nicht in der Druckgrafik. | Direkte Nutzerentscheidung |
| D-004 | Originale und unveränderte Ressourcen erhalten; keine unnötige Neuerzeugung des gesamten Produktbildes. | Direkte Nutzerentscheidung |
| D-005 | Kein pauschaler zusätzlicher Sicherheitsrand. Angegebene Maße und bestätigte technische Vorgaben gelten. | Direkte Nutzerkorrektur und bestehendes Rezept |
| D-006 | Drei unterschiedliche Designs bedeuten eigenständige Layouts und Motivideen; bloße Farb-, Namens- oder Spruchwechsel zählen nicht. | Nutzer am 13.10.2026: „komplett unterschiedliche und nicht nur Farbänderungen“ |
| D-007 | Neue Konzepte im neuen Design-Arbeitsbereich mit den neuen Agenten bearbeiten. | Dieselbe aktuelle Nutzeranweisung |

Eine zusätzliche Schutzzone von 3 mm, eine neue Schrift oder ein erfundener Produktionsstandard ist durch diese Regeln nicht freigegeben. Empfehlungen anderer Agenten bleiben Vorschläge, bis sie vom Nutzer bestätigt oder durch eine bestehende bestätigte Vorgabe gedeckt sind.

## Was wiederverwendbar ist

- Bestehendes Rezept: `design/product-design/START.md`.
- Quellenregister: `design/product-design/references.json`, konkret registriert ist `acryl-18`.
- Helfer: `scripts/product-design-session.py` für private Arbeitskopien und Änderungsprüfungen. Er generiert keine Bilder und passt Layouts nicht automatisch an.
- Bestehende Acrylvorlage: 150 × 200 mm, rechteckige Produktfläche, Bogenfotomaske, getrennte Texte und Olivenzweig. Original-SHA `f6be9bb3b2526ab829dcd9c2419060147c95d0a0d94d79e404f2eaaea413b43b`.
- Werkstatt-Schriften: Garamond Acryl und Freestyle Acryl als vorhandene Glyphdaten. Keine mitgelieferten installierbaren TTF/OTF; keine stillen Browser-Ersatzfonts.
- Die Vorlage ist eine historische Rekonstruktion mit dokumentierten Abweichungen vom alten Mockup. Im wiedergefundenen Sammelarchiv lagen Beispiele 13–18; die Sammlung aller ungefähr 18 Muster ist nicht vollständig wiedergefunden.

Die lokalen Ressourcen und historischen Ergebnisse werden in `QUELLEN.json` verzeichnet. Bei einer anderen Cloud-Laufzeit ist ein absoluter alter Pfad kein Zugriffsnachweis. Zuerst die mitgegebene Projektkopie prüfen, sonst die im Referenzregister belegte Originalquelle anhand der Prüfsumme wiederbeschaffen. Ein erfolgloser Zugriff wird nicht unverändert wiederholt.

## Was der erste Teamlauf wirklich bewiesen hat

ACR-001, ACR-002 und ACR-003 sind Varianten derselben Gestaltung: Namen, Texte beziehungsweise Bogenfarben geändert. Drei Designer und ein unabhängiger Prüfer haben Wiederverwendung, getrennte Arbeitskopien, native Bearbeitbarkeit und richtige Vorschauen geprüft. Diese Ergebnisse sind **kein Nachweis für drei eigenständige Designideen** und keine Werkstatt-/Fertigungsfreigabe. Sie bleiben unter `private/history/` als technische Referenz erhalten.

## Wie drei neue Designs unterschieden werden

Die Koordination formuliert zunächst drei kurze Konzeptkarten für denselben konkreten Produktauftrag. Jede Karte nennt eine andere Komposition und Motividee sowie passende Bildführung, Text-Hierarchie und Formensprache. Es genügt nicht, im selben Aufbau Namen oder Farben zu wechseln. Vorhandene technische Produktvorgaben und verwendbare Ressourcen gelten für alle drei.

Die Designer erhalten je eine Karte und eine eigene Arbeitskopie. Vor dem Ausarbeiten gleicht die Koordination die Richtungen ab. Der Prüfer bewertet sowohl die technische Qualität als auch die sichtbare Eigenständigkeit der drei Entwürfe. Er meldet unzureichend verschiedene Varianten zurück. Die Nutzerabnahme bleibt eine eigene Entscheidung.

## Dauerhaftes Wissen und Agenteneinweisung

Dieses Projekt speichert Kontext, Rollen, Quellen und Einweisungsnachweise als Dateien. Neue Agenten laden sie gezielt. Das ist eine nachvollziehbare Konfiguration, kein Modelltraining. Eine produktive Kontextdatenbank und automatische Synchronisation zwischen verschiedenen Apps sind noch nicht implementiert.

Die Einweisung prüft: Quellen lesbar, richtige Maße, Regeln verstanden, alte Varianten korrekt eingeordnet und neue Designaufträge noch nicht eigenmächtig gestartet. `agents/*/EINWEISUNG.json` hält den tatsächlichen Test fest. Ein Nachweis bezieht sich auf diese Sitzung; ein neuer Chat erzeugt eigene Agenten aus denselben Rollen.
