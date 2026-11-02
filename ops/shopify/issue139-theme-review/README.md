# Theme-Prüffassung zu #139 · 02.11.2026

Quelle: MAIN-Theme `185833718140`, `gravuru-shopify-theme/production`, lesend vollständig für Sections, Snippets, JSON-Vorlagen, deutsche Übersetzungen und Einstellungen gesichert. `manifest.json` enthält Quellprüfsummen. **Keine Shopify-Schreibänderung, keine Veröffentlichung.**

`proposed/` enthält den Vorschlag für die zwei bestehenden Dateien und die neue Vorlage:

- `config/settings_data.json`: aktive Freiversand-Schwelle von 69 auf 90 Euro. Andere gespeicherte Theme-Presets bleiben erhalten.
- `sections/header-group.json`: „Versandkostenfrei ab 90 € in Deutschland“.
- `templates/product.konfi.json`: vorhandener Seitenaufbau aus `product.test-temp-svenja-grid`, deaktivierte Sections/Blöcke, alte FPD-Module und leere Liquid-Blöcke entfernt. Der bestehende native Konfi-Einstieg bleibt erhalten. Der allgemeine Hinweis verspricht keinen Foto-Upload bei Edelstahl.

Vor Anwendung: die aktuellen Quellen gegen die Prüfsummen abgleichen, auf einer unveröffentlichten Theme-Kopie anwenden, Produktseite/Warenkorb/FAQ und mobile Darstellung screenshotten. Claude prüft vor Veröffentlichung (Kommentar 6574480234). Neue Produkte erhalten `templateSuffix: konfi` erst zusammen mit der abgenommenen Vorlage. Keine Testvorlage zuweisen.

Die tatsächliche Versandstaffel ist separat in Shopify einzurichten; die Änderung des Theme-Hinweises richtet keine Versandtarife ein. Live-Produktzuordnungen, Screenshots der Theme-Kopie und vollständiger Theme-Check stehen noch aus. Diese drei Dateien sind noch keine freigegebene Theme-Version.
