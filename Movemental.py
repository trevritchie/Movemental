###############################################################################
# Movemental.py
# 2025-09-11
# Trevor Ritchie
#
# Interface inspired by tonnetz by _____ and Bill Manaris
#
# Chord visualization inspired by chordTuner
# by Pangur Brougham-Cook and Bill Manaris
###############################################################################


# region Imports ##############################################################
from music import *
from gui import *
from math import hypot, pi, cos, sin
# endregion Imports ###########################################################


# region User Settings ########################################################
TONAL_CENTER_OFFSET = A0  # 0 = C, 2 = D, -2 = Bb, 10 = Bb etc.

OCTAVE_RANGE = 3  # which octave to place chords in

VOICING = "Drop 2 and 4"  # Close, Drop 2, Drop 3, Drop 2 and 4
# VOICING = "Drop 3"  # Close, Drop 2, Drop 3, Drop 2 and 4
# VOICING = "Drop 2"  # Close, Drop 2, Drop 3, Drop 2 and 4
# VOICING = "Close"  # Close, Drop 2, Drop 3, Drop 2 and 4

CHORD_DURATION = HN  # how long to play each chord

# For all instrument constants, see:
# https://jythonmusic.me/api/midi-constants/instrument/
Play.setInstrument(RHODES_PIANO)
# Play.setInstrument(PIANO)
# Play.setInstrument(SYNTH)
# Play.setInstrument(CELLO)
# Play.setInstrument(DX_PIANO)

# Screen dimensions

# Laptop screen
SCREEN_WIDTH = 1920  # pixels
SCREEN_HEIGHT = 1200  # pixels
DISPLAY_SCALE = 1.5  # Ex. Windows 150% scaling = 1.5 (check display settings)

# Lab monitor
SCREEN_WIDTH = 3440  # pixels
SCREEN_HEIGHT = 1440  # pixels
DISPLAY_SCALE = 1.0  # Ex. Windows 150% scaling = 1.5 (check display settings)
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

# Cached calculations for performance
TONAL_CENTER_PITCH_CLASS = TONAL_CENTER_OFFSET % 12
OCTAVE_OFFSET = OCTAVE * OCTAVE_RANGE

# Magic number constants
MAX_MIDI_PITCH = 127
MAX_VOICING_PITCH = 120
LARGE_DISTANCE = 1000000
MIN_RADIUS = 50
MIN_NODE_RADIUS = 8
MIN_TICK_RADIUS = 3
MIN_SMALL_TICK_RADIUS = 2
MIN_LABEL_DISTANCE = 15
MIN_FONT_SIZE = 12
MIN_FONT_HEIGHT = 16
MIN_PADDING = 40
MIN_TOP_MARGIN = 10
MIN_BOTTOM_MARGIN = 30

# Scales of chords by "pitch class". Semitones are assigned to 0-11.
MAJOR_SIXTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 9, 11]
MAJOR_SIXTH_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 3, 4, 5, 7, 8, 10]
MAJOR_SIXTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 2, 4, 5, 7, 9, 10]
MAJOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [
    0, 2, 3, 5, 7, 8, 10, 11]  # aka minor seventh diminished

MINOR_SIXTH_DIMINISHED_SCALE = [0, 2, 3, 5, 7, 8, 9, 11]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_THIRD = [0, 2, 4, 5, 6, 8, 9, 11]
MINOR_SIXTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 2, 4, 5, 7, 8, 10]
# aka minor seventh flat five diminished
MINOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [0, 2, 3, 5, 6, 8, 10, 11]

DOMINANT_SEVENTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 10, 11]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 3, 4, 6, 7, 8, 10]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 3, 4, 5, 7, 9, 10]
DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_SEVENTH = [0, 1, 2, 4, 6, 7, 9, 10]

DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE = [
    0, 2, 4, 5, 6, 8, 10, 11]  # same as from flat fifth
DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE_FROM_THIRD = [
    0, 1, 2, 4, 6, 7, 8, 10]  # same as from seventh

DOMINANT_ROOTS_AND_THEIR_DIMINISHED = [
    0, 2, 3, 5, 6, 8, 9, 11]  # aka whole-half diminished
DIMINISHED_AND_ITS_DOMINANT_ROOTS = [
    0, 1, 3, 4, 6, 7, 9, 10]  # aka half-whole diminished

# Chord qualities
MAJOR_SIXTH_CHORD = [0, 4, 7, 9]
MAJOR_SIXTH_CHORD_FROM_THIRD = [0, 3, 5, 8]
MAJOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 9]
MAJOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 7, 10]  # aka minor seventh chord

