# movemental.py

# region Imports ##############################################################
from gui import *
from music import *
from math import *
from string import *
# endregion Imports ############################################################

# region Classes ##############################################################
# Note letter names
NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NOTE_NAMES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

class Chord():
    def __init__(self, name, pitches):
        self.name = name

        # Normalize pitches (convert to pitch classes 0-11)
        self.pitch_classes = [x % 12 for x in pitches]
        self.pitch_classes.sort()

        # String of chord spelling (note letter names)
        self.spelling = NOTE_NAMES_FLAT[self.pitch_classes[0]] + " " + \
                        NOTE_NAMES_FLAT[self.pitch_classes[1]] + " " + \
                        NOTE_NAMES_FLAT[self.pitch_classes[2]] + " " + \
                        NOTE_NAMES_FLAT[self.pitch_classes[3]]

# endregion Classes ###########################################################

# region Constants ############################################################
# Set the tonal center
TONAL_CENTER_OFFSET = -5  # 0 = C4, 2 = D4, -2 = Bb3, +10 = Bb4, etc.
VOICING = "Drop 2"  # Close, Drop 2, Drop 3, Drop 2 and 4
CHORD_DURATION = SN  # how long to play each chord
OCTAVE_RANGE = 5     # which octave to use

VOICING_TO_INDICES = {
    "Close": [],
    "Drop 2": [1],
    "Drop 3": [1, 2],
    "Drop 2 and 4": [1, 3]
}

# Map points on the display to chords
# (everything is relative to C, but TRANSPOSE_KEY_SEMITONES will allow for any tonal center)
COORDINATES_TO_CHORD = {}

# Elemental Diminished Chords
COORDINATES_TO_CHORD[(111, 176)] = Chord("Earth", [C4, EF4, FS4, A4])
COORDINATES_TO_CHORD[(736, 166)] = Chord("Wind", [DF4, E4, G4, BF4])
COORDINATES_TO_CHORD[(409, 631)] = Chord("Fire", [D4, F4, AF4, B4])

# Earth-Wind Combinations
# Trunk (min 6)
COORDINATES_TO_CHORD[(256, 92)] = Chord("Trunk", [C4, EF4, G4, A4])
COORDINATES_TO_CHORD[(222, 148)] = Chord("Brother Trunk", [EF4, GF4, BF4, C5])
COORDINATES_TO_CHORD[(256, 147)] = Chord("Cousin Trunk", [GF4, A4, DF5, EF5])
COORDINATES_TO_CHORD[(290, 145)] = Chord("Sister Trunk", [A3, C4, E4, FS4])
# Branch (maj 6)
COORDINATES_TO_CHORD[(406, 36)] = Chord("Branch", [C4, E4, G4, A4])
COORDINATES_TO_CHORD[(362, 77)] = Chord("Brother Branch", [EF4, G4, BF4, C5])
COORDINATES_TO_CHORD[(412, 77)] = Chord("Cousin Branch", [GF4, BF4, DF5, EF5])
COORDINATES_TO_CHORD[(459, 79)] = Chord("Sister Branch", [A3, CS4, E4, FS4])
# Sand-Storm (dom 7 b5) (default=cousin and brother=sister)
COORDINATES_TO_CHORD[(418, 156)] = Chord("Sand-Storm", [C4, E4, GF4, BF4])
COORDINATES_TO_CHORD[(425, 205)] = Chord("Brother Sand-Storm", [EF4, G4, A4, DF5])
# Leaf (dom 7)
COORDINATES_TO_CHORD[(565, 96)] = Chord("Leaf", [C4, E4, G4, BF4])
COORDINATES_TO_CHORD[(539, 155)] = Chord("Brother Leaf", [EF4, G4, BF4, DF5])
COORDINATES_TO_CHORD[(572, 151)] = Chord("Cousin Leaf", [GF4, BF4, DF5, E5])
COORDINATES_TO_CHORD[(610, 148)] = Chord("Sister Leaf", [A3, CS4, E4, G4])

