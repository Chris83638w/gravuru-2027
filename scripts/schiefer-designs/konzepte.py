"""Neue Konzepte 04.11.2026 (ohne Vorlage). Zeile: (Feld, Text, Schrift, relative Größe zum Hauptelement).
layout: links/rechts = Motiv seitlich im Quer-Master, oben/unten = gestapelt. Quadrat-Master immer gestapelt."""

STERNENKINDER = [  # zielgruppe Sternenkinder, je einmal ohne und mit Foto
    ('SK01', 'Emma', 'sonne-mond-wolken/mond-mit-sternen.svg', 'links', [('name', 'Emma', 'Great Vibes', 1), ('daten', 'still geboren am 14.03.2025', 'Lato', .26), ('spruch', 'Du bist unser Stern am Himmel', 'Cormorant Garamond', .34)]),
    ('SK02', 'Paul', 'engel/engel-mit-sternen.svg', 'oben', [('name', 'Paul', 'Parisienne', 1), ('daten', '12.08.2025', 'Josefin Sans', .26), ('spruch', 'So klein und doch so unendlich geliebt', 'Cormorant Garamond', .32)]),
    ('SK03', 'Mila', 'herzen/herz-mit-babyfuen.svg', 'rechts', [('name', 'Mila', 'Magnolia Script', 1), ('daten', '* 02.02.2025  † 03.02.2025', 'Bellefair', .26), ('spruch', 'Für immer in unseren Herzen', 'Bellefair', .3)]),
    ('SK04', 'Elias', 'sterne/sternschnuppe.svg', 'oben', [('name', 'Elias', 'Alex Brush', 1), ('daten', 'still geboren · 21.06.2025', 'Lato', .24), ('spruch', 'Ein Engel auf Erden, ein Stern am Himmel', 'Lora', .28)]),
    ('SK05', 'Lina', 'federn/feder-mit-schleife.svg', 'links', [('name', 'Lina', 'Italianno', 1), ('daten', '30.09.2025', 'Josefin Sans', .26), ('spruch', 'Wir tragen dich in unseren Herzen', 'Cormorant Garamond', .32)]),
    ('SK06', 'Jona', 'engel/engel-auf-wolke-1.svg', 'oben', [('name', 'Jona', 'Great Vibes', 1), ('daten', '18.01.2025', 'Lato', .26), ('spruch', 'Unser kleiner Stern', 'Josefin Sans', .3)]),
    ('SK07', 'Hanna', 'sterne/stern-handgezeichnet.svg', 'rechts', [('name', 'Hanna', 'Playfair Display', 1), ('daten', 'Sternenkind · 07.11.2024', 'Lato', .24), ('spruch', 'Du warst nur kurz bei uns, doch für immer in unseren Herzen', 'Lora', .26)]),
]