MINOR_SIXTH_CHORD = [0, 3, 7, 9]
MINOR_SIXTH_CHORD_FROM_THIRD = [0, 4, 6, 9]
MINOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 8]
MINOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 6, 10]  # aka minor seventh flat five

DOMINANT_SEVENTH_CHORD = [0, 4, 7, 10]
DOMINANT_SEVENTH_CHORD_FROM_THIRD = [0, 3, 6, 8]
DOMINANT_SEVENTH_CHORD_FROM_FIFTH = [0, 3, 5, 9]
DOMINANT_SEVENTH_CHORD_FROM_SEVENTH = [0, 2, 6, 9]

DOMINANT_SEVENTH_FLAT_FIVE_CHORD = [0, 4, 6, 10]  # same as from flat fifth
DOMINANT_SEVENTH_FLAT_FIVE_CHORD_FROM_THIRD = [
    0, 2, 6, 8]  # same as from seventh

DIMINISHED_CHORD = [0, 3, 6, 9]

# Relative positioning constants (as ratios of radius)
LABEL_DISTANCE_RATIO = 1.2  # How far outside circle to place note labels
SMALL_TICK_RATIO = 0.95     # How close to center to place small ticks
TITLE_DISTANCE_RATIO = 1.4  # How far above circle to place title

# Math constants for faster calculations
PI_OVER_6 = pi / 6
PI_OVER_3 = pi / 3
PI_OVER_2 = pi / 2
PI_TIMES_2 = 2 * pi
# endregion Constants #########################################################


# region Classes ##############################################################
# Note letter names
NOTE_NAMES_SHARP = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"]
NOTE_NAMES_FLAT = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B"]


class Chord:
    def __init__(self, name, pitches):
        """Initialize a Chord with name and pitches.

        Args:
            name (str): The elemental name of the chord
            pitches (list): List of pitch values for the chord
        """
        self.name = name

        # Convert to pitch classes (0-11) then add tonal center offset
        self.pitches = [(x % 12) + TONAL_CENTER_PITCH_CLASS
                        for x in pitches]

        # Type of 4 note chord - simplified with dictionary lookup
        chord_quality_map = {
            "arth": " dim7", "Wind": " dim7", "Fire": " dim7",
            "Trunk": " min6", "Smoke": " min6", "Magma": " min6",
            "ranch": " maj6", "Ember": " maj6", "Glass": " maj6",
            "Sand-Storm": "7 b5", "Fire-Storm": "7 b5", "orest-Fire": "7 b5",
            "Leaf": "7", "lame": "7", "coal": "7"
        }

        self.quality = ""
        for suffix, quality in chord_quality_map.items():
            if name.endswith(suffix):
                self.quality = quality
                break

        # Traditional music theory name for the chord
        if self.pitches:
            root_note = NOTE_NAMES_FLAT[self.pitches[0] % 12]
            self.traditional_name = root_note + self.quality
        else:
            self.traditional_name = "Unknown"

        # Sort the pitches low to high
        self.pitches.sort()

        # Apply voicing transformations to get the actual note ordering
        voiced_pitches = []
        for i in range(len(self.pitches)):
            # Place the pitch class into the correct octave range
            adjusted_pitch = self.pitches[i] + OCTAVE_OFFSET

            # For the chosen voicing, raise the appropriate notes up an octave
            if i in VOICING_TO_INDICES.get(VOICING):
                if adjusted_pitch + OCTAVE <= MAX_MIDI_PITCH:
                    adjusted_pitch += OCTAVE

            voiced_pitches.append(adjusted_pitch)

        # Sort the voiced pitches to get the correct display order
        voiced_pitches.sort()

        # String of chord spelling (note letter names) using voiced pitches
        if len(voiced_pitches) >= 4:
            note_names = [NOTE_NAMES_FLAT[pitch % 12]
                          for pitch in voiced_pitches]
            self.spelling = "  ".join(f"{name:<2}" for name in note_names)
        else:
            self.spelling = "Incomplete"
# endregion Classes ###########################################################


# region Coordinates to Chords ################################################
# Map points on the display to chords.
# Everything is relative to C here, but TRANSPOSE_KEY_SEMITONES
# will allow for any tonal center. Also, these will be reduced to pitch
# classes in Chord, but I wrote them as absolute pitches in case that
# is useful later.
COORDINATES_TO_CHORD = {}

# Elemental Diminished Chords
COORDINATES_TO_CHORD[(0.091, 0.158)] = Chord("Earth", [C4, EF4, FS4, A4])
COORDINATES_TO_CHORD[(0.878, 0.157)] = Chord("Wind", [DF4, E4, G4, BF4])
COORDINATES_TO_CHORD[(0.471, 0.889)] = Chord("Fire", [D4, F4, AF4, B4])

