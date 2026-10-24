# Paket M · Ein Design für mehrere Materialien und Verfahren · 24.10.2026

Für **Astra High** (Codex, GPT-5, Reasoning high). Basis: Code `main` (≥ c571859), Katalog `main` (≥ c11f968).

Wunsch Chris (24.10.): „Ein Design für eine Gedenktafel Hund könnte man 1:1 auf Schiefer, Edelstahl, Acrylglas mit
Gravur übernehmen, oder als Druck für Edelstahl und Schiefer. Man müsste auch Unterkategorien angeben können.“
Entscheidungen Chris: **Freigabe getrennt je Ziel** (Material × Verfahren) und **bei anderem Seitenverhältnis
automatisch umrechnen** (eigene Variante mit eigener Vorschau und Freigabe).

Heutiger Stand (an der Quelle geprüft):
- `design.json.material` bindet ein Design an ein Material. `designOfLine` (design-dashboard.mjs) zeigt es nur in
  Linien mit passender Familie (Material gleich, Plattenmaß in einer Formatreihe ±1 %).
- Das Verfahren hängt an der Familie (`material.processingProfileId`, z. B. `slate-engraving`).
- Es gibt **eine** Freigabe je Design (`design.json.freigabe`). Import (`katalog-import`) und `shop-sync` lesen sie.
- `themes` (Unterkategorien) sind ein Feld in design.json, das schon mehrere Werte haben kann. PATCH kann es, im
  Dashboard wird es aber nur angezeigt.
- Familien heute: Edelstahl (Türschilder, Gedenktafel 30×20), Schiefer (Gedenktafel 22×14 natur/Hunde, 30×20
  natur/premium), Acryl (Abstandshalter, Gedenktafel 30×20 anthrazit/schwarz). **Keine Druckfamilie für Edelstahl
  oder Schiefer.**

---

Du bist Programmierer im Projekt gravuru 2027 (Chris, Inhaber; Deutsch, Du, kurz). Boss ist Claude: Er prüft und
merged. Branch `dev/design-ziele-20261024-astra` (Code und Katalog, falls Daten betroffen), PRs gegen `main`,
Bericht, Absatz oben in `STATUS.md`. Lies `gravuru-katalog./designs/README.md` (Lieferform 2) und die Berichte zu
Paket I–L.

**1. Ziele je Design.** design.json bekommt `ziele`: eine Liste aus Material und Verfahren
(`processingProfileId`), je Ziel mit eigener `freigabe` {status, am, von}. Das bisherige Feld `freigabe` gehört zum
Ziel des eigenen Materials/Verfahrens. Migration per Skript: erst Dry-run mit Zählern, dann `--apply`. Keine
bestehende Freigabe darf verloren gehen oder dazukommen. Schema und Validierung in `designs/README.md`
dokumentieren. Kennungen bleiben stabil.

**2. Sichtbarkeit in Linien.** Ein Design gehört zu einer Linie, wenn eines seiner Ziele zu einer Familie der Linie
passt und das Format passt (Formatreihe ±1 %, sonst siehe 4). Import und `shop-sync` nehmen ein Design nur, wenn
**das Ziel dieser Familie** freigegeben ist. Das Verhalten für bestehende Edelstahl-Freigaben bleibt gleich (Test).

**3. Dashboard.** Je Design die Ziele als Häkchen. Es gibt nur Ziele mit vorhandener Familie. Fehlt eine Familie
(z. B. Edelstahl · Druck), steht dort „Familie fehlt“, und der Fall kommt in den Bericht. Familien, Größen oder
Preise nicht erfinden. Je Ziel gibt es eine Vorschau auf der echten Oberfläche (`familyProductConfig` →
`materialSurface`), die Passungsprüfung mit den Regeln des Verfahrens (Mindestschrift, Lochschutz, Form) und eine
eigene Freigabe nach geöffneter Vorschau, wie in Paket I. Eine Inhaltsänderung im Editor (Paket L) setzt **alle**
Ziel-Freigaben zurück. Unterkategorien (`themes`) lassen sich im Dashboard per Häkchen aus `themen.json` setzen,
mehrere möglich, über den bestehenden PATCH mit Protokoll.

**4. Anderes Seitenverhältnis → Variante.** Passt keine Formatreihe der Zielfamilie, erzeugt „Variante anlegen“
automatisch eine eigene Lieferform-2-Variante, so wie `scripts/build-design-reihe.py` überträgt: neuer Master in der
Zielformatreihe, Text bleibt Text, Motive bleiben Pfade, `transfer.from` verweist auf das Original. Die Kennung
folgt der README-Regel; ist die Regel offen, frag Claude. Die Variante hat eigene Vorschau, Ziele und Freigabe und
ist im Editor (Paket L) bearbeitbar. Nie still strecken. Bei Contain-Einpassung die Abweichung in % anzeigen.

**5. Gravur ↔ Druck.** Ein Gravurdesign (einfarbig) darf 1:1 auf ein Druckziel. Druck-Elemente (farbige Motive,
Fotos) auf einem Gravurziel melden „passt nicht“ mit Grund.

**Abnahme:**
- Tests: Migration, Sichtbarkeit je Linie, Freigabe und Rücksetzung je Ziel, Import und shop-sync je Ziel,
  Variantenbildung, Gravur/Druck-Regel, Themen-PATCH. Bestehende Tests grün.
- Beispiel auf einer **Katalogkopie**: ein Schiefer-Hunde-Design 22×14 mit den Zielen Schiefer · Gravur 22×14 (1:1),
  Edelstahl · Gravur 30×20 (Variante) und Acryl 30×20 (Variante). Vorschau, Passung und Freigabe je Ziel.
  Screenshots Desktop und iPhone.
- Edelstahl-Startdesigns: vorher/nachher gleiche Zuordnungen und Freigaben.
- Bericht mit fehlenden Familien (z. B. Druck auf Edelstahl/Schiefer) als Liste für Chris.

Regeln wie immer: keine Freigabe setzen, keine Live-Systeme, kein Import, kein Merge, kein Force-Push, nichts
erfinden, LF-Zeilenenden, keine Schriftdateien ins Code-Repo.
