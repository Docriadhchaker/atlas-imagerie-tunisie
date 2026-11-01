export type Equipment = 'CT' | 'MRI';
export type Sector = 'public' | 'private';
export type Verification = 'verified' | 'unverified' | 'example';
export type CoverageStatus = 'no_data' | 'not_recorded' | 'verified_absent';
export interface Provenance {
  observed_on: string;
  source: string;
  source_reference: string;
  verification: Verification;
  note: string;
  is_demo: boolean;
}
/** One count per site, equipment type and observation date. Not an individual machine registry. */
export interface Observation extends Provenance {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_type: string;
  sector: Sector;
  governorate_code: string;
  delegation: string | null;
  latitude: number | null;
  longitude: number | null;
  equipment_type: Equipment;
  equipment_count: number;
  functional_status: 'operational' | 'non_operational' | 'unknown';
}
export interface Governorate { code: string; name: string }
export interface Population extends Provenance { governorate_code: string; population: number }
export interface Coverage extends Provenance {
  governorate_code: string;
  equipment_type: Equipment;
  sector: Sector;
  status: CoverageStatus;
}
/** Territorial inventory, kept separate from facilities: never add both together. */
export interface TerritorialCount extends Provenance {
  governorate_code: string;
  equipment_type: Equipment;
  sector: Sector;
  equipment_count: number;
}
export interface FacilityEvidence {
  id: string; facility_id: string; facility_name: string; facility_type: string | null;
  sector: Sector | null; governorate_code: string | null;
  latitude: number | null; longitude: number | null;
  equipment_type: Equipment; evidence_status: string; observation_period: string | null;
  source: string; source_reference: string; source_date: string | null;
  confidence: string; note: string; is_demo: false;
  location_source?: string | null;
}
export type MapFacility = Pick<Observation, 'facility_id' | 'facility_name' | 'latitude' | 'longitude' | 'equipment_type' | 'is_demo'> & { sector: Sector | null };
export interface Dataset {
  version: string;
  title: string;
  is_demo: boolean;
  updated_on: string;
  observations: Observation[];
  populations: Population[];
  coverage: Coverage[];
  territorial_counts?: TerritorialCount[];
  facility_evidence?: FacilityEvidence[];
  source_notice?: string;
  source_url?: string;
  snapshot_label?: string;
}
export interface Filters { equipment: Equipment[]; sectors: Sector[]; governorate: string }
export type TerritoryStatus = CoverageStatus | 'observed' | 'source_zero';
export interface TerritoryIndicator extends Governorate {
  ct: number; mri: number; total: number; publicCount: number; privateCount: number;
  facilities: number; status: TerritoryStatus;
  ctStatus: TerritoryStatus; mriStatus: TerritoryStatus;
  density: number | null; population: Population | undefined;
  source_reference?: string; observed_on?: string; verification?: Verification;
}
export const EQUIPMENT_LABELS: Record<Equipment, string> = { CT: 'Scanner CT', MRI: 'IRM' };
export const SECTOR_LABELS: Record<Sector, string> = { public: 'Public', private: 'Privé' };
export const STATUS_LABELS: Record<TerritoryStatus, string> = {
  observed: 'Équipements recensés',
  verified_absent: 'Absence vérifiée',
  not_recorded: 'Aucun équipement recensé dans la source',
  no_data: 'Aucune donnée disponible',
  source_zero: 'Zéro déclaré dans la source',
};
export const DEFAULT_FILTERS: Filters = { equipment: ['CT', 'MRI'], sectors: ['public', 'private'], governorate: '' };
