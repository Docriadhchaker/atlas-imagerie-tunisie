import type { Dataset, Governorate } from './domain/model';
import type { FeatureCollection, Geometry } from 'geojson';
declare global {
  interface Window {
    __ATLAS_LOCAL__?: {
      dataset: Dataset;
      governorates: Governorate[];
      geometry: FeatureCollection<Geometry>;
      datasets?: { demo: Dataset; inventory2024: Dataset };
    };
  }
}
export {};
