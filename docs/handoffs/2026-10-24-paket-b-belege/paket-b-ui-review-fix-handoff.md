# Paket B – UI-Seitenwechselbefund behoben

- edge-clamp.mjs: Bei Konturen nur Objekte der aktiven Fläche prüfen; uxProfileGeometry ist bereits seitenrichtig. Separate Positionsanker je Fläche mit eigenem Geometrieschlüssel. Bestehender Rechteckpfad unverändert.
- usability.mjs: Textwarnungen betreffen ausschließlich die angezeigte Fläche; auch „Text passend verkleinern“ lehnt inaktive Objekte ab. Direkt genutzter surfaceTextIssues-Helper ermöglicht Prüfung ohne Browser/DOM-Nachbau.
- contour-ui.test.mjs: Drei neue Regressionen – asymmetrische Front-/Back-Kontur unverändert beim Wechsel, aktive Bearbeitung weiterhin begrenzt, getrennte Anker bei geschütztem Mittelpunkt, Warnungen nur für aktive Texte.

Geprüft: `node --test app/configurator/variant-m/contour-ui.test.mjs app/configurator/variant-m/edge-clamp.test.mjs app/configurator/variant-m/usability.test.mjs` – Exit 0, 22/22 Tests grün. Rohe Ausgabe: paket-b-ui-review-fix-tests.log. SHA256-Fixmanifest: paket-b-ui-review-fix-files.json.

Nur diese drei Source-/Testdateien geändert. Gemeinsame surfaceGeometry-Reexport-Umstellung gehört dem Core-Agent; abgestimmt und im Teststand enthalten. Kein zweites Review, kein Browserlauf und keine GitHub-Mutation. Das alte Reproduktionsskript wurde nicht verändert; es enthält bewusst Assertions für den ursprünglichen Fehler.
