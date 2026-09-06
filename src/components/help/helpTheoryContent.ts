/**
 * Copy and reference URLs for harmonic theory help articles.
 */

export const HELP_HUB_LEDE =
  'Movemental is a harmonic instrument built around an elemental chord ' +
  'diagram. Tap chords to play them immediately, shape voicings with elevator ' +
  'floors, and borrow neighbor tones for dynamic color.';

export const HELP_HUB_HOW_TO_PLAY_BODY =
  'Movemental is a harmonic playground built around an elemental chord diagram:';

export const HELP_HUB_DIAGRAM_AND_CLOCK_BODY =
  'Earth, Wind, and Fire anchor the triangle corners as fully diminished seventh parents. ' +
  'Child chord families sit along each axis, combining notes from their two parents. ' +
  'Node names reflect their elemental proportions (Trunk: 3 Earth / 1 Wind, Branch & Sand-Storm: 2 / 2, Leaf: 1 / 3). ' +
  'Each family divides into four sibling slices (Base, Brother, Twin, Sister). ' +
  'The Clock Face dial displays all twelve pitch classes around a circular dial with elemental colors, ' +
  'and the four-level chord readout provides Elemental Name, Chord Chemistry, Traditional Name, and Note Names.';

export const HELP_HUB_BORROWING_BODY =
  'Four vertical sliders represent the chord voices (Root, Third, Fifth, ' +
  'Sixth/Seventh). The center line is the chord tone; drag up or down to ' +
  'borrow notes from the neighbor (the opposite vertex across the triangle) ' +
  'for extra color. Tap an active slider node again to mute that voice ' +
  '(creating smaller voicings such as triads or two-note shells).';

export const HELP_HUB_VOICING_AND_TILT_BODY =
  'Shape chord width and register across nine elevator floors from narrow Unison to wide Double Octave. ' +
  'In Tilt mode, phone roll changes voicing width (contrary motion) and pitch sets IN THE BASS (parallel motion). ' +
  'In No-Tilt mode, select floors and bass notes using screen pills, and lock preferred settings per chord.';

export const HELP_HUB_SETTINGS_BODY =
  'Configure play styles (Tap vs Tap & Hold), Tilt to Strum, note retriggering, voice leading modes ' +
  '(Root Position, Smooth, Smoothest), tonal centers, synth presets, envelopes, and audio FX.';

export const HELP_HUB_RECORDING_BODY =
  'Record live takes in audio and standard MIDI. ' +
  'Use the Panic switch anytime to immediately silence all audio and reset notes.';

export const CREATION_THEORY_VIDEO_URL =
  'https://youtube.com/shorts/NWT86jDvUPQ';
export const CREATION_THEORY_VIDEO_TITLE_1 =
  'Succinct demonstration - Chris Parks';

export const CREATION_THEORY_VIDEO_URL_2 =
  'https://www.youtube.com/shorts/OmWSgjwroLM';
export const CREATION_THEORY_VIDEO_TITLE_2 =
  'Succinct demonstration - Thomas Echols';

export const CREATION_THEORY_ATTRIBUTION =
  'Concept by Dr. Barry Harris.';

export const CREATION_THEORY_INTRO =
  'Barry Harris\'s "Creation Theory" reveals how the entire harmonic universe ' +
  'unfolds from unity into rich chord families. Barry Harris was a Christian, ' +
  'so he compared this theory to The Book of Genesis in The Bible. We paraphrase ' +
  'his poetic teaching metaphors below to honor his life\'s work and show how ' +
  'Movemental\'s own analogies derive from them.';

export const CREATION_STEP_1_TITLE = '1. The Chromatic Scale (The Universe)';
export const CREATION_STEP_1_BODY =
  'In the beginning, the Creator made the universe: the twelve pitch classes ' +
  'of the chromatic scale. This total chromatic collection is the complete ' +
  'world of sound from which every musical note, chord, and progression is drawn.';
export const CREATION_STEP_1_MOVEMENTAL =
  'The Clock Face dial visualizes these twelve chromatic pitch classes ' +
  'around a circular geometry, color-coded by their elemental origins.';

export const CREATION_STEP_2_TITLE = '2. Two Whole Tone Scales (Adam and Eve)';
export const CREATION_STEP_2_BODY =
  'Just as God created Man and Woman (Adam and Eve), the twelve-note universe ' +
  'naturally divides into two symmetrical whole-tone scales of six notes each ' +
  '(Whole Tone 1: C, D, E, F#, G#, A# and Whole Tone 2: Db, Eb, F, G, A, B). ' +
  'Because their steps are completely uniform, neither scale has a single home ' +
  'center; they are the primordial ancestors of all harmony.';
