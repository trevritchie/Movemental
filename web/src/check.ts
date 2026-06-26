import { chordManager } from './music/ChordManager';
import { SLICE_VARIANTS } from './music/diagramMetadata';
import {
  DIAGRAM_VIEW_W,
  DIAGRAM_VIEW_H,
  coordToPixels,
} from './music/diagramLayout';

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

// Print Trunk, Leaf, Branch centers (subset of diagram groups for CLI check)
const CHECK_BASE_GROUPS = ['Trunk', 'Branch', 'Sand-Storm', 'Leaf'];

const groupCenters = CHECK_BASE_GROUPS.reduce((acc, baseName) => {
  const chords = SLICE_VARIANTS.map(v =>
    chordManager.getChordByName(v.prefix + baseName) ?? undefined
  );
  const coords = chords.map(c => {
    if (!c) return null;
    const coord = chordManager.getCoordinateForChord(c.name);
    if (!coord) return null;
    return coordToPixels(coord.x, coord.y, DIAGRAM_VIEW_W, DIAGRAM_VIEW_H);
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