# Earth-Wind Combinations
# Trunk (min 6)
COORDINATES_TO_CHORD[(0.277, 0.101)] = Chord("Trunk", [C4, EF4, G4, A4])
COORDINATES_TO_CHORD[(0.238, 0.165)] = Chord("Brother Trunk",
                                             [EF4, GF4, BF4, C5])
COORDINATES_TO_CHORD[(0.280, 0.161)] = Chord("Twin Trunk",
                                             [GF4, A4, DF5, EF5])
COORDINATES_TO_CHORD[(0.317, 0.160)] = Chord("Sister Trunk",
                                             [A3, C4, E4, FS4])
# Branch (maj 6)
COORDINATES_TO_CHORD[(0.493, 0.042)] = Chord("Branch", [C4, E4, G4, A4])
COORDINATES_TO_CHORD[(0.442, 0.094)] = Chord("Brother Branch",
                                             [EF4, G4, BF4, C5])
COORDINATES_TO_CHORD[(0.488, 0.094)] = Chord("Twin Branch",
                                             [GF4, BF4, DF5, EF5])
COORDINATES_TO_CHORD[(0.533, 0.094)] = Chord("Sister Branch",
                                             [A3, CS4, E4, FS4])
# Sand-Storm (dom 7 b5) (default=twin and brother=sister)
COORDINATES_TO_CHORD[(0.494, 0.221)] = Chord("Sand-Storm", [C4, E4, GF4, BF4])
COORDINATES_TO_CHORD[(0.442, 0.282)] = Chord("Brother Sand-Storm",
                                             [EF4, G4, A4, DF5])
COORDINATES_TO_CHORD[(0.499, 0.283)] = Chord("Twin Sand-Storm",
                                             [GF4, BF4, C5, E5])
COORDINATES_TO_CHORD[(0.558, 0.283)] = Chord("Sister Sand-Storm",
                                             [A3, DF4, EF4, G4])
# Leaf (dom 7)
COORDINATES_TO_CHORD[(0.683, 0.113)] = Chord("Leaf", [C4, E4, G4, BF4])
COORDINATES_TO_CHORD[(0.658, 0.171)] = Chord("Brother Leaf",
                                             [EF4, G4, BF4, DF5])
COORDINATES_TO_CHORD[(0.693, 0.161)] = Chord("Twin Leaf",
                                             [GF4, BF4, DF5, E5])
COORDINATES_TO_CHORD[(0.726, 0.165)] = Chord("Sister Leaf",
                                             [A3, CS4, E4, G4])

# Wind-Fire Combinations
# Smoke (min 6)
COORDINATES_TO_CHORD[(0.833, 0.310)] = Chord("Smoke", [G4, BF4, D5, E5])
COORDINATES_TO_CHORD[(0.785, 0.360)] = Chord("Brother Smoke",
                                             [BF4, DF5, F5, G5])
COORDINATES_TO_CHORD[(0.825, 0.360)] = Chord("Twin Smoke",
                                             [DF5, E5, AF5, BF5])
COORDINATES_TO_CHORD[(0.864, 0.371)] = Chord("Sister Smoke",
                                             [E4, G4, B4, CS5])
# Ember (maj 6)
COORDINATES_TO_CHORD[(0.929, 0.475)] = Chord("Ember", [G4, B4, D5, E5])
COORDINATES_TO_CHORD[(0.873, 0.533)] = Chord("Brother Ember",
                                             [BF4, D5, F5, G5])
COORDINATES_TO_CHORD[(0.919, 0.528)] = Chord("Twin Ember",
                                             [DF5, F5, AF5, BF5])
COORDINATES_TO_CHORD[(0.962, 0.532)] = Chord("Sister Ember",
                                             [E4, GS4, B4, CS5])
# Fire-Storm (dom 7 b5)
COORDINATES_TO_CHORD[(0.627, 0.444)] = Chord("Fire-Storm", [G4, B4, DF5, F5])
COORDINATES_TO_CHORD[(0.561, 0.511)] = Chord("Brother Fire-Storm",
                                             [BF4, D5, E5, AF5])
COORDINATES_TO_CHORD[(0.630, 0.501)] = Chord("Twin Fire-Storm",
                                             [DF5, F5, G5, B5])
COORDINATES_TO_CHORD[(0.686, 0.504)] = Chord("Sister Fire-Storm",
                                             [E4, AF4, BF4, D5])
# Flame (dom 7)
COORDINATES_TO_CHORD[(0.680, 0.738)] = Chord("Flame", [G4, B4, D5, F5])
COORDINATES_TO_CHORD[(0.623, 0.794)] = Chord("Brother Flame",
                                             [BF4, D5, F5, AF5])