HAUSNUMMERN = [
    ('H01', '12 Rosenweg', 'blumen/rose-2.svg', 'links', [('nummer', '12', 'Bebas Neue', 1), ('strasse', 'Rosenweg', 'Montserrat', .26)]),
    ('H02', '7 Familie Brandt', 'haus/haus-mit-herzen-1.svg', 'oben', [('nummer', '7', 'Cinzel', 1), ('name', 'Familie Brandt', 'Great Vibes', .34)]),
    ('H03', '24a Am Mühlbach', None, 'oben', [('nummer', '24a', 'Oswald', 1), ('strasse', 'AM MÜHLBACH', 'Josefin Sans', .2)]),
    ('H04', '3 Lindenstraße', 'baume/baum-2.svg', 'rechts', [('nummer', '3', 'Playfair Display', 1), ('strasse', 'Lindenstraße', 'Allura', .36)]),
    ('H05', '18 Birkenweg', None, 'oben', [('nummer', '18', 'Archivo Black', 1), ('name', 'Familie Seidel', 'Great Vibes', .3), ('strasse', 'Birkenweg', 'Lato', .2)]),
    ('H06', '41 Sonnenhang', 'sonne-mond-wolken/sonne-02.svg', 'oben', [('nummer', '41', 'Days One', 1), ('strasse', 'Sonnenhang', 'Comfortaa', .26)]),
    ('H07', '9 Eichenallee', 'baume/baum-5.svg', 'links', [('nummer', '9', 'Rounded Elegance', 1), ('strasse', 'Eichenallee', 'Lato', .26)]),
    ('H08', '15 Hier wohnen', 'haus/dach-mit-herzen.svg', 'oben', [('nummer', '15', 'Fjalla One', 1), ('name', 'Hier wohnen Lena & Tim', 'Dancing Script', .28)]),
    ('H09', '102 Hafenstraße', 'anker/anker-2.svg', 'links', [('nummer', '102', 'Michroma', 1), ('strasse', 'Hafenstraße', 'Montserrat', .24)]),
    ('H10', '5 Wiesengrund', 'schmetterlinge/schmetterling-3.svg', 'rechts', [('nummer', '5', 'Cormorant Garamond', 1), ('strasse', 'Wiesengrund', 'Great Vibes', .36)]),
    ('H11', '33 Familie Köhler', 'haus/strich-haus.svg', 'oben', [('nummer', '33', 'Oswald', 1), ('name', 'Familie Köhler', 'Allura', .34)]),
    ('H12', '27 Kastanienweg', 'baume/baum-mit-vogeln.svg', 'links', [('nummer', '27', 'Cinzel', 1), ('strasse', 'KASTANIENWEG', 'Cinzel', .18)]),
    ('H13', '8 Am Leuchtturm', 'leuchtturme/leuchtturm-mit-wellen.svg', 'rechts', [('nummer', '8', 'Bebas Neue', 1), ('strasse', 'Am Leuchtturm', 'Great Vibes', .34)]),
    ('H14', '60 Gartenstraße', 'blumen/pusteblume-1.svg', 'links', [('nummer', '60', 'Playfair Display', 1), ('strasse', 'Gartenstraße', 'Josefin Sans', .22)]),
    ('H15', '4 Am Steinbruch', 'haus/haus.svg', 'links', [('nummer', '4', 'Roboto Slab', 1), ('strasse', 'Am Steinbruch', 'Roboto Slab', .22)]),
    ('H16', '21 Familie Winter', 'schmetterlinge/schmetterlinge-1.svg', 'oben', [('nummer', '21', 'Minimalist', 1), ('name', 'Familie Winter', 'Alex Brush', .34)]),
]

