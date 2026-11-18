"""Compare the engraving artwork for the two reference designs at 10 px/mm."""
import io
import json
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

import cairosvg
from PIL import Image, ImageChops

folder = Path(sys.argv[1])
designs = ["RE-90X60-HOC-08", "RE-90X60-EIN-10"]


def artwork_mask(file):
    svg = ET.parse(file).getroot()
    assert (svg.get("width"), svg.get("height"), svg.get("viewBox")) == ("90mm", "60mm", "0 0 90 60")
    for layer in list(svg):
        if layer.get("id") == "CutContour":
            svg.remove(layer)
    raster = cairosvg.svg2png(
        bytestring=ET.tostring(svg), output_width=900, output_height=600, background_color="white"
    )
    with Image.open(io.BytesIO(raster)) as pixels:
        return pixels.convert("L").point(lambda level: 255 if level < 160 else 0)


for design in designs:
    reference = artwork_mask(folder / f"{design}-r15.svg")
    actual = artwork_mask(folder / f"{design}-studio.svg")
    common = ImageChops.darker(reference, actual).histogram()[255]
    union = ImageChops.lighter(reference, actual).histogram()[255]
    assert union > 0
    print(json.dumps(dict(design=design, commonPixels=common, unionPixels=union)))
    assert common == union, f"{design}: abweichende Gravurmaske, siehe Vergleichsdateien."
