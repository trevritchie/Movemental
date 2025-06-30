# movemental.py

# region Imports ##############################################################
from gui import *
from music import *
from math import *
from string import *
# endregion Imports ############################################################

# region Classes ##############################################################
class Chord():
    def __init__(self, quality, pitches):
        self.quality = quality

        # Normalize pitches (convert to pitch classes 0-11)
        self.pitch_classes = [x % 12 for x in pitches]
# endregion Classes ###########################################################

# region Constants ############################################################
# Set the tonal center
TONAL_CENTER_OFFSET = -2  # 0 = C4, 2 = D4, -2 = Bb3, +10 = Bb4, etc.
VOICING = "Close"  # Close, Drop 2, Drop 3, Drop 2 and 4
CHORD_DURATION = QN  # how long to play each chord
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
COORDINATES_TO_CHORD[(245, 95)] = Chord("Trunk", [C4, EF4, G4, A4]) # min6
COORDINATES_TO_CHORD[(406, 36)] = Chord("Branch", [C4, E4, G4, A4]) # maj6
COORDINATES_TO_CHORD[(418, 156)] = Chord("Sand-Storm", [C4, E4, GF4, BF4]) # dom7 b5
COORDINATES_TO_CHORD[(565, 96)] = Chord("Leaf", [C4, E4, G4, BF4]) # dom7

# Wind-Fire Combinations
COORDINATES_TO_CHORD[(736, 275)] = Chord("Smoke", [G4, BF4, D5, E5]) # min6
COORDINATES_TO_CHORD[(830, 386)] = Chord("Ember", [G4, B4, D5, E5]) # maj6
COORDINATES_TO_CHORD[(579, 346)] = Chord("Fire-Storm", [G4, B4, DF5, F5]) # dom7 b5
COORDINATES_TO_CHORD[(623, 533)] = Chord("Flame", [G4, B4, D5, F5]) # dom7

# Fire-Earth Combinations
COORDINATES_TO_CHORD[(219, 464)] = Chord("Magma", [F4, C5, D5, AF5]) # min6
COORDINATES_TO_CHORD[(82, 366)] = Chord("Glass", [F4, C5, D5, A5]) # maj6
COORDINATES_TO_CHORD[(310, 327)] = Chord("Forest-Fire", [F4, CF5, EF4, A5]) # dom7 b5
COORDINATES_TO_CHORD[(156, 266)] = Chord("Charcoal", [F4, C5, EF4, A5]) # dom7

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

# Note letter names
NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NOTE_NAMES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

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
diagram = Icon("./images/diagram.jpg", 900, 720)
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
    chord_quality    = COORDINATES_TO_CHORD[point].quality
    chord_pitch_classes = COORDINATES_TO_CHORD[point].pitch_classes

    # Play the chord
    play_chord(chord_pitch_classes)

    # Place a dot on the selection
    select_chord_visually(point[0], point[1])

    # Print chord info
    print(chord_quality)

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
    transformation = COORDINATES_TO_CHORD[(x, y)]

    # Apply transformation
    x, y = selected_chord_dot.getPosition()
    new_coordinates = transformation(x, y)

    # Split coordinate pair
    new_x, new_y = new_coordinates

    # Play next chord
    select_chord(new_x, new_y)


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
