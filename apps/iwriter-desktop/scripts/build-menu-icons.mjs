import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(packageDir, 'electron/assets/menu-icons');
const releaseDir = path.join(packageDir, 'release');
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${body}</svg>`;
const line = body => svg(`<g fill="none" stroke="#000" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${body}</g>`);

const icons = {
  Headings: line('<rect x="1.5" y="3" width="13" height="10" rx="5"/><path d="M4.5 10V6m0 2h3m0-2v4m2.2-2.8 1.5-1v3.8m-1.5 0h3"/>'),
  Lists: line('<circle cx="2.5" cy="4" r=".65" fill="#000" stroke="none"/><circle cx="2.5" cy="8" r=".65" fill="#000" stroke="none"/><circle cx="2.5" cy="12" r=".65" fill="#000" stroke="none"/><path d="M5 4h8.5M5 8h8.5M5 12h8.5"/>'),
  Blockquote: line('<path d="M2.2 5.7h3.3v2.6H3.2v2h2.3M8 5.7h5.3v2.6H8.9v2h4.4M2.2 13h11.1"/>'),
  Body: line('<path d="M2 3.2h12M2 6.4h12M2 9.6h12M2 12.8h12"/>'),
  Structure: line('<circle cx="2.3" cy="3.5" r=".7" fill="#000" stroke="none"/><circle cx="4.4" cy="7.7" r=".7" fill="#000" stroke="none"/><circle cx="6.5" cy="11.9" r=".7" fill="#000" stroke="none"/><path d="M4.8 3.5h8.7M6.9 7.7h6.6M9 11.9h4.5M2.3 6v2.1l2.1 1.3"/>'),
  Bold: svg('<text x="8" y="12" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="12" font-weight="700" fill="#000">B</text>'),
  Italic: svg('<text x="8" y="12" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-style="italic" font-weight="700" fill="#000">I</text>'),
  Strikethrough: svg('<text x="8" y="12" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="11" fill="#000">S</text><path d="M3 8h10" stroke="#000" stroke-width="1.3"/>'),
  Highlight: svg('<text x="8" y="11.5" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="11" font-weight="600" fill="#D8D8D8">A</text><rect x="3" y="12.4" width="10" height="2.3" rx=".5" fill="#D7A52E"/>'),
  Code: line('<path d="M5.2 2.5c-1.7 0-2 .8-2 2.1v1.2c0 1-.5 1.7-1.5 1.7 1 0 1.5.7 1.5 1.7v1.2c0 1.3.3 2.1 2 2.1M10.8 2.5c1.7 0 2 .8 2 2.1v1.2c0 1 .5 1.7 1.5 1.7-1 0-1.5.7-1.5 1.7v1.2c0 1.3-.3 2.1-2 2.1"/>'),
  'Code Block': line('<rect x="2" y="2.3" width="12" height="11.4" rx="1.5"/><path d="M6 5.2c-1 0-1.2.5-1.2 1.2v.4c0 .6-.3 1-.9 1 .6 0 .9.4.9 1v.4c0 .7.2 1.2 1.2 1.2M10 5.2c1 0 1.2.5 1.2 1.2v.4c0 .6.3 1 .9 1-.6 0-.9.4-.9 1v.4c0 .7-.2 1.2-1.2 1.2"/>'),
  'Add Link': line('<path d="M6.5 10.4 5.1 11.8a2.7 2.7 0 0 1-3.8-3.8l2.2-2.2A2.7 2.7 0 0 1 7.3 5m2.2.6 1.4-1.4A2.7 2.7 0 1 1 14.7 8l-2.2 2.2a2.7 2.7 0 0 1-3.8.8M5.8 8h4.4"/>'),
  'Add Wikilink': line('<path d="M6.3 10.6 5 11.9A2.6 2.6 0 0 1 1.3 8.2l2.1-2.1A2.6 2.6 0 0 1 7 5.8m2.7-.4L11 4.1a2.6 2.6 0 1 1 3.7 3.7l-2.1 2.1a2.6 2.6 0 0 1-3.6.3M5.7 8h4.6M8 5.7v4.6"/>'),
  'Add Footnote': svg('<text x="6.2" y="12" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="11" font-weight="600" fill="#000">A</text><text x="12" y="6.2" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="6.5" font-weight="700" fill="#000">1</text>'),
  'Add Content Block': line('<rect x="3" y="1.8" width="10" height="12.4" rx="1.4"/><path d="M5.5 5h5M5.5 7.6h5M5.5 10.2h3.2"/>'),
  'Add Hashtag': svg('<text x="8" y="12.5" text-anchor="middle" font-family="Helvetica Neue,Arial" font-size="14" font-weight="600" fill="#000">#</text>'),
  'Add Date': line('<rect x="2" y="3.2" width="12" height="10.5" rx="1.5"/><path d="M2 6.2h12M5 1.8v3M11 1.8v3M4.5 8.6h1m2 0h1m2 0h1m-7 2.6h1m2 0h1m2 0h1"/>'),
  'Add Table': line('<rect x="1.8" y="2.5" width="12.4" height="11" rx="1.3"/><path d="M1.8 6.2h12.4M1.8 9.8h12.4M6 2.5v11"/>'),
  'Add Table of Contents': line('<rect x="2" y="2.2" width="12" height="11.6" rx="1.4"/><circle cx="4.4" cy="5" r=".55" fill="#000" stroke="none"/><circle cx="4.4" cy="8" r=".55" fill="#000" stroke="none"/><circle cx="4.4" cy="11" r=".55" fill="#000" stroke="none"/><path d="M6.4 5h5.2M6.4 8h5.2M6.4 11h4"/>'),
  'Add Horizontal Rule': line('<rect x="3" y="1.5" width="10" height="13" rx="1.5"/><path d="M5.2 8h5.6"/>'),
  'Add Page Break': line('<path d="M1.5 5h3V2.5M1.5 5 5 1.5M3.5 8H1.8v4.5h3.7M6.5 3h7v10h-7zM6.5 8h7"/>'),
  'Clear Styles': line('<rect x="2.3" y="2.3" width="11.4" height="11.4" rx="1.5"/><path d="m5.4 5.4 5.2 5.2m0-5.2-5.2 5.2"/>'),
};

await mkdir(outputDir, { recursive: true });
await mkdir(releaseDir, { recursive: true });
// Unpacked electron-builder .app bundles are intermediates, not installed apps.
// Keep Spotlight/Launchpad from presenting them as duplicate clients.
await writeFile(path.join(releaseDir, '.metadata_never_index'), '');
await Promise.all(Object.entries(icons).map(async ([label, source]) => {
  const filename = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.png`;
  await sharp(Buffer.from(source), { density: 192 })
    .resize(32, 32, { fit: 'fill' })
    .png()
    .toFile(path.join(outputDir, filename));
}));

console.info(`[iWriter] rendered ${Object.keys(icons).length} Retina menu icons`);
