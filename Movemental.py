###############################################################################
# movemental.py
# 2025-09-11
# Trevor Ritchie
#
# Interface inspired by tonnetz by _____ and Bill Manaris
#
# Chord visualization inspired by TetrachordTuner
# by Pangur Brougham-Cook and Bill Manaris
###############################################################################


# region Imports ##############################################################
from music import *
from gui import *
from math import hypot, pi, cos, sin
# endregion Imports ###########################################################


# region User Settings ########################################################
TONAL_CENTER_OFFSET = 7  # 0 = C, 2 = D, -2 = Bb, 10 = Bb etc.

OCTAVE_RANGE = 3  # which octave to place chords in

CHORD_DURATION = HN  # how long to play each chord

VOICING = "Drop 2 and 4"  # Close, Drop 2, Drop 3, Drop 2 and 4
# VOICING = "Drop 3"  # Close, Drop 2, Drop 3, Drop 2 and 4

# For all instrument constants, see https://jythonmusic.me/api/midi-constants/instrument/
Play.setInstrument(RHODES_PIANO)
# Play.setInstrument(PIANO)
# Play.setInstrument(SYNTH)
# Play.setInstrument(CELLO)
# Play.setInstrument(DX_PIANO)
# endregion User Settings #####################################################


# region Constants ############################################################
VOICING_TO_INDICES = {
    "Close": [],
    "Drop 2": [1],
    "Drop 3": [1, 2],
    "Drop 2 and 4": [1, 3]
}

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
MAJOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [0, 2, 3, 5, 7, 8, 10, 11]  # aka minor seventh diminished scale

MINOR_SIXTH_DIMINISHED_SCALE = [0, 2, 3, 5, 7, 8, 9, 11]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_THIRD = [0, 2, 4, 5, 6, 8, 9, 11]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 2, 4, 5, 7, 8, 10]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [0, 2, 3, 5, 6, 8, 10, 11]  # aka minor seventh flat five diminished scale

DOMINANT_SEVENTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 10, 11]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 3, 4, 6, 7, 8, 10]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 3, 4, 5, 7, 9, 10]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_SEVENTH = [0, 1, 2, 4, 6, 7, 9, 10]

DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE = [0, 2, 4, 5, 6, 8, 10, 11]  # same as from flat fifth
DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 2, 4, 6, 7, 8, 10]  # same as from seventh

DOMINANT_ROOTS_AND_THEIR_DIMINISHED = [0, 2, 3, 5, 6, 8, 9, 11]  # aka whole-half diminished scale
DIMINISHED_AND_ITS_DOMINANT_ROOTS = [0, 1, 3, 4, 6, 7, 9, 10]  # aka half-whole diminished scale

# Chord qualities
MAJOR_SIXTH_CHORD = [0, 4, 7, 9]
MAJOR_SIXTH_CHORD_FROM_THIRD = [0, 3, 5, 8]
MAJOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 9]
MAJOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 7, 10]  # aka minor seventh chord

MINOR_SIXTH_CHORD = [0, 3, 7, 9]
MINOR_SIXTH_CHORD_FROM_THIRD = [0, 4, 6, 9]
MINOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 8]
MINOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 6, 10]  # aka minor seventh flat five chord

DOMINANT_SEVENTH_CHORD = [0, 4, 7, 10]
DOMINANT_SEVENTH_CHORD_FROM_THIRD = [0, 3, 6, 8]
DOMINANT_SEVENTH_CHORD_FROM_FIFTH = [0, 3, 5, 9]
DOMINANT_SEVENTH_CHORD_FROM_SEVENTH = [0, 2, 6, 9]

DOMINANT_SEVENTH_FLAT_FIVE_CHORD = [0, 4, 6, 10]  # same as from flat fifth
DOMINANT_SEVENTH_FLAT_FIVE_CHORD_FROM_THIRD = [0, 2, 6, 8]  # same as from seventh

DIMINISHED_CHORD = [0, 3, 6, 9]