COORDINATES_TO_CHORD[(0.675, 0.792)] = Chord("Twin Flame",
                                             [DF5, F5, AF5, B5])
COORDINATES_TO_CHORD[(0.728, 0.796)] = Chord("Sister Flame",
                                             [E4, GS4, B4, D5])

# Fire-Earth Combinations
# Magma (min 6)
COORDINATES_TO_CHORD[(0.283, 0.690)] = Chord("Magma", [D4, F4, A4, B5])
COORDINATES_TO_CHORD[(0.233, 0.756)] = Chord("Brother Magma",
                                             [F4, AF4, C5, D5])
COORDINATES_TO_CHORD[(0.284, 0.754)] = Chord("Twin Magma",
                                             [AF4, CF5, EF5, F5])
COORDINATES_TO_CHORD[(0.328, 0.751)] = Chord("Sister Magma",
                                             [B3, D4, FS4, GS4])
# Glass (maj 6)
COORDINATES_TO_CHORD[(0.069, 0.468)] = Chord("Glass", [F4, A4, C5, D5])
COORDINATES_TO_CHORD[(0.028, 0.533)] = Chord("Brother Glass",
                                             [AF4, C4, EF5, F5])
COORDINATES_TO_CHORD[(0.072, 0.528)] = Chord("Twin Glass",
                                             [B4, DS5, FS5, GS5])
COORDINATES_TO_CHORD[(0.109, 0.525)] = Chord("Sister Glass",
                                             [D4, FS4, A4, B5])
# Forest-Fire (dom 7 b5)
COORDINATES_TO_CHORD[(0.392, 0.432)] = Chord("Forest-Fire", [F4, A4, CF5, EF5])
COORDINATES_TO_CHORD[(0.348, 0.493)] = Chord("Brother Forest-Fire",
                                             [AF4, C5, D5, GF5])
COORDINATES_TO_CHORD[(0.393, 0.487)] = Chord("Twin Forest-Fire",
                                             [CF5, EF5, F5, A5])
COORDINATES_TO_CHORD[(0.438, 0.485)] = Chord("Sister Forest-Fire",
                                             [D4, GF4, AF4, C5])
# Charcoal (dom 7)
COORDINATES_TO_CHORD[(0.196, 0.326)] = Chord("Charcoal", [F4, A4, C5, EF5])
COORDINATES_TO_CHORD[(0.144, 0.381)] = Chord("Brother Charcoal",
                                             [AF4, C4, EF5, GF5])
COORDINATES_TO_CHORD[(0.193, 0.378)] = Chord("Twin Charcoal",
                                             [B4, DS5, FS5, A5])
COORDINATES_TO_CHORD[(0.241, 0.381)] = Chord("Sister Charcoal",
                                             [D4, FS4, A4, C5])
# endregion Coordinates to Chords #############################################


# region chord Functions ######################################################
def get_position_on_chord_circle(angle):
    """Returns x,y coordinates on the chord circle for a given angle.

    Args:
        angle (float): Angle in radians (0 = 12 o'clock, increases clockwise)

    Returns:
        tuple: (x, y) coordinates on the circle
    """
    # Adjust angle so 0 is at 12 o'clock and increases clockwise
    # In standard coordinates: 0° = 3 o'clock, -90° = 12 o'clock
    adjusted_angle = angle - PI_OVER_2

    # Calculate coordinates relative to center
    new_x = CLOCK_RADIUS * cos(adjusted_angle) + CLOCK_X
    new_y = CLOCK_RADIUS * sin(adjusted_angle) + CLOCK_Y

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
    adjusted_pitch_class = (pitch_class - TONAL_CENTER_PITCH_CLASS) % 12

    # Convert to angle (12 semitones = 2π radians)
    angle = (adjusted_pitch_class / 12.0) * PI_TIMES_2

    return angle


def create_chord_color_gradient():
    """Create a 24-color array for the chord display.

    Uses a repeating pattern of elemental colors around the clock face:
    - Brown, Light Blue, Red, Brown, Light Blue, Red, etc.

    Returns:
        list: List of Color objects
    """
    # Define the three elemental colors
    brown = Color(139, 90, 60)        # Rich brown - like fertile soil
    light_blue = Color(135, 206, 235)  # Light blue - like clear sky
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
# endregion chord Functions ###################################################


# region GUI Setup ############################################################
# Calculate effective screen dimensions (accounting for scaling)
EFFECTIVE_WIDTH = SCREEN_WIDTH / DISPLAY_SCALE  # 1280
EFFECTIVE_HEIGHT = SCREEN_HEIGHT / DISPLAY_SCALE  # 800

