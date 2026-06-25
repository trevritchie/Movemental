import { chordManager } from './music/ChordManager';

/** Diagram pixel scale (matches ElementalDiagram VIEW_W / VIEW_H). */
const DIAGRAM_VIEW_W = 1160;
const DIAGRAM_VIEW_H = 800;

console.log("Initializing chord dictionary...");
chordManager.initializeChordDictionary();

const earth = chordManager.getChordByName('Earth');
const wind = chordManager.getChordByName('Wind');
const fire = chordManager.getChordByName('Fire');

console.log("Earth:", earth ? { name: earth.name, pitches: earth.pitches } : "undefined");
console.log("Wind:", wind ? { name: wind.name, pitches: wind.pitches } : "undefined");
console.log("Fire:", fire ? { name: fire.name, pitches: fire.pitches } : "undefined");

const earthCoord = chordManager.getCoordinateForChord('Earth');
const windCoord = chordManager.getCoordinateForChord('Wind');
const fireCoord = chordManager.getCoordinateForChord('Fire');

console.log("Earth Coord:", earthCoord);
console.log("Wind Coord:", windCoord);
console.log("Fire Coord:", fireCoord);

// Print Trunk, Leaf, Branch centers
const BASE_GROUPS = ['Trunk', 'Branch', 'Sand-Storm', 'Leaf'];
const SLICE_VARIANTS = [
  { prefix: '',          label: 'Base', sliceIdx: 0 },
  { prefix: 'Sister ',  label: 'Si.',  sliceIdx: 1 },
  { prefix: 'Twin ',    label: 'Tw.',  sliceIdx: 2 },
  { prefix: 'Brother ', label: 'Br.',  sliceIdx: 3 },
];

const groupCenters = BASE_GROUPS.reduce((acc, baseName) => {
  const chords = SLICE_VARIANTS.map(v =>
    chordManager.getChordByName(v.prefix + baseName) ?? undefined
  );
  const coords = chords.map(c => {
    if (!c) return null;
    const coord = chordManager.getCoordinateForChord(c.name);
    if (!coord) return null;
    return { x: coord.x * DIAGRAM_VIEW_W, y: coord.y * DIAGRAM_VIEW_H };
  });
  if (coords.every(c => !!c)) {
    const cx = coords.reduce((s, c) => s + c!.x, 0) / 4;
    const cy = coords.reduce((s, c) => s + c!.y, 0) / 4;
    acc[baseName] = { x: cx, y: cy };
  } else {
    console.log(`Failed to find all coords for ${baseName}!`);
  }
  return acc;
}, {} as Record<string, { x: number; y: number }>);

console.log("Group Centers:", groupCenters);
