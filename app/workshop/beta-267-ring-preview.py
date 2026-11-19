"""Render one Ring preview from the pinned catalog geometry and the public device image."""
import json, re, sys
from PIL import Image, ImageDraw, ImageFont

request = json.load(sys.stdin)
scale = int(request["scale"])
plate = request["plate"]
bounds = request["bounds"]
width, height = plate["widthMm"] * scale, plate["heightMm"] * scale
image = Image.new("RGB", (width, height), (18, 20, 22))
device = Image.open(request["device"]).convert("RGB")
box = (round(bounds["x"] * scale), round(bounds["y"] * scale), round(bounds["width"] * scale), round(bounds["height"] * scale))
image.paste(device.resize((box[2], box[3]), Image.Resampling.LANCZOS), (box[0], box[1]))
draw = ImageDraw.Draw(image)
stroke = max(2, round(0.65 * scale))
for mark in request.get("marks") or []:
    parts = re.findall(r"[MHV]|[-+]?(?:\d*\.\d+|\d+)", mark["d"])
    # Only the catalog commands used by these two designs: M, H, V.
    x = y = None
    points = []
    i = 0
    while i < len(parts):
        command = parts[i]
        if command == "M":
            if len(points) > 1:
                draw.line(points, fill=(255, 255, 255), width=stroke, joint="curve")
            x, y = float(parts[i + 1]), float(parts[i + 2])
            points = [(x * scale, y * scale)]
            i += 3
        elif command == "H":
            x = float(parts[i + 1])
            points.append((x * scale, y * scale))
            i += 2
        elif command == "V":
            y = float(parts[i + 1])
            points.append((x * scale, y * scale))
            i += 2
        else:
            raise SystemExit("Unbekannter Markenbefehl: " + command)
    if len(points) > 1:
        draw.line(points, fill=(255, 255, 255), width=stroke, joint="curve")
font = ImageFont.truetype("/usr/share/fonts/truetype/macos/Inter-Regular.ttf", 28 * scale // 5)
draw.text((24 * scale, 28 * scale), request["text"], fill=(236, 232, 220), font=font)
samples = []
for index in range(16):
    hx = 22 + (138 - 22) * (index + 0.5) / 16
    vy = 87 + (237 - 87) * (index + 0.5) / 16
    for kind, px, py in (("h", hx, 87), ("v", 138, vy)):
        pixel = image.getpixel((round(px * scale), round(py * scale)))
        samples.append({"leg": kind, "index": index, "rgb": list(pixel), "white": min(pixel) >= 220})
device_pixel = image.getpixel((box[0] + box[2] // 2, box[1] + box[3] // 2))
out = Image.new("RGB", image.size)
out.paste(image)
import io
buffer = io.BytesIO()
out.save(buffer, format="PNG")
json.dump({"png": buffer.getvalue().hex(), "samples": samples, "deviceCenter": list(device_pixel), "width": width, "height": height}, sys.stdout)
