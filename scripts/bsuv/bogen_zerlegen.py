# Zerlegt einen Corel-UV-Sammelbogen (PDF) in Einzel-Designs, exakt auf Schnittmaß.
# Text bleibt Text, Vektoren bleiben Vektoren, Schneidkontur (Sonderfarbe CutContour) wird blau angezeigt.
import sys, json, re, pymupdf as fitz
from pathlib import Path
QUELLE, ZIEL = Path(sys.argv[1]), Path(sys.argv[2]); ZIEL.mkdir(parents=True, exist_ok=True)
PT2MM = 25.4/72
CUT_RGB = (0.92, 0.18, 0.57)          # so meldet PyMuPDF die CutContour-Alternativfarbe
BLAU_LAB = "[ 29.6 68.3 -112.0 ]"     # Lab-Wert für reines Blau

def blau_machen(doc):
    for x in range(1, doc.xref_length()):
        o = doc.xref_object(x) or ""
        if "/Separation /CutContour" in o:
            fx = int(re.search(r"/CutContour \d+ 0 R (\d+) 0 R", o).group(1))
            doc.xref_set_key(fx, "C1", BLAU_LAB)

def oeffnen(blau=True):
    d = fitz.open(QUELLE); p = d[0]
    p.set_mediabox(fitz.Rect(0, 0, 6000, 6000))
    if blau: blau_machen(d)
    return d, d[0]

d, p = oeffnen(blau=False)
cuts = [dr["rect"] for dr in p.get_drawings() if dr.get("color") and tuple(round(c,2) for c in dr["color"]) == CUT_RGB]
spans = [s for b in p.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
labels = [s for s in spans if re.match(r"^[A-Z]{2,}[A-Z0-9]*(-[A-Za-z0-9,]+)*-\d+(,\d+)?x\d+(,\d+)?(-D\d+)?$", s["text"].strip())]
inhalt = fitz.Rect(); [inhalt.include_rect(r["rect"]) for r in p.get_drawings()]
for i in p.get_image_info(): inhalt.include_rect(i["bbox"])
for s in spans: inhalt.include_rect(s["bbox"])

# 1) Gesamtbogen mit korrigierter Seitengröße
blau_machen(d)
g = fitz.open(); g.insert_pdf(d); gp = g[0]
r = inhalt + (-28, -28, 28, 28); gp.set_mediabox(r * ~gp.transformation_matrix)
g.save(ZIEL / f"{QUELLE.stem}_Gesamt.pdf", garbage=3, deflate=True)
gp.get_pixmap(dpi=20).save(ZIEL / f"{QUELLE.stem}_Gesamt.png")

def label_zu(cut):
    kand = [s for s in labels if abs(s["bbox"][0]-cut.x0) < 30 and 0 <= cut.y0 - s["bbox"][3] < 40]
    return min(kand, key=lambda s: cut.y0 - s["bbox"][3]) if kand else None

bericht = []
for cut in sorted(cuts, key=lambda r: (round(r.y0/100), r.x0)):
    lab = label_zu(cut); code = lab["text"].strip() if lab else f"ohne-code_{int(cut.x0)}_{int(cut.y0)}"
    m = re.search(r"-D(\d+)$", code); code_n = re.sub(r"-D(\d+)$", lambda k: f"-D{int(k.group(1)):02d}", code)
    e, ep = oeffnen()
    puffer = cut + (-14, -14, 14, 14)         # 5 mm: Beschnitt dieses Designs bleibt unangetastet
    W = ep.rect
    for band in (fitz.Rect(W.x0, W.y0, W.x1, puffer.y0), fitz.Rect(W.x0, puffer.y1, W.x1, W.y1),
                 fitz.Rect(W.x0, puffer.y0, puffer.x0, puffer.y1), fitz.Rect(puffer.x1, puffer.y0, W.x1, puffer.y1)):
        ep.add_redact_annot(band)
    if lab: ep.add_redact_annot(fitz.Rect(lab["bbox"]) + (-1, -1, 1, 1))
    ep.apply_redactions(images=0, graphics=1, text=0)
    # Bilder, die das Schild nicht beruehren, aus dem Inhalt nehmen (Fotos mit Uebergroesse/Beschnitt bleiben erhalten)
    namen = {x[0]: x[7] for x in ep.get_images(full=True)}
    weg = {namen[i["xref"]] for i in ep.get_image_info(xrefs=True)
           if i["xref"] in namen and not fitz.Rect(i["bbox"]).intersects(cut)}
    behalten = {namen[i["xref"]] for i in ep.get_image_info(xrefs=True)
                if i["xref"] in namen and fitz.Rect(i["bbox"]).intersects(cut)}
    weg -= behalten
    for cx in ep.get_contents():
        st = e.xref_stream(cx).decode("latin1")
        for n in weg: st = re.sub(r"/" + re.escape(n) + r"\s+Do\b", "", st)
        e.update_stream(cx, st.encode("latin1"))
    ep.set_mediabox(cut * ~ep.transformation_matrix)
    ep.clean_contents(sanitize=True)
    ziel_pdf = ZIEL / f"{code_n}.pdf"
    e.save(ziel_pdf, garbage=4, deflate=True)
    e2 = fitz.open(ziel_pdf); q = e2[0]
    q.get_pixmap(dpi=100).save(ZIEL / f"{code_n}.png")
    texte = []
    for b in q.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if not s["text"].strip(): continue
                x0, y0, x1, y1 = s["bbox"]
                texte.append({"text": s["text"], "schrift": re.sub(r"^[A-Z]{6}\+", "", s["font"]),
                              "groesse_pt": round(s["size"], 1), "farbe": f"#{s['color']:06X}",
                              "x_mm": round(x0*PT2MM, 1), "y_mm": round(y0*PT2MM, 1),
                              "b_mm": round((x1-x0)*PT2MM, 1), "h_mm": round((y1-y0)*PT2MM, 1)})
    foto = sum(1 for t in texte if t["text"].strip() == "Foto-Upload")
    info = {"code": code_n, "breite_mm": round(cut.width*PT2MM, 1), "hoehe_mm": round(cut.height*PT2MM, 1),
            "bilder": len(q.get_images()), "foto_upload_felder": foto, "texte": texte,
            "schriften": sorted({t["schrift"] for t in texte}), "dateigroesse_kb": ziel_pdf.stat().st_size//1024}
    json.dump(info, open(ZIEL / f"{code_n}.json", "w"), ensure_ascii=False, indent=1)
    bericht.append(info)
json.dump(bericht, open(ZIEL / "_bericht.json", "w"), ensure_ascii=False, indent=1)
print(len(cuts), "Schnittkonturen,", len(labels), "Codes,", len(bericht), "Designs exportiert")