# Layout: Diagram takes 2/3 width, Clock takes 1/3 width, both take 3/4 height
# Use 95% of screen width to leave margins on sides
TOTAL_WIDTH = int(EFFECTIVE_WIDTH * 0.95)  # 95% of effective width
DIAGRAM_WIDTH = int(TOTAL_WIDTH * 2 / 3)  # 2/3 of the 95% width
CLOCK_WIDTH = int(TOTAL_WIDTH * 1 / 3)    # 1/3 of the 95% width
# ~720 pixels (increased from 533)
DISPLAY_HEIGHT = int(EFFECTIVE_HEIGHT * 3 / 4)

# Center vertically on screen
VERTICAL_CENTER = (EFFECTIVE_HEIGHT - DISPLAY_HEIGHT) / \
    2  # ~133 pixels from top

# Center horizontally on screen with 95% width
HORIZONTAL_CENTER = (EFFECTIVE_WIDTH - TOTAL_WIDTH) / 2  # Center the 95% width
DIAGRAM_X = HORIZONTAL_CENTER
CLOCK_X = HORIZONTAL_CENTER + DIAGRAM_WIDTH

# Create main display with diagram image
diagram_display = Display("Movemental", DIAGRAM_WIDTH, DISPLAY_HEIGHT,
                          DIAGRAM_X, VERTICAL_CENTER)
diagram = Icon("./images/diagram.jpg", DIAGRAM_WIDTH, DISPLAY_HEIGHT)
diagram_display.add(diagram)

# Create a circle that marks the active chord
selected_chord_dot = Circle(0, 0, 8, Color.BLUE, fill=True)
diagram_display.add(selected_chord_dot)

# Create separate display for chord visualization
chord_display = Display("Chord Visualization", CLOCK_WIDTH, DISPLAY_HEIGHT,
                        CLOCK_X, VERTICAL_CENTER, Color.BLACK)

# Calculate chord positioning based on clock display dimensions
# Use relative positioning to maximize space usage and ensure
# proper scaling.
# X position of chord center (centered in clock window)
CLOCK_X = CLOCK_WIDTH // 2
# Y position of chord center (centered in clock window)
CLOCK_Y = DISPLAY_HEIGHT // 2


# Calculate radius to ensure adequate space for both note labels
# and chord info labels. Need space for: note labels +
# chord info labels + padding between them. Calculate maximum
# safe radius based on available space.
def calculate_safe_radius():
    """Calculate the maximum safe radius that leaves room for all labels."""
    # Available space is the smaller dimension of the clock display
    available_space = min(CLOCK_WIDTH, DISPLAY_HEIGHT)

    # Estimate space needed for labels
    # Note labels extend beyond circle by LABEL_DISTANCE (15% of radius)
    # Chord info labels need 2.5x that space to avoid overlap
    # So total space needed = radius + note_label_space +
    # chord_info_space + padding

    # Start with a conservative estimate and refine
    # Start with 30% of available space
    max_radius = int(available_space * 0.3)

    # Calculate required space for this radius
    note_label_space = int(max_radius * 0.15)  # 15% of radius
    chord_info_space = int(note_label_space * 2.5)  # 2.5x note label space
    padding = MIN_PADDING  # Minimum padding

    total_required_space = (max_radius + note_label_space +
                            chord_info_space + padding)

    # If we need more space than available, reduce the radius
    if total_required_space > available_space:
        # Calculate maximum radius that fits
        max_radius = int((available_space - padding) /
                         (1 + 0.15 + 0.15 * 2.5))

    return max(MIN_RADIUS, max_radius)  # Minimum radius


CLOCK_RADIUS = calculate_safe_radius()

# This ensures consistent visual relationships
# regardless of display size.
NODE_RADIUS = max(MIN_NODE_RADIUS, int(
    CLOCK_RADIUS * 0.1))  # 10% of radius, minimum
BIG_TICK_RADIUS = max(MIN_TICK_RADIUS, int(
    CLOCK_RADIUS * 0.04))  # 4% of radius, minimum
SMALL_TICK_RADIUS = max(MIN_SMALL_TICK_RADIUS, int(
    CLOCK_RADIUS * 0.02))  # 2% of radius, minimum
LABEL_DISTANCE = max(MIN_LABEL_DISTANCE, int(
    CLOCK_RADIUS * 0.15))  # 15% of radius, minimum


