# Sicherung nach dem verschwundenen Mikail-Chat

**Aktualisierung während der Sicherung:** Der Nutzer meldet „Ist wieder da“. Wir bleiben im bestehenden Chat. Die Zusammenfassung/Sicherung wird trotzdem fertiggestellt; ein neuer Chat wird derzeit nicht angelegt. Die Startnachricht ist eine vorsorgliche Wiederaufnahmehilfe.

1. [Ausführliche Projektübergabe](MIKAIL-PROJEKTUEBERGABE.md): Projektziel, Entscheidungen, Stand, Prüfungen, Referenzen, Grenzen und Fortsetzung.
2. [Startnachricht für den Folgechat](START-NACHRICHT.txt): direkt einfügen oder zusammen mit der kompakten Übergabe-ZIP übergeben.
3. [Inventar des gesicherten Produktstands](QUELLSTAND-MANIFEST.json): vollständige Pfade/Größen/SHA-256 der 471 versionierten Dateien am Produktcommit.

Die Sicherung verändert keinen Produktcode. Basis ist `0265ed5ad83c05fd3d7569ccb522b75e8b464e94` im Repository `Chris83638w/gravuru-2027`. Der Dokumentbranch heißt `docs/chat-recovery-mika-20261005`. Seine Commit-ID und die endgültigen Download-Prüfsummen stehen im separat erzeugten `SICHERUNG-MANIFEST.json` des Downloadpakets.

Die kompakte ZIP dient der Chatübergabe; die vollständige Quellstand-ZIP enthält den versionierten Projektbaum samt Referenzarchiven. Beide sind keine Kopie privater Datenbanken oder unsichtbarer Browserentwürfe und kein vollständiger wortgetreuer Chat-Export. Die Originaldateien der zwei noch ungesicherten Zeilenendenänderungen liegen im kompakten Paket unter `erhaltene-arbeitsdateien/`, außerhalb des Git-Commits.

Zur späteren Wiederherstellung in ein NEUES privates Cloud-Verzeichnis entpacken; niemals vorhandene Arbeit überschreiben. Prüfsummen mit dem Downloadmanifest abgleichen. Alternativ den Dokumentbranch aus dem bestätigten Repository abrufen. Die Laufzeitabhängigkeiten und Schutzregeln stehen in der ausführlichen Übergabe. Eine ZIP allein installiert keine Cloud-Umgebung und richtet keine gemeinsame private Datenbank ein.

Ein neuer Chat wurde durch diesen Dokumentationsschritt nicht automatisch angelegt. Das entsprechende Werkzeug fehlt. Ein nicht funktionierender alter Chat-Link wird nicht als neuer Zugang wiederverwendet.
