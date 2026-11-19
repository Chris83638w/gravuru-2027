"""Read the paired Corel catalog sources into a review, never into a saleable release."""
import hashlib
import math
import re
from xml.etree import ElementTree as ET

from worker import IDENTITY, colour, path_data, require


def number(value):
    result = float(value)
    require(math.isfinite(result), "Ungültige Koordinate im Katalog-SVG.")
    return result


def tag(node):
    return node.tag.rsplit("}", 1)[-1]


def attributes(node, allowed):
    extra = set(node.attrib) - set(allowed.split())
    if extra:
        raise ValueError(f"{tag(node)}#{node.get('id', '')}: SVG-Eigenschaft {', '.join(sorted(extra))} prüfen.")


def catalog_text(node, original):
    attributes(node, "id x y font-family font-size fill text-anchor")
    x, y = number(node.attrib["x"]), number(node.attrib["y"])
    anchor = node.get("text-anchor", "start")
    require(anchor in ("start", "middle", "end") and not (node.text or "").strip(),
            "Textanker oder direkt gesetzten Text prüfen.")
    lines = []
    for span in node:
        attributes(span, "x dy")
        require(tag(span) == "tspan" and not len(span) and not (span.tail or "").strip(),
                "Nur die unveränderten Textzeilen des Quellbogens sind zugeordnet.")
        y += number(span.attrib["dy"])
        lines.append({"x": number(span.get("x", x)), "baseline": y, "text": span.text or ""})
    font = node.attrib["font-family"]
    size = number(node.attrib["font-size"])
    require(lines and [line["text"] for line in lines] == original["text"].split("\n")
            and font == original["font"] and not original.get("hint")
            and {"left": "start", "center": "middle", "right": "end"}.get(original["align"]) == anchor
            and colour(original["color"]) == colour(node.attrib["fill"])
            and abs(size - number(original["sizePt"]) * 25.4 / 72) <= .011,
            "Text, Originalschrift oder Schriftgröße unterscheiden sich zwischen SVG und JSON.")
    return {"id": node.attrib["id"], "font": font, "sizeMm": size, "anchor": anchor,
            "fill": colour(node.attrib["fill"]), "lines": lines}


