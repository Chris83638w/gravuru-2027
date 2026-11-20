# Claudes Prio R15 auf dem geschützten Prüfstand

Der [geschützte Einstieg für Chris](https://konfi-beta.gravuru-designwerkstatt.de/prio-stufe-1/) öffnet den vollständigen Prio R15 am freigegebenen Edelstahl-Türschild. Der Zugriff verwendet die bestehenden Beta-Konten. Ein privates Browserfenster eignet sich für den Einkaufsversuch. Der reguläre Shopify-Produkteinstieg verwendet weiterhin den zuvor veröffentlichten R15. [Auftrag von Claude](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7036352754)

## Selbst ausprobieren

1. Den Testlink öffnen, anmelden und im Prio auf **Designs** tippen. **Zwei Zeilen, versetzt** wählen.
2. Im Textwerkzeug das Feld **Name** bearbeiten und das Schild in den Warenkorb legen. Das persönliche Bild lässt sich antippen und vergrößern.
3. Über **Weiteres Edelstahl-Türschild gestalten** zurückgehen. **Willkommen bei den … – Familie mit Vornamen** wählen, den vorbelegten Nachnamen „Hansens“ ersetzen und das zweite Schild hinzufügen.

Das Startformat ist 120 × 80 mm mit abgerundeten Ecken, Produktrevision 4, Befestigung K00. Beim Designwechsel führt die Rückgängig-Taste zur vorherigen Gestaltung. Wer die frühere zusätzliche Zurück-Schaltfläche kennt, findet diese Abweichung auch in [Claudes Übergabe](../../../docs/handoffs/2026-11-20-prio-c-technik-claude.md).

## Bestätigung im echten Shopify-Warenkorb

Beim Test im mobilen Chrome-Browserfenster mit 390 × 844 Pixeln blieben bei beiden Wechseln der Rahmen, das Dokument und das Editor-Element identisch. Shopify bestätigte zwei einzelne Gestaltungsrevisionen derselben SKU `156-GR-ES-AB-120X80-T15-K00`. „Berger“ im versetzten Design D2 und „Neumann“ im Familiendesign D952 kosteten je 19,99 €, zusammen 39,98 €. Beide persönlichen Bilder ließen sich vergrößern. Ihre 1600 × 1102 Pixel stimmten jeweils vollständig mit der gespeicherten Kundenansicht überein. Der Browser meldete zwei Übernahmen und null Kassenaufrufe. Die Bedien- und Geschwindigkeitsabnahme liegt bei Chris. [Shopify-Warenkorb mit beiden Schildern](nachweis/Shopify-zwei-Schilder.png) · [Ergebnis mit Bildabgleich und Warenkorbdaten](nachweis/Ergebnis.json)

## Bekannter Fehler in diesem Prüfstand

Bei **Zwei Zeilen mit Trennlinie** (D3) liefert das signierte Zielmodell die originale Linie als SVG-Pfad. Beim schnellen Wechsel von D1 fehlt dieser Eintrag im Motivbestand des laufenden Editors. Er rendert den Textplatzhalter „Motiv fehlt“. Die Fertigungsprüfung stoppt den Versuch vor dem Speichern. Dasselbe Design erzeugt beim bisherigen Wechsel im regulären R15 eine gültige Grafik mit der Trennlinie. Für die Zusammenführung braucht Claude an dieser Stelle die Originalgeometrie oder den bestehenden Wechselweg. [Vergleich beider Wege](nachweis/d3-vergleich.json) · [Meldung an Claude](https://github.com/Chris83638w/gravuru-2027/issues/265#issuecomment-7036710071)

## Aufbau und Rückweg

Für eine Wiederholung öffnet `node e2e/warenkorb.cjs` ein neues Chrome-Fenster über Playwright und legt die beiden Prüfartikel in dessen eigenen Warenkorb. Es verwendet `GRAVURU_BETA_BENUTZER` und `GRAVURU_BETA_PASSWORT`. Die Berichte landen in einem neuen temporären Ordner. Mit `--trennlinie` lässt sich der gesonderte D3-Befund nachvollziehen. Die Prüfung löst keine Bestellung aus.

- Ausgangspunkt ist der [Live-Stand `2bd7bd8e`](https://github.com/Chris83638w/gravuru-2027/commit/2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179). Für den Test wurde [Claudes Stand `a38c9701`](https://github.com/Chris83638w/gravuru-2027/commit/a38c97014feeedba7238f4e55f851e80050bb754) gebaut. Das Hauptpaket trägt die Kennung `d64f43ea13aaac6a`. Alle elf veröffentlichten Testdateien sind mit Prüfsumme im [Manifest](editor/manifest.json) erfasst.
- Die App liefert die Testoberfläche unter `/konfi-demo/prio-claude-stufe1-267/`. Der [Bau](editor/build.mjs) prüft den ausgelieferten Basisstand und übernimmt die bestehenden Editor- und Shop-Ressourcen. Er lässt sich mit `node build.mjs <Checkout-2bd7bd8e> <Checkout-a38c9701>` ausführen. Das [Veröffentlichungsskript](editor/publish.py) schreibt ausschließlich in das eigene Testverzeichnis und liest die Dateien über HTTPS zurück.
- Das getrennte Beta-Konto holt über den [Einstieg](beta/einstieg.cjs) eine regulär signierte Produktfreigabe. Die [Umschaltung](beta/umschalten.py) prüft die vorige Startdatei und legt eine Rücksicherung an. `rollback` stellt den früheren Einstieg wieder her. Vor einer Wiederinbetriebnahme ist der Laufzeitdienst ausschließlich dieser Beta-Domain neu zu laden. Der Zugang der älteren C-Prüfung bleibt separat erreichbar.
- Die [Warenkorbansicht](product.warenkorb-cst1.liquid) liegt als `templates/product.warenkorb-cst1.liquid` im unveröffentlichten Shopify-Prüftheme `191449661820`. Sie verwendet den bestehenden Shopify-Client und die persönlichen Bilder der gespeicherten Gestaltungsrevision. Ein bereits mit fremden Positionen gefüllter Warenkorb wird vor dem Hinzufügen erkannt. Der Test endet im Warenkorb.
