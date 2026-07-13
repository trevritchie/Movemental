/**
 * Download vendored instrument samples into public/samples/.
 * Run from repository root: node scripts/download-instrument-samples.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(__dirname, '..', 'public', 'samples');
const manifestPath = path.join(
  __dirname,
  '..',
  'src',
  'audio',
  'tonejsInstruments.manifest.json',
);

const SALAMANDER_BASE = 'https://tonejs.github.io/audio/salamander/';
const TONEJS_INSTRUMENTS_BASE =
  'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/';

const SALAMANDER_FILES = [
  'A0.mp3',
  'C1.mp3',
  'Ds1.mp3',
  'Fs1.mp3',
  'A1.mp3',
  'C2.mp3',
  'Ds2.mp3',
  'Fs2.mp3',
  'A2.mp3',
  'C3.mp3',
  'Ds3.mp3',
  'Fs3.mp3',
  'A3.mp3',
  'C4.mp3',
  'Ds4.mp3',
  'Fs4.mp3',
  'A4.mp3',
  'C5.mp3',
  'Ds5.mp3',
  'Fs5.mp3',
  'A5.mp3',
  'C6.mp3',
  'Ds6.mp3',
  'Fs6.mp3',
  'A6.mp3',
  'C7.mp3',
  'Ds7.mp3',
  'Fs7.mp3',
  'A7.mp3',
  'C8.mp3',
];

async function loadTonejsInstrumentFiles() {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  return manifest.instruments;
}

async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}

async function downloadPack(packId, baseUrl, files) {
  const destDir = path.join(publicRoot, packId);
  await mkdir(destDir, { recursive: true });

  for (const file of files) {
    const url = `${baseUrl}${file}`;
    const destPath = path.join(destDir, file);
    process.stdout.write(`  ${packId}/${file} ... `);
    await downloadFile(url, destPath);
    process.stdout.write('ok\n');
  }
}

async function main() {
  console.log('Downloading instrument samples to public/samples/');

  console.log('\nsalamander (Tone.js CDN mirror, Grand Piano):');
  await downloadPack('salamander', SALAMANDER_BASE, SALAMANDER_FILES);

  const tonejsFiles = await loadTonejsInstrumentFiles();
  for (const [packId, files] of Object.entries(tonejsFiles)) {
    console.log(`\n${packId}:`);
    await downloadPack(
      packId,
      `${TONEJS_INSTRUMENTS_BASE}${packId}/`,
      files,
    );
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
