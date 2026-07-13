import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChordManager } from './ChordManager';
import {
  DEFAULT_OCTAVE_RANGE,
  DEFAULT_TONAL_CENTER_OFFSET,
} from './config';
import {
  buildSmoothestParallelFromBranchTable,
  computeSmoothestParallelFromBranch,
} from './smoothestParallelFromBranch';
import { BASE_GROUPS, CHORD_TO_GROUP, SLICE_VARIANTS } from './diagramMetadata';
import { ELEMENTAL_NAMES } from './elementalRoot';
import {
  getVoiceDegreeLabel,
  voiceLineForParallelSteps,
} from './voiceDegreeLabel';

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = join(here, '../../docs');

const EDGE_LABELS: Record<string, string> = {
  Trunk: 'Earth-Wind',
  Branch: 'Earth-Wind',
  'Sand-Storm': 'Earth-Wind',
  Leaf: 'Earth-Wind',
  Smoke: 'Wind-Fire',
  Ember: 'Wind-Fire',
  'Fire-Storm': 'Wind-Fire',
  Flame: 'Wind-Fire',
  Magma: 'Fire-Earth',
  Glass: 'Fire-Earth',
  'Forest-Fire': 'Fire-Earth',
  Charcoal: 'Fire-Earth',
};

function orderedChordEntries(
  table: Record<string, number>
): [string, number][] {
  const entries: [string, number][] = [];
  for (const element of ELEMENTAL_NAMES) {
    entries.push([element, table[element]]);
  }
  for (const group of BASE_GROUPS) {
    for (const variant of SLICE_VARIANTS) {
      const name = `${variant.prefix}${group}`;
      entries.push([name, table[name]]);
    }
  }
  return entries;
}

function writeSmoothestFlatTableMarkdown(
  manager: ChordManager,
  table: Record<string, number>
): void {
  const ordered = orderedChordEntries(table);
  const mdSections: string[] = [];
  let currentSection = '';
  for (const [name, steps] of ordered) {
    const chord = manager.getChordByName(name)!;
    const degree = getVoiceDegreeLabel(
      voiceLineForParallelSteps(steps),
      chord
    );
    let section = 'Elemental';
    if (!ELEMENTAL_NAMES.includes(name as (typeof ELEMENTAL_NAMES)[number])) {
      const group = CHORD_TO_GROUP.get(name)!;
      section = `${EDGE_LABELS[group]}, ${group}`;
    }
    if (section !== currentSection) {
      if (currentSection) {
        mdSections.push('');
      }
      mdSections.push(`### ${section}`);
      mdSections.push('');
      mdSections.push('| Chord | Parallel steps | Bass degree at flat |');
      mdSections.push('|-------|----------------|---------------------|');
      currentSection = section;
    }
    mdSections.push(`| ${name} | ${steps} | ${degree} |`);
  }

  writeFileSync(
    join(docsDir, 'smoothest-flat-parallel-from-branch.md'),
    [
      '# Smoothest flat parallel from Branch',
      '',
      'Parallel ladder steps Smoothest mode picks when you hold Branch at',
      'flat double octave, then tap each chord. These values seed Smooth mode',
      'defaults in `predeterminedVoiceLeading.ts` unless noted below.',
      '',
      'Settings: tonal center Bb, home octave 2, contrary tilt anchor.',
      '',
      'To change Smooth mode defaults, edit `CHORD_FLAT_PARALLEL` in',
      '`src/music/predeterminedVoiceLeading.ts`. Re-run the vitest',
      '`writes smoothest-from-branch table markdown for review` test in',
      '`smoothestParallelFromBranch.test.ts` to regenerate this file.',
      '',
      ...mdSections,
      '',
      '## Smooth mode: Wind',
      '',
      'Smoothest from Branch gives Wind parallel **-1** (6th in bass). Smooth',
      'overrides the Wind table entry to **-2** (5th in bass at flat tilt).',
      '',
      'When navigating **to Wind** in smooth tilt mode (see',
      '`playbackTiltResolution.ts` and `elementalRoot.ts`):',
      '',
      '| Previous context | Entry parallel | Bass at flat (no pitch delta) |',
      '|------------------|----------------|-----------------------------|',
      '| Earth-Wind or Wind-Fire edge, not opposite | -1 | 6th |',
      '| Fire corner or other non-opposite | -2 | 5th |',
      '| Fire-Earth edge (opposite-element) | preserve committed parallel from source + pitch delta; rotation search | depends on source |',
      '',
      'Pitch tilt since the last diagram tap adds to the entry baseline. Roll',
      'comes from live device tilt.',
      '',
    ].join('\n')
  );
}
describe('computeSmoothestParallelFromBranch', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(DEFAULT_TONAL_CENTER_OFFSET);
    manager.setOctaveRange(DEFAULT_OCTAVE_RANGE);
  });

  it('Branch from itself stays at parallel 0', () => {
    expect(computeSmoothestParallelFromBranch(manager, 'Branch')).toBe(0);
  });

  it('builds a parallel step for every named chord', () => {
    const table = buildSmoothestParallelFromBranchTable(manager);
    expect(Object.keys(table)).toHaveLength(51);
    for (const steps of Object.values(table)) {
      expect(steps).toBeGreaterThanOrEqual(-4);
      expect(steps).toBeLessThanOrEqual(4);
    }
  });

  it('writes smoothest-from-branch table markdown for review', () => {
    const table = buildSmoothestParallelFromBranchTable(manager);
    writeSmoothestFlatTableMarkdown(manager, table);
    expect(table.Branch).toBe(0);
    expect(Object.keys(table)).toHaveLength(51);
  });
});