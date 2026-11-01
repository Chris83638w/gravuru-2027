"""Nachauftrag #76: one JPG in code, followed by the scoped audit."""
import runpy
from pathlib import Path
for script in ["contact-grabkreuze-hunde.py","check-grabkreuze-nachauftrag.py"]:
    runpy.run_path(str(Path(__file__).with_name(script)),run_name="__main__")