export const CREATION_STEP_2_MOVEMENTAL =
  'Think of these two whole-tone scales as underlying the geometric symmetry ' +
  'of Movemental. While they aren\'t represented on the diagram, they give rise ' +
  'to Earth, Wind, and Fire.';

export const CREATION_STEP_3_TITLE =
  '3. Three Diminished Chords (The First Generation)';
export const CREATION_STEP_3_BODY =
  'From Adam and Eve came the first generation of children such as Cain and ' +
  'Abel. By combining DNA (taking two notes from the first whole-tone scale and ' +
  'two notes from the second), they formed the three symmetrical fully diminished ' +
  'seventh chords (four notes each, 12 / 4 = 3).';
export const CREATION_STEP_3_MOVEMENTAL =
  'These three ancestors are Earth, Wind, and Fire: the three parent vertices ' +
  'anchored at the corners of the elemental triangle. Every chord on the ' +
  'diagram traces its lineage directly to them.';

export const CREATION_STEP_4_TITLE =
  '4. Four Chord Types (Lowering Notes & Siblings)';
export const CREATION_STEP_4_BODY_INTRO =
  'From the diminished parents, further generations emerge by combining notes ' +
  'from two parent pools. By systematically lowering notes by a half step ' +
  '(testing permutations), you discover four fundamental chord qualities:';

export interface CreationLoweringRule {
  label: string;
  result: string;
}

export const CREATION_STEP_4_RULES: CreationLoweringRule[] = [
  {
    label: 'Major 6th (Lower 2 adjacent notes)',
    result:
      'Contains the exact same notes as a Minor 7th (for example, C6 is C-E-G-A, ' +
      'the same pitch collection as A minor 7).',
  },
  {
    label: 'Minor 6th (Lower 3 notes)',
    result:
      'Contains the exact same notes as a Minor 7th b5 / Half-Diminished (for ' +
      'example, C minor 6 is C-Eb-G-A, the same pitch collection as A min7b5).',
  },
  {
    label: 'Dominant 7th (Lower 1 note)',
    result:
      'Lowers a single voice to create a strong pull toward resolution.',
  },
  {
    label: 'Dominant 7th b5 (Lower 2 tritone notes)',
    result:
      'Lowers two opposite notes across the tritone, producing another dominant color.',
  },
];

export const CREATION_STEP_4_THEORY_NOTE =
  'Note for experienced, and thus hesitant, musicians: If you wonder where ' +
  'chords like "Major 7th" are, these emerge from "borrowing" in Step 5.';

export const CREATION_STEP_4_SIBLINGS_BODY =
  'For every pair of parents, each chord quality generates a family of four ' +
  'related sibling chords (or two for Dominant 7th b5 due to tritone symmetry). ' +
  'Barry would say things like, "When we were children, who do we play with first? ' +
  'Our brothers and sisters." For example, with Dominant 7th chords, these four ' +
  'siblings elegantly explain concepts that are often glossed over in traditional ' +
  'music theory, such as tritone substitution or back-door dominants.';

export const CREATION_STEP_4_MOVEMENTAL =
  'On the diagram, each circular group along an axis is a chord quality that ' +
  'reflects the ratio of notes inherited from its parents (Trunk has 3 Earth notes ' +
  'and 1 Wind note, Branch has 2 and 2, and Leaf has 1 and 3). ' +
  'The four slices in that circle (Base, Brother, Twin, and Sister) are the ' +
  'siblings. Rotating between sibling slices simply rotates the chord\'s ' +
  'geometry around the clock face.';

export const CREATION_STEP_5_TITLE =
  '5. Eight-Note Scales of Chords (The Neighbor)';
export const CREATION_STEP_5_BODY =
  'Every four-note chord combines DNA from two parent diminished chords, which ' +
  'leaves the third diminished chord completely untouched. To build a complete ' +
  'scale for movement and improvisation, Barry Harris combined the four-note ' +
  'chord with the unused diminished chord (4 chord notes + 4 diminished notes = ' +
  '8-note "Scale of Chords"). This allows you to alternate between tension and ' +
  'resolution and mix them together. By "borrowing" notes, all the other types of ' +
  'chords in jazz theory arise (for example, borrowing one note on a Major 6th ' +
  'yields a Major 7th, two notes yields a Major 7th #5, and so on).';
export const CREATION_STEP_5_MOVEMENTAL =
  'That untouched third diminished chord is the Neighbor (the opposite vertex ' +
  'across the triangle). Alternating between your child chord ("on") and its ' +
  'neighbor diminished chord ("off") creates beautiful, flowing movements.';

