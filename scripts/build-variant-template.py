"""Rebuild the operator XLSX template; requires documented openpyxl dependency."""
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

def build(destination):
    w=Workbook();w.remove(w.active)
    for name,columns,widths,limit in [
        ('Gruppen',['import_key','name','action','group_id','expected_revision'],[28,42,20,48,24],101),
        ('Varianten',['import_key','variant_id','label','product_id','product_revision','default_variant'],[28,28,42,48,24,24],101)]:
        s=w.create_sheet(name);s.append(columns);s.freeze_panes='C2';s.sheet_view.showGridLines=False
        for i,width in enumerate(widths,1):s.column_dimensions[get_column_letter(i)].width=width
        for row in s.iter_rows(min_row=1,max_row=limit,max_col=len(columns)):
            for c in row:
                c.font=Font(name='Arial',size=11,color='FFFFFF' if c.row==1 else '2F3740',bold=c.row==1)
                c.fill=PatternFill('solid',fgColor='3E4B57' if c.row==1 else 'F5F6F7')
                c.alignment=Alignment(wrap_text=True,vertical='center')
                c.number_format='0' if columns[c.column-1] in ['expected_revision','product_revision','default_variant'] else '@'
            s.row_dimensions[row[0].row].height=28
        s.add_table(Table(displayName=name,ref='A1:'+get_column_letter(len(columns))+str(limit),tableStyleInfo=TableStyleInfo(name='TableStyleMedium2',showRowStripes=True)))
    s=w.create_sheet('Anleitung');s.append(['Feld / Regel','Bedeutung'])
    for row in [
        ('Ablauf','Formprodukte zuerst speichern. Die Arbeitsmappe unter Ausführungen → Excel-Zuordnung prüfen und anschließend übernehmen. Keine Anlage oder Änderung von Produkten durch diesen Import.'),
        ('Gruppen.import_key','Pflicht, je Änderung eindeutig. Bei Wiederholung derselben Tabelle denselben Schlüssel behalten; so entstehen keine Duplikate.'),
        ('Gruppen.name','Name der gemeinsamen Kundenauswahl. Bei Neuanlage erforderlich; bei update bleibt ein leerer Name erhalten.'),
        ('Gruppen.action','Leer/create legt eine Gruppe an. update benötigt group_id und expected_revision.'),
        ('Gruppen.group_id','Vorhandene variants_-Gruppen-ID aus der URL der Gruppenverwaltung. Nur für update.'),
        ('Gruppen.expected_revision','Bei update der erwartete aktuelle Gruppenstand als ganze Zahl. Zwischenzeitliche Änderungen werden abgewiesen.'),
        ('Varianten.import_key','Verbindet diese Ausführung mit genau einem import_key im Blatt Gruppen. Unbekannte Schlüssel stoppen die Prüfung.'),
        ('Varianten.variant_id','Stabile Ausführungs-ID wie acryl-klein. Bei update: bestehende ID gezielt ersetzen, neue ergänzen. Nicht aufgeführte Ausführungen bleiben erhalten.'),
        ('Varianten.label','Bezeichnung für Kunden. Innerhalb der Gruppe eindeutig, zum Beispiel Acryl · 120 × 80 mm.'),
        ('Varianten.product_id','Bereits gespeicherte cfg_-ID eines vollständigen freien Formprodukts. Keine Master oder ältere Acryl-Sockelvorlagen.'),
        ('Varianten.product_revision','Pflicht: fester Produktstand als ganze Zahl. Keine automatische Verwendung des neuesten Standes.'),
        ('Varianten.default_variant','Leer/0 oder bei genau einer Ausführung je Gruppe 1. Ohne 1 bleibt die alte Standardausführung erhalten; bei Neuanlage wird die erste gewählt.'),
        ('Grenzen','1–100 Gruppen; höchstens 50 Ausführungen je Gruppe, insgesamt 5000 ausgefüllte Variantenzeilen. Leere Vorlagenzeilen können erweitert werden. XLSX bis 5 MB.'),
        ('Feste Werte','Keine Formeln, externen Tabellen oder lokalen Dateipfade. Spalten- und Blattnamen unverändert lassen.'),
        ('Prüfung','Fehler einer Ausführung blockieren die ganze Gruppe. Gültige Gruppen nur nach ausdrücklicher Teilübernahme speichern; korrigierte Tabelle anschließend mit denselben Schlüsseln erneut prüfen.'),
        ('Bestand','Preise, Maße, Bohrungen, Designs und Kundenrechte kommen unverändert aus den referenzierten Produktständen. Keine Größenumrechnung oder automatische Übertragung von Fotos/Texten.'),
        ('Entfernen / Archiv','Ausführungen entfernen oder Gruppen archivieren bewusst in der Gruppenverwaltung. Leere Tabellenwerte löschen nichts.'),
    ]:s.append(row)
    s.column_dimensions['A'].width=34;s.column_dimensions['B'].width=110;s.freeze_panes='A2'
    for row in s:
        for c in row:c.font=Font(name='Arial',size=11,bold=c.column==1);c.alignment=Alignment(wrap_text=True,vertical='center')
        s.row_dimensions[row[0].row].height=58
    destination.parent.mkdir(parents=True,exist_ok=True);w.save(destination)
    checked=load_workbook(destination);assert checked.sheetnames==['Gruppen','Varianten','Anleitung']
    for name in ['Gruppen','Varianten']:
        assert all(c.value is None for row in checked[name].iter_rows(min_row=2) for c in row)
    return destination
if __name__=='__main__':
    print(build(Path(__file__).resolve().parents[1]/'app/workshop/templates/ausfuehrungen.xlsx'))
