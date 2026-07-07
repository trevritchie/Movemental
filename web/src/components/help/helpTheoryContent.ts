/**
 * Copy and reference URLs for harmonic theory help articles.
 */

export const HELP_HUB_LEDE =
  'Movemental is a harmonic playground built around an elemental chord ' +
  'diagram. Tap chords to hear them, step through elevator floors to shape ' +
  'voicing, and borrow from the neighbor (the opposite vertex on the triangle).';

export const HELP_HUB_DIAGRAM_BODY =
  'Earth, Wind, and Fire are diminished parent vertices at the triangle ' +
  'corners. Child groups sit on each axis between two parents. Each group has ' +
  'four slices (Base, Brother, Twin, Sister). Tap any slice or parent vertex ' +
  'to play that chord.';

export const HELP_HUB_BORROWING_BODY =
  'Four vertical sliders control Root, Third, Fifth, and Sixth/Seventh. Drag ' +
  'up or down to pull a voice into the neighbor\'s pitch pool (on-chord vs ' +
  'off color). Tap the active slider node again to mute that voice.';

export const HELP_HUB_VOICING_TILT_BODY =
  'In Tilt mode, roll (left/right tilt) steps through elevator floors from ' +
  'narrow to wide; the Voicing readout shows your floor. Pitch (forward/back ' +
  'tilt) sets IN THE BASS. As the spread changes, the bass shifts with it ' +
  '(contrary motion). Labels update live before each tap.';

export const HELP_HUB_VOICING_NO_TILT_BODY =
  'In No Tilt mode, the Voicing dropdown picks an elevator floor. IN THE BASS ' +
  'is separate: changing voicing alone keeps the bass fixed (oblique motion). ' +
  'Lock buttons keep your choices per chord when you leave and return.';

export const HELP_HUB_THEORY_POINTER =
  'For deeper reading, open Creation Theory, Borrowing from the Neighbors, ' +
  'or Elevator System under Harmonic theory above.';

export const CREATION_THEORY_VIDEO_URL =
  'https://www.youtube.com/shorts/OmWSgjwroLM';

export const CREATION_THEORY_ATTRIBUTION =
  'Concept by Dr. Barry Harris.';

export const CREATION_THEORY_INTRO =
  'Barry Harris Creation Theory explains how chord types grow from two ' +
  'diminished parents. Think of each chord as carrying DNA from both parents: ' +
  'when you lower a note in one parent shape, you are moving toward pitch ' +
  'material from the other parent\'s DNA pool.';

export const CREATION_TWO_PARENTS_BODY =
  'A single diminished chord is only half of the picture. Every chord family ' +
  'is defined by two parent diminished structures. Lowering a note in one ' +
  'parent does not invent new harmony from scratch; it reveals a chord type ' +
  'that already lives in the combined DNA of both parents.';

export const CREATION_MOVEMENTAL_BODY =
  'Earth, Wind, and Fire are the three diminished parent vertices on the ' +
  'elemental triangle. Each child group on the diagram has two axis parents ' +
  '(for example, Branch inherits from Earth and Wind). Every child chord ' +
  'carries DNA from those two parents. The neighbor is the opposite vertex ' +
  'across the triangle (Fire for Branch). It is not a parent of the child ' +
  'chord. Combining a child chord with its neighbor, using the voice borrowing ' +
  'sliders, opens Barry Harris\'s scale of chords: the full set of related ' +
  'harmonies you can move through in a key.';

export const CREATION_ONE_NOTE_LOWER_BODY =
  'By lowering one note at a time from a diminished parent, you get four related dominant seventh chords. ' +
  'Barry Harris ' +
  'called them brothers and sisters because they share the same parents ' +
  'and serve similar harmonic function. Each one is a different ' +
  'combination of the parent\'s DNA. He would say something like, "when ' +
  'we\'re young, we play with our brothers and sisters first."';

export const CREATION_ONE_NOTE_LOWER_SIBLINGS_BODY =
  'The sibling relationship is not limited to dominants. Whenever lowering ' +
  'notes reveals a chord quality (major 6, dominant 7 flat five, minor 6, ' +
  'and so on), you get a family of four related shapes with the same interval ' +
  'structure and harmonic function. Lower two, three, or four notes and the ' +
  'same brother-and-sister pattern appears for those qualities too.';

export const CREATION_ONE_NOTE_LOWER_DIAGRAM_BODY =
  'On the diagram, each circle is one chord quality (one family at a given ' +
  'lowering depth). The four slices in that circle (Base, Brother, Twin, ' +
  'Sister) are the siblings.';