# Tetrachord display constants
TETRACHORD_X = 200          # X position of tetrachord center (centered in 400px window)
TETRACHORD_Y = 200          # Y position of tetrachord center (centered in 400px window)
TETRACHORD_RADIUS = 120     # Radius of tetrachord circle (larger for dedicated window)
NODE_RADIUS = 12            # Size of note nodes (larger like TetrachordTuner)
BIG_TICK_RADIUS = 5         # Size of major tick marks
SMALL_TICK_RADIUS = 2       # Size of minor tick marks
LABEL_DISTANCE = 18         # Distance from node edge to label (consistent spacing)

# Relative positioning constants (as ratios of radius)
LABEL_DISTANCE_RATIO = 1.2  # How far outside circle to place note labels
SMALL_TICK_RATIO = 0.95     # How close to center to place small ticks
TITLE_DISTANCE_RATIO = 1.4  # How far above circle to place title

# Math constants for faster calculations
PI_OVER_6 = pi/6
PI_OVER_3 = pi/3
PI_OVER_2 = pi/2
PI_TIMES_2 = 2*pi
# endregion Constants #########################################################


# region Classes ##############################################################
# Note letter names
NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

class Chord:
    def __init__(self, name, pitches):
        """Initialize a Chord with name and pitches.

        Args:
            name (str): The elemental name of the chord
            pitches (list): List of pitch values for the chord
        """
        self.name = name

        # Convert to pitch classes (0-11) then add tonal center offset
        self.pitches = [(x % 12) + (TONAL_CENTER_OFFSET % 12)
                       for x in pitches]

        # Type of 4 note chord
        self.quality = ""
        if name[-4:] in ["arth", "Wind", "Fire"]:
            self.quality = " dim7"
        if name[-5:] in ["Trunk", "Smoke", "Magma"]:
            self.quality = " min6"
        elif name[-5:] in ["ranch", "Ember", "Glass"]:
            self.quality = " maj6"
        elif name[-10:] in ["Sand-Storm", "Fire-Storm", "orest-Fire"]:
            self.quality = "7 b5"
        elif name[-4:] in ["Leaf", "lame", "coal"]:
            self.quality = "7"

        # Traditional music theory name for the chord
        self.traditional_name = (NOTE_NAMES_FLAT[self.pitches[0] % 12]
                                + self.quality)

        # Sort the pitches low to high
        self.pitches.sort()

        # Apply voicing transformations to get the actual note ordering
        voiced_pitches = []
        for i in range(len(self.pitches)):
            # Place the pitch class into the correct octave range
            adjusted_pitch = self.pitches[i] + (OCTAVE * OCTAVE_RANGE)

            # For the chosen voicing, raise the appropriate notes up an octave
            if i in VOICING_TO_INDICES.get(VOICING):
                if adjusted_pitch + OCTAVE <= 127:
                    adjusted_pitch += OCTAVE

            voiced_pitches.append(adjusted_pitch)

        # Sort the voiced pitches to get the correct display order
        voiced_pitches.sort()

        # String of chord spelling (note letter names) using voiced pitches
        self.spelling = (f"{NOTE_NAMES_FLAT[voiced_pitches[0] % 12]:<2}  "
                        f"{NOTE_NAMES_FLAT[voiced_pitches[1] % 12]:<2}  "
                        f"{NOTE_NAMES_FLAT[voiced_pitches[2] % 12]:<2}  "
                        f"{NOTE_NAMES_FLAT[voiced_pitches[3] % 12]:<2}")
# endregion Classes ###########################################################


# region Coordinates to Chords ################################################
# Map points on the display to chords.
# Everything is relative to C here, but TRANSPOSE_KEY_SEMITONES will allow for any tonal center.
# Also, theses will be reduced to pitch classes in Chord, but I wrote them as absolute pitches
# in case that is useful later
COORDINATES_TO_CHORD = {}

