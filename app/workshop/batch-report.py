"""Private, editable correction workbook. User text is never an Excel formula."""
import io
import json
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


def export(data):
    book = Workbook()
    book.remove(book.active)
    report_columns = ['source_record', 'correction_excel_row', 'import_key', 'name', 'status', 'message', 'product_id', 'expected_revision', 'master_id', 'master_revision']
    for name, columns, rows in [('Produkte', data['columns'], data['rows']), ('Designs', data['designColumns'], data['designRows']), ('Pruefbericht', report_columns, data['report'])]:
        sheet = book.create_sheet(name)
        sheet.append(columns)
        sheet.freeze_panes = 'C2'
        sheet.sheet_view.showGridLines = False
        for index, row in enumerate(rows, 2):
            for column, key in enumerate(columns, 1):
                cell = sheet.cell(index, column, row.get(key, ''))
                if isinstance(cell.value, str):
                    cell.data_type = 's'
                    cell.number_format = '@'
                cell.alignment = Alignment(wrap_text=True, vertical='top')
            sheet.row_dimensions[index].height = 42
        for cell in sheet[1]:
            cell.font = Font(name='Arial', bold=True, color='FFFFFF')
            cell.fill = PatternFill('solid', fgColor='3E4B57')
        for index, key in enumerate(columns, 1):
            sheet.column_dimensions[get_column_letter(index)].width = 70 if key == 'message' else 42 if key in ['import_key', 'name', 'design_name', 'product_id', 'master_id'] else 24
        sheet.auto_filter.ref = sheet.dimensions
    guide = book.create_sheet('Anleitung')
    for row in [
        ('Stand', data['createdAt']),
        ('Umfang', 'Produkte enthält nur die aktuell fehlerhaften Datensätze.' if data['mode'] == 'errors' else 'Produkte enthält alle eingereichten Datensätze, auch bereits ausgeführte.'),
        ('Pruefbericht', 'Aktuelle erneute Prüfung beim Download. source_record ist die ursprüngliche Datensatznummer; correction_excel_row die Zeile im Blatt Produkte dieser Datei. Leer bedeutet: nicht in dieser Korrektur enthalten. Der Bericht wird nicht importiert.'),
        ('Korrigieren', 'Fehler im Blatt Produkte oder Designs korrigieren, Datei speichern und im Dashboard erneut prüfen. Es wird nichts automatisch angewendet.'),
        ('Design-Dateien', 'Die betroffenen Designzuordnungen bleiben vollständig erhalten. Zugehörige PDF-/SVG-Dateien beim erneuten Prüfen zusätzlich auswählen. Diese Excel-Datei enthält keine Originalbilder.'),
        ('Wiederholung', 'Importschlüssel bei Wiederholung beibehalten. Bereits angewendete unveränderte Zeilen werden nicht doppelt ausgeführt. Eine neue Änderung an einem bereits importierten Produkt braucht einen neuen Importschlüssel und action=update mit product_id und expected_revision.'),
        ('Konflikte', 'Doppelte/fehlende Importschlüssel und veraltete expected_revision bewusst prüfen. Revisionen werden nicht automatisch erhöht; zwischenzeitliche Änderungen bleiben geschützt.'),
        ('Master', 'Verwendete Master-ID und Revision stehen in den Produktzeilen. Ungültige Angaben bleiben zur Korrektur erhalten. Die Auswahl eines anderen Masters im Dashboard überschreibt diese Angaben nicht.'),
        ('Datum', 'Numerische Datumswerte bleiben als Fehler erkennbar. Datum als gewünschten Text eingeben, beispielsweise 06.10.2026. Keine Formeln verwenden.'),
        ('Privat', 'Diese Datei enthält die eingereichten Produktdaten. Privat aufbewahren. Kein dauerhafter Importauftrag: Nach Schließen des Tabs diese Datei und die benötigten Design-Dateien erneut auswählen.'),
    ]:
        guide.append(row)
    guide.column_dimensions['A'].width = 28
    guide.column_dimensions['B'].width = 110
    for row in guide:
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical='top')
        guide.row_dimensions[row[0].row].height = 65
    output = io.BytesIO()
    book.save(output)
    return output.getvalue()


if __name__ == '__main__':
    sys.stdout.buffer.write(export(json.load(sys.stdin)))