export const CREATION_ADJACENT_NAV_BODY =
  'Move to an adjacent chord node on the diagram while staying on the same ' +
  'slice (for example, Base Branch to Base Trunk, or Brother Branch to Brother ' +
  'Trunk). Only one note changes, and it moves by one half step. That is why ' +
  'smooth navigation along the diagram feels like minimal motion: same family ' +
  'member, smallest possible step.';

export const CREATION_ADJACENT_NAV_MOVEMENTAL =
  'Use smooth voice leading modes to keep these small steps connected as you ' +
  'move around the triangle.';

export const CREATION_SCALE_PRACTICE_BODY =
  'Start on a child chord, then borrow from the neighbor with the vertical ' +
  'voice sliders. Each slider pulls a voice up or down into the neighbor\'s ' +
  'pitch pool. Together, the child plus neighbor borrowing builds the ' +
  'eight-note scale of chords Harris describes, ready for melodic lines and ' +
  'comping across the key.';

export const CREATION_SCALE_PRACTICE_MOVEMENTAL =
  'Drag a borrowing slider up or down to pull from the neighbor. Tap the ' +
  'active node again to mute that voice.';

export const CREATION_NEIGHBORS_LINK =
  'For a full walkthrough of on/off chords and borrowing from the neighbors, ' +
  'see Borrowing from the Neighbors in Help.';

export const CREATION_DEEPER_LOWERING_INTRO =
  'Lowering more than one note pulls even more DNA from the other parent. ' +
  'The full Harris table:';

export const CREATION_BEFORE_DIAGRAM_INTRO =
  'Creation Theory reaches further back than the chord nodes on Movemental\'s ' +
  'diagram. Harris often used an analogy from the Judeo-Christian tradition to ' +
  'describe how the pitch universe is organized.';

export const CREATION_CHROMATIC_UNIVERSE_BODY =
  'In the beginning there was everything: the twelve notes of the chromatic ' +
  'scale. God then created man and woman, which Harris mapped to the two ' +
  'symmetrical whole-tone scales, six notes each. In Movemental\'s family ' +
  'language, you can think of these as the grandparents sitting above the ' +
  'diminished parents on the diagram.';

export const CREATION_DIMINISHED_FROM_WHOLE_TONE_BODY =
  'Take two notes from one whole-tone scale and two from the other and you ' +
  'arrive at the symmetrical diminished chords. The twelve-note chromatic ' +
  'universe divides into three of them (twelve divided by four). That is ' +
  'where Movemental\'s layout begins: Earth, Wind, and Fire are three ' +
  'diminished parent vertices on the triangle, and the child chords fan out ' +
  'from there. The full chromatic scale and the two whole-tone grandparents ' +
  'still underlie everything you play on the diagram.';

export interface CreationLoweringRule {
  label: string;
  result: string;
}

export const CREATION_LOWERING_RULES: CreationLoweringRule[] = [
  {
    label: 'Lower 2 notes (adjacent pairs)',
    result:
      'Four major sixth chords, more of the other parent\'s DNA expressed.',
  },
  {
    label: 'Lower 2 notes (non-adjacent pairs)',
    result: 'Two dominant 7 flat five (7b5) chords.',
  },
  {
    label: 'Lower 3 notes',
    result:
      'Four minor sixth chords, highly functional jazz structures.',
  },
  {
    label: 'Lower 4 notes',
    result:
      'Another diminished chord, completing the cycle back to a parent shape.',
  },
];

export const BORROWING_NEIGHBORS_VIDEO_URL =
  'https://www.youtube.com/watch?v=eRgvvbGuwLo&t=172s';

export const BORROWING_NEIGHBORS_ATTRIBUTION =
  'Concept by Dr. Barry Harris.';

export const BORROWING_NEIGHBORS_INTRO =
  'In Barry Harris\'s major 6 diminished framework, every functional chord ' +
  'sits inside a larger pool of neighbor tones. On the diagram, each child ' +
  'chord has two axis parents (Earth and Wind for Branch). The neighbor is ' +
  'the third vertex across the triangle (Fire for Branch). It is not a parent ' +
  'of the child chord. That is why we borrow from the neighbor: parents gave ' +
  'you the chord; the neighbor gives you the notes around it.';

export const BORROWING_SCALE_ON_OFF_BODY =
  'Combining a child chord with its neighbor element opens Harris\'s scale ' +
  'of chords: eight related harmonies you can move through in a key. The scale ' +
  'alternates between an on-chord and an off-chord.';

export interface OnOffChordTerm {
  name: string;
  description: string;
}

