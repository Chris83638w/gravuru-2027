# gravuru JobControl – Analyse Gravotech-Treiber und Jobformat

Stand: 19.10.2026. Grundlage: Treiberpaket „L-Solution 7.28-3“ (Gravograph Update/Win_8) und GravoStyle-8-Konfiguration (GS8_Build7b) von Chris' Laptop, nur gelesen. Ziel: die Zwischenschicht „gravuru JobControl“ zwischen CorelDRAW 2020 und den 13 Gravograph-Lasern (9× LS100, 3× LS900, 1× LS1000), mit änderbaren Parametern beim Senden (Vorbild Trotec JobControl / Epilog Job Manager). Keine Treiber- oder Herstellerdateien im Repo; Dongle-, Lizenz- und Schlüsseldateien wurden nicht angefasst. Die Analyse dient ausschließlich dem Zusammenspiel mit den eigenen Maschinen.

## Ergebnis

Der Weg ist frei und braucht **keinen Eingriff in die Gravotech-Software**:

1. Corel druckt wie heute auf den Gravograph-Treiber „L-Solution“.
2. Der Treiber erzeugt eine Jobdatei im Format **LA 192** (`.las`, Kopf `!LA 192;<Name>`). Er kennt bereits einen eigenen **JobManager-Modus**: statt an die Maschine schreibt er den Auftrag als `.job` in einen Warteschlangen-Ordner (`…\JobManager\Jobs_queue\`, Materialdatei `ressources\materials\Materials.xml`, Einstellung „Job Manager files path“ in der Treiberoberfläche).
3. JobControl liest diese Dateien, zeigt sie im Leitstand (Maschine, Material, Leistung, Geschwindigkeit, Frequenz, Luft, Fokus, Dauer), lässt die Parameter ändern und schickt die Bytes **unverändert bis auf die geänderten Werte** als RAW-Druckauftrag an die Druckerwarteschlange des gewählten Lasers (USB-Druckerklasse `USBPRINT\GRAVOGRAPH_LSolutionA097`).
4. Status (bereit, belegt, Fehler, Speicher) liefert der Sprachmonitor `LSolutionMon.dll` über PJL-ähnliche Meldungen (`USTATUS`, `STATUS`, `MEMORY`, `NAME="MSJOB …"`) an die Windows-Warteschlange; JobControl liest ihn dort ab.

## Treiberaufbau (glaser.inf)

| Datei | Rolle |
| --- | --- |
| `GLASER.DLL` | Druckertreiber (Plotter-DDK-Vorlage, Win7-DDK 7600) |
| `GLASERUI.DLL` | Treiberoberfläche: Farbtabelle (PUISSANCE, VITESSE, Raster/Vektor), DPI, Luft, Fokus, JobManager-Pfad |
| `GRAVOLAS.DLL` | Umwandlung GDI → Jobformat `!LA %d;` (Raster) bzw. `!RA%d;` |
| `LSolutionMon.dll` | Sprachmonitor (Statusrückmeldung, Basis „ddkpjlmon“) |
| `*.las` | mitgelieferte Testjobs (Fokus, Ausrichtung, Spiel X/Y) |
| `firmware_table*.dos` | Firmwaretabellen (nicht angefasst) |

## Jobformat LA 192 (an 15 Beispieljobs geprüft)

- Kopf: ASCII `!LA 192;` + 16 Zeichen Jobname, dann 40 × int32 big-endian ab Offset 0x18. Belegt: Feld 6/7 = dpi X/Y (300/600), Feld 8 = Leistung %, Feld 9 = Geschwindigkeit %, Feld 10/11 = Plattengröße (Einheit offen). Restliche Felder: offen.
- Befehlsstrom: `FF FD` + 2 Zeichen + 16-Bit-Wert (big-endian). Belegt: `PW` Leistung %, `VD` Geschwindigkeit % (Raster), `vd` Geschwindigkeit % (Vektor), `FR` Frequenz (250–500), `AI` Luft an/aus, `ZA` Z/Fokus, `RX`/`RY` Position (zweiteilig), `RE`/`RS` Rasterbereich, `PU`/`PD` Laser aus/an (Vektor), `DP` Vektor-DPI, `JF` Jobende.
- Rasterdaten: `C1` (vorwärts) / `C2` (rückwärts) + Länge in 16-Bit-Wörtern + gepackte Zeile. Mit dieser Regel werden alle 14 Rasterjobs ohne unbekannten Befehl gelesen.
- **Offen:** Koordinatenblöcke hinter `BX`/`BY`/`PD` in Vektorjobs, Bedeutung von `SL`, `R5`, `RF`, `TI`, `V2`, `OP`, `TE`, restliche Kopffelder, Packverfahren der Rasterzeilen. Für JobControl reicht das Ändern von Kopf + `PW`/`VD`/`vd`/`FR`/`AI` – Raster- und Vektordaten bleiben unberührt.

Prüf-Leser: `python3 -I scripts/jobcontrol/las_inspect.py <datei.las> [--json]` (liest nur, sendet nichts).

## Parameter und Material (GravoStyle-Konfiguration)

- `LSPresetsGII_mm.ini`: 657 Materialvorgaben, je Maschine/Leistung/Material (z. B. `LS900-40W-METALLEX 0.5mm`, 358 für LS100). Je Vorgabe 9 Farbzuordnungen `Color0…Color8` mit je 8 Werten plus Grundwerte (Bitmapmodus, Raster-Richtung, DPI X/Y, Luft, Absaugung, Autofokus, Leistungskorrektur Raster/Vektor). Das ist die Vorlage für die JobControl-Materialtabelle (gravuru-Materialien: Edelstahl, Schiefer, Acryl AA/AS 3/5 mm, klar, satiniert …).
- `MachiLaserLS.ini`: Vektor-DPI-Stufen 50–75 000, Vorschau, Link auf die Gravograph-Materialdatenbank.
- Deutung der 8 Werte je Farbe (`30,100.0,1,1,0.000000,1,0,25`) ist **offen** und wird an einer echten Maschine gegen die Treiberoberfläche geprüft (vermutlich Leistung, Geschwindigkeit, Durchgänge, …, Modus Raster/Vektor, Luft, Frequenz).

## Vorschlag Ausbau (Paket J1–J4)

| Paket | Inhalt | Abnahme |
| --- | --- | --- |
| J1 Erfassen | An einem Produktions-PC den Treiber auf JobManager-Pfad oder „Drucken in Datei“ stellen; 3 echte Jobs (Edelstahl-Schild, Schiefer-Foto, Acryl) mit bekannten Parametern drucken; Dateien + Screenshot der Treibereinstellungen sichern | Leser zeigt genau die eingestellten Werte |
| J2 Senden | Gleiche Datei unverändert als RAW an die Warteschlange senden (Windows `WritePrinter`, kleines Programm auf dem PC) | Maschine graviert identisch zum Direktdruck |
| J3 Ändern | Leistung/Geschwindigkeit/Frequenz im Kopf und in `PW`/`VD`/`FR` ändern, senden; Probe auf Restmaterial | Gravurbild entspricht der Änderung |
| J4 Leitstand | Ordnerwächter + Liste aller Jobs je Maschine/Material, Statusabfrage der Warteschlangen, Materialtabelle aus den Vorgaben, Anbindung an Werkstatt-Freigabe (K5) | 13 Laser im Überblick, Auftrag per Klick an freie Maschine |

J1–J3 brauchen einen Produktions-PC mit angeschlossenem Laser und Chris' Freigabe vor jedem Senden. Nichts wird an eine Maschine geschickt, bevor J2 an Restmaterial abgenommen ist.
