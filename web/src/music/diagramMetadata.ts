// Diagram layout metadata shared by ElementalDiagram and domain logic.

export const BASE_GROUPS = [
  'Trunk', 'Branch', 'Sand-Storm', 'Leaf',
  'Smoke', 'Ember', 'Fire-Storm', 'Flame',
  'Magma', 'Glass', 'Forest-Fire', 'Charcoal',
] as const;

export type BaseGroupName = (typeof BASE_GROUPS)[number];

export const SLICE_VARIANTS = [
  { prefix: '', label: 'Base', sliceIdx: 0 },
  { prefix: 'Sister ', label: 'Si.', sliceIdx: 1 },
  { prefix: 'Twin ', label: 'Tw.', sliceIdx: 2 },
  { prefix: 'Brother ', label: 'Br.', sliceIdx: 3 },
] as const;

export const CHORD_TO_GROUP = new Map<string, string>(
  BASE_GROUPS.flatMap(group =>
    SLICE_VARIANTS.map(v => [v.prefix + group, group] as [string, string])
  )
);

export const GROUP_PALETTE: Record<string, { color: string; glow: string }> = {
  'Trunk': { color: 'hsl(25, 42%, 35%)', glow: 'hsla(25, 42%, 35%, 0.55)' },
  'Branch': { color: 'hsl(32, 45%, 42%)', glow: 'hsla(32, 45%, 42%, 0.55)' },
  'Leaf': { color: 'hsl(122, 48%, 38%)', glow: 'hsla(122, 48%, 38%, 0.55)' },
  'Sand-Storm': { color: 'hsl(42, 45%, 46%)', glow: 'hsla(42, 45%, 46%, 0.55)' },
  'Smoke': { color: 'hsl(215, 18%, 48%)', glow: 'hsla(215, 18%, 48%, 0.55)' },
  'Ember': { color: 'hsl(18, 90%, 45%)', glow: 'hsla(18, 90%, 45%, 0.55)' },
  'Fire-Storm': { color: 'hsl(8, 88%, 42%)', glow: 'hsla(8, 88%, 42%, 0.55)' },
  'Flame': { color: 'hsl(28, 95%, 48%)', glow: 'hsla(28, 95%, 48%, 0.55)' },
  'Magma': { color: 'hsl(356, 85%, 40%)', glow: 'hsla(356, 85%, 40%, 0.55)' },
  'Glass': { color: 'hsl(182, 55%, 44%)', glow: 'hsla(182, 55%, 44%, 0.55)' },
  'Forest-Fire': { color: 'hsl(135, 38%, 28%)', glow: 'hsla(135, 38%, 28%, 0.55)' },
  'Charcoal': { color: 'hsl(0, 0%, 28%)', glow: 'hsla(0, 0%, 28%, 0.55)' },
};

export const AXIS_PARENTS: Record<string, { p1: string; p2: string }> = {
  'Trunk': { p1: 'Earth', p2: 'Wind' },
  'Branch': { p1: 'Earth', p2: 'Wind' },
  'Sand-Storm': { p1: 'Earth', p2: 'Wind' },
  'Leaf': { p1: 'Earth', p2: 'Wind' },
  'Smoke': { p1: 'Wind', p2: 'Fire' },
  'Ember': { p1: 'Wind', p2: 'Fire' },
  'Fire-Storm': { p1: 'Wind', p2: 'Fire' },
  'Flame': { p1: 'Wind', p2: 'Fire' },
  'Magma': { p1: 'Fire', p2: 'Earth' },
  'Glass': { p1: 'Fire', p2: 'Earth' },
  'Forest-Fire': { p1: 'Fire', p2: 'Earth' },
  'Charcoal': { p1: 'Fire', p2: 'Earth' },
};