export const BORROWING_ON_OFF_TERMS: OnOffChordTerm[] = [
  {
    name: 'On chord',
    description:
      'The functional child chord you are playing (major 6, dominant, and so ' +
      'on, depending on slice and group). Its two axis parents define its DNA.',
  },
  {
    name: 'Off chord',
    description:
      'A diminished chord from the neighbor pool. It is the diminished ' +
      'structure that is not one of the on-chord\'s two parents.',
  },
];

export const BORROWING_SCALE_MIXING_BODY =
  'Borrowing does not replace your progression. It mixes on and off colors by ' +
  'leaning one or more voices toward neighbor tones while you stay on the ' +
  'same child chord.';

export const BORROWING_BRANCH_EXAMPLE_BODY =
  'Branch is an Earth-Wind child: its parents are Earth and Wind. Its ' +
  'neighbor is Fire, the opposite vertex, and Fire is not a Branch parent. ' +
  'When you borrow on Branch, the sliders draw from Fire\'s diminished pitch ' +
  'pool. Start on Branch (on). Shift one voice to a Fire neighbor (off color). ' +
  'You can resolve back to the chord tone or let the borrowed tension stand ' +
  'on its own.';

export const BORROWING_NEIGHBOR_TONES_BODY =
  'In the major 6 diminished scale, every chord tone is surrounded by notes ' +
  'from the related diminished step. To borrow from the neighbors, pick a voice ' +
  'and move it up or down to the nearest neighbor tone from that diminished ' +
  'pool. Resolving back to the chord tone is optional; the tension can serve ' +
  'as its own texture.';

export interface BorrowingPracticeMethod {
  label: string;
  description: string;
}

export const BORROWING_PRACTICE_METHODS: BorrowingPracticeMethod[] = [
  {
    label: 'Borrowing above and below',
    description:
      'Practice shifting one voice up to a neighbor tone, then down to a ' +
      'neighbor tone, on the same chord.',
  },
  {
    label: 'Isolating by harmonic function',
    description:
      'Target one structural voice (such as the 6th) and track how that ' +
      'single element interacts with its neighbors through inversions.',
  },
  {
    label: 'Pedal tone',
    description:
      'Hold one chord tone still as a pedal while other voices borrow around it.',
  },
];

export const BORROWING_MOVEMENTAL_BODY =
  'Four vertical sliders control Root, Third, Fifth, and Sixth/Seventh. ' +
  'Neutral keeps the on-chord (no borrow). Drag up or down to borrow from ' +
  'the neighbor element\'s pitch pool (colored in the UI as the opposite ' +
  'element). Movemental finds the closest higher or lower pitch class from ' +
  'the neighbor\'s diminished chord and substitutes it into that voice. Tap ' +
  'the active slider node again to mute that voice.';

export const BORROWING_DIAGRAM_PRACTICE_BODY =
  'Pick any child group (Branch, Smoke, Magma, and so on) and identify its ' +
  'neighbor from the triangle. Stay on one slice while borrowing to hear on ' +
  'and off color without changing harmonic function family. Use per-chord or ' +
  'global borrowing memory in Settings depending on whether you want each ' +
  'chord to remember its own slider positions.';

export const BORROWING_DIAGRAM_PRACTICE_MOVEMENTAL =
  'Try Base Branch with the Root slider borrowed up, then move to Base Trunk ' +
  'with the same borrow to hear how neighbor color travels along the axis.';

export const BORROWING_ADVANCED_BODY =
  'Borrow two or three neighbor voices at once for denser harmonic tension. ' +
  'On static chords or common endings, neighbor borrowing adds the right kind ' +
  'of wrongness: fresh movement and voice-leading interest without rewriting ' +
  'the underlying progression.';

export const ELEVATOR_SYSTEM_VIDEO_URL =
  'https://www.youtube.com/watch?v=qYoSZqWLh7E';

export const LABYRINTH_CHANNEL_URL =
  'https://www.youtube.com/@LabyrinthofLimitations';

export const ELEVATOR_SYSTEM_ATTRIBUTION =
  'Elevator system by Thomas Echols (Labyrinth of Limitations on YouTube), ' +
  'adapted for guitar from Barry Harris\'s teaching. The same framework ' +
  'applies to any polyphonic instrument.';

export interface ElevatorFloor {
  floor: number;
  name: string;
  description: string;
}

