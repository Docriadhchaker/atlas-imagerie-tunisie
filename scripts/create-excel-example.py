"""Build the fictive Excel import template from the canonical CSV (stdlib only)."""
import csv
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'


def column_name(index):
    result = ''
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def write_workbook(path, rows):
    headers = rows[0]
    sheet_rows = []
    for row_number, row in enumerate(rows, 1):
        cells = []
        for index, value in enumerate(row):
            address = f'{column_name(index + 1)}{row_number}'
            field = headers[index]
            if row_number > 1 and value and field == 'observed_on':
                serial = (date.fromisoformat(value) - date(1899, 12, 30)).days
                cells.append(f'<c r="{address}" s="1"><v>{serial}</v></c>')
            elif row_number > 1 and value and field in ('latitude', 'longitude', 'equipment_count'):
                cells.append(f'<c r="{address}"><v>{escape(value)}</v></c>')
            elif row_number > 1 and field == 'is_demo':
                cells.append(f'<c r="{address}" t="b"><v>{int(value == "true")}</v></c>')
            elif value:
                cells.append(f'<c r="{address}" t="inlineStr"><is><t xml:space="preserve">{escape(value)}</t></is></c>')
        sheet_rows.append(f'<row r="{row_number}">{"".join(cells)}</row>')
    files = {
        '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
        '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml': f'<workbook xmlns="{NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Observations fictives" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
        'xl/styles.xml': f'<styleSheet xmlns="{NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>',
        'xl/worksheets/sheet1.xml': f'<worksheet xmlns="{NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>{"".join(sheet_rows)}</sheetData><autoFilter ref="A1:R{len(rows)}"/></worksheet>',
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(path, 'w', ZIP_DEFLATED) as workbook:
        for name, content in files.items():
            workbook.writestr(name, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + content)


if __name__ == '__main__':
    with (ROOT / 'public/data/observations.example.csv').open(encoding='utf-8-sig', newline='') as source:
        rows = list(csv.reader(source))
    write_workbook(ROOT / 'public/data/observations.example.xlsx', rows)
    # Negative fixture: a genuine workbook missing required provenance.
    invalid = [list(row) for row in rows[:2]]
    invalid[1][invalid[0].index('source')] = ''
    write_workbook(ROOT / 'tests/fixtures/observations-missing-source.xlsx', invalid)
    print('Modèle Excel fictif et fixture de validation générés.')
