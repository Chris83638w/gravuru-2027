// Schriftnamen für Kunden: interne Kennung (· 12 Zeichen Prüfsumme der Schriftdatei) und „Regular“ nicht
// anzeigen (Chris 20.10.2026: „Bei den Schriftarten ist irgendwas alphanumerisches. Wegnehmen.“).
// Gespeichert und gefertigt wird weiter mit der vollen Kennung.
export const fontDisplayName=name=>String(name??'').replace(/\s+·\s+[0-9a-f]{12}$/i,'').replace(/[\s-]+Regular$/i,'').trim();
