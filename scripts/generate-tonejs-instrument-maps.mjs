/**
 * Generate src/audio/tonejsInstruments.generated.ts from Tonejs-Instruments.js.
 * Run from repository root: node scripts/generate-tonejs-instrument-maps.mjs
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'src', 'audio', 'tonejsInstruments.generated.ts');

const SOURCE_URL =
  'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/Tonejs-Instruments.js';

const EXCLUDED_TONEJS_INSTRUMENT_IDS = new Set([
  'bass-electric',
  'contrabass',
]);

const DISPLAY_NAMES = {
  'bass-electric': 'Electric Bass',
  bassoon: 'Bassoon',
  cello: 'Cello',
  clarinet: 'Clarinet',
  contrabass: 'Contrabass',
  flute: 'Flute',
  'french-horn': 'French Horn',
  'guitar-acoustic': 'Acoustic Guitar',
  'guitar-electric': 'Electric Guitar',
  'guitar-nylon': 'Nylon Guitar',
  harmonium: 'Harmonium',
  harp: 'Harp',
  organ: 'Organ',
  piano: 'Bright Piano',
  saxophone: 'Saxophone',
  trombone: 'Trombone',
  trumpet: 'Trumpet',
  tuba: 'Tuba',
  violin: 'Violin',
  xylophone: 'Xylophone',
};

function normalizeFilename(value) {
  return value.replace('.[mp3|ogg]', '.mp3');
}

function normalizeUrls(rawMap) {
  const urls = {};
  for (const [note, filePattern] of Object.entries(rawMap)) {
    urls[note] = normalizeFilename(filePattern);
  }
  return urls;
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: HTTP ${response.status}`);
  }

  const js = await response.text();
  const fn = new Function(`${js}\nreturn SampleLibrary;`);
  const library = fn();
  const ids = library.list.filter(
    (id) => !EXCLUDED_TONEJS_INSTRUMENT_IDS.has(id),
  );

  const instruments = ids.map((id) => ({
    id,
    name: DISPLAY_NAMES[id] ?? id,
    urls: normalizeUrls(library[id]),
  }));

  const fileListById = Object.fromEntries(
    instruments.map((instrument) => [
      instrument.id,
      [...new Set(Object.values(instrument.urls))].sort(),
    ]),
  );

  const lines = [
    '/**',
    ' * Auto-generated from nbrosowsky/tonejs-instruments Tonejs-Instruments.js.',
    ' * Regenerate: node scripts/generate-tonejs-instrument-maps.mjs',
    ' */',
    '',
    'export interface TonejsInstrumentDefinition {',
    '  id: string;',
    '  name: string;',
    '  urls: Record<string, string>;',
    '}',
    '',
    'export const TONEJS_INSTRUMENT_IDS = [',
    ...ids.map((id) => `  '${id}',`),
    '] as const;',
    '',
    'export type TonejsInstrumentId = (typeof TONEJS_INSTRUMENT_IDS)[number];',
    '',
    'export const TONEJS_INSTRUMENTS: TonejsInstrumentDefinition[] = [',
  ];

  for (const instrument of instruments) {
    lines.push('  {');
    lines.push(`    id: '${instrument.id}',`);
    lines.push(`    name: '${instrument.name}',`);
    lines.push('    urls: {');
    for (const [note, file] of Object.entries(instrument.urls)) {
      const noteKey = note.includes('#') ? `'${note}'` : `'${note}'`;
      lines.push(`      ${noteKey}: '${file}',`);
    }
    lines.push('    },');
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  lines.push('/** Unique MP3 filenames per instrument (for download script). */');
  lines.push('export const TONEJS_INSTRUMENT_FILES: Record<TonejsInstrumentId, string[]> = {');
  for (const [id, files] of Object.entries(fileListById)) {
    lines.push(`  '${id}': [`);
    for (const file of files) {
      lines.push(`    '${file}',`);
    }
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');

  const outDir = path.join(__dirname, '..', 'src', 'audio');
  const tsPath = path.join(outDir, 'tonejsInstruments.generated.ts');
  const manifestPath = path.join(outDir, 'tonejsInstruments.manifest.json');

  await writeFile(tsPath, lines.join('\n'), 'utf8');
  await writeFile(
    manifestPath,
    JSON.stringify({ instruments: fileListById }, null, 2),
    'utf8',
  );
  console.log(`Wrote ${tsPath} (${instruments.length} instruments)`);
  console.log(`Wrote ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