# Wind-Fire Combinations
# Smoke (min 6)
COORDINATES_TO_CHORD[(736, 275)] = Chord("Smoke", [G4, BF4, D5, E5])
COORDINATES_TO_CHORD[(690, 318)] = Chord("Brother Smoke", [BF4, DF5, F5, G5])
COORDINATES_TO_CHORD[(728, 321)] = Chord("Cousin Smoke", [DF5, E5, AF5, BF5])
COORDINATES_TO_CHORD[(770, 325)] = Chord("Sister Smoke", [E4, GF4, B4, CS5])
# Ember (maj 6)
COORDINATES_TO_CHORD[(830, 386)] = Chord("Ember", [G4, B4, D5, E5])
COORDINATES_TO_CHORD[(780, 427)] = Chord("Brother Ember", [BF4, D5, F5, G5])
COORDINATES_TO_CHORD[(821, 426)] = Chord("Cousin Ember", [DF5, F5, AF5, BF5])
COORDINATES_TO_CHORD[(858, 427)] = Chord("Sister Ember", [E4, GS4, B4, CS5])
# Fire-Storm (dom 7 b5)
COORDINATES_TO_CHORD[(579, 346)] = Chord("Fire-Storm", [G4, B4, DF5, F5])
COORDINATES_TO_CHORD[(558, 382)] = Chord("Brother Fire-Storm", [BF4, D5, E5, AF5])
# Flame (dom 7)
COORDINATES_TO_CHORD[(623, 533)] = Chord("Flame", [G4, B4, D5, F5])
COORDINATES_TO_CHORD[(600, 572)] = Chord("Brother Flame", [BF4, D5, F5, AF5])
COORDINATES_TO_CHORD[(638, 571)] = Chord("Cousin Flame", [DF5, F5, AF5, B5])
COORDINATES_TO_CHORD[(676, 573)] = Chord("Sister Flame", [E4, GS4, B4, D5])

# Fire-Earth Combinations
# Magma (min 6)
COORDINATES_TO_CHORD[(222, 459)] = Chord("Magma", [D4, F4, A4, B5])
COORDINATES_TO_CHORD[(183, 520)] = Chord("Brother Magma", [F4, AF4, C5, D5])
COORDINATES_TO_CHORD[(231, 507)] = Chord("Cousin Magma", [AF4, CF5, EF5, F5])
COORDINATES_TO_CHORD[(278, 492)] = Chord("Sister Magma", [B3, D4, FS4, GS4])
# Glass (maj 6)
COORDINATES_TO_CHORD[(87, 360)] = Chord("Glass", [F4, A4, C5, D5])
COORDINATES_TO_CHORD[(57, 413)] = Chord("Brother Glass", [AF4, C4, EF5, F5])
COORDINATES_TO_CHORD[(100, 406)] = Chord("Cousin Glass", [B4, DS5, FS5, GS5])
COORDINATES_TO_CHORD[(141, 394)] = Chord("Sister Glass", [D4, FS4, A4, B5])
# Forest-Fire (dom 7 b5)
COORDINATES_TO_CHORD[(318, 333)] = Chord("Forest-Fire", [F4, A4, CF5, EF5])
COORDINATES_TO_CHORD[(326, 384)] = Chord("Brother Forest-Fire", [AF4, C5, D5, GF5])
# Charcoal (dom 7)
COORDINATES_TO_CHORD[(158, 263)] = Chord("Charcoal", [F4, A4, C5, EF5])
COORDINATES_TO_CHORD[(131, 306)] = Chord("Brother Charcoal", [AF4, C4, EF5, GF5])
COORDINATES_TO_CHORD[(166, 299)] = Chord("Cousin Charcoal", [B4, DS5, FS5, A5])
COORDINATES_TO_CHORD[(206, 297)] = Chord("Sister Charcoal", [D4, FS4, A4, C5])

