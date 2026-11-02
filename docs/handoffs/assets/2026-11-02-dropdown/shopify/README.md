# Shopify-Veröffentlichung 02.11.2026

Die aktuelle ausdrückliche Freigabe von Chris gilt für alle 126 Produkte und die sofortige Veröffentlichung. Der vorbereitete PR-56-Plan wird wiederverwendet, anhand des frischen Bestands auf 41 fehlende Marker und 84 fehlende Veröffentlichungen begrenzt. Der AOSU-Hochformat-Pilot ist bereits veröffentlicht und angebunden.

`before.json` ist die aktuelle Sicherung vor Schreibzugriffen. `authorized-actions.json` enthält ausschließlich diese nachgeprüften Anforderungen und die vorbereiteten Rückweg-Mutationen. Die historischen Revisionsnummern aus dem ursprünglichen Plan werden nicht als aktuelle Bindungen geschrieben; die aktuelle Konfigurator-Datenbank bleibt unverändert.

Jede Mutation erhält eine separate Ergebnisdatei und lesende Nachprüfung. Nur im Journal erfolgreich neu angelegte Marker bzw. Veröffentlichungen kommen für den Rückweg infrage. Vor einem Rückweg aktuellen Zustand vergleichen; bei parallelen Änderungen anhalten. Keine alten Marker, Produktvarianten, Preise, Themes oder Bindungen zurücksetzen.