def create_background_lines():
    """Create the background grid lines connecting all tick marks."""
    # Calculate tick mark coordinates
    big_tick_coords = []
    for i in range(12):  # 12 semitones
        angle = (i / 12.0) * PI_TIMES_2
        x, y = get_position_on_chord_circle(angle)
        big_tick_coords.append((x, y))

    # Draw background lines connecting all big ticks (like chordTuner)
    trans_gray = Color(180, 180, 190, 80)  # More visible light gray
    for i, (x1, y1) in enumerate(big_tick_coords):
        for j, (x2, y2) in enumerate(big_tick_coords):
            if i != j:  # Don't draw line to itself
                chord_display.drawLine(x1, y1, x2, y2, trans_gray, 1)


def create_tick_marks_and_labels():
    """Create tick marks and note labels around the circle."""
    global note_labels

    for i in range(12):  # 12 semitones
        angle = (i / 12.0) * PI_TIMES_2  # 0 to 2π radians
        x, y = get_position_on_chord_circle(angle)

        # Major tick marks (every semitone)
        color = clock_color_gradient[i * 2]  # Use every other color
        tick = Circle(x, y, BIG_TICK_RADIUS, color, True)
        chord_display.add(tick)

        # Add note names positioned outside the circle
        # Adjust note index so tonal center appears at 12 o'clock
        note_index = (i + TONAL_CENTER_PITCH_CLASS) % 12
        note_name = NOTE_NAMES_FLAT[note_index]

        # Position labels at a consistent distance outside the circle
        # Use relative positioning based on radius for better scaling
        label_radius = CLOCK_RADIUS + LABEL_DISTANCE
        label_angle = angle - PI_OVER_2  # Convert to standard coordinates

        # Calculate position for label center
        label_x = int(CLOCK_X + label_radius * cos(label_angle))
        label_y = int(CLOCK_Y + label_radius * sin(label_angle))

        # Adjust y position based on vertical position to compensate
        # for text bottom-alignment. Labels at the top need to be
        # pushed further away, and labels at bottom pulled closer.
        y_adjustment = int(sin(label_angle) * 3)  # Ranges from -3 to +3
        adjusted_label_y = label_y - 7 + y_adjustment

        # Create a properly centered label
        note_label = Label(note_name, CENTER, Color.WHITE)
        chord_display.add(note_label, label_x - 10, adjusted_label_y - 5)
        note_labels.append(note_label)


def create_chord_nodes_and_lines():
    """Create the chord nodes and connection lines."""
    global note_nodes, note_connection_lines

    # Initialize four nodes (will be positioned when chords are played)
    note_nodes = []
    for i in range(4):
        # Create node
        node = Circle(CLOCK_X, CLOCK_Y, NODE_RADIUS, Color.WHITE, True)
        chord_display.add(node)
        note_nodes.append(node)

    # Initialize connecting lines
    # (6 lines needed to connect all pairs of 4 nodes)
    note_connection_lines = []
    for i in range(6):  # 6 lines needed to connect all pairs of 4 nodes
        line = Line(CLOCK_X, CLOCK_Y, CLOCK_X, CLOCK_Y, Color.WHITE, 2)
        chord_display.add(line)
        note_connection_lines.append(line)


# Initialize chord display
def create_chord_display():
    """Create the chord visualization display."""
    global chord_display, clock_color_gradient, chord_info_text
    global clock_path, note_nodes, note_connection_lines, note_labels

    # Create color gradient
    clock_color_gradient = create_chord_color_gradient()

    # Create the circular path
    clock_path = Circle(CLOCK_X, CLOCK_Y, CLOCK_RADIUS,
                        # Sophisticated dark gray
                        Color(120, 120, 130), False, 2)
    chord_display.add(clock_path)

    # Create background elements
    create_background_lines()
    create_tick_marks_and_labels()
    create_chord_nodes_and_lines()

    # Add chord information display at the top
    chord_info_text = {
        'elemental': None,
        'traditional': None
    }


# Global variables for chord display
clock_color_gradient = None
clock_path = None
note_nodes = []
note_connection_lines = []
chord_info_text = None
note_labels = []

# Create the clock-like chord display
create_chord_display()
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
    display_width = diagram_display.getWidth()
    display_height = diagram_display.getHeight()

    # Convert relative coordinates to absolute for comparison
    here_abs = here  # here is already in absolute coordinates

    # Keep track of the closest distance and point so far
    closest_distance_so_far = LARGE_DISTANCE
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
        adjusted_pitch = chord.pitches[i] + OCTAVE_OFFSET

        # For the chosen voicing, raise the appropriate notes up an octave
        if i in VOICING_TO_INDICES.get(VOICING):
            if adjusted_pitch + OCTAVE <= MAX_VOICING_PITCH:
                adjusted_pitch += OCTAVE

        # Add correctly placed pitch
        adjusted_pitches.append(adjusted_pitch)
        # Play.note(adjusted_pitch, 0, 1000, 120)

    # Create the chord
    phrase = Phrase()
    phrase.addChord(adjusted_pitches, CHORD_DURATION, 127)

    # Play the chord!
    Play.midi(phrase)

    # Update choed display with the chord pitches and info
    update_chord_display(adjusted_pitches)
    update_chord_info_display(chord)


