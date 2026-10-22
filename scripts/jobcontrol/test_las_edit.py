"""Tests JobControl-Leser/-Editor. Aufruf: python3 -I -m unittest discover -s scripts/jobcontrol -p 'test_*.py'"""
import os
import struct
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import las_edit  # noqa: E402
import las_inspect  # noqa: E402

FIXTURE = os.path.join(HERE, "..", "..", "tests", "fixtures", "jobcontrol", "corel-test-schild-92-9.las")


class CorelJob(unittest.TestCase):
    def setUp(self):
        self.data = open(FIXTURE, "rb").read()

    def test_kopf_entspricht_treibereinstellung(self):
        r = las_inspect.parse(self.data)
        k = r["kopf"]
        self.assertEqual(r["vorspann"], "!LB 1;")
        self.assertEqual((k["dpi_x"], k["dpi_y"], k["leistung_prozent"], k["geschwindigkeit_zehntel_prozent"], k["laser_watt"]), (500, 500, 92, 90, 40))
        self.assertEqual((k["platte_breite_hundertstel_mm"], k["platte_hoehe_hundertstel_mm"]), (46000, 30500))
        self.assertEqual(r["unbekannte_befehle"], [])

    def test_bloecke_je_farbe(self):
        b = las_edit.blocks(self.data)
        self.assertEqual([(x["art"], x["leistung"], x["geschwindigkeit"]) for x in b], [("Raster", 92, 9.0), ("Vektor", 0, 0.0)])

    def test_aendern_nur_die_werte(self):
        out, changes = las_edit.edit(self.data, 1, 80, 12.5)
        self.assertEqual(len(out), len(self.data))
        changed = [i for i, (x, y) in enumerate(zip(self.data, out)) if x != y]
        allowed = set()
        for offset, *_ in changes:
            allowed.update(range(offset, offset + 4))
        self.assertTrue(set(changed) <= allowed)
        b = las_edit.blocks(out)
        self.assertEqual((b[0]["leistung"], b[0]["geschwindigkeit"]), (80, 12.5))
        self.assertEqual((b[1]["leistung"], b[1]["geschwindigkeit"]), (0, 0.0))
        k = las_inspect.parse(out)["kopf"]
        self.assertEqual((k["leistung_prozent"], k["geschwindigkeit_prozent"], k["geschwindigkeit_zehntel_prozent"]), (80, 12, 125))

    def test_block_mit_null_bleibt_unveraendert(self):
        with self.assertRaisesRegex(ValueError, "steht auf 0"):
            las_edit.edit(self.data, 2, 50, 5)

    def test_grenzen(self):
        for args in [(1, 0, None), (1, 101, None), (1, None, 0), (3, 50, None)]:
            with self.assertRaises(ValueError):
                las_edit.edit(self.data, *args)

    def test_rasterdaten_identisch(self):
        out, _ = las_edit.edit(self.data, 1, 55, 3.3)
        start = struct.unpack(">H", b"\x00\x00")[0]
        tail = self.data.find(b"\xff\xfdRX")
        self.assertEqual(self.data[tail:], out[tail:])
        self.assertGreater(tail, start)


if __name__ == "__main__":
    unittest.main()