# Elemental Diminished Chords
COORDINATES_TO_CHORD[(109, 114)] = Chord("Earth", [C4, EF4, FS4, A4])
COORDINATES_TO_CHORD[(1054, 113)] = Chord("Wind", [DF4, E4, G4, BF4])
COORDINATES_TO_CHORD[(565, 640)] = Chord("Fire", [D4, F4, AF4, B4])

# Earth-Wind Combinations
# Trunk (min 6)
COORDINATES_TO_CHORD[(332, 73)] = Chord("Trunk", [C4, EF4, G4, A4])
COORDINATES_TO_CHORD[(285, 119)] = Chord("Brother Trunk", [EF4, GF4, BF4, C5])
COORDINATES_TO_CHORD[(336, 116)] = Chord("Twin Trunk", [GF4, A4, DF5, EF5])
COORDINATES_TO_CHORD[(380, 115)] = Chord("Sister Trunk", [A3, C4, E4, FS4])
# Branch (maj 6)
COORDINATES_TO_CHORD[(591, 30)] = Chord("Branch", [C4, E4, G4, A4])
COORDINATES_TO_CHORD[(530, 68)] = Chord("Brother Branch", [EF4, G4, BF4, C5])
COORDINATES_TO_CHORD[(586, 68)] = Chord("Twin Branch", [GF4, BF4, DF5, EF5])
COORDINATES_TO_CHORD[(639, 68)] = Chord("Sister Branch", [A3, CS4, E4, FS4])
# Sand-Storm (dom 7 b5) (default=twin and brother=sister)
COORDINATES_TO_CHORD[(593, 159)] = Chord("Sand-Storm", [C4, E4, GF4, BF4])
COORDINATES_TO_CHORD[(530, 203)] = Chord("Brother Sand-Storm", [EF4, G4, A4, DF5])
COORDINATES_TO_CHORD[(599, 204)] = Chord("Twin Sand-Storm", [GF4, BF4, C5, E5])
COORDINATES_TO_CHORD[(670, 204)] = Chord("Sister Sand-Storm", [A3, DF4, EF4, G4])
# Leaf (dom 7)
COORDINATES_TO_CHORD[(820, 81)] = Chord("Leaf", [C4, E4, G4, BF4])
COORDINATES_TO_CHORD[(790, 123)] = Chord("Brother Leaf", [EF4, G4, BF4, DF5])
COORDINATES_TO_CHORD[(832, 116)] = Chord("Twin Leaf", [GF4, BF4, DF5, E5])
COORDINATES_TO_CHORD[(871, 119)] = Chord("Sister Leaf", [A3, CS4, E4, G4])

# Wind-Fire Combinations
# Smoke (min 6)
COORDINATES_TO_CHORD[(1000, 223)] = Chord("Smoke", [G4, BF4, D5, E5])
COORDINATES_TO_CHORD[(942, 259)] = Chord("Brother Smoke", [BF4, DF5, F5, G5])
COORDINATES_TO_CHORD[(990, 259)] = Chord("Twin Smoke", [DF5, E5, AF5, BF5])
COORDINATES_TO_CHORD[(1037, 267)] = Chord("Sister Smoke", [E4, G4, B4, CS5])
# Ember (maj 6)
COORDINATES_TO_CHORD[(1115, 342)] = Chord("Ember", [G4, B4, D5, E5])
COORDINATES_TO_CHORD[(1047, 384)] = Chord("Brother Ember", [BF4, D5, F5, G5])
COORDINATES_TO_CHORD[(1103, 380)] = Chord("Twin Ember", [DF5, F5, AF5, BF5])
COORDINATES_TO_CHORD[(1154, 383)] = Chord("Sister Ember", [E4, GS4, B4, CS5])
# Fire-Storm (dom 7 b5)
COORDINATES_TO_CHORD[(752, 320)] = Chord("Fire-Storm", [G4, B4, DF5, F5])
COORDINATES_TO_CHORD[(673, 368)] = Chord("Brother Fire-Storm", [BF4, D5, E5, AF5])
COORDINATES_TO_CHORD[(756, 361)] = Chord("Twin Fire-Storm", [DF5, F5, G5, B5])
COORDINATES_TO_CHORD[(823, 363)] = Chord("Sister Fire-Storm", [E4, AF4, BF4, D5])
# Flame (dom 7)
COORDINATES_TO_CHORD[(816, 531)] = Chord("Flame", [G4, B4, D5, F5])
COORDINATES_TO_CHORD[(747, 572)] = Chord("Brother Flame", [BF4, D5, F5, AF5])
COORDINATES_TO_CHORD[(810, 570)] = Chord("Twin Flame", [DF5, F5, AF5, B5])
COORDINATES_TO_CHORD[(873, 573)] = Chord("Sister Flame", [E4, GS4, B4, D5])

