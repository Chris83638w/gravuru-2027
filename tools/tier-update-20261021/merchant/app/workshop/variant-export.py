"""Create an editable reference workbook in memory; never interpret cell formulas."""
import sys, json, io
from pathlib import Path
from copy import copy
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

def cell_value(cell, value):
    cell.value = value
    if isinstance(value, str):
        cell.data_type = 's'  # Excel formula-like names remain literal text.

def export(data):
    book = load_workbook(Path(__file__).parent/'templates/ausfuehrungen.xlsx')
    for name, key in [('Gruppen', 'rows'), ('Varianten', 'variantRows')]:
        sheet = book[name]
        columns = [c.value for c in sheet[1]]
        for number, row in enumerate(data[key], 2):
            for col, field in enumerate(columns, 1):
                cell = sheet.cell(number, col)
                cell._style = copy(sheet.cell(2, col)._style)
                cell_value(cell, row[field])
            sheet.row_dimensions[number].height = 28
        sheet.tables[name].ref = 'A1:'+get_column_letter(len(columns))+str(max(101,len(data[key])+1))
    sheet = book.create_sheet('Produktliste', 2)
    columns = ['product_id','product_revision','name','material','width_mm','height_mm','thickness_mm','method','price_cents','design_count','current_revision','availability','referenced']
    sheet.append(columns)
    sheet.freeze_panes = 'D2'
    for number, row in enumerate(data['products'], 2):
        for col, field in enumerate(columns, 1):
            cell_value(sheet.cell(number, col), row[field])
    for row in sheet:
        for cell in row:
            cell._style = copy(book['Gruppen'].cell(1 if cell.row==1 else 2, 1)._style)
            if cell.row>1 and not isinstance(cell.value,str): cell.number_format='General'
        sheet.row_dimensions[row[0].row].height = 42
    for i in range(1,len(columns)+1):sheet.column_dimensions[get_column_letter(i)].width = 48 if columns[i-1] in ['product_id','name','availability'] else 23
    sheet.add_table(Table(displayName='Produktliste',ref='A1:M'+str(max(2,sheet.max_row)),tableStyleInfo=TableStyleInfo(name='TableStyleMedium2',showRowStripes=True)))
    for row in [
        ('Export bearbeiten','Gruppen und Varianten sind mit festen IDs/Revisionen ausgefüllt. Werte bearbeiten, unter Ausführungen → Excel-Zuordnung prüfen und übernehmen. Unveränderte Gruppen werden übersprungen, ohne neue Revision.'),
        ('Produktliste – nur Nachschlagen','Dieses Blatt wird nicht importiert. product_id UND product_revision aus derselben Zeile nach Varianten übernehmen. Es enthält aktuelle aktive Formprodukte und die ausgewählten historischen Referenzen; availability beachten.'),
        ('Historische Produktstände','Die exportierten Varianten behalten ihren bisherigen Produktstand, auch wenn current_revision neuer ist. Keine automatische Preis- oder Designaktualisierung.'),
        ('Importschlüssel im Export','Jeder Export erhält neue Schlüssel. Dieselbe bearbeitete Datei bei Wiederholung unverändert behalten. Für die nächste Änderung erneut exportieren. Veraltete Gruppenstände werden abgewiesen.'),
        ('Neue Gruppen','Ohne Gruppenauswahl bleibt Gruppen/Varianten leer; Produktliste dient als Hilfe zur Neuanlage. Anleitung zu create beachten. Entfernen von Varianten erfolgt weiterhin in der Gruppenverwaltung.'),
    ]:book['Anleitung'].append(row)
    for row in book['Anleitung']:
        for cell in row:cell._style=copy(book['Anleitung'].cell(2,cell.column)._style)
        book['Anleitung'].row_dimensions[row[0].row].height=65
    result=io.BytesIO();book.save(result);return result.getvalue()

if __name__=='__main__':sys.stdout.buffer.write(export(json.load(sys.stdin)))