WILLKOMMEN = [
    ('W01', 'Willkommen Schubert', 'haus/haus-mit-herzen-2.svg', 'links', [('zusatz', 'Willkommen bei', 'Lato', .3), ('name', 'Familie Schubert', 'Great Vibes', 1)]),
    ('W02', 'Herzlich Willkommen Arnold', 'blumen/blumenstrauch.svg', 'oben', [('zusatz', 'Herzlich Willkommen', 'Lora', .32), ('name', 'Familie Arnold', 'Parisienne', 1)]),
    ('W03', 'Schön dass du da bist', 'herzen/herz-handgezeichnet.svg', 'rechts', [('zusatz', 'Schön, dass du da bist', 'Dancing Script', .4), ('name', 'FAMILIE KRÜGER', 'Josefin Sans', .7)]),
    ('W04', 'Willkommen im Zuhause', 'baume/herzbaum.svg', 'links', [('zusatz', 'Willkommen im', 'Lato', .28), ('titel', 'Zuhause', 'Alex Brush', 1), ('name', 'von Mara & Jonas', 'Lato', .28)]),
    ('W05', 'Herzlich Willkommen Otto', 'vogel/zwei-tauben.svg', 'oben', [('zusatz', 'Herzlich Willkommen', 'Great Vibes', .55), ('name', 'FAMILIE OTTO', 'Cinzel', .7)]),
    ('W06', 'Willkommen Sarah & Max', 'schmetterlinge/schmetterlinge-2.svg', 'rechts', [('zusatz', 'Willkommen bei', 'Raleway', .28), ('name', 'Sarah & Max', 'Allura', 1)]),
    ('W07', 'Hier wohnt das Glück', 'haus/dach-mit-herzen.svg', 'oben', [('zusatz', 'Hier wohnt das Glück', 'Dancing Script', .42), ('name', 'Familie Busch', 'Playfair Display', .8)]),
    ('W08', 'Willkommen Hoffmann', 'blumen/pusteblume-mit-vogeln.svg', 'links', [('titel', 'Willkommen', 'Italianno', 1), ('name', 'bei Familie Hoffmann', 'Cormorant Garamond', .4)]),
    ('W09', 'Herzlich Willkommen Lorenz', 'herzen/blatterherz-1.svg', 'oben', [('zusatz', 'HERZLICH WILLKOMMEN', 'Josefin Sans', .22), ('name', 'Familie Lorenz', 'Magnolia Script', 1)]),
    ('W10', 'Willkommen Sonnemann', 'sonne-mond-wolken/sonne-02.svg', 'links', [('zusatz', 'Willkommen bei', 'Comfortaa', .28), ('name', 'Familie Sonnemann', 'Comfortaa', .75)]),
    ('W11', 'Willkommen Anna & Elias', 'infinity/infinity-herz.svg', 'rechts', [('zusatz', 'Willkommen bei', 'Bellefair', .28), ('name', 'Anna & Elias', 'Great Vibes', 1), ('strasse', 'Bergstraße 4', 'Bellefair', .24)]),
    ('W12', 'Willkommen Fischer', 'anker/anker-mit-seil.svg', 'links', [('zusatz', 'Willkommen an Bord', 'Lato', .3), ('name', 'Familie Fischer', 'Great Vibes', 1)]),
    ('W13', 'Herzlich Willkommen Weber', 'blumen/rose-5.svg', 'rechts', [('zusatz', 'Herzlich Willkommen', 'Cormorant Garamond', .32), ('name', 'Familie Weber', 'Playfair Display', .8)]),
    ('W14', 'Willkommen Lena & Tom', 'haus/haus-mit-herzen-3.svg', 'oben', [('zusatz', 'Willkommen bei', 'Josefin Sans', .26), ('name', 'Lena & Tom', 'Parisienne', 1)]),
    ('W15', 'Willkommen Zimmermann', 'vogel/vogel-mit-zweig-1.svg', 'links', [('zusatz', 'Schön, dass ihr da seid', 'Dancing Script', .4), ('name', 'Familie Zimmermann', 'Raleway', .65)]),
    ('W16', 'Willkommen Hartmann', 'baume/lebensbaum-2.svg', 'oben', [('zusatz', 'WILLKOMMEN BEI', 'Cinzel', .24), ('name', 'Familie Hartmann', 'Allura', 1)]),
    ('W17', 'Willkommen Kaya', 'sonne-mond-wolken/mond-mit-sternen.svg', 'rechts', [('zusatz', 'Willkommen bei', 'Comfortaa', .28), ('name', 'Familie Kaya', 'Comfortaa', .75)]),
    ('W18', 'Willkommen Engel', 'herzen/herz-2.svg', 'oben', [('zusatz', 'Herzlich Willkommen', 'Great Vibes', .5), ('name', 'FAMILIE ENGEL', 'Montserrat', .6)]),
]