def select_chord_visually(x, y):
    """Create and place a circle at the coordinates.

    Args:
        x (float): X coordinate for the visual indicator (relative 0-1)
        y (float): Y coordinate for the visual indicator (relative 0-1)
    """
    global diagram_display, selected_chord_dot

    # Convert relative coordinates to absolute
    display_width = diagram_display.getWidth()
    display_height = diagram_display.getHeight()
    abs_x = int(x * display_width)
    abs_y = int(y * display_height)

    diagram_display.move(selected_chord_dot, abs_x, abs_y)


def get_precise_label_position(text, font_size, window_center):
    """Calculate the exact x position to center a label in the window."""
    # Scale character width with font size for better accuracy
    # Proportional to font size (was 8.4 for size 16)
    char_width = font_size * 0.525

    # Estimate text width
    estimated_text_width = len(text) * char_width

    # Calculate label position to center the text in the window
    # Label should start at: window_center - (text_width / 2)
    # Adjust offset based on font size for better centering
    offset = max(8, int(font_size * 0.75))  # Scale offset with font size
    label_x = int(window_center - (estimated_text_width / 2) - offset)

    return label_x


def calculate_label_positions():
    """Calculate vertical positions for chord info labels."""
    # Font sizes - scale with display size for better readability
    # 3% of display height, minimum
    base_font_size = max(MIN_FONT_SIZE, int(DISPLAY_HEIGHT * 0.03))
    # 2.5% of display height, minimum
    font_height = max(MIN_FONT_HEIGHT, int(DISPLAY_HEIGHT * 0.025))

    # Center horizontally in the clock window
    horizontal_center = CLOCK_WIDTH // 2

    # Calculate vertical positions with more generous spacing from
    # circle. Circle center and radius are dynamic based on
    # display size.
    circle_top = CLOCK_Y - CLOCK_RADIUS
    circle_bottom = CLOCK_Y + CLOCK_RADIUS

    # Calculate spacing to ensure chord info labels don't overlap with
    # note labels. Note labels extend LABEL_DISTANCE beyond the circle.
    note_label_extension = LABEL_DISTANCE
    # 2.5x note label extension, minimum 60px
    chord_info_spacing = max(60, int(note_label_extension * 2.5))

    # Top label: position so text appears well above circle and note
    # labels. Since text aligns to bottom of label, we need to
    # account for font height.
    top_y = circle_top - chord_info_spacing - font_height

    # Bottom label: position so text appears well below circle and
    # note labels. Text aligns to bottom of label, so this is simpler.
    bottom_y = circle_bottom + chord_info_spacing

    # Ensure labels stay within display bounds
    # At least minimum margin from top of display
    top_y = max(MIN_TOP_MARGIN, top_y)
    # At least minimum margin from bottom of display
    bottom_y = min(DISPLAY_HEIGHT - MIN_BOTTOM_MARGIN, bottom_y)

    return base_font_size, horizontal_center, top_y, bottom_y


def create_chord_labels(chord, font_size, horizontal_center, top_y, bottom_y):
    """Create and position the chord name labels."""
    global chord_info_text, chord_display

    # Elemental name (top center, perfectly centered for any length)
    elemental_label = Label(chord.name, CENTER, Color.WHITE)
    elemental_label.setFont(Font("Arial", Font.BOLD, font_size))
    chord_info_text['elemental'] = elemental_label

    # Calculate precise position for perfect centering
    nudge = 0
    if chord.name[-6:] == "Branch":
        nudge = -6
    elif chord.name == "Fire":
        nudge = 12
    elif chord.name[-5:] == "Magma":
        nudge = -12

    elemental_x = get_precise_label_position(
        chord.name, font_size, horizontal_center)
    chord_display.add(elemental_label, elemental_x + nudge, top_y)

    # Traditional name (bottom center, perfectly centered for any length)
    traditional_label = Label(chord.traditional_name, CENTER, Color.WHITE)
    traditional_label.setFont(Font("Arial", Font.BOLD, font_size))
    chord_info_text['traditional'] = traditional_label

    # Calculate precise position for perfect centering
    traditional_x = get_precise_label_position(
        chord.traditional_name, font_size, horizontal_center)
    chord_display.add(traditional_label, traditional_x, bottom_y - 5)


