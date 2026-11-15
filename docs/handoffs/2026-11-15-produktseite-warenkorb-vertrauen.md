# Auftrag: Speicherhinweis, Fertigungsfrist und Vertrauen – Konfi, Produktseite, Warenkorb

**Stand:** main `76269aa` · **Von:** Claude (Operator) · **Datum:** 15.11.2026
**Anlass:** Chris hat ein TikTok („8 figure Produktseiten Checkliste“) auswerten lassen; die passenden Punkte hat er im Chat freigegeben („ok“, 15.11.2026 11:24).
**Zuständig:** Konfi-Oberfläche nur Mika (PRIO-KONFI.md, R15-Basis). Produktseite und Warenkorb: Bearbeiter der Produktseite in der Theme-Kopie „Produktseite 2027 – Kopie 10.11.“. **Nichts live schalten.** Abnahme per Screenshot 1:1 aus dem echten Konfi bzw. Theme (Handy und Desktop).

## 1. Speicherhinweis (freigegeben)

Chris, 15.11.2026: „das Design bleibt gespeichert sollte auch in der cart und im warenkorb stehen“.

| Ort | Text (Vorschlag) |
|---|---|
| Konfi, klein und immer sichtbar beim Warenkorb-Knopf | ✓ Automatisch auf diesem Gerät gespeichert · Mit Kundenkonto 90 Tage auf allen Geräten |
| Warenkorb-Drawer **und** Warenkorb-Seite, je personalisierter Position | ✓ Dein Design ist gespeichert – wir fertigen es genau so, wie du es gestaltet hast. |
| Warenkorb (Drawer und Seite), einmal über „Zur Kasse“, nur ohne Anmeldung | Mit Kundenkonto findest du deine Designs 90 Tage auf jedem Gerät wieder. → Anmelden / Registrieren |

**Geprüft gegen den Code (Wahrheit der Texte):**
- `app/configurator/variant-m/session-guard.mjs`: Stand liegt 7 Tage im `localStorage` (`SESSION_GUARD_TTL_MS`), **ohne Foto-Bytes** – nach Neuladen müssen Fotos neu gewählt werden (`ux.mjs` Z. 471). Darum steht im Konfi-Hinweis „auf diesem Gerät“ und **kein** Versprechen zu Fotos.
- `ux.mjs` Hilfe „Entwurf speichern“: Kundenkonto = 90 Tage mit Fotos, auf jedem Gerät. Daher „90 Tage“.
- `cart-edit.mjs`: „Bearbeiten“ aus dem Warenkorb nutzt den privaten Zugriff im `sessionStorage` dieses Tabs/Browsers. Deshalb im Warenkorb **nicht** versprechen, dass man das Design später auf einem anderen Gerät bearbeiten kann.

**Verboten (Chris, 15.11.):** kein Ablauf-Timer („nur noch X Minuten gespeichert“), kein „Warenkorb reserviert“. Das Design wird nie künstlich gelöscht. (UWG Anhang Nr. 7: unwahre Befristung ist stets unzulässig.)

## 2. Echte Frist statt künstlichem Countdown

Anzeige auf der Produktseite (unter „Jetzt personalisieren“) und im Warenkorb:
- vor der Frist an Werktagen: „Noch 1 Std. 37 Min. bestellen – heute noch gefertigt.“
- danach, am Wochenende und an Feiertagen: „Jetzt bestellen – Fertigung am Montag“ (nächster Werktag).

Quelle: Chris 10.11.2026 – Fertigung am gleichen Werktag für Bestellungen bis ca. 13 Uhr. **Offen (vor dem Bau klären):** genaue Uhrzeit, gilt sie für alle Produktlinien, Feiertage NRW (Standort Bielefeld)?

## 3. Produktseite und Warenkorb (Checkliste)

1. **Lieferzeitleiste** Bestellt → Gefertigt → Versendet → Zugestellt, mit Datum; vorhandene Lieferdatum-Logik weiterverwenden (Sonntag überspringen, deutsche Wochentage).
2. **Sterne direkt unter dem Titel:** 4,89 ★ · über 10.000 Bewertungen **auf Amazon** (Quelle sichtbar nennen) · über 800.000 Kunden. Zusätzlich ein Satz, wie die Echtheit gesichert ist (Rechtstext-Dienst von Chris fragen). Kein Trustpilot-Logo – gravuru hat kein Trustpilot.
3. **Warenkorb:** Fortschrittsbalken bis zum Gratisversand, Rabattcode-Feld direkt im Warenkorb, Vertrauenszeile. „Passend dazu“ erst im Warenkorb, nicht neben „Jetzt personalisieren“.
4. **FAQ** aus eigenen Kundenfragen (Amazon-Anfragen, Reklamationen), nicht von Wettbewerbern kopiert.

**Nicht umsetzen:** KI-UGC-Videos (Chris: Bilder natürlich, nicht KI-generiert), Streichpreise ohne 30-Tage-Tiefstpreis (§ 11 PAngV; neuer Shop hat keine Preisgeschichte), Countdown, der neu startet.

## Offen – Freigabe von Chris fehlt
- Fertigungsfrist: genaue Uhrzeit, Produktlinien, Feiertage.
- Grenze für Gratisversand (Betrag).
- Welche Artikel unter „Passend dazu“ (z. B. Pflegespray 6,99 €, Acrylständer 12,99/14,99 €, Abstandshalter)?
- Satz zur Echtheit der Bewertungen.

## Nächster Schritt
Mika: Konfi-Hinweis (Abschnitt 1, Zeile 1) als Vorschlag mit Screenshot vorlegen. Bearbeiter Produktseite: Abschnitte 1 (Warenkorb), 2 und 3 in der Theme-Kopie, Screenshots an Chris. Die offenen Werte nicht raten – leer lassen und markieren.
