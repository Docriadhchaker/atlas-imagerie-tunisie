/** Works at the root domain and under a GitHub Pages repository path. */
export function publicAsset(path: string): string {
  return `${import.meta.env?.BASE_URL ?? '/'}${path.replace(/^\//, '')}`;
}
