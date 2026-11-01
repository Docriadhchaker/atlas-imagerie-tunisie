import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  absWorkingDir: root, entryPoints: ['src/main.tsx'], outdir: 'work/standalone',
  bundle: true, format: 'iife', platform: 'browser', target: 'es2022',
  minify: true, write: false, loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify({ BASE_URL: '/' }) },
});
const javascript = bundle.outputFiles.find(f => f.path.endsWith('.js')).text;
const stylesheet = bundle.outputFiles.find(f => f.path.endsWith('.css')).text;
const readData = async name => JSON.parse((await fs.readFile(path.join(root, 'public/data', name), 'utf8')).replace(/^\uFEFF/, ''));
const datasets = { demo: await readData('demo.json'), inventory2024: await readData('inventory2024.json') };
const embedded = { dataset: datasets.inventory2024, datasets, governorates: await readData('governorates.json'), geometry: await readData('tunisia-governorates.geojson') };
const dataString = JSON.stringify(embedded).replaceAll('<', '\\u003c');
// The same application, compiled with local data and geometry embedded. No server or network request.
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#103f39"><title>Atlas Imagerie · Tunisie · Local</title><style>${stylesheet}</style></head><body><div id="root"></div><script>window.__ATLAS_LOCAL__=${dataString};</script><script>${javascript.replaceAll('</script', '<\\/script')}</script></body></html>`;
const output = path.join(root, 'Atlas-Imagerie-local.html');
await fs.writeFile(output, html, 'utf8');
console.log(`Version autonome locale : ${output} (${Math.round(Buffer.byteLength(html) / 1024)} Ko)`);
