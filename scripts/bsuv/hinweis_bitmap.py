# Corel-Hinweis „Foto-Upload hier klicken“ exakt wie im Bogen als Bitmap rendern (Kreis 60 % weiss, schwarzer Ring, Text).
import re, pymupdf as fitz
PAINT = re.compile(r'(?<=[\s\d.\])>])(f\*|B\*|b\*|f|F|S|s|B|b)(?=[\s/\[]|$)')
def hint_layer(pdf_path, hints, zoom):
    """hints: [(center Point, Kreisradius pt, Ringradius pt, Ringbreite pt)]; Rueckgabe: RGBA-Pixmap der ganzen Seite nur mit Hinweisen."""
    doc = fitz.open(pdf_path); page = doc[0]
    hint_fonts = {f[4] for f in page.get_fonts() if 'CenturyGothic' in f[3]}
    xs = page.get_contents()
    s = b''.join(doc.xref_stream(x) for x in xs).decode('latin1')
    def bt(m):
        blk = m.group(0)
        if any('/'+f+' ' in blk or '/'+f+'\n' in blk for f in hint_fonts):
            return 'BT 0 Tr' + blk[2:-2] + ' 3 Tr ET'
        return blk
    s = re.sub(r'BT.*?ET', bt, s, flags=re.S)
    # Pfade und Bilder ausblenden (Text ausserhalb der Hinweise unsichtbar)
    out, i = [], 0
    for m in re.finditer(r'BT.*?ET', s, flags=re.S):
        seg = s[i:m.start()]; seg = PAINT.sub('n', seg); seg = re.sub(r'/[\w.]+\s+Do', '', seg); seg = re.sub(r'\bsh\b', '', seg)
        out.append(seg); out.append(m.group(0)); i = m.end()
    seg = s[i:]; seg = PAINT.sub('n', seg); seg = re.sub(r'/[\w.]+\s+Do', '', seg); out.append(seg)
    s = '3 Tr ' + ''.join(out)
    doc.update_stream(xs[0], s.encode('latin1'))
    for x in xs[1:]: doc.update_stream(x, b'')
    for c, r, rr, rw in hints:
        sh = page.new_shape(); sh.draw_circle(c, r); sh.finish(color=None, fill=(1, 1, 1), fill_opacity=0.6); sh.commit(overlay=False)
        if rr:
            sh = page.new_shape(); sh.draw_circle(c, rr); sh.finish(color=(0, 0, 0), width=rw, fill=None); sh.commit(overlay=True)
    return page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=True)
