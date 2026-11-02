import { importDataset } from './repository';
import type { Dataset, Governorate } from '../domain/model';
import type { CellValue, SheetData } from 'read-excel-file/universal';

type ImportFile = Pick<File, 'name' | 'size' | 'text' | 'arrayBuffer'>;

function cellText(value: CellValue | null | undefined): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === null || value === undefined ? '' : String(value);
}

/** Reuse the CSV validation contract for the typed cells in the first Excel sheet. */
function sheetToCsv(rows: SheetData): string {
  const nonEmptyRows = rows.filter(row => row.some(value => cellText(value).trim()));
  const headers = nonEmptyRows[0]?.map(cellText).map(value => value.trim());
  if (!headers?.length || headers.some(value => !value) || new Set(headers).size !== headers.length) {
    throw new Error('En-têtes Excel manquants ou dupliqués. Utilisez le modèle proposé.');
  }
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [headers, ...nonEmptyRows.slice(1).map((row, index) => {
    if (row.slice(headers.length).some(value => cellText(value).trim())) {
      throw new Error(`Ligne Excel ${index + 2} : cellule sans en-tête de colonne.`);
    }
    return headers.map((_, i) => cellText(row[i]));
  })].map(row => row.map(quote).join(',')).join('\n');
}

export async function importDataFile(file: ImportFile, governorates: Governorate[]): Promise<Dataset> {
  if (file.size > 5_000_000) throw new Error('Le fichier dépasse 5 Mo.');
  if (/\.(csv|json)$/i.test(file.name)) return importDataset(await file.text(), file.name, governorates);
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Choisissez un fichier .csv, .xlsx ou .json. Pour Excel, enregistrez au format .xlsx.');

  const { readSheet } = await import('read-excel-file/universal');
  let rows: SheetData;
  try {
    rows = await readSheet(await file.arrayBuffer());
  } catch {
    throw new Error('Impossible de lire ce classeur Excel. Vérifiez qu’il est au format .xlsx et non protégé par mot de passe.');
  }
  const dataset = importDataset(sheetToCsv(rows), `${file.name}.csv`, governorates);
  return { ...dataset, title: file.name };
}