# Intervals in semitones
MINOR_THIRD = 3
TRITONE = 6
OCTAVE = 12

# Map family transformation buttons
COORDINATES_TO_FAMILY = {}
# Default
COORDINATES_TO_FAMILY[(763, 567)] = 0
# Sister
COORDINATES_TO_FAMILY[(675, 651)] = -MINOR_THIRD
# Cousin
COORDINATES_TO_FAMILY[(675, 651)] = TRITONE
# Brother
COORDINATES_TO_FAMILY[(838, 647)] = MINOR_THIRD

# Scales of chords by "pitch class". Semitones are assigned to 0-11.
MAJOR_SIXTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 9, 11]
MAJOR_SIXTH_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 3, 4, 5, 7, 8, 10]
MAJOR_SIXTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 2, 4, 5, 7, 9, 10]
MAJOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [0, 2, 3, 5, 7, 8, 10, 11] # aka minor seventh diminished scale

MINOR_SIXTH_DIMINISHED_SCALE = [0, 2, 3, 5, 7, 8, 9, 11]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_THIRD = [0, 2, 4, 5, 6, 8, 9, 11]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 2, 4, 5, 7, 8, 10]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [0, 2, 3, 5, 6, 8, 10, 11] # aka minor seventh flat five diminished scale

DOMINANT_SEVENTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 10, 11]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 3, 4, 6, 7, 8, 10]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 3, 4, 5, 7, 9, 10,]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_SEVENTH = [0, 1, 2, 4, 6, 7, 9, 10]

DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE = [0, 2, 4, 5, 6, 8, 10, 11] # same as from flat fifth
DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 2, 4, 6, 7, 8, 10] # same as from seventh

DOMINANT_ROOTS_AND_THEIR_DIMINISHED = [0, 2, 3, 5, 6, 8, 9, 11] # aka whole-half diminished scale
DIMINISHED_AND_ITS_DOMINANT_ROOTS = [0, 1, 3, 4, 6, 7, 9, 10] # aka half-whole diminished scale

# Chord qualities
MAJOR_SIXTH_CHORD = [0, 4, 7, 9]
MAJOR_SIXTH_CHORD_FROM_THIRD = [0, 3, 5, 8]
MAJOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 9]
MAJOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 7, 10] # aka minor seventh chord

MINOR_SIXTH_CHORD = [0, 3, 7, 9]
MINOR_SIXTH_CHORD_FROM_THIRD = [0, 4, 6, 9]
MINOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 8]
MINOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 6, 10] # aka minor seventh flat five chord

DOMINANT_SEVENTH_CHORD = [0, 4, 7, 10]
DOMINANT_SEVENTH_CHORD_FROM_THIRD = [0, 3, 6, 8]
DOMINANT_SEVENTH_CHORD_FROM_FIFTH = [0, 3, 5, 9]
DOMINANT_SEVENTH_CHORD_FROM_SEVENTH = [0, 2, 6, 9]

DOMINANT_SEVENTH_FLAT_FIVE_CHORD = [0, 4, 6, 10] # same as from flat fifth
DOMINANT_SEVENTH_FLAT_FIVE_CHORD_FROM_THIRD = [0, 2, 6, 8] # same as from seventh

DIMINISHED_CHORD = [0, 3, 6, 9]
# endregion Constants #########################################################

# region GUI Setup ############################################################
# Create a display with diagram image
display = Display("Movemental", 900, 720)
diagram = Icon("./images/diagram_family.jpg", 900, 720)
display.add(diagram)

# Create a circle that marks the active chord
selected_chord_dot = Circle(0, 0, 8, Color.BLUE, fill=True)
display.add(selected_chord_dot)
# endregion GUI Setup #########################################################

# region Functions ############################################################
def distance(point1, point2):
    """
    Calculates the euclidean distance between two points.

    Args:
        point1 (_type_): _description_
        point2 (_type_): _description_

    Returns:
        _type_: _description_
    """
    return hypot(point2[0] - point1[0], point2[1] - point1[1])