def review_pair(data, svg_bytes):
    require(data.get("katalog", {}).get("sourceKind") == "corel-bogen",
            "Der Quellbogen ist nicht als Corel-Katalog gekennzeichnet.")
    require(len(svg_bytes) <= 8_000_000 and b"<!" not in svg_bytes, "Eigenständiges Katalog-SVG erforderlich.")
    root = ET.fromstring(svg_bytes)
    attributes(root, "viewBox width height version")
    require(root.tag == "{http://www.w3.org/2000/svg}svg", "SVG-Namensraum fehlt.")
    width, height = (number(data["plate"][k]) for k in ("widthMm", "heightMm"))
    require(width > 0 and height > 0 and all(root.attrib[k].endswith("mm") and number(root.attrib[k][:-2]) == v
            for k, v in (("width", width), ("height", height)))
            and [number(v) for v in root.attrib["viewBox"].split()] == [0, 0, width, height],
            "Plattengröße von JSON und SVG stimmt nicht überein.")
    vectors, texts, photos, hidden, unpainted = [], [], [], [], []
    seen, paired_motifs, clips = set(), set(), {}
    frame = None
    for node in root:
        kind, key = tag(node), node.get("id", "")
        require(key and key not in seen, "Fehlende oder doppelte SVG-Ebenen-ID.")
        seen.add(key)
        if kind == "rect" and key == "platte":
            attributes(node, "id x y width height fill stroke stroke-width")
            stroke_width = number(node.attrib["stroke-width"])
            require(number(node.get("x", 0)) == number(node.get("y", 0)) == 0
                    and number(node.attrib["width"]) == width and number(node.attrib["height"]) == height
                    and node.get("fill") == "none" and stroke_width > 0,
                    "Plattenrahmen und Seitenformat unterscheiden sich.")
            frame = {"id": key, "widthMm": width, "heightMm": height, "stroke": colour(node.attrib["stroke"]),
                     "strokeWidthMm": stroke_width, "role": "preview"}
        elif kind == "path" and re.fullmatch(r"(motiv|hinweis)-[1-9]\d*", key):
            attributes(node, "id class fill stroke stroke-width fill-rule display d")
            index = int(key.split("-")[1]) - 1
            original = data["motifs"][index]
            d = node.attrib["d"]
            path_data(d)
            require(d == original.get("d") and node.get("fill", "none") == (original.get("fill") or "none")
                    and node.get("stroke", "none") == "none" and not original.get("stroke"),
                    "Motivpfad, Strich oder Füllung weichen vom Katalog ab.")
            rule = node.get("fill-rule", "nonzero")
            require(rule in ("evenodd", "nonzero") and number(node.get("stroke-width", 0)) >= 0,
                    "Füllregel oder Strichstärke prüfen.")
            paired_motifs.add(index)
            if original.get("hint"):
                require(key.startswith("hinweis-") and node.get("class") == "hinweis" and node.get("display") == "none",
                        "Der Bedienhinweis ist im SVG sichtbar oder nicht zugeordnet.")
                hidden.append(key)
            else:
                require(not node.get("class") and not node.get("display") and key.startswith("motiv-"),
                        "Die Sichtbarkeit des Motivs muss geprüft werden.")
                if node.get("fill") == "none":
                    unpainted.append(key)
                else:
                    vectors.append((key, {"d": d, "fill": colour(node.attrib["fill"]), "rule": rule, "matrix": IDENTITY}))
        elif kind == "text" and re.fullmatch(r"text-[1-9]\d*", key):
            texts.append(catalog_text(node, data["texts"][int(key[5:]) - 1]))
        elif kind == "clipPath":
            attributes(node, "id")
            require(len(node) == 1 and tag(node[0]) == "path", "Fotoclip benötigt einen eigenen Pfad.")
            attributes(node[0], "d")
            d = node[0].attrib["d"]
            path_data(d, closed=True)
            candidates = [i for i, motif in enumerate(data["motifs"]) if motif.get("d") == d]
            require(len(candidates) == 1, "Fotoclip und Originalpfad widersprechen sich.")
            paired_motifs.add(candidates[0])
            clips[key] = d
        elif kind == "image":
            href = "{http://www.w3.org/1999/xlink}href"
            attributes(node, f"id class x y width height preserveAspectRatio clip-path {href}")
            asset = node.attrib[href]
            link = re.fullmatch(r"url\(#([\w.-]+)\)", node.get("clip-path", ""))
            require(node.get("class") == "foto" and asset in data.get("photoFiles", [])
                    and re.fullmatch(r"[\w.-]+\.(?:jpe?g|png)", asset, re.I) and link
                    and node.get("preserveAspectRatio") == "none",
                    "Fotoquelle oder Platzierung gehört nicht zum Original.")
            box = [number(node.attrib[k]) for k in ("x", "y", "width", "height")]
            require(min(box[2:]) > 0, "Foto besitzt keine gültige Originalgröße.")
            photos.append({"id": key, "source": asset, "box": box, "clip": link[1], "preserveAspectRatio": "none"})
        else:
            raise ValueError(f"Nicht zugeordnete Katalogebene {kind}#{key}.")
    require(frame and set(clips) == {p["clip"] for p in photos}
            and sorted(p["source"] for p in photos) == sorted(data.get("photoFiles", []))
            and paired_motifs == set(range(len(data["motifs"])))
            and {t["id"] for t in texts} == {f"text-{i+1}" for i, t in enumerate(data["texts"]) if not t.get("hint")},
            "Das Dateipaar enthält nicht alle Originalebenen.")
    for photo in photos:
        photo["sourceClipPath"] = clips[photo["clip"]]
    report = {"sourceSvgSha256": hashlib.sha256(svg_bytes).hexdigest(), "plateFrame": frame,
              "motifPaths": [{"id": key, "sha256": hashlib.sha256(path["d"].encode()).hexdigest(),
                              "fill": path["fill"], "fillRule": path["rule"]} for key, path in vectors],
              "texts": texts, "photos": photos, "hiddenGuides": hidden, "unpaintedPaths": unpainted,
              "cutContour": None}
    return report, {"width": width, "height": height, "cuts": [], "paths": [path for _, path in vectors]}
