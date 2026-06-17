import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Tone from 'tone';
import { audioEngine } from '../audio/AudioEngine';

describe('AudioEngine.playNotes', () => {
  beforeEach(async () => {
    await audioEngine.startContext();
    audioEngine.releaseActiveNotes();
  });

  it('tracks active notes so the next playNotes releases them', () => {
    const synth = (audioEngine as unknown as { synth: Tone.PolySynth }).synth;
    const releaseSpy = vi.spyOn(synth, 'triggerRelease');

    audioEngine.playNotes([60, 64, 67], '2n');
    audioEngine.playNotes([62, 65], '2n');

    expect(releaseSpy).toHaveBeenCalled();
    const firstReleaseArg = releaseSpy.mock.calls[0]?.[0];
    expect(firstReleaseArg).toEqual(expect.arrayContaining(['C4', 'E4', 'G4']));
  });
});
