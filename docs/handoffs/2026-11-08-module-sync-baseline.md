# Sicherung vor Modul-/Galerie-Synchronisierung · 08.11.2026

Getrennte Arbeitskopie auf `dev/mika-module-sync-20261108`, Ausgangsbasis `49626dd715a564295712e53fb5a2515f90f54313` (PR #201). Der Ausgangsstand und seine vollständige Git-Historie bleiben erhalten. Diese Sicherung betrifft ausschließlich den Quellstand. Keine Live-Datenbank, keine Galerie-Originale und keine Shopify-Daten wurden verändert.

Wiederverwendete Sync-Quelle: `dev/mika-verwaltung-sync-absicherung-20261107`, Stand `3ad2cdc`; die vorhandene Engine aus PR #185/#189 ist Grundlage für Bestätigung, feste Produkt-/Varianten-IDs, Journal, Wiederaufnahme und Aktivierung. Astra PR #194 (`d689044b19ce922ef8a410342b7f7b839216935b`) bleibt Quelle der echten Galerie-/Familienzuordnungen; es wird kein zweiter Importer aufgebaut.

Nutzerauftrag: Ein gemeinsamer Konfi, Module als Produktdaten. Änderungen aus Galerie/Produktprofil zuerst konkret anzeigen, dann bestätigen und bestehende Shopzuordnungen gezielt weiterverwenden. Keine Duplikate oder ungefragten Löschungen. Der freigegebene Kundenaufbau wird nicht geändert. Designarbeiten folgen dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

Ohne Aktivierung genügt als Rückweg die gesicherte Quellbasis. Nach späterer Aktivierung müssen gegebenenfalls aktive Produktrevisionen und Shopzuordnungen ausdrücklich auf geprüfte alte Stände zurückgeführt werden; Journal, Profile, Bestellungen und Historie werden dabei nicht gelöscht. Eine alte Runtime ohne Modulprüfung darf neue Modulprodukte nicht ausliefern. Diese Arbeit führt keine Aktivierung und keine Shopify-Schreibzugriffe aus.