export const APPLIED_MOVEMENTAL_ATTRIBUTION =
  'Synthesized for Movemental from Dr. Barry Harris\'s Creation Theory and Thomas Echols\'s Elevator System.';

export const APPLIED_MOVEMENTAL_INTRO =
  'Movemental translates Barry Harris\'s Scales of Chords and Thomas Echols\'s ' +
  'Elevator System into a direct, physical instrument. Here is how each harmonic ' +
  'framework comes alive under your fingers and device motions.';

export const APPLIED_TOPIC_1_TITLE = '1. The Elemental Triangle and Lineage';
export const APPLIED_TOPIC_1_BODY =
  'Earth, Wind, and Fire anchor the three corners of the triangle as fully ' +
  'diminished seventh parents. Child chord groups sit along each axis between ' +
  'two parents, inheriting notes from both. Each quality is divided into four ' +
  'sibling slices (Base, Brother, Twin, Sister). Rotating between sibling slices ' +
  'preserves the chord type while rotating its geometric polygon around the ' +
  'Clock Face dial.';

export const APPLIED_TOPIC_2_TITLE = '2. Borrowing Sliders and the Scale of Chords';
export const APPLIED_TOPIC_2_BODY =
  'Barry Harris\'s eight-note scale of chords alternates between your child chord ' +
  '(on) and the untouched third diminished chord (off). On the triangle, that ' +
  'untouched diminished chord is the Neighbor at the opposite vertex.';
export const APPLIED_TOPIC_2_SLIDERS =
  'Four vertical sliders control Root, Third, Fifth, and Sixth/Seventh. The center ' +
  'line plays the pure chord tone. Dragging up or down borrows the nearest higher ' +
  'or lower pitch class from the Neighbor\'s diminished pool, infusing bebop tension ' +
  'without breaking your chord. Tapping an active node mutes that voice for lighter ' +
  'triads or shells.';

export const APPLIED_TOPIC_3_TITLE = '3. VOICING and Relative Motion (The Elevator)';
export const APPLIED_TOPIC_3_BODY =
  'Thomas Echols\'s nine elevator floors determine the vertical spread between ' +
  'chord voices. Movemental gives you two expressive ways to ride the elevator:';
export const APPLIED_TOPIC_3_TILT =
  'In Tilt mode, phone roll steps through the nine floors from narrow Unison (full tilt) ' +
  'to wide Double Octave (flat), creating contrary motion. Phone pitch moves the entire ' +
  'stack to set IN THE BASS, creating parallel motion across chord inversions.';
export const APPLIED_TOPIC_3_NO_TILT =
  'In No-Tilt mode, the VOICING selector steps through floors while anchoring the bass, ' +
  'creating oblique motion. IN THE BASS selects inversions independently, and lock ' +
  'buttons save your preferred voicings per chord.';

export const APPLIED_TOPIC_4_TITLE = '4. Smooth Voice Leading Across the Diagram';
export const APPLIED_TOPIC_4_BODY =
  'Moving between adjacent chord circles on the diagram while staying on the ' +
  'same sibling slice (for example, Base Branch to Base Trunk) moves only one ' +
  'note by a single half step. Movemental\'s voice leading engine keeps common ' +
  'tones connected and steps minimal as you travel around the triangle.';

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
export const ELEVATOR_SYSTEM_VIDEO_TITLE =
  'Episode 16: The Elevator Sequence (Barry Harris Scales of Chords)';

export const LABYRINTH_CHANNEL_URL =
  'https://www.youtube.com/@LabyrinthofLimitations';

export const ELEVATOR_SYSTEM_ATTRIBUTION =
  'Elevator system by Thomas Echols (The Labyrinth of Limitations on YouTube), ' +
  'adapted for guitar from Barry Harris\'s teaching. The same framework ' +
  'applies to any polyphonic instrument.';

