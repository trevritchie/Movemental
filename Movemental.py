###############################################################################
# Movemental.py
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
COORDINATES_TO_FAMILY[(0.636, 0.787)] = 0
# Sister
COORDINATES_TO_FAMILY[(0.563, 0.904)] = -MINOR_THIRD
# Cousin
COORDINATES_TO_FAMILY[(0.563, 0.904)] = TRITONE
# Brother
COORDINATES_TO_FAMILY[(0.698, 0.899)] = MINOR_THIRD

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
COORDINATES_TO_CHORD[(0.091, 0.158)] = Chord("Earth", [C4, EF4, FS4, A4])
COORDINATES_TO_CHORD[(0.878, 0.157)] = Chord("Wind", [DF4, E4, G4, BF4])
COORDINATES_TO_CHORD[(0.471, 0.889)] = Chord("Fire", [D4, F4, AF4, B4])

# Earth-Wind Combinations
# Trunk (min 6)
COORDINATES_TO_CHORD[(0.277, 0.101)] = Chord("Trunk", [C4, EF4, G4, A4])
COORDINATES_TO_CHORD[(0.238, 0.165)] = Chord("Brother Trunk", [EF4, GF4, BF4, C5])
COORDINATES_TO_CHORD[(0.280, 0.161)] = Chord("Twin Trunk", [GF4, A4, DF5, EF5])
COORDINATES_TO_CHORD[(0.317, 0.160)] = Chord("Sister Trunk", [A3, C4, E4, FS4])
# Branch (maj 6)
COORDINATES_TO_CHORD[(0.493, 0.042)] = Chord("Branch", [C4, E4, G4, A4])
COORDINATES_TO_CHORD[(0.442, 0.094)] = Chord("Brother Branch", [EF4, G4, BF4, C5])
COORDINATES_TO_CHORD[(0.488, 0.094)] = Chord("Twin Branch", [GF4, BF4, DF5, EF5])
COORDINATES_TO_CHORD[(0.533, 0.094)] = Chord("Sister Branch", [A3, CS4, E4, FS4])
# Sand-Storm (dom 7 b5) (default=twin and brother=sister)
COORDINATES_TO_CHORD[(0.494, 0.221)] = Chord("Sand-Storm", [C4, E4, GF4, BF4])
COORDINATES_TO_CHORD[(0.442, 0.282)] = Chord("Brother Sand-Storm", [EF4, G4, A4, DF5])
COORDINATES_TO_CHORD[(0.499, 0.283)] = Chord("Twin Sand-Storm", [GF4, BF4, C5, E5])
COORDINATES_TO_CHORD[(0.558, 0.283)] = Chord("Sister Sand-Storm", [A3, DF4, EF4, G4])
# Leaf (dom 7)
COORDINATES_TO_CHORD[(0.683, 0.113)] = Chord("Leaf", [C4, E4, G4, BF4])
COORDINATES_TO_CHORD[(0.658, 0.171)] = Chord("Brother Leaf", [EF4, G4, BF4, DF5])
COORDINATES_TO_CHORD[(0.693, 0.161)] = Chord("Twin Leaf", [GF4, BF4, DF5, E5])
COORDINATES_TO_CHORD[(0.726, 0.165)] = Chord("Sister Leaf", [A3, CS4, E4, G4])

