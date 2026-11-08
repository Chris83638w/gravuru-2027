# Öffentliche Designvorschauen – unabhängiger Prüfstand

Stand: 08.11.2026, Codex/Mika, Sicherung vor der Flugpause. **Noch keine Freigabe und nicht live aktiviert.** Diese Datei dokumentiert ausschließlich den unabhängigen Read-only-Review. Die Umsetzung liegt getrennt auf `dev/mika-public-design-previews-20261108`, Ausgangspunkt `ad9b24a`, gesicherter Zwischenstand **`6686e86`**. Die zugehörige Übergabe ist `docs/handoffs/2026-11-08-public-design-preview-cache.md` auf diesem Umsetzungsbranch; Integration und Tests sind dort ausdrücklich noch offen.

## Ziel und Abgrenzung

Bis zu drei freigegebene Vorlagenvorschauen sollen schon auf der Produktseite im Hintergrund geladen werden. Die Bilder werden vorab mit dem vorhandenen nativen Renderer erzeugt und getrennt gespeichert. Beim Kundenstart darf nur ein vorhandenes Bild nachgeschlagen werden; kein neues Rendern und kein Aufbau einer zweiten Design- oder Preislogik.

Kundenuploads, gespeicherte Kundengestaltungen und Warenkorb-/Bestellbilder gehören ausdrücklich nicht in diesen öffentlichen Vorlagen-Cache. Der separate bestehende PNG-Pfad `customer-design-image.mjs` bleibt davon getrennt. Kundenoberfläche, Produktrevisionen, Preise und historische Bestellungen werden hierfür nicht geändert.

## Tatsächlich gelesen

- Bestehende Galerie- und Freigabekette in `app/workshop/shop-design-gallery.mjs` und `shop-entry.mjs`.
- Bestehender Produktseiten-Vorlader in `shop-warm-manifest.mjs` und `ui/shop-warm.mjs` einschließlich Mengen- und Bytebudgets.
- Nativer Vorlagenrenderer `product-preview.mjs`, Vorschau-Warteschlange und vorhandene Galerie-/Starttests.
- Erster, noch unvollständiger neuer Speicherbaustein `public-design-preview-cache.mjs`: getrennte Dateien, signierte Metadaten, Hashprüfung, begrenzte Dateigröße und atomare unveränderliche Ablage. Dessen Lektüre allein belegt keine sichere Integration.

Der bisherige öffentliche In-Memory-Bildpfad liefert ein bereits vorhandenes Hash-Bild ohne erneute Zuordnungsprüfung. Diese Grenze wurde dem implementierenden Agenten ausdrücklich gemeldet. Der neue persistente Abruf muss sie schließen; sie ist keine bestandene Abnahme.

## Vor einer Veröffentlichung noch nachzuweisen

1. Direkter Bildabruf und neues Warm-Manifest prüfen die aktuelle native Produktzuordnung, den Mandanten, Shop, Freigabe-/Pausenstatus und die zulässige Vorlage erneut. Entzug und Zuordnungswechsel wirken auch ohne neue Produktrevision.
2. Identität enthält Mandant, Shop, Produktrevision, Optionen, Design sowie Renderer-/Ressourcenstand. Identische Bildbytes in einem anderen Shop dürfen keine widerrufene Zuordnung legitimieren.
3. Erzeugung akzeptiert ausschließlich native freigegebene Vorlagen; keine Sitzungsdaten, Kundentexte, fremden Ressourcen oder Uploads. Der bisherige private Fallback bleibt nutzbar.
4. Neustart, manipulierte Cachedatei, alter Renderer, fehlende Datei, Freigabeentzug und fremder Mandant werden gezielt getestet. Der Kundenstart rendert auch bei Cachefehlern nicht.
5. Vorbereitungsauftrag und Vorlader bleiben begrenzt: höchstens drei Startvorschauen, bestehende Daten-/Parallelitätsbudgets, keine unbeschränkte Vollbankerzeugung beim Start.
6. Root prüft anschließend den echten Produktseiten-/Handyablauf. Bis dahin gibt es keinen Browser- oder Live-Nachweis dieses neuen Caches.

Bereits vom Browser oder einem öffentlichen Zwischencache geladene Bildbytes können nach einem Entzug weiterhin existieren. Eine rückwirkende Löschung wird nicht versprochen; neue Manifeste und neue Serverabrufe müssen die Freigabe beachten.

## Fortsetzung

Zuerst den endgültigen Umsetzungs-Checkpoint lesen, dann dessen Integration und gezielte Tests unabhängig prüfen. Danach nur das enge Cachepaket auf den inzwischen aktuelleren Kundenstand übertragen. **Die Basis `ad9b24a` ist kein Auftrag, spätere Zentrierungs-/Bedienkorrekturen zurückzusetzen.** Keine vollständige alte UI-Laufzeit über die aktuelle legen.

Dieser Review hat keine Produktionsdateien, Serverdaten, Produktstände oder Shopdaten geändert. Zusätzliche breite Tests wurden nicht doppelt ausgeführt; ein Cache-End-to-End-PASS liegt noch nicht vor.