ANDENKEN = [
    ('A01', 'Erika Lange', 'kreuze/kreuz-mit-strauch.svg', 'links', [('name', 'Erika Lange', 'Great Vibes', 1), ('daten', '* 03.05.1944  † 12.01.2026', 'Lato', .26), ('spruch', 'In liebevoller Erinnerung', 'Cormorant Garamond', .32)]),
    ('A02', 'Heinrich Vogel', 'kerzen/kerze-2.svg', 'links', [('name', 'Heinrich Vogel', 'Cinzel', .8), ('daten', '1936 – 2025', 'Lato', .26), ('spruch', 'Unvergessen', 'Parisienne', .5)]),
    ('A03', 'Margarete Schulte', 'blumen/rose-1.svg', 'rechts', [('name', 'Margarete', 'Alex Brush', 1), ('name-2', 'SCHULTE', 'Cinzel', .4), ('daten', '1940 – 2026', 'Lato', .24)]),
    ('A04', 'Günter Krämer', 'vogel/taube-mit-zweig-2.svg', 'oben', [('name', 'Günter Krämer', 'Libre Baskerville', .8), ('daten', '* 22.08.1938  † 30.11.2025', 'Lato', .24), ('spruch', 'Ruhe in Frieden', 'Italianno', .5)]),
    ('A05', 'Ilse Möller', 'baume/lebensbaum-1.svg', 'links', [('name', 'Ilse Möller', 'Magnolia Script', 1), ('daten', '1947 – 2025', 'Lato', .24), ('spruch', 'Du lebst in unseren Herzen weiter', 'Lora', .28)]),
    ('A06', 'Walter Berg', 'federn/feder-2.svg', 'rechts', [('name', 'Walter Berg', 'Bellefair', .8), ('daten', '1942 – 2025', 'Bellefair', .26), ('spruch', 'Für immer bei uns', 'Great Vibes', .5)]),
    ('A07', 'Renate Hoffmann', 'blumen/pusteblume-2.svg', 'links', [('name', 'Renate', 'Parisienne', 1), ('name-2', 'HOFFMANN', 'Josefin Sans', .36), ('daten', '* 14.02.1950  † 09.10.2025', 'Josefin Sans', .22)]),
    ('A08', 'Anneliese Koch', 'schmetterlinge/schmetterling-5.svg', 'oben', [('name', 'Anneliese Koch', 'Great Vibes', 1), ('daten', '1939 – 2026', 'Lato', .24), ('spruch', 'In Liebe und Dankbarkeit', 'Cormorant Garamond', .3)]),
    ('A09', 'Josef Bauer', 'kreuze/kreuz-mit-schein.svg', 'links', [('name', 'Josef Bauer', 'Cinzel', .8), ('daten', '* 01.07.1935  † 18.02.2026', 'Lato', .24), ('spruch', 'Herr, gib ihm die ewige Ruhe', 'Lora', .28)]),
    ('A10', 'Brigitte Wolff', 'engel/engel-betend-1.svg', 'oben', [('name', 'Brigitte Wolff', 'Italianno', 1), ('daten', '1952 – 2025', 'Bellefair', .26), ('spruch', 'Behütet und unvergessen', 'Bellefair', .3)]),
    ('A11', 'Manfred Schulz', 'herzen/herz-kontur.svg', 'links', [('name', 'Manfred Schulz', 'Playfair Display', .8), ('daten', '1944 – 2025', 'Lato', .24), ('spruch', 'Geliebt und unvergessen', 'Alex Brush', .5)]),
    ('A12', 'Elfriede Kaiser', 'linien-mit-verzierungen/zierlinie-mit-punkt.svg', 'unten', [('name', 'Elfriede Kaiser', 'Cinzel', .8), ('daten', 'geb. 1938 · gest. 2025', 'Lato', .24), ('spruch', 'In stillem Gedenken', 'Cormorant Garamond', .32)]),
    ('A13', 'Dieter Schäfer', 'vogel/schwalbe.svg', 'rechts', [('name', 'Dieter Schäfer', 'Antic Slab', .75), ('daten', '1949 – 2025', 'Lato', .24), ('spruch', 'Du fehlst', 'Great Vibes', .55)]),
    ('A14', 'Hildegard Becker', 'blumen/rose-3.svg', 'oben', [('name', 'Hildegard Becker', 'Great Vibes', 1), ('daten', '* 11.11.1941  † 24.12.2025', 'Lato', .24)]),
    ('A15', 'Klaus Richter', 'baume/baum-1.svg', 'links', [('name', 'Klaus Richter', 'Bernardo Moda Contrast', .8), ('daten', '1946 – 2026', 'Lato', .24), ('spruch', 'Was bleibt, ist die Liebe', 'Lora', .3)]),
    ('A16', 'Inge Braun', 'kerzen/kerze-3.svg', 'rechts', [('name', 'Inge Braun', 'Libre Baskerville', .8), ('daten', '1937 – 2025', 'Lato', .24), ('spruch', 'Ein Licht für dich', 'Italianno', .55)]),
    ('A17', 'Rolf Neumann', 'federn/feder-mit-vogeln.svg', 'oben', [('name', 'ROLF NEUMANN', 'Josefin Sans', .6), ('daten', '* 05.09.1950  † 02.03.2026', 'Josefin Sans', .22), ('spruch', 'Frei wie ein Vogel', 'Alex Brush', .5)]),
    ('A18', 'Gisela Hartwig', 'infinity/infinity-kreuz.svg', 'links', [('name', 'Gisela Hartwig', 'Parisienne', 1), ('daten', '1943 – 2025', 'Cinzel', .22), ('spruch', 'FÜR IMMER', 'Cinzel', .26)]),
    ('A19', 'Hans Peters', 'blumen/rose5.svg', 'rechts', [('name', 'Hans Peters', 'Cinzel', .8), ('daten', '1933 – 2025', 'Lato', .24), ('spruch', 'Danke für alles', 'Great Vibes', .55)]),
    ('A20', 'Ursula Krüger', 'blumen/pusteblume-einzeln.svg', 'rechts', [('name', 'Ursula Krüger', 'Alex Brush', 1), ('daten', '1945 – 2026', 'Josefin Sans', .24), ('spruch', 'Du bist nicht fort, nur voraus', 'Cormorant Garamond', .3)]),
    ('A21', 'Werner Haas', 'kreuze/kreuz-mit-taube.svg', 'links', [('name', 'Werner Haas', 'Playfair Display', .8), ('daten', '* 17.03.1941  † 05.01.2026', 'Lato', .24), ('spruch', 'In Gottes Hand', 'Italianno', .5)]),
    ('A22', 'Edith Sommer', 'schmetterlinge/schmetterling-7.svg', 'oben', [('name', 'Edith Sommer', 'Magnolia Script', 1), ('daten', '1950 – 2025', 'Bellefair', .24), ('spruch', 'Im Herzen bei uns', 'Bellefair', .3)]),
]

