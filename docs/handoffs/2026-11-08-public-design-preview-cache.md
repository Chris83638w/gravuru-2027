# Öffentliche Designvorschauen vor dem Konfi — Arbeitsstand, noch nicht freigegeben

Basis: ad9b24a. Eigener Branch dev/mika-public-design-previews-20261108.
Keine Liveänderung, kein Kundenlayout und keine Produkt-/Galeriedatenbank geändert.

Ziel: auf der Shopify-Produktseite höchstens drei bereits vorbereitete, erlaubte Designkarten laden. Beim Startticket niemals Vorschauen rendern; fehlende Bilder bleiben beim bestehenden authentifizierten Fallback.

Geplant: optionaler separater Dateicache; Identität mit Tenant/Shop/aktiver Produktbindung, Revision, Optionen, Modell-/Ressourcenhash und Rendererhash. Nur native Originalvorlagen, keine Kundentexte/Uploads. Direkter Bildabruf löst die aktuelle Bindung/Freigabe erneut auf. Bereits im Browser gespeicherte öffentliche Bilder können nicht nachträglich aus dessen Cache entfernt werden.

Vorbereitung nur für genau ein ausdrücklich genanntes Produkt/Variante, maximal drei Bilder; zunächst Shopify-Produkt 16190784438652, Variante 58104606556540. Keine Schleife über 404 Varianten oder 251 Designs.

Checkpoint: erste separate Cache-Implementierung vorhanden. Einbindung, gezielte Tests (Neustart, Widerruf, fremder Tenant, Modell/Rendererwechsel, Start ohne Rendering, privater Fallback) sowie unabhängiger Review fehlen noch. Dieser Commit ist keine Deployfreigabe.

Designs folgen unverändert dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).