export const ELEVATOR_FLOORS: ElevatorFloor[] = [
  {
    floor: 1,
    name: 'Unison',
    description:
      'A single pitch, or two voices on the same note before they split apart.',
  },
  {
    floor: 2,
    name: 'Thirds',
    description: 'Two-note intervals mapping closely along the scale.',
  },
  {
    floor: 3,
    name: 'Triads',
    description: 'Three-note closed structures.',
  },
  {
    floor: 4,
    name: 'Shell Chords',
    description:
      'Guide-tone voicings, typically roots, thirds, and sevenths or sixths.',
  },
  {
    floor: 5,
    name: 'Octave Chords',
    description:
      'Octave-based voicings, often like a shell chord with a missing inner voice.',
  },
  {
    floor: 6,
    name: 'Drop 2 Chords',
    description:
      'Four-note jazz voicings with the second-highest close voice dropped an octave.',
  },
  {
    floor: 7,
    name: 'Drop 3 Chords',
    description:
      'Voicings with the third-highest voice dropped, giving wide bass separation.',
  },
  {
    floor: 8,
    name: 'Drop 2 and 4 Chords',
    description:
      'Wide textures for lower registers, dropping the second and fourth voices.',
  },
  {
    floor: 9,
    name: 'Double Octave Chords',
    description:
      'The widest voicing, with the outer voices separated by two octaves. ' +
      'One can devise wider voicings, but we\'ll stop here.',
  },
];

export interface RelativeMotionTopic {
  title: string;
  mechanic: string;
  application: string;
  movemental: string;
}

export const ELEVATOR_MOTION_TOPICS: RelativeMotionTopic[] = [
  {
    title: 'Contrary motion',
    mechanic:
      'Voices move in opposite directions, expanding outward or compressing inward.',
    application:
      'Walking the Elevator up or down a scale moves from narrow floors to wide ' +
      'ones (or back), so outer voices naturally drift apart or together.',
    movemental:
      'In Tilt mode, roll your phone left or right to step through Movemental\'s ' +
      'voicing elevator while staying on the same chord. Each roll stop is one ' +
      'floor; rolling two stops skips a floor. From Unison toward Triads (skipping ' +
      'Thirds), the outer voices move in opposite directions even though the ' +
      'harmony stays put. That is contrary motion in thirds. Watch the Voicing ' +
      'readout as you roll.',
  },
  {
    title: 'Parallel (direct) motion',
    mechanic:
      'Every active voice shifts in the same direction by the same structural amount.',
    application:
      'Stay on one floor (Thirds, Triads, Drop 2, and so on) and move up or ' +
      'down the scale. The spacing between voices stays locked.',
    movemental:
      'Keep roll steady so the Voicing readout stays on the same elevator floor. ' +
      'Tilt pitch forward or back instead. Every sounding note shifts together ' +
      'through parallel positions on the tone ladder, which is parallel motion ' +
      'through different inversions of the chord. IN THE BASS shows which chord ' +
      'tone sits in the bass as pitch moves the stack.',
  },
  {
    title: 'Oblique motion',
    mechanic:
      'One or more voices hold a fixed pitch while others move around them.',
    application:
      'Blend or change floors selectively. A sustained soprano with a moving ' +
      'lower voice can step from Unison to Thirds without leaving the melody note.',
    movemental:
      'Roll between adjacent elevator floors while pitch stays roughly steady. ' +
      'Unison to Third adds a second voice while one pitch is held. At wide ' +
      'spreads, stepping from Double Octave to Drop 2 and 4 reshapes inner voices ' +
      'but can leave an outer note anchored, so one line stays put while others ' +
      'move (oblique motion).',
  },
];

export const ELEVATOR_CONTRARY_ON_OFF_BODY =
  'Moving one elevator floor while stepping through the on/off scale of chords ' +
  'gives contrary motion by step (see Borrowing from the Neighbors in Help for ' +
  'on and off). Stay on the child chord for the on color, then move to its ' +
  'neighbor element for the off color on the next floor. For example, play a ' +
  'Double Octave voicing of Branch (on), then a Drop 2 and 4 voicing of Fire ' +
  '(off, Branch\'s neighbor). The spread compresses while the harmony shifts to ' +
  'the neighbor pool, so outer voices move in opposite directions even though ' +
  'you only stepped one floor.';

export const ELEVATOR_CONTRARY_BIGGER_INTERVALS_BODY =
  'Of course, skipping more floors of the elevator pushes the voices ' +
  'farther apart or together, so you get contrary motion in wider intervals. ' +
  'Try this to really highlight the expanding and contracting effect.';

export const ELEVATOR_VOICING_BASS_NOTE =
  'In No Tilt mode, changing the voicing on the elevator keeps the bass note ' +
  'the same (pivot anchor). Inner and outer voices reshape around that fixed ' +
  'bass, which is effectively oblique motion: one line stays put while others ' +
  'move. In Tilt mode, roll steps through voicing floors with the contrary ' +
  'anchor instead: the bass shifts automatically as the spread changes, so ' +
  'widening or narrowing the voicing produces opening or closing contrary motion.';