# Fire-Earth Combinations
# Magma (min 6)
COORDINATES_TO_CHORD[(340, 497)] = Chord("Magma", [D4, F4, A4, B5])
COORDINATES_TO_CHORD[(280, 544)] = Chord("Brother Magma", [F4, AF4, C5, D5])
COORDINATES_TO_CHORD[(341, 543)] = Chord("Twin Magma", [AF4, CF5, EF5, F5])
COORDINATES_TO_CHORD[(393, 541)] = Chord("Sister Magma", [B3, D4, FS4, GS4])
# Glass (maj 6)
COORDINATES_TO_CHORD[(83, 337)] = Chord("Glass", [F4, A4, C5, D5])
COORDINATES_TO_CHORD[(33, 384)] = Chord("Brother Glass", [AF4, C4, EF5, F5])
COORDINATES_TO_CHORD[(86, 380)] = Chord("Twin Glass", [B4, DS5, FS5, GS5])
COORDINATES_TO_CHORD[(131, 378)] = Chord("Sister Glass", [D4, FS4, A4, B5])
# Forest-Fire (dom 7 b5)
COORDINATES_TO_CHORD[(470, 311)] = Chord("Forest-Fire", [F4, A4, CF5, EF5])
COORDINATES_TO_CHORD[(417, 355)] = Chord("Brother Forest-Fire", [AF4, C5, D5, GF5])
COORDINATES_TO_CHORD[(472, 351)] = Chord("Twin Forest-Fire", [CF5, EF5, F5, A5])
COORDINATES_TO_CHORD[(526, 349)] = Chord("Sister Forest-Fire", [D4, GF4, AF4, C5])
# Charcoal (dom 7)
COORDINATES_TO_CHORD[(235, 235)] = Chord("Charcoal", [F4, A4, C5, EF5])
COORDINATES_TO_CHORD[(173, 274)] = Chord("Brother Charcoal", [AF4, C4, EF5, GF5])
COORDINATES_TO_CHORD[(231, 272)] = Chord("Twin Charcoal", [B4, DS5, FS5, A5])
COORDINATES_TO_CHORD[(289, 274)] = Chord("Sister Charcoal", [D4, FS4, A4, C5])
# endregion Coordinates to Chords #############################################


# region Tetrachord Functions #################################################
def get_position_on_tetrachord_circle(angle):
    """Returns x,y coordinates on the tetrachord circle for a given angle.

    Args:
        angle (float): Angle in radians (0 = 12 o'clock, increases clockwise)

    Returns:
        tuple: (x, y) coordinates on the circle
    """
    # Adjust angle so 0 is at 12 o'clock and increases clockwise
    # In standard coordinates: 0° = 3 o'clock, -90° = 12 o'clock
    adjusted_angle = angle - PI_OVER_2

    # Calculate coordinates relative to center
    new_x = TETRACHORD_RADIUS * cos(adjusted_angle) + TETRACHORD_X
    new_y = TETRACHORD_RADIUS * sin(adjusted_angle) + TETRACHORD_Y

    return (int(new_x), int(new_y))