# Wind-Fire Combinations
# Smoke (min 6)
COORDINATES_TO_CHORD[(0.833, 0.310)] = Chord("Smoke", [G4, BF4, D5, E5])
COORDINATES_TO_CHORD[(0.785, 0.360)] = Chord("Brother Smoke", [BF4, DF5, F5, G5])
COORDINATES_TO_CHORD[(0.825, 0.360)] = Chord("Twin Smoke", [DF5, E5, AF5, BF5])
COORDINATES_TO_CHORD[(0.864, 0.371)] = Chord("Sister Smoke", [E4, G4, B4, CS5])
# Ember (maj 6)
COORDINATES_TO_CHORD[(0.929, 0.475)] = Chord("Ember", [G4, B4, D5, E5])
COORDINATES_TO_CHORD[(0.873, 0.533)] = Chord("Brother Ember", [BF4, D5, F5, G5])
COORDINATES_TO_CHORD[(0.919, 0.528)] = Chord("Twin Ember", [DF5, F5, AF5, BF5])
COORDINATES_TO_CHORD[(0.962, 0.532)] = Chord("Sister Ember", [E4, GS4, B4, CS5])
# Fire-Storm (dom 7 b5)
COORDINATES_TO_CHORD[(0.627, 0.444)] = Chord("Fire-Storm", [G4, B4, DF5, F5])
COORDINATES_TO_CHORD[(0.561, 0.511)] = Chord("Brother Fire-Storm", [BF4, D5, E5, AF5])
COORDINATES_TO_CHORD[(0.630, 0.501)] = Chord("Twin Fire-Storm", [DF5, F5, G5, B5])
COORDINATES_TO_CHORD[(0.686, 0.504)] = Chord("Sister Fire-Storm", [E4, AF4, BF4, D5])
# Flame (dom 7)
COORDINATES_TO_CHORD[(0.680, 0.738)] = Chord("Flame", [G4, B4, D5, F5])
COORDINATES_TO_CHORD[(0.623, 0.794)] = Chord("Brother Flame", [BF4, D5, F5, AF5])
COORDINATES_TO_CHORD[(0.675, 0.792)] = Chord("Twin Flame", [DF5, F5, AF5, B5])
COORDINATES_TO_CHORD[(0.728, 0.796)] = Chord("Sister Flame", [E4, GS4, B4, D5])

# Fire-Earth Combinations
# Magma (min 6)
COORDINATES_TO_CHORD[(0.283, 0.690)] = Chord("Magma", [D4, F4, A4, B5])
COORDINATES_TO_CHORD[(0.233, 0.756)] = Chord("Brother Magma", [F4, AF4, C5, D5])
COORDINATES_TO_CHORD[(0.284, 0.754)] = Chord("Twin Magma", [AF4, CF5, EF5, F5])
COORDINATES_TO_CHORD[(0.328, 0.751)] = Chord("Sister Magma", [B3, D4, FS4, GS4])
# Glass (maj 6)
COORDINATES_TO_CHORD[(0.069, 0.468)] = Chord("Glass", [F4, A4, C5, D5])
COORDINATES_TO_CHORD[(0.028, 0.533)] = Chord("Brother Glass", [AF4, C4, EF5, F5])
COORDINATES_TO_CHORD[(0.072, 0.528)] = Chord("Twin Glass", [B4, DS5, FS5, GS5])
COORDINATES_TO_CHORD[(0.109, 0.525)] = Chord("Sister Glass", [D4, FS4, A4, B5])
# Forest-Fire (dom 7 b5)
COORDINATES_TO_CHORD[(0.392, 0.432)] = Chord("Forest-Fire", [F4, A4, CF5, EF5])
COORDINATES_TO_CHORD[(0.348, 0.493)] = Chord("Brother Forest-Fire", [AF4, C5, D5, GF5])
COORDINATES_TO_CHORD[(0.393, 0.487)] = Chord("Twin Forest-Fire", [CF5, EF5, F5, A5])
COORDINATES_TO_CHORD[(0.438, 0.485)] = Chord("Sister Forest-Fire", [D4, GF4, AF4, C5])
# Charcoal (dom 7)
COORDINATES_TO_CHORD[(0.196, 0.326)] = Chord("Charcoal", [F4, A4, C5, EF5])
COORDINATES_TO_CHORD[(0.144, 0.381)] = Chord("Brother Charcoal", [AF4, C4, EF5, GF5])
COORDINATES_TO_CHORD[(0.193, 0.378)] = Chord("Twin Charcoal", [B4, DS5, FS5, A5])
COORDINATES_TO_CHORD[(0.241, 0.381)] = Chord("Sister Charcoal", [D4, FS4, A4, C5])
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

    # Adjust so tonal center appears at 12 o'clock
    tonal_center = TONAL_CENTER_OFFSET % 12
    adjusted_pitch_class = (pitch_class - tonal_center) % 12

    # Convert to angle (12 semitones = 2π radians)
    angle = (adjusted_pitch_class / 12.0) * PI_TIMES_2

    return angle

