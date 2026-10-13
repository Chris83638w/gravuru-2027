# Gravuru 2027 – Arbeitsregeln

Zuerst `START_HERE.md`, danach das aktive Paket in `UMSETZUNGSPAKETE.md` lesen. Detailanforderungen stehen im `NEUE-WERKSTATT-PLAN.md`; die aktuelle Entscheidung gilt vor historischen Quelltexten und Bildprompts.

- Eigenständige neue App; vorhandenen Kundeneditor und Ressourcen gezielt wiederverwenden. Die ZIPs enthalten eingefrorene Referenzen, keine fertige neue App. `legacy-reference/` unverändert zum Vergleich halten; aktive Änderungen in klar benannten neuen Modulen.
- Ein Arbeitspaket mit überprüfbarem Ergebnis nach dem anderen. Keine neue Komplettplanung bei jeder Fortsetzung. Passende Quelldateien gezielt lesen; große Motiv-/Fontsegmente nicht als Text in den Kontext laden.
- **Verbindliche Masterbegriffe (Nutzer, 04.10.2026):** „Motiv“ bezeichnet ein einzelnes hinzufügbares Element. „Design“ bezeichnet die gesamte Gestaltung einer Platte/eines Acrylglases einschließlich Foto, Texten und Motiven. Diese Unterscheidung gilt für Kommunikation, Oberfläche, Dokumentation und neue fachliche Benennungen. Bestehende technische Bezeichner nicht allein deshalb ungeprüft migrieren.
- Nur 2D. AR ist vertagt. Neue Technikwahl begründen, ohne bereits beantwortete Produktfragen zu wiederholen.
- Maße in mm, Preise in ganzen Cent. Vorschau, Preis, Variantenprüfung und Produktion beziehen sich auf denselben versionierten Produktstand. Keine zweite Preis-/Geometrielogik für Import oder Shopify.
- Endgültige Schriften und echte Produktionsprofile nicht erfinden. Vorliegende Materialbilder können gestaltete Muster sein. `MATERIALREFERENZEN.md` beachten, besonders Edelstahl v4 und unbestätigte Musterstärken.
- Produktionsdateien getrennt von Szene, Sockel, Bediengriffen und Fotohinweis. Schriftpfade, Originalbilder, Konturen, Weiß und Spiegelung anhand der Abnahmekriterien prüfen. Keine angeblich verlustfreie Vektorisierung eines flachen Fotos.
- Fertige Funktionen, synthetische Tests, historische Nachweise und offene Voraussetzungen ausdrücklich unterscheiden. Eine passende Oberfläche allein belegt keine funktionierende Bestellstrecke.
- Geeignete Tests und sichtbare Bedienprüfung je Änderung; bei Fehlern Ursache beheben statt Sollwerte an fehlerhaftes Verhalten anzupassen. Nach bestandener Abnahme nicht ohne Anlass denselben Testlauf wiederholen.
- Geheimnisse, Kunden-/Bestelldaten und lokale Datenbanken gehören nicht ins Repository. Bestehendes Vergleichsprojekt nicht überschreiben. Veröffentlichte Bestellstände sind unveränderlich.
- Für Implementierung eigenen Aufgabenbranch verwenden. Keine fremden Änderungen zurücksetzen. Repositoryzugriff und bestehenden Stand zuerst prüfen; keine pauschalen Veröffentlichungs-/Berechtigungsänderungen als Umweg.
- Nach jedem Paket `STATUS.md` knapp fortschreiben: Dateien/Commit, ausgeführte Prüfungen, offene Grenzen, genau nächster Schritt. Kurze deutsche Updates, nutzbare Links und sichtbare Ergebnisse für Mikail.

Diese Regeln beantragen keine selbstständigen Parallelagenten und ändern keine Modellwahl. Der Nutzer legt fest, welches Modell arbeitet.

## Wiederkehrende Gestaltung mit Product Design

Bei neuen Gravuru-Designs oder Varianten zuerst `design/product-design/START.md` lesen. Dieser kompakte Einstieg enthält die geltenden Gestaltungsregeln und verweist gezielt auf die benötigte Vorlage. Vorhandene Ebenen und Bildressourcen wiederverwenden; nur beauftragte Teile ändern. Gestaltung über das Product-Design-Plugin, keine eigenen Generierungs-API-Aufrufe und kein Modelltraining. Die Projektdateien sind der dauerhafte Kontext; ein globaler Plugin-Speicher darf nur als eingerichtet bezeichnet werden, wenn er tatsächlich beschreibbar und gespeichert ist.