def pitch_to_angle(pitch):
    """Convert MIDI pitch to angle on the circle.

    Args:
        pitch (int): MIDI pitch value

    Returns:
        float: Angle in radians (0-2π)
    """
    # Get pitch class (0-11)
    pitch_class = pitch % 12

    # Convert to angle (12 semitones = 2π radians)
    angle = (pitch_class / 12.0) * PI_TIMES_2

    return angle

def create_tetrachord_color_gradient():
    """Create a 24-color gradient for the tetrachord display.

    Returns:
        list: List of Color objects
    """
    # Define base colors
    green = Color(42, 230, 67)
    blue = Color.BLUE
    red = Color.RED
    gold = Color(255, 208, 51)

    # Create gradient (24 colors total)
    gradient = (colorGradient(green, blue, 6) +
                colorGradient(blue, red, 6) +
                colorGradient(red, gold, 6) +
                colorGradient(gold, green, 6))

    return gradient
# endregion Tetrachord Functions ##############################################


# region GUI Setup ############################################################
# Create main display with diagram image
display = Display("Movemental", 1200, 720)
diagram = Icon("./images/diagram.jpg", 1200, 720)
display.add(diagram)

# Create a circle that marks the active chord
selected_chord_dot = Circle(0, 0, 8, Color.BLUE, fill=True)
display.add(selected_chord_dot)

# Create separate display for tetrachord visualization
tetrachord_display = Display("Tetrachord View", 400, 400, 1500, 500, Color.BLACK)

# Initialize tetrachord display
def create_tetrachord_display():
    """Create the tetrachord visualization display."""
    global tetrachord_display, tetrachord_color_gradient
    global tetrachord_path, tetrachord_nodes, tetrachord_lines

    # Create color gradient
    tetrachord_color_gradient = create_tetrachord_color_gradient()

    # Create the circular path
    tetrachord_path = Circle(TETRACHORD_X, TETRACHORD_Y, TETRACHORD_RADIUS,
                           Color(179, 177, 179), False, 2)
    tetrachord_display.add(tetrachord_path)

    # Calculate tick mark coordinates
    big_tick_coords = []
    small_tick_coords = []
    for i in range(12):  # 12 semitones
        angle = (i / 12.0) * PI_TIMES_2
        # Big ticks on the circle
        x, y = get_position_on_tetrachord_circle(angle)
        big_tick_coords.append((x, y))

        # Small ticks between big ticks (offset by half a semitone)
        # Position them slightly closer to center for visual hierarchy
        small_angle = ((i + 0.5) / 12.0) * PI_TIMES_2
        small_adjusted_angle = small_angle - PI_OVER_2
        small_x = int((TETRACHORD_RADIUS * SMALL_TICK_RATIO) * cos(small_adjusted_angle) + TETRACHORD_X)
        small_y = int((TETRACHORD_RADIUS * SMALL_TICK_RATIO) * sin(small_adjusted_angle) + TETRACHORD_Y)
        small_tick_coords.append((small_x, small_y))

    # Draw background lines connecting all big ticks (like TetrachordTuner)
    trans_gray = Color(179, 177, 179, 50)  # Transparent gray
    for i, (x1, y1) in enumerate(big_tick_coords):
        for j, (x2, y2) in enumerate(big_tick_coords):
            if i != j:  # Don't draw line to itself
                tetrachord_display.drawLine(x1, y1, x2, y2, trans_gray, 1)

    # Create tick marks around the circle
    # Note positions: i=0 is C at 12 o'clock, increasing clockwise
    for i in range(12):  # 12 semitones
        angle = (i / 12.0) * PI_TIMES_2  # 0 to 2π radians
        x, y = get_position_on_tetrachord_circle(angle)

        # Major tick marks (every semitone)
        color = tetrachord_color_gradient[i * 2]  # Use every other color
        tick = Circle(x, y, BIG_TICK_RADIUS, color, True)
        tetrachord_display.add(tick)

        # Add note names positioned outside the circle
        note_name = NOTE_NAMES_FLAT[i]

        # Position labels at a consistent distance outside the circle
        label_radius = TETRACHORD_RADIUS + 25  # Fixed distance outside circle
        label_angle = angle - PI_OVER_2  # Convert to standard coordinate system

        # Calculate position
        label_x = int(TETRACHORD_X + label_radius * cos(label_angle))
        label_y = int(TETRACHORD_Y + label_radius * sin(label_angle))

        # Center the text properly around the circle
        # Fine-tuned based on actual screenshot measurements
        text_width = 6 if len(note_name) == 1 else 10  # Adjusted for better centering
        text_height = 8  # Adjusted font height

        centered_x = label_x - text_width // 2
        centered_y = label_y - text_height // 2

        tetrachord_display.drawText(note_name, centered_x, centered_y, Color.WHITE)

    # Add small tick marks between major ticks
    for i in range(12):
        x, y = small_tick_coords[i]
        color = tetrachord_color_gradient[i * 2 + 1]  # Use alternate colors
        small_tick = Circle(x, y, SMALL_TICK_RADIUS, color, True)
        tetrachord_display.add(small_tick)

    # Initialize four nodes (will be positioned when chords are played)
    tetrachord_nodes = []
    for i in range(4):
        # Create node
        node = Circle(TETRACHORD_X, TETRACHORD_Y, NODE_RADIUS, Color.WHITE, True)
        tetrachord_display.add(node)
        tetrachord_nodes.append(node)

    # No center labels - only the clock face labels around the circle

    # Initialize connecting lines (6 lines needed to connect all pairs of 4 nodes)
    tetrachord_lines = []
    for i in range(6):  # 6 lines needed to connect all pairs of 4 nodes
        line = Line(TETRACHORD_X, TETRACHORD_Y, TETRACHORD_X, TETRACHORD_Y, Color.WHITE, 2)
        tetrachord_display.add(line)
        tetrachord_lines.append(line)

