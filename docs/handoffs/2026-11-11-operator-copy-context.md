# #168/#230/#233: konkrete Kopienanschlüsse für den Restabschluss

Ausgangsstand `feebb047307d8810595014c8f5483c000f281479`; geprüfte Runtime weiterhin `e49659fe9cd6e433e578a5ffd054e0345cbcc440`. Dieser Nachtrag enthält ausschließlich lesend erarbeitete Operatorunterlagen. Kein neuer Harness, Testlauf, App-/Server-/Produktzugriff und keine neue fachliche Regel. Design-Master unverändert: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md.

## Was konkret geklärt ist

- [Nativer Produktanschluss](../reviews/2026-11-11-operator-copy-context/main-update-native-context.md): tatsächlicher vollständiger Universalprodukt-Validator und Metadatenhook, genaue Profil-/Fertigungsgetter, getrennte Hashverfahren und Katalogprojektion. Der bestehende geschlossene Repository-Hook ist nicht nachträglich austauschbar; der bereits geprüfte Updateadapter benötigt einen dedizierten Repository auf einer neuen Arbeitskopie.
- [HTTP-/Sitzungsanschluss](../reviews/2026-11-11-operator-copy-context/isolated-shop-entry-proposal.md): vorhandene native Proxy-/Sitzungs-/Modell-/Galerie-APIs können auf einer isolierten Instanz geprüft werden. Das ist noch kein ausgeführter Kopientest und ersetzt nicht den tatsächlichen privaten Zwei-Store-Host. Dessen Legacy-Instanz wird vor dem Acryl-Datenpfad geladen; ein einzelner geänderter Pfad isoliert ihn nicht.
- [Messgrenzen](../reviews/2026-11-11-operator-copy-context/gallery-measurement-boundaries.md): Galeriebenchmark ist sequenziell, nicht die volle Kundensitzung. Seine Einzelprozessausgabe enthält weder die erste Produktidentität noch die äußere Hashzusammenfassung; tatsächliche Operatorbelege ergänzen. Frischer Galeriecache bedeutet keinen kalten Betriebssystemcache.
- [Veröffentlichte Bytes](../reviews/2026-11-11-operator-copy-context/main-update-published-blob-check.json): alle zwölf Dateien des feebb04-Updatepakets im Git-Commit stimmen mit dem eingefrorenen Manifest überein.

## Kleinster nächster Schritt

Claude führt das bereits angekündigte gemeinsame Kopienfenster aus: begrenzte Galerie-Cold-/Reopen-Messung, Hauptkategorien und Kleinproduktidentitäten. Für die weitergehende Sitzung benennt er die tatsächlich verwendeten Fabriken/Versionen beider Stores, vollständig getrennte DB-/Lock-/Preview-/Cachepfade und aktive Worker-/Modell-/TTL-Optionen. Keine Geheimnisse übertragen. Danach kann der native Sitzungstest am tatsächlichen Anschluss durchgeführt werden; unveränderte reale TTL und mindestens 60 Sekunden parallele Anfragen, nicht ein künstlicher Ablauf als Stabilitätsnachweis.

Für den Hauptpilot benötigt der genaue native Anschluss nur die zusammengehörigen Arbeitskopien, den echten Ressourcen-/Fontkatalog, die überprüfte Callbackverdrahtung und den erfolgreichen Kategorienbeleg. Erst daraus produktiven Update-Review und versionierten Excel-Nachtrag erstellen; der vorhandene reviewHash bleibt bis dahin null. Bereits bestätigte Preise, Mehrwertsteuer, Starts, Uploads und H1 nicht erneut erfragen. Die konkrete gemeinsame Produktübernahme wird anhand der echten Zielmatrix abschließend freigegeben; keine Neuanlage oder Veröffentlichung aus diesem Nachtrag ableiten.

Die direkte Browserabstimmung ist aktuell trotz Wiederverbindungsversuchen nicht funktionsfähig. Chris wurde um eine kurze Nachricht an Claude mit den beiden bereits vorhandenen GitHub-Aufträgen gebeten. Stand bei Erstellung: kein neues Operatorergebnis in #168/#233, alte R15-App nach Rückschaltung, Motivzählung weiterhin offen. Der Browserfehler ist kein Nachweis einer neuen Serveränderung.
