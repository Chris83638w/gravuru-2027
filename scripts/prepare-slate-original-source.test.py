import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
spec=importlib.util.spec_from_file_location('prepare',Path(__file__).with_name('prepare-slate-original-source.py'))
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)

class OriginalPreparation(unittest.TestCase):
    def test_inside_geometry_is_byte_preserved(self):
        el=ET.fromstring('<path id="motiv-1" d="M10 10L20 10L20 20Z" fill="#b3b3b3"/>')
        before=ET.tostring(el);changes=[]
        self.assertIs(prepare.source_clip(el,[300,200],changes),el)
        el.attrib.pop('data-painted-bounds',None)
        self.assertEqual(before,ET.tostring(el));self.assertEqual(changes,[])

    def test_viewport_clip_retains_visible_area_and_does_not_shift(self):
        el=ET.fromstring('<path id="motiv-1" d="M-5 20H20V40H-5Z" fill="#b3b3b3"/>')
        result=prepare.source_clip(el,[300,200],[])
        wrapper=ET.Element('{'+prepare.NS+'}svg',{'viewBox':'0 0 300 200'});wrapper.append(result)
        svg=prepare.SVG.fromstring(ET.tostring(wrapper).decode());svg.topicosvg(inplace=True)
        b=svg.bounding_box();self.assertEqual(list(b),[0,20,20,20])
        self.assertEqual(svg.shapes()[0].fill,'#b3b3b3')

    def test_photo_and_text_keep_source_position_and_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'designs/bestand/gedenktafeln/Tiere/Hund/D1';root.mkdir(parents=True)
            svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect id="platte" width="300" height="200"/><clipPath id="clip"><rect x="20" y="30" width="60" height="70"/></clipPath><image id="foto-1" class="foto" x="10" y="15" width="100" height="100" href="foto.jpg" clip-path="url(#clip)"/><text id="text-1" x="140" y="100" font-size="12" font-family="Original"><tspan x="140" dy="0">Emma</tspan></text><g id="foto-2" class="foto"><path d="M90 90L95 90L95 95Z"/></g></svg>'
            (root/'design.svg').write_text(svg);(root/'foto.jpg').write_bytes(b'exact original sample')
            meta={'id':'D1','plate':{'widthMm':300,'heightMm':200},'texts':[]}
            out=Path(tmp)/'out';changes=prepare.adapt(root,out,meta,{'Original':{'to':'Approved','source':'documented'}})
            source=ET.fromstring(svg);result=ET.parse(out/'design.svg').getroot()
            original_text=source.find('.//{*}text');text=result.find('.//{*}text')
            self.assertEqual([text.get(k) for k in ['x','y','font-size']],[original_text.get(k) for k in ['x','y','font-size']])
            self.assertEqual(text.get('font-family'),'Approved')
            image=result.find('.//{*}image');self.assertEqual([image.get(k) for k in ['x','y','width','height','href']],['10','15','100','100','foto.jpg'])
            self.assertEqual((out/'foto.jpg').read_bytes(),(root/'foto.jpg').read_bytes())
            self.assertIsNotNone(result.find(".//*[@id='deko-foto-2']"));self.assertEqual((root/'design.svg').read_text(),svg)
            self.assertTrue(json.loads((out/'design.json').read_text())['originalPreparation']['fontReplacement'])

if __name__=='__main__': unittest.main()
