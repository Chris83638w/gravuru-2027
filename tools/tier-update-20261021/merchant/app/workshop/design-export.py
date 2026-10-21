"""Editable design assignments, not a media or customer-data export."""
import io,json,sys
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table,TableStyleInfo

def export(data):
    book=Workbook();book.remove(book.active)
    reference_columns=['product_id','product_revision','design_id','design_name','width_mm','height_mm','field_count','default_design']
    for name,columns,rows in [('Produkte',data['columns'],data['rows']),('Designs',data['designColumns'],data['designRows']),('Designliste',reference_columns,data['references'])]:
        sheet=book.create_sheet(name);sheet.append(columns);sheet.freeze_panes='C2';sheet.sheet_view.showGridLines=False
        for r,row in enumerate(rows,2):
            for c,key in enumerate(columns,1):
                cell=sheet.cell(r,c);cell.value=row.get(key,'')
                if isinstance(cell.value,str):cell.data_type='s'
        for row in sheet.iter_rows(min_row=1,max_row=max(2,sheet.max_row),max_col=len(columns)):
            for cell in row:
                cell.font=Font(name='Arial',size=11,bold=cell.row==1,color='FFFFFF' if cell.row==1 else '2F3740')
                cell.fill=PatternFill('solid',fgColor='3E4B57' if cell.row==1 else 'F5F6F7')
                cell.alignment=Alignment(wrap_text=True,vertical='center')
                cell.number_format='General' if isinstance(cell.value,(int,float)) else '@'
            sheet.row_dimensions[row[0].row].height=38
        for i,key in enumerate(columns,1):sheet.column_dimensions[get_column_letter(i)].width=48 if key in ['import_key','product_id','name','design_name'] else 24
        if name=='Produkte':
            # Keep the proven import schema; collapse irrelevant empty creation fields.
            for i,key in enumerate(columns,1):
                if key not in ['import_key','name','action','product_id','expected_revision']:sheet.column_dimensions[get_column_letter(i)].hidden=True
        sheet.add_table(Table(displayName=name,ref='A1:'+get_column_letter(len(columns))+str(max(2,sheet.max_row)),tableStyleInfo=TableStyleInfo(name='TableStyleMedium2',showRowStripes=True)))
    guide=book.create_sheet('Anleitung');guide.append(['Regel','Bedeutung'])
    for row in [
        ('Ablauf','Im Blatt Designs Namen und Standarddesign bearbeiten, speichern und in Produktserien prüfen. Produkte enthält die festen Produkt-IDs und erwarteten Revisionen.'),
        ('Original bleibt erhalten','design_file bleibt beim Export leer. Ohne neue Datei werden nur Designname und Standardauswahl bearbeitet. Geometrie, Foto-/Textfelder, Rechte und Originalgrafik bleiben unverändert.'),
        ('Neue Grafik / neues Design','Neue SVG/PDF zusätzlich im Dashboard auswählen; design_file, ggf. design_page und design_fit ausfüllen. Neue Design-ID braucht eine Datei. Beim Ersetzen werden Kundenfelder des betroffenen Designs bewusst neu zugeordnet, nicht blind übertragen.'),
        ('Standarddesign','Je Produkt genau eine Zeile mit default_design=1 wählen, die übrigen auf 0 setzen. Ohne 1 bleibt das bestehende Standarddesign erhalten.'),
        ('Designliste','Nur Referenz: gespeicherte Design-ID, Name, Maße und Feldanzahl. Wird nicht importiert. Keine Originalbilder oder Inhalte von Text-/Fotofeldern enthalten.'),
        ('Löschen','Weggelassene Zeilen löschen nichts. Designs ausdrücklich im Produkteditor entfernen.'),
        ('Unverändert','Unveränderte Produkte werden übersprungen. Eine zwischenzeitliche Bearbeitung wird als Konflikt angezeigt. Dann frisch exportieren und Änderungen vergleichen.'),
        ('Wiederaufnahme','Dieselbe bearbeitete Datei bei Wiederholung behalten. Für die nächste Änderung frisch exportieren; jeder Export erhält neue Importschlüssel.'),
        ('Grenzen','1–100 Formprodukte, bis 30 Designs pro Produkt, XLSX bis 5 MB. Keine Formeln. Ausgeblendete Produktspalten sind nur für bereits dokumentierte Serienfunktionen; leere Werte behalten den Bestand.'),
    ]:guide.append(row)
    guide.column_dimensions['A'].width=30;guide.column_dimensions['B'].width=110;guide.freeze_panes='A2'
    for row in guide:
        for c in row:c.font=Font(name='Arial',size=11,bold=c.column==1);c.alignment=Alignment(wrap_text=True,vertical='center')
        guide.row_dimensions[row[0].row].height=65
    output=io.BytesIO();book.save(output);return output.getvalue()
if __name__=='__main__':sys.stdout.buffer.write(export(json.load(sys.stdin)))
