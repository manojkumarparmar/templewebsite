import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await mkdir(dist, { recursive: true });
await copyFile(new URL('index.html', root), new URL('index.html', dist));
await writeFile(new URL('_routes.json', dist), JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
console.log('Built website in dist; server code and database files are excluded.');
