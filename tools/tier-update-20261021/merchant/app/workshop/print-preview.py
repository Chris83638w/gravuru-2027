"""Read a saved PDF from stdin and render an isolated print plate, in memory only."""
import sys
import pymupdf as pdf

try:
    mode = sys.argv[1]
    if mode not in ['color', 'white', 'engraving']:
        raise ValueError('Unsupported plate')
    raw = sys.stdin.buffer.read(64 * 1024 * 1024 + 1)
    if len(raw) > 64 * 1024 * 1024 or not raw.startswith(b'%PDF-'):
        raise ValueError('Unsupported PDF')
    doc = pdf.open(stream=raw, filetype='pdf')
    if len(doc) != 1 or doc.is_repaired or doc.needs_pass:
        raise ValueError('Expected a single intact unencrypted page')
    layers = doc.get_ocgs()
    if mode == 'engraving':
        # Render the stored engraving page as-is. Never invert, recolor or mirror it.
        if layers:
            raise ValueError('Unexpected print layers in engraving PDF')
        visible = doc
    else:
        names = ['Farbmotiv'] if mode == 'color' else ['RDG_WHITE', 'Weissersatz Vektor']
        chosen = [key for key, value in layers.items() if value['name'] in names]
        if len(chosen) != 1:
            raise ValueError('Print plate is not uniquely identified')
        doc.set_layer(-1, on=chosen, off=[key for key in layers if key not in chosen])
        visible = pdf.open(stream=doc.tobytes(), filetype='pdf')
    page = visible[0]
    edge = max(page.rect.width, page.rect.height)
    if not 0 < edge <= 14400:
        raise ValueError('Invalid page size')
    pix = page.get_pixmap(matrix=pdf.Matrix(1000/edge, 1000/edge), alpha=mode != 'engraving', annots=False)
    sys.stdout.buffer.write(pix.tobytes('png'))
except Exception:
    # No PDF contents, filenames or parser diagnostics in server logs.
    sys.stderr.write('Die gespeicherte PDF besitzt keine eindeutig darstellbare Ausgabe.\n')
    sys.exit(1)