HOCHZEIT = [
    ('Z01', 'Laura & Jonas', 'hochzeit/eheringe-1.svg', 'oben', [('name', 'Laura & Jonas', 'Great Vibes', 1), ('datum', '12.09.2026', 'Montserrat', .26)]),
    ('Z02', 'Sophie & Leon', 'hochzeit/hochzeitstauben-1.svg', 'links', [('name', 'Sophie & Leon', 'Parisienne', 1), ('datum', 'Just married · 05.06.2026', 'Josefin Sans', .24)]),
    ('Z03', 'Mr & Mrs Wagner', 'herzen/doppelherz-2.svg', 'rechts', [('zusatz', 'MR & MRS', 'Cinzel', .3), ('name', 'Wagner', 'Allura', 1), ('datum', 'seit 2026', 'Lato', .22)]),
    ('Z04', 'Mia & Noah', 'infinity/infinity-love-1.svg', 'oben', [('name', 'Mia & Noah', 'Alex Brush', 1), ('datum', 'für immer · 18.07.2026', 'Cormorant Garamond', .3)]),
    ('Z05', 'Hannah & Felix', 'hochzeit/eheringe-3.svg', 'links', [('name', 'Hannah & Felix', 'Magnolia Script', 1), ('datum', '21. August 2026', 'Bellefair', .28)]),
    ('Z06', 'Emma & Paul', 'blumen/rose-2.svg', 'rechts', [('name', 'Emma & Paul', 'Italianno', 1), ('datum', 'Hochzeit · 30.05.2026', 'Lato', .22)]),
    ('Z07', 'Lea & Tim', 'hochzeit/brautpaar.svg', 'oben', [('name', 'Lea & Tim', 'Great Vibes', 1), ('datum', 'Ja, wir wollen! · 13.06.2026', 'Josefin Sans', .22)]),
    ('Z08', 'Clara & David', 'herzen/hande-mit-herz.svg', 'links', [('name', 'Clara & David', 'Playfair Display', .8), ('datum', '02.10.2026', 'Lato', .24), ('spruch', 'Liebe ist alles', 'Dancing Script', .4)]),
    ('Z09', 'Marie & Lukas', 'vogel/zwei-tauben.svg', 'oben', [('name', 'Marie & Lukas', 'Allura', 1), ('datum', 'unser Tag · 22.08.2026', 'Lato', .22)]),
    ('Z10', 'Anna & Ben', 'linien-mit-verzierungen/zierlinie-mit-herzchen.svg', 'unten', [('name', 'ANNA & BEN', 'Cinzel', .7), ('datum', '19.09.2026', 'Great Vibes', .45)]),
    ('Z11', 'Julia & Finn', 'herzen/fingerabdruck-herz.svg', 'rechts', [('name', 'Julia & Finn', 'Dancing Script', 1), ('datum', 'verheiratet seit 2026', 'Raleway', .22)]),
    ('Z12', 'Familie Schröder Hochzeit', 'hochzeit/mr-und-mrs-1.svg', 'oben', [('name', 'Familie Schröder', 'Great Vibes', 1), ('datum', 'seit dem 04.07.2026', 'Lato', .22)]),
    ('Z13', 'Nele & Jan', 'infinity/herz-mit-infinity.svg', 'links', [('name', 'Nele & Jan', 'Parisienne', 1), ('datum', '11.11.2026', 'Josefin Sans', .24)]),
    ('Z14', 'Lisa & Moritz', 'blumen/blumenstrauch.svg', 'oben', [('name', 'Lisa & Moritz', 'Alex Brush', 1), ('datum', 'Hochzeit · 15.08.2026', 'Cormorant Garamond', .28)]),
    ('Z15', 'Paula & Max', 'herzen/herz-handgezeichnet.svg', 'rechts', [('name', 'Paula & Max', 'Magnolia Script', 1), ('datum', 'Für immer wir · 26.09.2026', 'Lato', .22)]),
]