def create_tetrachord_color_gradient():
    """Create a 24-color array for the tetrachord display.

    Uses a repeating pattern of elemental colors around the clock face:
    - Brown, Light Blue, Red, Brown, Light Blue, Red, etc.

    Returns:
        list: List of Color objects
    """
    # Define the three elemental colors
    brown = Color(139, 90, 60)        # Rich brown - like fertile soil
    light_blue = Color(135, 206, 235) # Light blue - like clear sky
    red = Color(220, 50, 50)          # Deep red - like burning embers

    # Create 24 colors with repeating pattern: Brown, Light Blue, Red
    gradient = []

    for i in range(24):
        if i % 3 == 0:      # Positions 0, 3, 6, 9, 12, 15, 18, 21
            gradient.append(brown)
        elif i % 3 == 1:    # Positions 1, 4, 7, 10, 13, 16, 19, 22
            gradient.append(red)
        else:               # Positions 2, 5, 8, 11, 14, 17, 20, 23
            gradient.append(light_blue)

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
tetrachord_display = Display("Tetrachord View", 400, 400, 1000, 500, Color.BLACK)

# Initialize tetrachord display
def create_tetrachord_display():
    """Create the tetrachord visualization display."""
    global tetrachord_display, tetrachord_color_gradient
    global tetrachord_path, tetrachord_nodes, tetrachord_lines, note_labels

    # Create color gradient
    tetrachord_color_gradient = create_tetrachord_color_gradient()

    # Create the circular path
    tetrachord_path = Circle(TETRACHORD_X, TETRACHORD_Y, TETRACHORD_RADIUS,
                           Color(120, 120, 130), False, 2)  # Sophisticated dark gray
    tetrachord_display.add(tetrachord_path)

    # Calculate tick mark coordinates
    big_tick_coords = []
    for i in range(12):  # 12 semitones
        angle = (i / 12.0) * PI_TIMES_2
        # Big ticks on the circle
        x, y = get_position_on_tetrachord_circle(angle)
        big_tick_coords.append((x, y))

    # Draw background lines connecting all big ticks (like TetrachordTuner)
    trans_gray = Color(180, 180, 190, 80)  # More visible light gray
    for i, (x1, y1) in enumerate(big_tick_coords):
        for j, (x2, y2) in enumerate(big_tick_coords):
            if i != j:  # Don't draw line to itself
                tetrachord_display.drawLine(x1, y1, x2, y2, trans_gray, 1)

    # Create tick marks around the circle
    # Note positions: tonal center at 12 o'clock, increasing clockwise
    tonal_center = TONAL_CENTER_OFFSET % 12
    for i in range(12):  # 12 semitones
        angle = (i / 12.0) * PI_TIMES_2  # 0 to 2π radians
        x, y = get_position_on_tetrachord_circle(angle)

        # Major tick marks (every semitone)
        color = tetrachord_color_gradient[i * 2]  # Use every other color
        tick = Circle(x, y, BIG_TICK_RADIUS, color, True)
        tetrachord_display.add(tick)

        # Add note names positioned outside the circle
        # Adjust note index so tonal center appears at 12 o'clock
        note_index = (i + tonal_center) % 12
        note_name = NOTE_NAMES_FLAT[note_index]

        # Position labels at a consistent distance outside the circle
        label_radius = TETRACHORD_RADIUS + 25  # Fixed distance outside circle
        label_angle = angle - PI_OVER_2  # Convert to standard coordinate system

        # Calculate position for label center
        label_x = int(TETRACHORD_X + label_radius * cos(label_angle))
        label_y = int(TETRACHORD_Y + label_radius * sin(label_angle))

        # Adjust y position based on vertical position to compensate for text bottom-alignment
        # Labels at the top need to be pushed further away, labels at bottom pulled closer
        y_adjustment = int(sin(label_angle) * 3)  # Ranges from -3 to +3
        adjusted_label_y = label_y - 7 + y_adjustment

        # Create a properly centered label
        note_label = Label(note_name, CENTER, Color.WHITE)
        tetrachord_display.add(note_label, label_x - 10, adjusted_label_y - 5)
        note_labels.append(note_label)


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

    # Add chord information display at the top
    global chord_info_text
    chord_info_text = {
        'elemental': None,
        'traditional': None
    }

    # Labels and values will be updated in update_chord_info_display()