def find_closest_point(here, points):
    """
    Finds closest among all points to here.

    Returns:
        _type_: _description_
    """
    # Keep track of the closest distance and point so far
    closest_distance_so_far = 1000000
    closest_point_so_far    = None

    # Iterate through all point looking for closest one
    for point in points:
        thisDistance = distance(here, point)   # calculate distance
        if thisDistance < closest_distance_so_far:  # is this closer than ever before?
            # Yes, so update
            closest_distance_so_far = thisDistance
            closest_point_so_far    = point
    # Now, closestPointSoFar contains the closest point overall.
    closest_point = closest_point_so_far

    return closest_point


def play_chord(pitch_classes):
    """
    Play the provided list of pitches as a chord.

    Args:
        pitches (_type_): _description_
    """
    pitches = []
    # Place notes in the correct octave range based on the chosen voicing
    for i in range(len(pitch_classes)):
        # Place the pitch class into the correct octave range
        adjusted_pitch = pitch_classes[i] + (OCTAVE * OCTAVE_RANGE) + TONAL_CENTER_OFFSET

        # For the chosen voicing, raise the appropriate notes up an octave
        if i in VOICING_TO_INDICES.get(VOICING):
            if adjusted_pitch + OCTAVE <= 127:
                adjusted_pitch += OCTAVE

        # Add corretly placed cpitch
        pitches.append(adjusted_pitch)

    # Create the chord
    phrase = Phrase()
    phrase.addChord(pitches, CHORD_DURATION)

    # Stop any sounding notes
    Play.allNotesOff()

    # Play the chord!
    Play.midi(phrase)


def select_chord_visually(x, y):
    """
    Create and place a circle at the coordinates.

    Args:
        x (_type_): _description_
        y (_type_): _description_
    """
    global display, selected_chord_dot

    display.move(selected_chord_dot, x, y)


def select_chord(x, y):
    """
    Finds the closest chord and plays it.

    Args:
        x (_type_): _description_
        y (_type_): _description_
    """
    # Find the closest point
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())

    # Get chord info
    chord = COORDINATES_TO_CHORD[point]

    # Play the chord
    play_chord(chord.pitch_classes)

    # Place a dot on the selection
    select_chord_visually(point[0], point[1])

    print(chord.name + ": " + chord.spelling)

    # # Construct note names
    # if isFlat(chord_root):  # if chord name is flat, use flat note names
    #     chord_notes = [NOTE_NAMES_FLAT[x] for x in chord_pitches]   # put names in a list
    # else:  # otherwise, use sharp names
    #     chord_notes = [NOTE_NAMES_SHARP[x] for x in chord_pitches]  # put names in a list

    # # Join names into a string, and print them
    # print(f"- [{', '.join(chord_notes)}]")


def select_family(x, y):
    """
    Finds the closest tranformation and performs it.

    Args:
        x (_type_): _description_
        y (_type_): _description_
    """
    # Select transformation type
    chord = COORDINATES_TO_FAMILY[(x, y)]

    # Play next chord
    select_chord(x, y)


def choose_action(x, y):
    """
    _summary_

    Args:
        x (_type_): _description_
        y (_type_): _description_
    """
    # Snap clicked coordinates to known centers
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())

    new_x, new_y = point

    # Test if key holds type is a chord
    if isinstance(COORDINATES_TO_CHORD[point], Chord): # test if value is a Chord

        # If a chord, call play chord function
        select_chord(new_x, new_y)

    # If not a chord, its a change in family
    else:
        # Play that transformation
        select_family(new_x, new_y)
# endregion Functions #########################################################

def main():
    # Set the instrument
    Play.setInstrument(SYNTH, 0)

    # Register callback for playing chords by clicking the mouse
    display.onMouseClick(choose_action)

    # Show mouse coordinates for testing
    display.showMouseCoordinates()

if __name__ == "__main__":
    main()
