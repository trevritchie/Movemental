# movemental.py

# region Imports ##############################################################
from gui import *
from music import *
from math import *
from string import *
# endregion Imports ############################################################

# region Constants ############################################################
# Map points on the display to chords
COORDINATES_TO_CHORD = {
    (0,0) = "chord name"
}

# For setting the key (where 0 is relative from)
TRANSPOSE_KEY_SEMITONES = -3  # 0 = C, 2 = D, -2 = Bb, +10 = Bb, etc.

# Note letter names
NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NOTE_NAMES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

# Intervals in semitones
MINOR_THIRD = 3
TRITONE = 6
OCTAVE = 12

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
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 3, 4, 5, 7, 9, 10, ]
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

# region Global Variables #####################################################
chord_duration = HN  # how long to play each chord
chord_octave = 5     # which octave to use
# endregion Global Variables ##################################################

# region Classes ##############################################################
class Chord():
    def __init__(self, root, quality, pitches):
        self.root = root
        self.quality = quality

        # Normalize pitches (convert to pitch classes 0-11)
        pitches = [x % 12 for x in pitches]
        self.pitches = pitches
# endregion Classes ###########################################################

# region GUI Setup ############################################################
# Create a display with tesseract diagram image
display = Display("Movemental", 1000, 514)
# TODO: draw the diagram and take a picture
display.drawImage("diagram.png", 0, 0)

# Create circle that shows active chord
selected_chord_dot = Circle(0, 0, 8, Color.BLACK, True)
display.add(selected_chord_dot)
# endregion GUI Setup #########################################################

# region Functions ############################################################
def distance( point1, point2 ):
    """
    Calculates the euclidean distance between two points.

    Args:
        point1 (_type_): _description_
        point2 (_type_): _description_

    Returns:
        _type_: _description_
    """
    return hypot(point2[0] - point1[0], point2[1] - point1[1])

def find_closest_point( here, points ):
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
        thisDistance = distance( here, point )   # calculate distance
        if thisDistance < closest_distance_so_far:  # is this closer than ever before?
            # Yes, so update
            closest_distance_so_far = thisDistance
            closest_point_so_far    = point
    # Now, closestPointSoFar contains the closest point overall.
    closest_point = closest_point_so_far

    return closest_point

def play_chord( pitches ):
    """
    Play the provided list of pitches as a chord.

    Args:
        pitches (_type_): _description_
    """
    global chord_duration, chord_octave

    # Place pitches in the correct octave range
    pitches = [x + (OCTAVE * chord_octave) for x in pitches]

    # Create the chord
    phrase = Phrase()
    phrase.addChord(pitches, chord_duration)

    # Play it!
    Play.midi( phrase )

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
    # TODO: define a COORDINATES_TO_CHORD dictionary mapping coordinates to chords

    # Find the closest point
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())

    # Get chord info
    chord_root    = COORDINATES_TO_CHORD[point].root
    chord_quality    = COORDINATES_TO_CHORD[point].quality
    chord_pitches = COORDINATES_TO_CHORD[point].pitches

    # Play the chord
    play_chord(chord_pitches)

    # Place a dot on the selection
    select_chord_visually( point[0], point[1] )

    # Print chord info
    print(chord_root, chord_quality)

    # Construct note names
    if isFlat(chord_root):  # if chord name is flat, use flat note names
        chord_notes = [NOTE_NAMES_FLAT[x] for x in chord_pitches]   # put names in a list
    else:  # otherwise, use sharp names
        chord_notes = [NOTE_NAMES_SHARP[x] for x in chord_pitches]  # put names in a list

    # Join names into a string, and print them
    print(f"- [{', '.join(chord_notes)}]")

def select_transformation(x, y):
    """
    Finds the closest tranformation and performs it.

    Args:
        x (_type_): _description_
        y (_type_): _description_
    """

    global COORDINATES_TO_CHORD, selected_chord_dot

    # Select transformation type
    transformation = COORDINATES_TO_CHORD[ ( x, y ) ]

    # Apply transformation
    x, y = selected_chord_dot.getPosition()
    new_coordinates = transformation( x, y )

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
    global COORDINATES_TO_CHORD

    # Snap clicked coordinates to known centers
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())

    new_x, new_y = point

    # Test if key holds type is a chord
    if isinstance( COORDINATES_TO_CHORD[point], Chord ): # test if value is a Chord

        # If a chord, call play chord function
        select_chord(new_x, new_y)

    # If not a chord, its a transformation
    else:
        # Play that transformation
        select_transformation(new_x, new_y)
# endregion Functions #########################################################

# Register callback for playing chords by clicking the mouse
display.onMouseClick(choose_action)