GRUPPEN = {
    'sternenkinder': (STERNENKINDER, {'zielgruppe': 'Sternenkinder', 'unterkategorie': 'Sternenkinder', 'themes': ['gedenktafeln']}),
    'hausnummern': (HAUSNUMMERN, {'zielgruppe': 'Familie', 'unterkategorie': 'Hausnummern', 'themes': ['hausnummern']}),
    'willkommen': (WILLKOMMEN, {'zielgruppe': 'Familie', 'unterkategorie': 'Willkommensschilder', 'themes': ['willkommensschilder', 'familienschilder']}),
    'andenken': (ANDENKEN, {'zielgruppe': 'Familie', 'unterkategorie': 'Andenken', 'themes': ['andenkenschilder']}),
    'hochzeit': (HOCHZEIT, {'zielgruppe': 'Familie', 'unterkategorie': 'Hochzeit', 'themes': ['hochzeitsschilder']}),
}


def _sk_foto():
    """Fotofassungen der vorhandenen 22 Sternenkinder-Designs (Texte, Schriften, Größenverhältnis wie die Vorlage)."""
    import json, os
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sk-foto-konzepte.json')
    if not os.path.exists(p):
        return []
    out = []
    for cid, name, mot, lay, rows in json.load(open(p, encoding='utf-8')):
        merged = []
        for r in rows:
            if merged and r[0].split('-')[0] == merged[-1][0].split('-')[0] and r[2] == merged[-1][2] and abs(r[3] - merged[-1][3]) < 0.02:
                merged[-1] = (merged[-1][0], merged[-1][1] + '\n' + r[1], r[2], r[3])
            else:
                merged.append(tuple(r))
        out.append((cid, name, mot, lay, merged))
    return out


# Chris 04.11. 15:00: „Einmal Foto reicht auch bei Sternenkinder“ – keine Fotofassungen (_sk_foto bleibt nur als Werkzeug)