# Global variables for tetrachord display
tetrachord_color_gradient = None
tetrachord_path = None
tetrachord_nodes = []
tetrachord_lines = []

# Create the tetrachord display
create_tetrachord_display()
# endregion GUI Setup #########################################################


# region Functions ############################################################
def distance(point1, point2):
    """Calculate the euclidean distance between two points.

    Args:
        point1 (tuple): First point as (x, y) coordinates
        point2 (tuple): Second point as (x, y) coordinates

    Returns:
        float: The euclidean distance between the points
    """
    return hypot(point2[0] - point1[0], point2[1] - point1[1])

def find_closest_point(here, points):
    """Find the closest point among all points to the given location.

    Args:
        here (tuple): The reference point as (x, y) coordinates
        points (list): List of points to search through

    Returns:
        tuple: The closest point as (x, y) coordinates
    """
    # Keep track of the closest distance and point so far
    closest_distance_so_far = 1000000
    closest_point_so_far = None

    # Iterate through all points looking for closest one
    for point in points:
        this_distance = distance(here, point)  # calculate distance
        if this_distance < closest_distance_so_far:  # is this closer?
            # Yes, so update
            closest_distance_so_far = this_distance
            closest_point_so_far = point
    # Now, closest_point_so_far contains the closest point overall.
    closest_point = closest_point_so_far

    return closest_point

def play_chord(pitches):
    """Play the provided list of pitches as a chord.

    Args:
        pitches (list): List of pitch values to play as a chord
    """
    # Stop any sounding notes
    Play.allNotesOff()

    adjusted_pitches = []
    # Place notes in the correct octave range based on the chosen voicing
    for i in range(len(pitches)):
        # Place the pitch class into the correct octave range
        adjusted_pitch = pitches[i] + (OCTAVE * OCTAVE_RANGE)

        # For the chosen voicing, raise the appropriate notes up an octave
        if i in VOICING_TO_INDICES.get(VOICING):
            if adjusted_pitch + OCTAVE <= 120:
                adjusted_pitch += OCTAVE

        # Add correctly placed pitch
        adjusted_pitches.append(adjusted_pitch)
        # Play.note(adjusted_pitch, 0, 1000, 120)

    # Create the chord
    phrase = Phrase()
    phrase.addChord(adjusted_pitches, CHORD_DURATION, 127)

    # Play the chord!
    Play.midi(phrase)

    # Update tetrachord display with the chord pitches
    update_tetrachord_display(adjusted_pitches)