export const ELEVATOR_SYSTEM_INTRO =
  'The Elevator Sequence is a series of nine voicings that we use for all ' +
  'kinds of polyphonic motion: when you have more than one melody happening at ' +
  'the same time, and how they relate to each other. Rather than being purely ' +
  'drop-2 centric, starting from small floors first brings our attention to ' +
  'subtle contrary motions and inner voice movements.';

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
      'A single note, or conceived of as two notes that split apart as you travel through the elevator.',
  },
  {
    floor: 2,
    name: 'Thirds',
    description:
      'Two voices playing thirds, moving along the scale in parallel motion.',
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
      'Guide-tone voicings (roots, thirds, and sevenths or sixths) harmonizing the scale.',
  },
  {
    floor: 5,
    name: 'Octave Chords',
    description:
      'Essentially a shell chord on top with the tenor voice missing, opening space in the middle.',
  },
  {
    floor: 6,
    name: 'Drop 2 Chords',
    description:
      'Four-note jazz voicings with the second voice from the top dropped down an octave.',
  },
  {
    floor: 7,
    name: 'Drop 3 Chords',
    description:
      'Voicings with the third voice from the top dropped an octave, providing wide bass separation.',
  },
  {
    floor: 8,
    name: 'Drop 2 and 4 Chords',
    description:
      'Wide textures dropping both the second and fourth voices, offering rich flexibility in lower registers.',
  },
  {
    floor: 9,
    name: 'Double Octave Chords',
    description:
      'The widest voicing, spanning two full octaves between the lowest and highest voices.',
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
      'Voices move apart from each other and become ever wider, or move inward together. When you play the elevator sequence as a scale, contrary motion is what it naturally does.',
    application:
      'Moving between floors widens or narrows voices. Thomas emphasizes not to just go out and in like an accordion or squeeze box, but to change things up by moving between floors and directions.',
    movemental:
      'In Tilt mode, roll your phone left or right to step through Movemental\'s ' +
      'voicing elevator while staying on the same chord. Each roll stop is one ' +
      'floor; rolling two stops skips a floor. From Unison toward Triads (skipping ' +
      'Thirds), the outer voices move in opposite directions even though the ' +
      'harmony stays put. That is contrary motion in thirds. Watch the VOICING ' +
      'readout as you roll.',
  },
  {
    title: 'Parallel (direct) motion',
    mechanic:
      'All voices move in the same direction. The spacing between voices stays locked.',
    application:
      'Stay on one floor (such as Thirds, Triads, or Drop 2) and travel up or ' +
      'down the scale degrees. The intervals remain parallel throughout.',
    movemental:
      'Keep roll steady so the VOICING readout stays on the same elevator floor. ' +
      'Tilt pitch forward or back instead. Every sounding note shifts together ' +
      'through parallel positions on the tone ladder, which is parallel motion ' +
      'through different inversions of the chord. IN THE BASS shows which chord ' +
      'tone sits in the bass as pitch moves the stack.',
  },
  {
    title: 'Oblique motion',
    mechanic:
      'One voice stays the same while another moves, or one voice stays static while multiple voices move in different directions.',
    application:
      'View oblique motion as a floor plus a floor (such as a unison plus a unison, or a third plus a unison). One line holds a pedal or melody note while another steps through elevator levels.',
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
  'gives contrary motion by step. Stay on the child chord for the on color ' +
  '(such as C minor 6), then move to its neighbor element for the off color on ' +
  'the next floor (such as an octave chord moving out to a drop 2). The spread ' +
  'widens or narrows while the harmony alternates, so outer voices move in ' +
  'opposite directions by step.';

export const ELEVATOR_CONTRARY_BIGGER_INTERVALS_BODY =
  'Skipping floors of the elevator pushes the voices farther apart or closer ' +
  'together, producing contrary motion in wider intervals.';

export const ELEVATOR_CODIFYING_MOVEMENT_BODY =
  'One of the most powerful things to do with the elevator is to codify ' +
  'movement into repeatable formulas. Instead of improvising purely by chance, ' +
  'you can establish an off-to-on sequence (such as an octave chord stepping ' +
  'out to a drop 2, or a triad stepping out to a shell) and transpose that ' +
  'exact formula across scale degrees or start it from different floors.';

export const ELEVATOR_SUBSET_SUPERSET_BODY =
  'Knowing your elevator of intervals lets you spot smaller subsets within ' +
  'a larger chord frame (superset). A Drop 2 chord contains thirds, fifths, ' +
  'and tenths inside its structure. By recognizing those intervals, you can ' +
  'create movement within inner voices while the overall chord shape remains anchored.';

export const ELEVATOR_PRACTICE_BODY =
  'Thomas emphasizes that Barry Harris\'s concepts are meant to be practiced, ' +
  'not merely comprehended: "This is not an armchair philosopher kind of thing; ' +
  'we have to get in there, roll up our sleeves, and practice if we want to ' +
  'understand anything. Can we do it? That is the only way we can say we really ' +
  'know anything."';

export const ELEVATOR_VOICING_BASS_NOTE =
  'In No Tilt mode, changing the voicing on the elevator keeps the bass note ' +
  'the same (pivot anchor). Inner and outer voices reshape around that fixed ' +
  'bass, which is effectively oblique motion: one line stays put while others ' +
  'move. In Tilt mode, roll steps through voicing floors with the contrary ' +
  'anchor instead: the bass shifts automatically as the spread changes, so ' +
  'widening or narrowing the voicing produces opening or closing contrary motion.';
