import type { Equipment, TerritoryIndicator } from '../domain/model';
import { displayCount } from '../domain/indicators';

export function equipmentSummary(territory: TerritoryIndicator | undefined, equipment: Equipment[]) {
  return equipment.map(type => ({
    type,
    label: type === 'CT' ? 'Scanners CT' : 'IRM',
    value: territory ? displayCount(type === 'CT' ? territory.ct : territory.mri, type === 'CT' ? territory.ctStatus : territory.mriStatus) : '—',
  }));
}