def select_chord_visually(x, y):
    """Create and place a circle at the coordinates.

    Args:
        x (int): X coordinate for the visual indicator
        y (int): Y coordinate for the visual indicator
    """
    global display, selected_chord_dot

    display.move(selected_chord_dot, x, y)

def update_tetrachord_display(pitches):
    """Update the tetrachord display with the four notes of a chord.

    Args:
        pitches (list): List of four MIDI pitch values
    """
    global tetrachord_nodes, tetrachord_lines, tetrachord_color_gradient

    # Sort pitches to ensure consistent ordering
    sorted_pitches = sorted(pitches)

    # Calculate positions and colors for each note
    positions = []
    colors = []
    for i, pitch in enumerate(sorted_pitches):
        angle = pitch_to_angle(pitch)
        x, y = get_position_on_tetrachord_circle(angle)
        positions.append((x, y))

        # Get color based on pitch class
        pitch_class = pitch % 12
        color_index = int((pitch_class / 12.0) * 24) % 24
        colors.append(tetrachord_color_gradient[color_index])

    # Update node positions and colors
    for i in range(4):
        if i < len(positions):
            x, y = positions[i]
            tetrachord_nodes[i].setColor(colors[i])
            tetrachord_display.move(tetrachord_nodes[i], x, y)
        else:
            # Hide unused nodes
            tetrachord_display.move(tetrachord_nodes[i], TETRACHORD_X, TETRACHORD_Y)

    # Update connecting lines to connect all nodes to each other
    if len(positions) >= 4:
        # Connect every node to every other node (complete graph)
        line_connections = [(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)]

        for i, (start_idx, end_idx) in enumerate(line_connections):
            start_x, start_y = positions[start_idx]
            end_x, end_y = positions[end_idx]

            # Remove old line and add new one
            tetrachord_display.remove(tetrachord_lines[i])
            tetrachord_lines[i] = Line(start_x, start_y, end_x, end_y, Color.WHITE, 2)
            tetrachord_display.add(tetrachord_lines[i])
    else:
        # Hide lines if not enough notes
        for line in tetrachord_lines:
            tetrachord_display.remove(line)

first_time = True
# make a bar of dashes with | in the same places as header
TABLE_SEPARATOR = "|" + "-"*22 + "|" + "-"*22 + "|" + "-"*22 + "|"

def select_chord(x, y):
    """Find the closest chord and play it.

    Args:
        x (int): X coordinate of the click
        y (int): Y coordinate of the click
    """
    global first_time, TABLE_SEPERATOR

    if first_time:
        first_time = False
        voicing_header = VOICING + " Voicing"
        header = (f"| {'Elemental Name':^20} | {'Traditional Name':^20} | "
                f"{voicing_header:^20} |")
        print("\n" + header)

        print(TABLE_SEPARATOR)

    # Find the closest point
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())

    # Get chord info
    chord = COORDINATES_TO_CHORD[point]

    # Play the chord (this will also update the tetrachord display)
    play_chord(chord.pitches)

    # Place a dot on the selection
    select_chord_visually(point[0], point[1])

    print(f"| {chord.name:^20} | {chord.traditional_name:^20} | "
          f"{chord.spelling:^20} |")
    print(TABLE_SEPARATOR)

    # # Construct note names
    # if isFlat(chord_root):  # if chord name is flat, use flat note names
    #     chord_notes = [NOTE_NAMES_FLAT[x] for x in chord_pitches]   # put names in a list
    # else:  # otherwise, use sharp names
    #     chord_notes = [NOTE_NAMES_SHARP[x] for x in chord_pitches]  # put names in a list

    # # Join names into a string, and print them
    # print(f"- [{', '.join(chord_notes)}]")