def update_chord_info_display(chord):
    """Update the chord information text at the top of the chord display.

    Args:
        chord (Chord): The chord object containing name and info
    """
    global chord_info_text, chord_display

    # Remove old labels if they exist
    if chord_info_text['elemental']:
        chord_display.remove(chord_info_text['elemental'])
    if chord_info_text['traditional']:
        chord_display.remove(chord_info_text['traditional'])

    # Calculate positions and create labels
    font_size, horizontal_center, top_y, bottom_y = calculate_label_positions()
    create_chord_labels(chord, font_size, horizontal_center, top_y, bottom_y)


def update_chord_display(pitches):
    """Update the chord display with the four notes of a chord.

    Args:
        pitches (list): List of four MIDI pitch values
    """
    global note_nodes, note_connection_lines, clock_color_gradient

    # Sort pitches to ensure consistent ordering
    sorted_pitches = sorted(pitches)

    # Calculate positions and colors for each note
    positions = []
    colors = []
    for i, pitch in enumerate(sorted_pitches):
        angle = pitch_to_angle(pitch)
        x, y = get_position_on_chord_circle(angle)
        positions.append((x, y))

        # Get color based on visual position on circle (not pitch class)
        # This ensures red is always at bottom, etc.
        color_index = int((angle / PI_TIMES_2) * 24) % 24
        colors.append(clock_color_gradient[color_index])

    # Update node positions and colors
    for i in range(4):
        if i < len(positions):
            x, y = positions[i]
            note_nodes[i].setColor(colors[i])
            chord_display.move(note_nodes[i], x, y)
        else:
            # Hide unused nodes
            chord_display.move(note_nodes[i], CLOCK_X, CLOCK_Y)

    # Update connecting lines to connect all nodes to each other
    if len(positions) >= 4:
        # Connect every node to every other node (complete graph)
        line_connections = [(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)]

        for i, (start_idx, end_idx) in enumerate(line_connections):
            start_x, start_y = positions[start_idx]
            end_x, end_y = positions[end_idx]

            # Update line position instead of recreating
            line = note_connection_lines[i]
            # Create new line with updated coordinates
            new_line = Line(start_x, start_y, end_x, end_y, Color.WHITE, 2)
            chord_display.remove(line)
            chord_display.add(new_line)
            note_connection_lines[i] = new_line
    else:
        # Hide lines if not enough notes by moving them off-screen
        for i, line in enumerate(note_connection_lines):
            # Create new line at center position to hide it
            new_line = Line(CLOCK_X, CLOCK_Y, CLOCK_X, CLOCK_Y, Color.WHITE, 2)
            chord_display.remove(line)
            chord_display.add(new_line)
            note_connection_lines[i] = new_line


first_time = True
# make a bar of dashes with | in the same places as header
TABLE_SEPARATOR = "|" + "-" * 22 + "|" + "-" * 22 + "|" + "-" * 22 + "|"


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

    # Play the chord (this will also update the chord display)
    play_chord(chord)

    # Place a dot on the selection (point is already relative)
    select_chord_visually(point[0], point[1])

    print(f"| {chord.name:^20} | {chord.traditional_name:^20} | "
          f"{chord.spelling:^20} |")
    print(TABLE_SEPARATOR)


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
    if isinstance(COORDINATES_TO_CHORD[point],
                  Chord):  # test if value is a Chord
        # If a chord, call play chord function (pass original absolute
        # coordinates)
        select_chord(x, y)
# endregion Functions #########################################################


# region Main #################################################################
def main():
    # Register callback for playing chords by clicking the mouse
    diagram_display.onMouseClick(choose_action)

    # # Show mouse coordinates for testing
    # display.showMouseCoordinates()

    # CLI Info
    tonal_center = NOTE_NAMES_FLAT[TONAL_CENTER_PITCH_CLASS]
    relative_minor = NOTE_NAMES_FLAT[(TONAL_CENTER_PITCH_CLASS - 3) % 12]

    # Print ASCII art
    ascii_art = ("""\
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
    print(
        "- Any chord may be combined with the element (Earth, Wind, or Fire) "
        "opposite from it.")
    print("  This creates an 8-note \"scale of chords\" which alternates "
          "between resolution and tension.")
    print("  Ex. C maj6 + D dim7 (Branch + Fire) = C maj6 diminished scale")
    print("- When playing a chord, \"borrowing\" some notes from the opposite "
          "element (not one of the parents) can produce beautiful results.")
    print("  Ex: C maj7, C maj7 #5... Following the thread, maybe these are "
          "grandchildren?")
    print("- These concepts were pioneered by Dr. Barry Harris, so...")
    print(
        "  In his memory, let's play beautiful movements, not static chords, "
        "and remember to play with our family!!!\n")


if __name__ == "__main__":
    main()
# endregion Main ##############################################################
