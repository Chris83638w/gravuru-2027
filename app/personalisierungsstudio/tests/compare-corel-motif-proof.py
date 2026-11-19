"""Private, repeatable raster comparison of D230 or D287. Run next to the original source pair."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from xml.etree import ElementTree as ET

from PIL import Image, ImageChops
import pypdfium2 as pdfium

parser = argparse.ArgumentParser()
parser.add_argument("design_json", type=Path)
args = parser.parse_args()
source = args.design_json.resolve()
studio = Path(__file__).resolve().parents[1]
env = {**os.environ, "STUDIO_PYTHON": sys.executable}

# The reference reads the six visible paths directly from the frozen source SVG.
# No Studio code participates in that rendering.
ET.register_namespace("", "http://www.w3.org/2000/svg")
root = ET.parse(source.with_suffix(".svg")).getroot()
originals = [node for node in root if node.get("id") in {f"motiv-{i}" for i in range(2, 8)}]
assert len(originals) == 6 and root.get("viewBox").split() in (["0","0","300.0","200.0"],["0","0","300","200"])
root[:] = originals
sharp = """const sharp = require('sharp');
const [input,out] = process.argv.slice(1);
sharp(input).flatten({background:'white'}).png().toFile(out).catch(e=>{console.error(e);process.exitCode=1;});"""

with tempfile.TemporaryDirectory() as scratch:
    dest = Path(scratch)
    ref = dest / "reference.svg"
    ref.write_bytes(ET.tostring(root, encoding="utf-8"))
    for suffix in ("svg", "pdf"):
        subprocess.run(["node", str(studio / "cli.mjs"), "proof-corel", str(source), "--out",
                        str(dest / ("proof."+suffix))], check=True, env=env)
    layers = []
    for svg in (ref, dest / "proof.svg"):
        tree = ET.parse(svg)
        tree.getroot().set("width", "1200")
        tree.getroot().set("height", "800")
        tree.write(svg, encoding="utf-8")
        png = svg.with_suffix(".png")
        subprocess.run(["node", "-e", sharp, str(svg), str(png)], check=True)
        with Image.open(png) as img:
            layers.append(img.convert("L"))
    pdf = pdfium.PdfDocument(dest / "proof.pdf")
    try:
        page = pdf[0]
        try:
            bitmap = page.render(scale=4*25.4/72)
            try:
                pdf_layer = bitmap.to_pil().convert("L")
            finally:
                bitmap.close()
        finally:
            page.close()
    finally:
        pdf.close()
    assert layers[0].size == layers[1].size == pdf_layer.size == (1200, 800)
    svg_equal = ImageChops.difference(*layers).getbbox() is None
    ref_mask, pdf_mask = [im.point(lambda p: 255 if p < 217 else 0) for im in (layers[0], pdf_layer)]
    common = ImageChops.darker(ref_mask, pdf_mask).histogram()[255]
    total = ImageChops.lighter(ref_mask, pdf_mask).histogram()[255]
    assert total > 0
    print(json.dumps({"pixels": [1200,800], "svgEqual": svg_equal, "pdfIntersection": common,
                      "pdfUnion": total, "pdfIoU": common/total, "originalBounds": ref_mask.getbbox(),
                      "pdfBounds": pdf_mask.getbbox()}))
    if not svg_equal or ref_mask.getbbox() != pdf_mask.getbbox():
        raise SystemExit("Motivgeometrie weicht ab.")