def select_family(x, y):
    """Find the closest transformation and perform it.

    Args:
        x (int): X coordinate of the click
        y (int): Y coordinate of the click
    """
    # Select transformation type
    chord = COORDINATES_TO_FAMILY[(x, y)]

    # Play next chord
    select_chord(x, y)

def choose_action(x, y):
    """Handle mouse click actions.

    TODO: only need this if I add a different click function

    Args:
        x (int): X coordinate of the click
        y (int): Y coordinate of the click
    """
    # Snap clicked coordinates to known centers
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())
    new_x, new_y = point

    # Test if key holds type is a chord
    if isinstance(COORDINATES_TO_CHORD[point], Chord):  # test if value is a Chord
        # If a chord, call play chord function
        select_chord(new_x, new_y)

    # # If not a chord, its a change in family
    # else:
    #     # Play that transformation
    #     select_family(new_x, new_y)
# endregion Functions #########################################################


# region Main #################################################################
def main():
    # Register callback for playing chords by clicking the mouse
    display.onMouseClick(choose_action)

    # # Show mouse coordinates for testing
    # display.showMouseCoordinates()

    # CLI Info
    tonal_center = NOTE_NAMES_FLAT[TONAL_CENTER_OFFSET % 12]
    relative_minor = NOTE_NAMES_FLAT[(TONAL_CENTER_OFFSET - 3) % 12]


    # Print ASCII art
    ascii_art  = ("""\
  __  __    U  ___ u__     __ U _____ u  __  __  U _____ u _   _     _____      _       _
U|' \\/ '|u   \\/"_ \\/\\ \\   /"/u\\| ___"|/U|' \\/ '|u\\| ___"|/| \\ |"|   |_ " _| U  /"\\  u  |"|
\\| |\\/| |/   | | | | \\ \\ / //  |  _|"  \\| |\\/| |/ |  _|" <|  \\| |>    | |    \\/ _ \\/ U | | u
 | |  | |.-,_| |_| | /\\ V /_,-.| |___   | |  | |  | |___ U| |\\  |u   /| |\\   / ___ \\  \\| |/__
 |_|  |_| \\_)-\\___/ U  \\_/-(_/ |_____|  |_|  |_|  |_____| |_| \\_|   u |_|U  /_/   \\_\\  |_____|
<<,-,,-.       \\\\     //       <<   >> <<,-,,-.   <<   >> ||   \\\\,-._// \\\\_  \\\\    >>  //  \\\\
 (./  \\.)     (__)   (__)     (__) (__) (./  \\.) (__) (__)(_")  (_/(__) (__)(__)  (__)(_")("_)

        """)
    print(ascii_art)


    print("REMEMBER!")
    print(f"- {tonal_center} maj6 is the same as {relative_minor} min7, and "
          f"{tonal_center} min6 is the same as {relative_minor} min7 b5")
    print("- Each \"child\" chord (in between Earth, Wind, and Fire) contains "
          "DNA from two parents (Earth, Wind, Fire).")
    print("  That is why each child chord has three siblings (who share the "
          "same ratio of DNA from each parent).")
    print("- Any chord may be combined with the element (Earth, Wind, or Fire) "
          "opposite from it.")
    print("  This creates an 8-note \"scale of chords\" which alternates "
          "between resolution and tension.")
    print("  Ex. C maj6 + D dim7 (Branch + Fire) = C maj6 diminished scale")
    print("- When playing a chord, \"borrowing\" some notes from the opposite "
          "element (not one of the parents) can produce beautiful results.")
    print("  Ex: C maj7, C maj7 #5... Following the thread, maybe these are "
          "grandchildren?")
    print("- These concepts were pioneered by Dr. Barry Harris, so...")
    print("  In his memory, let's play beautiful movements, not static chords, "
          "and remember to play with our family!!!\n")

if __name__ == "__main__":
    main()
# endregion Main ##############################################################