# Global variables for tetrachord display
tetrachord_color_gradient = None
tetrachord_path = None
tetrachord_nodes = []
tetrachord_lines = []
chord_info_text = None
note_labels = []

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
        points (list): List of points to search through (relative coordinates)

    Returns:
        tuple: The closest point as (x, y) coordinates (relative)
    """
    # Get display dimensions
    display_width = display.getWidth()
    display_height = display.getHeight()

    # Convert relative coordinates to absolute for comparison
    here_abs = here  # here is already in absolute coordinates

    # Keep track of the closest distance and point so far
    closest_distance_so_far = 1000000
    closest_point_so_far = None

    # Iterate through all points looking for closest one
    for point in points:
        # Convert relative point to absolute coordinates
        point_abs = (point[0] * display_width, point[1] * display_height)

        this_distance = distance(here_abs, point_abs)  # calculate distance
        if this_distance < closest_distance_so_far:  # is this closer?
            # Yes, so update
            closest_distance_so_far = this_distance
            closest_point_so_far = point  # Keep the relative coordinates
    # Now, closest_point_so_far contains the closest point overall.
    closest_point = closest_point_so_far

    return closest_point

def play_chord(chord):
    """Play the provided chord.

    Args:
        chord (Chord): The chord object to play
    """
    # Stop any sounding notes
    Play.allNotesOff()

    adjusted_pitches = []
    # Place notes in the correct octave range based on the chosen voicing
    for i in range(len(chord.pitches)):
        # Place the pitch class into the correct octave range
        adjusted_pitch = chord.pitches[i] + (OCTAVE * OCTAVE_RANGE)

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

    # Update tetrachord display with the chord pitches and info
    update_tetrachord_display(adjusted_pitches)
    update_chord_info_display(chord)

def select_chord_visually(x, y):
    """Create and place a circle at the coordinates.

    Args:
        x (float): X coordinate for the visual indicator (relative 0-1)
        y (float): Y coordinate for the visual indicator (relative 0-1)
    """
    global display, selected_chord_dot

    # Convert relative coordinates to absolute
    display_width = display.getWidth()
    display_height = display.getHeight()
    abs_x = int(x * display_width)
    abs_y = int(y * display_height)

    display.move(selected_chord_dot, abs_x, abs_y)

def update_chord_info_display(chord):
    """Update the chord information text at the top of the tetrachord display.

    Args:
        chord (Chord): The chord object containing name and info
    """
    global chord_info_text, tetrachord_display

    # Remove old labels if they exist
    if chord_info_text['elemental']:
        tetrachord_display.remove(chord_info_text['elemental'])
    if chord_info_text['traditional']:
        tetrachord_display.remove(chord_info_text['traditional'])

    # Add chord information vertically - elemental at top, traditional at bottom
    # Dynamically center based on string length and position equidistant from circle

    # Font sizes - consistent for both labels
    elemental_font_size = 16
    traditional_font_size = 16

    # Center horizontally in the 400px window
    horizontal_center = 200

    # Calculate vertical positions with more generous spacing from circle
    # Circle center is at y=200, with radius=120, so circle spans y=80 to y=320
    circle_top = TETRACHORD_Y - TETRACHORD_RADIUS    # 200 - 120 = 80
    circle_bottom = TETRACHORD_Y + TETRACHORD_RADIUS # 200 + 120 = 320

    label_distance = 50  # Increased distance from circle edge to text (was 35)
    font_height = 20     # More generous font height estimate

    # Top label: position so text appears 'label_distance' above circle
    # Since text aligns to bottom of label, we need to account for font height
    top_y = circle_top - label_distance - font_height

    # Bottom label: position so text appears 'label_distance' below circle
    # Text aligns to bottom of label, so this is simpler
    bottom_y = circle_bottom + label_distance

    # Calculate precise centering for any text length
    def get_precise_label_position(text, font_size, window_center):
        """Calculate the exact x position to center a label in the window."""
        # Fine-tuned character width estimation based on actual screenshots
        char_width = 8.4   # Based on text width calculator measurements for font size 16

        # Estimate text width
        estimated_text_width = len(text) * char_width

        # Calculate label position to center the text in the window
        # Label should start at: window_center - (text_width / 2)
        label_x = int(window_center - (estimated_text_width / 2) - 12)  # -5 shifts left by 5 pixels

        return label_x

    # Elemental name (top center, perfectly centered for any length)
    elemental_label = Label(chord.name, CENTER, Color.WHITE)
    elemental_label.setFont(Font("Arial", Font.BOLD, elemental_font_size))
    chord_info_text['elemental'] = elemental_label

    # Calculate precise position for perfect centering
    elemental_x = get_precise_label_position(chord.name, elemental_font_size, horizontal_center)
    tetrachord_display.add(elemental_label, elemental_x, top_y)

    # Traditional name (bottom center, perfectly centered for any length)
    traditional_label = Label(chord.traditional_name, CENTER, Color.WHITE)
    traditional_label.setFont(Font("Arial", Font.BOLD, traditional_font_size))
    chord_info_text['traditional'] = traditional_label

    # Calculate precise position for perfect centering
    traditional_x = get_precise_label_position(chord.traditional_name, traditional_font_size, horizontal_center)
    tetrachord_display.add(traditional_label, traditional_x, bottom_y - 5)

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

        # Get color based on visual position on circle (not pitch class)
        # This ensures red is always at bottom, etc.
        color_index = int((angle / PI_TIMES_2) * 24) % 24
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
        x (int): X coordinate of the click (absolute)
        y (int): Y coordinate of the click (absolute)
    """
    global first_time, TABLE_SEPERATOR

    if first_time:
        first_time = False
        voicing_header = VOICING + " Voicing"
        header = (f"| {'Elemental Name':^20} | {'Traditional Name':^20} | "
                f"{voicing_header:^20} |")
        print("\n" + header)

        print(TABLE_SEPARATOR)

    # Find the closest point (returns relative coordinates)
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())

    # Get chord info
    chord = COORDINATES_TO_CHORD[point]

    # Play the chord (this will also update the tetrachord display)
    play_chord(chord)

    # Place a dot on the selection (point is already relative)
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
        x (int): X coordinate of the click (absolute)
        y (int): Y coordinate of the click (absolute)
    """
    # Snap clicked coordinates to known centers (returns relative coordinates)
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())
    new_x, new_y = point

    # Test if key holds type is a chord
    if isinstance(COORDINATES_TO_CHORD[point], Chord):  # test if value is a Chord
        # If a chord, call play chord function (pass original absolute coordinates)
        select_chord(x, y)

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

# region Testing ##############################################################
def test_coordinate_conversion():
    """Test function to verify coordinate conversion works for different display sizes."""
    print("Testing coordinate conversion for different display sizes:")
    print("=" * 60)

    # Test with different display sizes
    test_sizes = [(1200, 720), (800, 600), (1600, 900), (1920, 1080)]

    for width, height in test_sizes:
        print(f"\nDisplay size: {width}x{height}")
        print("-" * 30)

        # Test a few key coordinates
        test_coords = [(0.091, 0.158), (0.878, 0.157), (0.471, 0.889)]
        coord_names = ["Earth", "Wind", "Fire"]

        for (rel_x, rel_y), name in zip(test_coords, coord_names):
            abs_x = int(rel_x * width)
            abs_y = int(rel_y * height)
            print(f"{name:8}: ({rel_x:.3f}, {rel_y:.3f}) -> ({abs_x:4d}, {abs_y:3d})")

# Uncomment the line below to run the test
# test_coordinate_conversion()
# endregion Testing ###########################################################

# endregion Main ##############################################################

if __name__ == "__main__":
    main()
