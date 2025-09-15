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
import time
# endregion Imports ###########################################################


# region Default Settings #####################################################
# If the user clicks no drop down menus, these will be used

DEFAULT_TONAL_CENTER_OFFSET = BF0  # 0 = C, 2 = D, -2 = Bb, 10 = Bb etc.

DEFAULT_OCTAVE_RANGE = 3  # which octave to place chords in

DEFAULT_VOICING = "Drop 2 and 4"  # Close, Drop 2, Drop 3, Drop 2 and 4
# DEFAULT_VOICING = "Drop 3"  # Close, Drop 2, Drop 3, Drop 2 and 4
# DEFAULT_VOICING = "Drop 2"  # Close, Drop 2, Drop 3, Drop 2 and 4
# DEFAULT_VOICING = "Close"  # Close, Drop 2, Drop 3, Drop 2 and 4

DEFAULT_CHORD_DURATION = HN  # how long to play each chord

# For all instrument constants, see:
# https://jythonmusic.me/api/midi-constants/instrument/
DEFAULT_INSTRUMENT = PIANO
Play.setInstrument(DEFAULT_INSTRUMENT)

# Screen dimensions
# Laptop screen
DEFAULT_SCREEN_WIDTH = 1920  # pixels
DEFAULT_SCREEN_HEIGHT = 1200  # pixels
DEFAULT_DISPLAY_SCALE = 1.5  # Ex. Windows 150% scaling = 1.5 (check display settings)

# Lab monitor
# DEFAULT_SCREEN_WIDTH = 3440  # pixels
# DEFAULT_SCREEN_HEIGHT = 1440  # pixels
# DEFAULT_DISPLAY_SCALE = 1.0  # Ex. Windows 150% scaling = 1.5 (check display settings)
# endregion Default Settings ##################################################


# region Runtime Variables ####################################################
# These will be updated by user settings
TONAL_CENTER_OFFSET = DEFAULT_TONAL_CENTER_OFFSET
OCTAVE_RANGE = DEFAULT_OCTAVE_RANGE
VOICING = DEFAULT_VOICING
CHORD_DURATION = DEFAULT_CHORD_DURATION
INSTRUMENT = DEFAULT_INSTRUMENT
SCREEN_WIDTH = DEFAULT_SCREEN_WIDTH
SCREEN_HEIGHT = DEFAULT_SCREEN_HEIGHT
DISPLAY_SCALE = DEFAULT_DISPLAY_SCALE

# Borrowing state management
BORROWING_STATE = {
    'active': False,
    'chord_name': None,
    'borrowed_notes': [],
    'original_notes': [],
    'circle_positions': {1: 'line', 2: 'line', 3: 'line', 4: 'line'},  # Where each circle is positioned: 'line', 'up', 'down', 'off'
    'borrowing_directions': {1: None, 2: None, 3: None, 4: None},      # Direction for each line: None, 'up', 'down', 'off'
    'note_states': {1: 'on', 2: 'on', 3: 'on', 4: 'on'},              # Whether each note is on or off: 'on', 'off'
    'borrowing_history': {}  # Store borrowing state per chord: {chord_name: {line: direction}}
}
# endregion Runtime Variables #################################################


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

# Borrowing system constants
ELEMENTAL_RELATIONSHIPS = {
    "Earth": ["Wind", "Fire"],
    "Wind": ["Earth", "Fire"],
    "Fire": ["Earth", "Wind"],

    # Earth+Wind chords → opposite is Fire
    "Trunk": ["Fire"],
    "Brother Trunk": ["Fire"],
    "Twin Trunk": ["Fire"],
    "Sister Trunk": ["Fire"],
    "Branch": ["Fire"],
    "Brother Branch": ["Fire"],
    "Twin Branch": ["Fire"],
    "Sister Branch": ["Fire"],
    "Sand-Storm": ["Fire"],
    "Brother Sand-Storm": ["Fire"],
    "Twin Sand-Storm": ["Fire"],
    "Sister Sand-Storm": ["Fire"],
    "Leaf": ["Fire"],
    "Brother Leaf": ["Fire"],
    "Twin Leaf": ["Fire"],
    "Sister Leaf": ["Fire"],

    # Wind+Fire chords → opposite is Earth
    "Smoke": ["Earth"],
    "Brother Smoke": ["Earth"],
    "Twin Smoke": ["Earth"],
    "Sister Smoke": ["Earth"],
    "Ember": ["Earth"],
    "Brother Ember": ["Earth"],
    "Twin Ember": ["Earth"],
    "Sister Ember": ["Earth"],
    "Fire-Storm": ["Earth"],
    "Brother Fire-Storm": ["Earth"],
    "Twin Fire-Storm": ["Earth"],
    "Sister Fire-Storm": ["Earth"],
    "Flame": ["Earth"],
    "Brother Flame": ["Earth"],
    "Twin Flame": ["Earth"],
    "Sister Flame": ["Earth"],

    # Fire+Earth chords → opposite is Wind
    "Magma": ["Wind"],
    "Brother Magma": ["Wind"],
    "Twin Magma": ["Wind"],
    "Sister Magma": ["Wind"],
    "Glass": ["Wind"],
    "Brother Glass": ["Wind"],
    "Twin Glass": ["Wind"],
    "Sister Glass": ["Wind"],
    "Forest-Fire": ["Wind"],
    "Brother Forest-Fire": ["Wind"],
    "Twin Forest-Fire": ["Wind"],
    "Sister Forest-Fire": ["Wind"],
    "Charcoal": ["Wind"],
    "Brother Charcoal": ["Wind"],
    "Twin Charcoal": ["Wind"],
    "Sister Charcoal": ["Wind"]
}

# Map line positions to chord note indices (sorted from low to high)
NOTE_POSITION_MAPPING = {
    1: 0,  # Line 1 → Lowest note (index 0)
    2: 1,  # Line 2 → Second lowest note (index 1)
    3: 2,  # Line 3 → Third lowest note (index 2)
    4: 3   # Line 4 → Highest note (index 3)
}


def get_root_position_mapping(chord):
    """
    Generate mapping from borrowing lines to chord notes in root position order.

    Args:
        chord (Chord): The chord object with root_position_index

    Returns:
        dict: Mapping from line number (1-4) to sorted pitch index
    """
    if not hasattr(chord, 'root_position_index'):
        # Fallback to original mapping if root position not available
        return NOTE_POSITION_MAPPING

    # Create root position order: root, 3rd, 5th, 7th
    # Root is at root_position_index in sorted pitches
    root_idx = chord.root_position_index
    third_idx = (root_idx + 1) % 4
    fifth_idx = (root_idx + 2) % 4
    seventh_idx = (root_idx + 3) % 4

    return {
        1: root_idx,     # Line 1 → Root note
        2: third_idx,    # Line 2 → Third note
        3: fifth_idx,    # Line 3 → Fifth note
        4: seventh_idx   # Line 4 → Seventh note
    }


def create_borrowing_name(original_chord_name, borrowing_state):
    """
    Create a chemistry-style borrowing name with subscripts reflecting note counts.

    Args:
        original_chord_name (str): Name of the original chord
        borrowing_state (dict): Current borrowing state

    Returns:
        str: Borrowing name like "Branch₄" (4 original notes) or "Branch₃Fire₁" (3 original + 1 borrowed)
    """
    # Count how many notes are active (turned on)
    active_count = 0
    for line_position in range(1, 5):
        if borrowing_state['note_states'][line_position] == 'on':
            active_count += 1

    # Create subscript numbers
    subscript_map = {
        0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄'
    }

    # Get the opposite element for this chord
    opposite_element = ELEMENTAL_RELATIONSHIPS.get(original_chord_name, [None])[0]

    # If no opposite element, just show active note count
    if not opposite_element:
        active_subscript = subscript_map.get(active_count, str(active_count))
        return f"{original_chord_name}{active_subscript}"

    # Count borrowed notes (notes that are borrowed from opposite element)
    borrowed_count = 0
    for line_position in range(1, 5):
        if (borrowing_state['circle_positions'][line_position] in ['up', 'down'] and
            borrowing_state['note_states'][line_position] == 'on'):
            borrowed_count += 1

    # Calculate original notes (active notes that are not borrowed)
    original_count = active_count - borrowed_count

    # Build the name with both original and borrowed counts
    # Only include elements that have notes (count > 0)
    name_parts = []

    if original_count > 0:
        original_subscript = subscript_map.get(original_count, str(original_count))
        name_parts.append(f"{original_chord_name}{original_subscript}")

    if borrowed_count > 0:
        opposite_subscript = subscript_map.get(borrowed_count, str(borrowed_count))
        name_parts.append(f"{opposite_element}{opposite_subscript}")

    return "".join(name_parts)


def create_active_spelling(chord, borrowing_state):
    """
    Create chord spelling based on only the active (turned on) notes,
    including any borrowed notes.

    Args:
        chord (Chord): The chord object
        borrowing_state (dict): Current borrowing state

    Returns:
        str: Spelling of only the active notes with borrowed notes included
    """
    # Start with original chord pitches
    original_pitches = sorted(chord.pitches)
    borrowed_pitches = original_pitches.copy()

    # Apply borrowing transformations (same logic as generate_and_play_borrowed_chord)
    opposite_element = ELEMENTAL_RELATIONSHIPS.get(chord.name, [None])[0]
    if opposite_element:
        opposite_chord = get_elemental_chord(opposite_element)
        if opposite_chord:
            opposite_pitches = opposite_chord.pitches
            root_position_mapping = get_root_position_mapping(chord)

            for line_position in range(1, 5):
                # Skip notes that are turned off
                if borrowing_state['note_states'][line_position] == 'off':
                    continue

                if borrowing_state['circle_positions'][line_position] != 'line':
                    direction = borrowing_state['borrowing_directions'][line_position]
                    target_note_index = root_position_mapping[line_position]

                    if target_note_index < len(borrowed_pitches):
                        target_pitch = borrowed_pitches[target_note_index]

                        if direction == 'up':
                            replacement = find_next_higher_note(target_pitch, opposite_pitches)
                        else:  # down
                            replacement = find_next_lower_note(target_pitch, opposite_pitches)

                        borrowed_pitches[target_note_index] = replacement

    # Apply voicing transformations to all notes first (same as play_chord function)
    voiced_pitches = []
    for i in range(len(borrowed_pitches)):
        # Place the pitch class into the correct octave range
        adjusted_pitch = borrowed_pitches[i] + OCTAVE_OFFSET

        # For the chosen voicing, raise the appropriate notes up an octave
        if i in VOICING_TO_INDICES.get(VOICING):
            if adjusted_pitch + OCTAVE <= MAX_VOICING_PITCH:
                adjusted_pitch += OCTAVE

        voiced_pitches.append(adjusted_pitch)

    # Filter to only active notes using the voiced pitches
    active_pitches = []
    root_position_mapping = get_root_position_mapping(chord)

    for line_position in range(1, 5):
        if borrowing_state['note_states'][line_position] == 'on':
            note_index = root_position_mapping[line_position]
            if note_index < len(voiced_pitches):
                active_pitches.append(voiced_pitches[note_index])

    if not active_pitches:
        return "No notes"

    # Sort by actual MIDI pitch values (low to high)
    sorted_pitches = sorted(active_pitches)
    note_names = [NOTE_NAMES_FLAT[pitch % 12] for pitch in sorted_pitches]

    return "  ".join(f"{name:<2}" for name in note_names)


# Borrowing control UI constants
BORROWING_CONTROLS = {
    'circle_radius': 8,  # Same as selected_chord_dot
    'arrow_size': 6      # Size of arrow indicators
}

# Transparent color for hiding circles (alpha = 0)
TRANSPARENT_COLOR = Color(0, 0, 0, 0)

# Borrowing control coordinates (relative coordinates for scaling)
# Base line positions for each note (where circles start)
# Original coordinates captured on 1200x720 diagram image
# Converted to relative (0-1) coordinates: x/1200, y/720
BORROWING_LINE_COORDINATES = {
    1: (0.036, 0.902),  # Line 1 - affects lowest note (bass)
    2: (0.110, 0.903),  # Line 2 - affects second lowest note (tenor)
    3: (0.188, 0.905),  # Line 3 - affects second highest note (alto)
    4: (0.267, 0.908),  # Line 4 - affects highest note (soprano)
}

# Arrow positions for each line (up and down)
# Original coordinates captured on 1200x720 diagram image
# Converted to relative (0-1) coordinates: x/1200, y/720
BORROWING_ARROW_COORDINATES = {
    1: {'up': (0.035, 0.828), 'down': (0.038, 0.977)},    # Line 1 arrows (26/1200, 498/720), (32/1200, 582/720)
    2: {'up': (0.109, 0.828), 'down': (0.111, 0.980)},    # Line 2 arrows (89/1200, 493/720), (92/1200, 584/720)
    3: {'up': (0.189, 0.833), 'down': (0.185, 0.970)},    # Line 3 arrows (152/1200, 495/720), (148/1200, 584/720)
    4: {'up': (0.268, 0.835), 'down': (0.268, 0.975)},    # Line 4 arrows (215/1200, 496/720), (216/1200, 583/720)
}
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


class UserSettingsGUI:
    """GUI class for user settings configuration before main application."""

    def __init__(self):
        """Initialize the settings GUI with default values from global variables."""
        # Convert global variables to GUI-friendly strings
        tonal_center_name = NOTE_NAMES_FLAT[DEFAULT_TONAL_CENTER_OFFSET % 12]

        # Convert duration constant to string
        duration_map = {WN: "Whole Note", HN: "Half Note", QN: "Quarter Note",
                       EN: "Eighth Note", SN: "Sixteenth Note"}
        chord_duration_name = duration_map.get(DEFAULT_CHORD_DURATION, "Half Note")

        # Convert instrument constant to string
        instrument_map = {RHODES_PIANO: "Rhodes Keyboard", PIANO: "Piano", SYNTH: "Synth",
                         CELLO: "Cello", DX_PIANO: "DX Keyboard", SHAKUHACHI: "Shakuhachi",
                         MUSIC_BOX: "Music Box"}
        instrument_name = instrument_map.get(DEFAULT_INSTRUMENT, "Rhodes Keyboard")

        # Convert display scale to string
        scale_name = f"{DEFAULT_DISPLAY_SCALE}x ({int(DEFAULT_DISPLAY_SCALE * 100)}%)"

        # Convert resolution to string
        resolution_name = f"{DEFAULT_SCREEN_WIDTH}x{DEFAULT_SCREEN_HEIGHT}"

        self.settings = {
            'tonal_center': tonal_center_name,
            'octave_range': DEFAULT_OCTAVE_RANGE,
            'voicing': DEFAULT_VOICING,
            'chord_duration': chord_duration_name,
            'instrument': instrument_name,
            'screen_resolution': resolution_name,
            'display_scale': scale_name
        }

        self.display = None
        self.dropdowns = {}
        self.done_button = None

    def show_settings_gui(self):
        """Create and show the settings configuration window."""
        # Create settings display window - smaller size to fit on any display
        # Center on smallest common display (1366x768)
        window_width = 600
        window_height = 450
        center_x = 1366 // 2 - window_width // 2
        center_y = 768 // 2 - window_height // 2

        self.display = Display("Movemental - User Settings", window_width, window_height,
                              center_x, center_y, Color(40, 40, 50))

        # Create dropdowns in grid layout
        self._create_dropdowns()

        # Create Done button with callback to start main application
        self.done_button = Button("Start", self._on_done_clicked)
        self.display.add(self.done_button, window_width // 2 - 50, window_height - 60)

    def _create_dropdowns(self):
        """Create all dropdown lists with proper positioning."""
        # Compact 2-column layout with smaller spacing
        # Row 1: Tonal Center | Octave Range
        self._create_tonal_center_dropdown()
        self._create_octave_range_dropdown()

        # Row 2: Voicing | Chord Duration
        self._create_voicing_dropdown()
        self._create_chord_duration_dropdown()

        # Row 3: Instrument | Screen Resolution
        self._create_instrument_dropdown()
        self._create_resolution_dropdown()

        # Row 4: Display Scale (centered)
        self._create_display_scale_dropdown()

    def _create_tonal_center_dropdown(self):
        """Create tonal center dropdown."""
        label = Label("Tonal Center:", LEFT, Color.WHITE)
        self.display.add(label, 30, 80)

        # Get current selection and put it first if not already first
        current_selection = self.settings['tonal_center']
        all_notes = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

        if current_selection == all_notes[0]:
            tonal_center_options = all_notes
        else:
            tonal_center_options = [current_selection] + all_notes

        self.dropdowns['tonal_center'] = DropDownList(
            tonal_center_options,
            self._on_tonal_center_selected
        )
        self.display.add(self.dropdowns['tonal_center'], 150, 80)

    def _create_octave_range_dropdown(self):
        """Create octave range dropdown."""
        label = Label("Octave Range:", LEFT, Color.WHITE)
        self.display.add(label, 320, 80)

        # Get current octave range and put it first if not already first
        current_octave = str(self.settings['octave_range'])
        all_octaves = ["2", "3", "4", "5", "6"]

        if current_octave == all_octaves[0]:
            octave_options = all_octaves
        else:
            octave_options = [current_octave] + all_octaves

        self.dropdowns['octave_range'] = DropDownList(
            octave_options,
            self._on_octave_range_selected
        )
        self.display.add(self.dropdowns['octave_range'], 440, 80)

    def _create_voicing_dropdown(self):
        """Create voicing dropdown."""
        label = Label("Voicing:", LEFT, Color.WHITE)
        self.display.add(label, 30, 130)

        # Get current voicing and put it first if not already first
        current_voicing = self.settings['voicing']
        all_voicings = ["Close", "Drop 2", "Drop 3", "Drop 2 and 4"]

        if current_voicing == all_voicings[0]:
            voicing_options = all_voicings
        else:
            voicing_options = [current_voicing] + all_voicings

        self.dropdowns['voicing'] = DropDownList(
            voicing_options,
            self._on_voicing_selected
        )
        self.display.add(self.dropdowns['voicing'], 150, 130)

    def _create_chord_duration_dropdown(self):
        """Create chord duration dropdown."""
        label = Label("Chord Duration:", LEFT, Color.WHITE)
        self.display.add(label, 320, 130)

        # Get current chord duration and put it first if not already first
        current_duration = self.settings['chord_duration']
        all_durations = ["Whole Note", "Half Note", "Quarter Note", "Eighth Note", "Sixteenth Note"]

        if current_duration == all_durations[0]:
            duration_options = all_durations
        else:
            duration_options = [current_duration] + all_durations

        self.dropdowns['chord_duration'] = DropDownList(
            duration_options,
            self._on_chord_duration_selected
        )
        self.display.add(self.dropdowns['chord_duration'], 440, 130)

    def _create_instrument_dropdown(self):
        """Create instrument dropdown."""
        label = Label("Instrument:", LEFT, Color.WHITE)
        self.display.add(label, 30, 180)

        # Get current instrument and put it first if not already first
        current_instrument = self.settings['instrument']
        all_instruments = ["Rhodes Keyboard", "Shakuhachi", "Piano", "Synth",
                           "Cello", "DX Keyboard", "Music Box"]

        if current_instrument == all_instruments[0]:
            instrument_options = all_instruments
        else:
            instrument_options = [current_instrument] + all_instruments

        self.dropdowns['instrument'] = DropDownList(
            instrument_options,
            self._on_instrument_selected
        )
        self.display.add(self.dropdowns['instrument'], 150, 180)

    def _create_resolution_dropdown(self):
        """Create screen resolution dropdown."""
        label = Label("Screen Resolution:", LEFT, Color.WHITE)
        self.display.add(label, 320, 180)

        # Get current resolution and put it first if not already first
        current_resolution = self.settings['screen_resolution']
        all_resolutions = ["1920x1200", "3440x1440", "1920x1080", "2560x1440",
                          "3840x2160", "1366x768", "2560x1600"]

        if current_resolution == all_resolutions[0]:
            resolution_options = all_resolutions
        else:
            resolution_options = [current_resolution] + all_resolutions

        self.dropdowns['screen_resolution'] = DropDownList(
            resolution_options,
            self._on_resolution_selected
        )
        self.display.add(self.dropdowns['screen_resolution'], 440, 180)

    def _create_display_scale_dropdown(self):
        """Create display scale dropdown."""
        label = Label("Display Scale:", LEFT, Color.WHITE)
        self.display.add(label, 200, 230)

        # Get current display scale and put it first if not already first
        current_scale = self.settings['display_scale']
        all_scales = ["1.0x (100%)", "1.25x (125%)", "1.5x (150%)", "1.75x (175%)", "2.0x (200%)"]

        if current_scale == all_scales[0]:
            scale_options = all_scales
        else:
            scale_options = [current_scale] + all_scales

        self.dropdowns['display_scale'] = DropDownList(
            scale_options,
            self._on_display_scale_selected
        )
        self.display.add(self.dropdowns['display_scale'], 320, 230)

    # Dropdown callback functions:
    def _on_tonal_center_selected(self, selection):
        """Handle tonal center selection."""
        self.settings['tonal_center'] = selection

    def _on_octave_range_selected(self, selection):
        """Handle octave range selection."""
        self.settings['octave_range'] = int(selection)

    def _on_voicing_selected(self, selection):
        """Handle voicing selection."""
        self.settings['voicing'] = selection

    def _on_chord_duration_selected(self, selection):
        """Handle chord duration selection."""
        self.settings['chord_duration'] = selection

    def _on_instrument_selected(self, selection):
        """Handle instrument selection."""
        self.settings['instrument'] = selection

    def _on_resolution_selected(self, selection):
        """Handle screen resolution selection."""
        self.settings['screen_resolution'] = selection

    def _on_display_scale_selected(self, selection):
        """Handle display scale selection."""
        self.settings['display_scale'] = selection

    def _on_done_clicked(self):
        """Handle Done button click - apply settings and start main application."""
        if self.display:
            # print("Applying user settings...")
            apply_user_settings(self.settings)

            # print("Initializing main application...")
            initialize_application()

            # Register callback for playing chords by clicking the mouse
            diagram_display.onMouseClick(choose_action)

            # Show CLI info
            show_cli_info()

            # Close settings window
            self.display.close()


# region Settings Conversion Functions ########################################
def string_to_tonal_center_offset(note_name):
    """Convert note name string to tonal center offset value."""
    # Match the original system where C = 0
    note_map = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5,
                "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
    return note_map.get(note_name, G0)  # Default is G


def string_to_duration(duration_name):
    """Convert duration name string to MIDI duration constant."""
    duration_map = {
        "Whole Note": WN, "Half Note": HN, "Quarter Note": QN,
        "Eighth Note": EN, "Sixteenth Note": SN
    }
    return duration_map.get(duration_name, HN)


def string_to_instrument(instrument_name):
    """Convert instrument name string to MIDI instrument constant."""
    instrument_map = {
        "Rhodes Keyboard": RHODES_PIANO,
        "Shakuhachi": SHAKUHACHI,
        "Piano": PIANO,
        "Synth": SYNTH,
        "Cello": CELLO,
        "DX Keyboard": DX_PIANO,
        "Music Box": MUSIC_BOX
    }
    return instrument_map.get(instrument_name, SHAKUHACHI)


def parse_resolution(resolution_string):
    """Parse '1920x1200' into (width, height) tuple."""
    try:
        width, height = resolution_string.split('x')
        return int(width), int(height)
    except:
        return 1920, 1200  # Default fallback


def parse_display_scale(scale_string):
    """Parse '1.5x (150%)' into float value."""
    try:
        # Extract the numeric part before 'x'
        scale_part = scale_string.split('x')[0]
        return float(scale_part)
    except:
        return 1.5  # Default fallback


def apply_user_settings(settings_dict):
    """Apply user settings to runtime variables and recalculate constants."""
    global TONAL_CENTER_OFFSET, OCTAVE_RANGE, VOICING, CHORD_DURATION
    global SCREEN_WIDTH, SCREEN_HEIGHT, DISPLAY_SCALE, INSTRUMENT
    global TONAL_CENTER_PITCH_CLASS, OCTAVE_OFFSET

    # Apply basic settings
    TONAL_CENTER_OFFSET = string_to_tonal_center_offset(settings_dict['tonal_center'])
    OCTAVE_RANGE = settings_dict['octave_range']
    VOICING = settings_dict['voicing']
    CHORD_DURATION = string_to_duration(settings_dict['chord_duration'])

    # Apply screen settings
    SCREEN_WIDTH, SCREEN_HEIGHT = parse_resolution(settings_dict['screen_resolution'])
    DISPLAY_SCALE = parse_display_scale(settings_dict['display_scale'])

    # Recalculate derived constants
    TONAL_CENTER_PITCH_CLASS = TONAL_CENTER_OFFSET % 12
    OCTAVE_OFFSET = OCTAVE * OCTAVE_RANGE

    # Set instrument
    INSTRUMENT = string_to_instrument(settings_dict['instrument'])
    Play.setInstrument(INSTRUMENT)

    # Initialize chord dictionary with the new tonal center
    initialize_chord_dictionary()


def show_user_settings_gui():
    """Show the user settings GUI."""
    settings_gui = UserSettingsGUI()
    settings_gui.show_settings_gui()
    # The GUI will handle everything through callbacks
    # No need to return anything or wait


def show_cli_info():
    """Display CLI information and ASCII art."""
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
# endregion Settings Conversion Functions ####################################


class Chord:
    def __init__(self, name, pitches):
        """Initialize a Chord with name and pitches.

        Args:
            name (str): The elemental name of the chord
            pitches (list): List of pitch values for the chord
        """
        self.name = name

        # Store root pitch class from original chord definition (before tonal center offset)
        root_pitch_class = pitches[0] % 12

        # Convert to pitch classes (0-11) then add tonal center offset
        self.pitches = [(x % 12) + TONAL_CENTER_PITCH_CLASS
                        for x in pitches]

        # Type of 4 note chord - simplified with dictionary lookup
        chord_quality_map = {
            "Earth": " dim7", "Wind": " dim7",
            "-Fire": "7 b5", "Fire": " dim7",  # -Fire must come before Fire
            "Trunk": " min6", "Smoke": " min6", "Magma": " min6",
            "Branch": " maj6", "Ember": " maj6", "Glass": " maj6",
            "Sand-Storm": "7 b5", "Fire-Storm": "7 b5",
            "Leaf": "7", "Flame": "7", "Charcoal": "7"
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

        # Find where the root note ended up after sorting
        # The root pitch class after tonal center offset
        transposed_root_pitch_class = (root_pitch_class + TONAL_CENTER_PITCH_CLASS) % 12
        self.root_position_index = 0  # Default to first position
        for i, pitch in enumerate(self.pitches):
            if pitch % 12 == transposed_root_pitch_class:
                self.root_position_index = i
                break

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


def initialize_chord_dictionary():
    """Initialize the COORDINATES_TO_CHORD dictionary with all chord definitions.

    This function must be called after user settings are applied so that
    the correct tonal center is used when creating Chord objects.
    """
    global COORDINATES_TO_CHORD

    # Clear any existing chords
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
    COORDINATES_TO_CHORD[(0.233, 0.754)] = Chord("Brother Magma",
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


# region GUI Setup Functions ##################################################
def calculate_safe_radius(clock_width, display_height):
    """Calculate the maximum safe radius that leaves room for all labels."""
    # Available space is the smaller dimension of the clock display
    available_space = min(clock_width, display_height)

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
        chord_display.add(note_label, label_x - 8, adjusted_label_y - 5)
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


# Global variables for chord display (will be initialized in main)
clock_color_gradient = None
clock_path = None
note_nodes = []
note_connection_lines = []
chord_info_text = None
note_labels = []
diagram_display = None
chord_display = None
selected_chord_dot = None
DISPLAY_HEIGHT = None
CLOCK_WIDTH = None

# Global variables for borrowing controls
borrowing_circles = {}  # Dictionary to store circles by line number
current_selected_chord = None
# endregion GUI Setup Functions ###############################################


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


def play_chord(chord_or_pitches):
    """Play the provided chord or list of pitch classes.

    Args:
        chord_or_pitches: Either a Chord object or a list of pitch classes (0-11)
    """
    global DISPLAY_HEIGHT, CLOCK_WIDTH

    # Stop any sounding notes
    Play.allNotesOff()

    # Handle both Chord objects and pitch class lists
    if isinstance(chord_or_pitches, Chord):
        chord = chord_or_pitches
        pitches = chord.pitches
        chord_info = chord
    else:
        # Assume it's a list of pitch classes
        pitches = chord_or_pitches
        chord_info = None

    adjusted_pitches = []
    # Place notes in the correct octave range based on the chosen voicing
    for i in range(len(pitches)):
        # Place the pitch class into the correct octave range
        adjusted_pitch = pitches[i] + OCTAVE_OFFSET

        # For the chosen voicing, raise the appropriate notes up an octave
        if i in VOICING_TO_INDICES.get(VOICING):
            if adjusted_pitch + OCTAVE <= MAX_VOICING_PITCH:
                adjusted_pitch += OCTAVE

        # Add correctly placed pitch
        adjusted_pitches.append(adjusted_pitch)
        # Play.note(adjusted_pitch, 0, 1000, 120)

    # Create the chord
    phrase = Phrase()
    phrase.addChord(adjusted_pitches, CHORD_DURATION, 120)

    # Play the chord!
    Play.midi(phrase)

    # Update chord display with the chord pitches and info
    update_chord_display(adjusted_pitches)
    if chord_info:
        update_chord_info_display(chord_info)


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


def create_custom_chord_labels(elemental_name, traditional_name, font_size, horizontal_center, top_y, bottom_y):
    """Create and position custom chord name labels."""
    global chord_info_text, chord_display

    # Elemental name (top center, perfectly centered for any length)
    elemental_label = Label(elemental_name, CENTER, Color.WHITE)
    elemental_label.setFont(Font("Arial", Font.BOLD, font_size))
    chord_info_text['elemental'] = elemental_label

    # Calculate precise position for perfect centering
    elemental_x = get_precise_label_position(
        elemental_name, font_size, horizontal_center)
    chord_display.add(elemental_label, elemental_x, top_y)

    # Traditional name (bottom center, perfectly centered for any length)
    traditional_label = Label(traditional_name, CENTER, Color.WHITE)
    traditional_label.setFont(Font("Arial", Font.BOLD, font_size))
    chord_info_text['traditional'] = traditional_label

    # Calculate precise position for perfect centering
    traditional_x = get_precise_label_position(
        traditional_name, font_size, horizontal_center)
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


def update_chord_info_display_with_name(elemental_name, traditional_name):
    """Update the chord information text with custom names.

    Args:
        elemental_name (str): The elemental name to display
        traditional_name (str): The traditional name to display
    """
    global chord_info_text, chord_display

    # Remove old labels if they exist
    if chord_info_text['elemental']:
        chord_display.remove(chord_info_text['elemental'])
    if chord_info_text['traditional']:
        chord_display.remove(chord_info_text['traditional'])

    # Calculate positions and create labels
    font_size, horizontal_center, top_y, bottom_y = calculate_label_positions()

    # Create custom labels
    create_custom_chord_labels(elemental_name, traditional_name, font_size, horizontal_center, top_y, bottom_y)


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


def update_chord_display_with_note_states(pitches):
    """Update the chord display with all notes, but hide turned-off ones.

    Args:
        pitches (list): List of four MIDI pitch values (including turned-off notes)
    """
    global note_nodes, note_connection_lines, clock_color_gradient, BORROWING_STATE

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
        color_index = int((angle / PI_TIMES_2) * 24) % 24
        colors.append(clock_color_gradient[color_index])

    # Update node positions and colors, but hide turned-off notes
    root_position_mapping = get_root_position_mapping(current_selected_chord)

    for i in range(4):
        if i < len(positions):
            # Check if this note is turned off
            note_is_off = False
            for line_position in range(1, 5):
                if (BORROWING_STATE['note_states'][line_position] == 'off' and
                    root_position_mapping[line_position] == i):
                    note_is_off = True
                    break

            if note_is_off:
                # Hide turned-off note by moving to center and making transparent
                note_nodes[i].setColor(TRANSPARENT_COLOR)
                chord_display.move(note_nodes[i], CLOCK_X, CLOCK_Y)
            else:
                # Show active note
                x, y = positions[i]
                note_nodes[i].setColor(colors[i])
                chord_display.move(note_nodes[i], x, y)
        else:
            # Hide unused nodes
            note_nodes[i].setColor(TRANSPARENT_COLOR)
            chord_display.move(note_nodes[i], CLOCK_X, CLOCK_Y)

    # Update connecting lines to connect only active nodes
    active_positions = []
    for i in range(4):
        if i < len(positions):
            # Check if this note is active (not turned off)
            note_is_off = False
            for line_position in range(1, 5):
                if (BORROWING_STATE['note_states'][line_position] == 'off' and
                    root_position_mapping[line_position] == i):
                    note_is_off = True
                    break

            if not note_is_off:
                active_positions.append(positions[i])

    if len(active_positions) >= 2:
        # Connect active nodes to each other
        line_connections = []
        for i in range(len(active_positions)):
            for j in range(i + 1, len(active_positions)):
                line_connections.append((i, j))

        # Update connection lines
        for i, (start_idx, end_idx) in enumerate(line_connections):
            if i < len(note_connection_lines):
                start_x, start_y = active_positions[start_idx]
                end_x, end_y = active_positions[end_idx]

                # Create new line with updated coordinates
                new_line = Line(start_x, start_y, end_x, end_y, Color.WHITE, 2)
                chord_display.remove(note_connection_lines[i])
                chord_display.add(new_line)
                note_connection_lines[i] = new_line

        # Hide unused connection lines
        for i in range(len(line_connections), len(note_connection_lines)):
            new_line = Line(CLOCK_X, CLOCK_Y, CLOCK_X, CLOCK_Y, Color.WHITE, 2)
            chord_display.remove(note_connection_lines[i])
            chord_display.add(new_line)
            note_connection_lines[i] = new_line
    else:
        # Hide all lines if not enough active notes
        for i, line in enumerate(note_connection_lines):
            new_line = Line(CLOCK_X, CLOCK_Y, CLOCK_X, CLOCK_Y, Color.WHITE, 2)
            chord_display.remove(line)
            chord_display.add(new_line)
            note_connection_lines[i] = new_line


first_time = True
# make a bar of dashes with | in the same places as header
TABLE_SEPARATOR = "|" + "-" * 32 + "|" + "-" * 22 + "|" + "-" * 22 + "|"


def select_chord(x, y):
    """Find the closest chord and play it.

    Args:
        x (int): X coordinate of the click (absolute)
        y (int): Y coordinate of the click (absolute)
    """
    global first_time, TABLE_SEPERATOR, current_selected_chord

    if first_time:
        first_time = False
        voicing_header = VOICING + " Voicing"
        header = (f"| {'Elemental Name':^30} | {'Traditional Name':^20} | "
                  f"{voicing_header:^20} |")
        print("\n" + header)

        print(TABLE_SEPARATOR)

    # Find the closest point (returns relative coordinates)
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())

    # Get chord info
    chord = COORDINATES_TO_CHORD[point]

    # Update current selected chord for borrowing
    current_selected_chord = chord

    # Play the chord (this will also update the chord display)
    play_chord(chord)

    # Place a dot on the selection (point is already relative)
    select_chord_visually(point[0], point[1])

    # Handle borrowing state for this chord
    if chord.name in ["Earth", "Wind", "Fire"]:
        # Fundamental chords - reset borrowing and make circles gray
        reset_borrowing_circles()
        update_borrowing_display()
        display_name = chord.name
    else:
        # Regular chords - restore borrowing state
        restore_borrowing_state(chord.name)
        # Create borrowing name for display
        display_name = create_borrowing_name(chord.name, BORROWING_STATE)

    # Create active spelling based on current state
    active_spelling = create_active_spelling(chord, BORROWING_STATE)

    print(f"| {display_name:^30} | {chord.traditional_name:^20} | "
          f"{active_spelling:^20} |")
    print(TABLE_SEPARATOR)


def choose_action(x, y):
    """Handle mouse click actions.

    TODO: only need this if I add a different click function

    Args:
        x (int): X coordinate of the click (absolute)
        y (int): Y coordinate of the click (absolute)
    """
    # print(f'{x/diagram_display.getWidth():.3f}, {y/diagram_display.getHeight():.3f}')

    # First check for borrowing control clicks
    if handle_borrowing_click(x, y):
        return

    # Original chord selection logic
    point = find_closest_point([x, y], COORDINATES_TO_CHORD.keys())
    new_x, new_y = point

    # Test if key holds type is a chord
    if isinstance(COORDINATES_TO_CHORD[point],
                  Chord):  # test if value is a Chord
        # If a chord, call play chord function (pass original absolute
        # coordinates)
        select_chord(x, y)


# region Borrowing Functions ##################################################
def get_chord_by_name(chord_name):
    """Find chord by name in COORDINATES_TO_CHORD."""
    for chord in COORDINATES_TO_CHORD.values():
        if chord.name == chord_name:
            return chord
    return None


def get_elemental_chord(element_name):
    """Get one of the three primary elemental chords."""
    elemental_chords = ["Earth", "Wind", "Fire"]
    if element_name in elemental_chords:
        return get_chord_by_name(element_name)
    return None


def find_next_higher_note(reference_pitch, available_pitches):
    """Find the next higher note from available pitches."""
    # Convert to pitch classes for comparison
    reference_pc = reference_pitch % 12
    available_pcs = [pitch % 12 for pitch in available_pitches]

    # Find pitches higher than reference
    higher_pitches = [pc for pc in available_pcs if pc > reference_pc]

    if higher_pitches:
        # Return the lowest higher pitch
        return min(higher_pitches)
    else:
        # Wrap around to the lowest available pitch
        return min(available_pcs)


def find_next_lower_note(reference_pitch, available_pitches):
    """Find the next lower note from available pitches."""
    # Convert to pitch classes for comparison
    reference_pc = reference_pitch % 12
    available_pcs = [pitch % 12 for pitch in available_pitches]

    # Find pitches lower than reference
    lower_pitches = [pc for pc in available_pcs if pc < reference_pc]

    if lower_pitches:
        # Return the highest lower pitch
        return max(lower_pitches)
    else:
        # Wrap around to the highest available pitch
        return max(available_pcs)


def get_borrowed_chord(chord_name, target_note_index, direction, opposite_element):
    """
    Generate a borrowed version of a chord by replacing a specific note.

    Args:
        chord_name (str): Name of the chord to borrow from
        target_note_index (int): Index of note to replace (0=lowest, 3=highest)
        direction (str): 'above' or 'below'
        opposite_element (str): Element to borrow from ('Earth', 'Wind', 'Fire')

    Returns:
        list: New chord pitches with borrowed note
    """
    # Get original chord
    original_chord = get_chord_by_name(chord_name)
    if not original_chord:
        return []

    original_pitches = sorted(original_chord.pitches)  # Ensure sorted order

    # Get opposite element chord
    opposite_chord = get_elemental_chord(opposite_element)
    if not opposite_chord:
        return []

    opposite_pitches = opposite_chord.pitches

    # Get the target note to replace
    if target_note_index >= len(original_pitches):
        return original_pitches

    target_pitch = original_pitches[target_note_index]

    # Find replacement note from opposite element
    if direction == 'above':
        # Find next higher note from opposite element
        replacement = find_next_higher_note(target_pitch, opposite_pitches)
    else:  # below
        # Find next lower note from opposite element
        replacement = find_next_lower_note(target_pitch, opposite_pitches)

    # Create new chord with replacement
    new_pitches = original_pitches.copy()
    new_pitches[target_note_index] = replacement

    return new_pitches


def get_borrowed_chord_from_ui_click(chord_name, line_position, direction, opposite_element):
    """
    Wrapper function that maps UI line position to note index.

    Args:
        chord_name (str): Name of the chord to borrow from
        line_position (int): UI line position (1-4)
        direction (str): 'above' or 'below'
        opposite_element (str): Element to borrow from

    Returns:
        list: New chord pitches with borrowed note
    """
    # Get the chord object to determine root position mapping
    chord = get_chord_by_name(chord_name)
    if not chord:
        return []

    # Map line position to note index using root position order
    root_position_mapping = get_root_position_mapping(chord)
    target_note_index = root_position_mapping[line_position]

    return get_borrowed_chord(chord_name, target_note_index, direction, opposite_element)




def create_borrowing_controls():
    """Create the borrowing control UI elements - just the blue circles."""
    global borrowing_circles

    # Initialize global variables
    borrowing_circles = {}

    # Create 4 blue circles, one for each note position
    for line_num in range(1, 5):
        # Get line coordinates
        line_coord = BORROWING_LINE_COORDINATES[line_num]
        line_x, line_y = relative_to_absolute(line_coord)

        # Create blue circle (starts on line)
        circle = Circle(line_x, line_y, BORROWING_CONTROLS['circle_radius'], Color.BLUE, True)
        diagram_display.add(circle)
        borrowing_circles[line_num] = circle


def relative_to_absolute(coord):
    """Convert relative coordinates to absolute coordinates."""
    display_width = diagram_display.getWidth()
    display_height = diagram_display.getHeight()
    return int(coord[0] * display_width), int(coord[1] * display_height)


def is_borrowing_click(x, y):
    """Check if click is within borrowing control area."""
    # Only check if we have borrowing controls initialized
    if not borrowing_circles:
        return False

    # Don't allow borrowing clicks for fundamental chords
    if current_selected_chord and current_selected_chord.name in ["Earth", "Wind", "Fire"]:
        return False

    # Check if click is near any arrow position with larger detection radius
    for line_num in range(1, 5):
        # Check up arrow
        up_coord = BORROWING_ARROW_COORDINATES[line_num]['up']
        up_x, up_y = relative_to_absolute(up_coord)
        up_distance = distance((x, y), (up_x, up_y))
        if up_distance < 25:  # Larger detection radius
            return True

        # Check down arrow
        down_coord = BORROWING_ARROW_COORDINATES[line_num]['down']
        down_x, down_y = relative_to_absolute(down_coord)
        down_distance = distance((x, y), (down_x, down_y))
        if down_distance < 25:  # Larger detection radius
            return True

        # Check line position (to reset borrowing)
        line_coord = BORROWING_LINE_COORDINATES[line_num]
        line_x, line_y = relative_to_absolute(line_coord)
        line_distance = distance((x, y), (line_x, line_y))
        if line_distance < 25:  # Larger detection radius
            return True

    return False


def get_clicked_borrowing_control(x, y):
    """Determine which borrowing control was clicked."""
    closest_line = None
    closest_direction = None
    min_distance = float('inf')

    for line_num in range(1, 5):
        # Check up arrow
        up_coord = BORROWING_ARROW_COORDINATES[line_num]['up']
        up_x, up_y = relative_to_absolute(up_coord)
        up_distance = distance((x, y), (up_x, up_y))
        if up_distance < min_distance and up_distance < 25:  # Larger detection radius
            min_distance = up_distance
            closest_line = line_num
            closest_direction = 'up'

        # Check down arrow
        down_coord = BORROWING_ARROW_COORDINATES[line_num]['down']
        down_x, down_y = relative_to_absolute(down_coord)
        down_distance = distance((x, y), (down_x, down_y))
        if down_distance < min_distance and down_distance < 25:  # Larger detection radius
            min_distance = down_distance
            closest_line = line_num
            closest_direction = 'down'

        # Check line position (to reset borrowing)
        line_coord = BORROWING_LINE_COORDINATES[line_num]
        line_x, line_y = relative_to_absolute(line_coord)
        line_distance = distance((x, y), (line_x, line_y))
        if line_distance < min_distance and line_distance < 25:  # Larger detection radius
            min_distance = line_distance
            closest_line = line_num
            closest_direction = 'line'

    if closest_line:
        return closest_line, closest_direction

    return None, None


def activate_borrowing(line_position, direction):
    """Activate borrowing for the specified line and direction."""
    global current_selected_chord, BORROWING_STATE

    # Get current selected chord
    if not current_selected_chord:
        return

    # Check if this is a fundamental chord (Earth, Wind, Fire) - no borrowing allowed
    if current_selected_chord.name in ["Earth", "Wind", "Fire"]:
        return

    # Handle line click when circle is already on line - toggle note off
    if direction == 'line' and BORROWING_STATE['circle_positions'][line_position] == 'line':
        # Toggle note off
        BORROWING_STATE['circle_positions'][line_position] = 'off'
        BORROWING_STATE['borrowing_directions'][line_position] = 'off'
        BORROWING_STATE['note_states'][line_position] = 'off'

        # Hide circle
        hide_circle(line_position)

        # Update history for this chord
        chord_name = current_selected_chord.name
        if chord_name not in BORROWING_STATE['borrowing_history']:
            BORROWING_STATE['borrowing_history'][chord_name] = {}
        BORROWING_STATE['borrowing_history'][chord_name][line_position] = 'off'

        # Generate and play modified chord
        generate_and_play_borrowed_chord()

        # Update visual display
        update_borrowing_display()
        return

    # Handle clicking on off note to turn it back on (line click)
    if direction == 'line' and BORROWING_STATE['circle_positions'][line_position] == 'off':
        # Turn note back on
        BORROWING_STATE['circle_positions'][line_position] = 'line'
        BORROWING_STATE['borrowing_directions'][line_position] = None
        BORROWING_STATE['note_states'][line_position] = 'on'

        # Show circle back on line
        show_circle(line_position)
        move_circle_to_line(line_position)

        # Update history for this chord
        chord_name = current_selected_chord.name
        if chord_name not in BORROWING_STATE['borrowing_history']:
            BORROWING_STATE['borrowing_history'][chord_name] = {}
        BORROWING_STATE['borrowing_history'][chord_name][line_position] = 'line'

        # Generate and play modified chord
        generate_and_play_borrowed_chord()

        # Update visual display
        update_borrowing_display()
        return

    # Handle clicking arrow when note is off - turn note on and move to arrow
    if direction in ['up', 'down'] and BORROWING_STATE['circle_positions'][line_position] == 'off':
        # Turn note back on
        BORROWING_STATE['note_states'][line_position] = 'on'

        # Show circle and move to arrow position
        show_circle(line_position)
        move_circle_to_arrow(line_position, direction)

        # Update borrowing state
        BORROWING_STATE['circle_positions'][line_position] = direction
        BORROWING_STATE['borrowing_directions'][line_position] = direction

        # Store borrowing state in history for this chord
        chord_name = current_selected_chord.name
        if chord_name not in BORROWING_STATE['borrowing_history']:
            BORROWING_STATE['borrowing_history'][chord_name] = {}
        BORROWING_STATE['borrowing_history'][chord_name][line_position] = direction

        # Generate and play borrowed chord
        generate_and_play_borrowed_chord()

        # Update visual display
        update_borrowing_display()
        return

    # Handle line click (reset borrowing for this line) - original behavior
    if direction == 'line':
        # Reset this line to no borrowing
        BORROWING_STATE['circle_positions'][line_position] = 'line'
        BORROWING_STATE['borrowing_directions'][line_position] = None

        # Update history for this chord
        chord_name = current_selected_chord.name
        if chord_name not in BORROWING_STATE['borrowing_history']:
            BORROWING_STATE['borrowing_history'][chord_name] = {}
        BORROWING_STATE['borrowing_history'][chord_name][line_position] = 'line'

        # Move circle back to line
        move_circle_to_line(line_position)

        # Generate and play borrowed chord
        generate_and_play_borrowed_chord()

        # Update visual display
        update_borrowing_display()
        return

    # Determine opposite element
    opposite_element = ELEMENTAL_RELATIONSHIPS.get(current_selected_chord.name, [None])[0]
    if not opposite_element:
        return

    # Update borrowing state for this line
    BORROWING_STATE['circle_positions'][line_position] = direction
    BORROWING_STATE['borrowing_directions'][line_position] = direction

    # Store borrowing state in history for this chord
    chord_name = current_selected_chord.name
    if chord_name not in BORROWING_STATE['borrowing_history']:
        BORROWING_STATE['borrowing_history'][chord_name] = {}
    BORROWING_STATE['borrowing_history'][chord_name][line_position] = direction

    # Move the circle to the arrow position
    move_circle_to_arrow(line_position, direction)

    # Generate and play borrowed chord
    generate_and_play_borrowed_chord()

    # Update visual display
    update_borrowing_display()


def move_circle_to_arrow(line_position, direction):
    """Move a circle to the specified arrow position."""
    global borrowing_circles

    if line_position in borrowing_circles:
        # Get the arrow coordinates
        arrow_coord = BORROWING_ARROW_COORDINATES[line_position][direction]
        abs_x, abs_y = relative_to_absolute(arrow_coord)

        # Move the circle
        diagram_display.move(borrowing_circles[line_position], abs_x, abs_y)


def move_circle_to_line(line_position):
    """Move a circle back to its line position."""
    global borrowing_circles

    if line_position in borrowing_circles:
        # Get the line coordinates
        line_coord = BORROWING_LINE_COORDINATES[line_position]
        abs_x, abs_y = relative_to_absolute(line_coord)

        # Move the circle
        diagram_display.move(borrowing_circles[line_position], abs_x, abs_y)


def hide_circle(line_position):
    """Hide the circle for the specified line position by making it transparent."""
    global borrowing_circles

    if line_position in borrowing_circles:
        # Use global transparent color to hide the circle
        borrowing_circles[line_position].setColor(TRANSPARENT_COLOR)


def show_circle(line_position):
    """Show the circle for the specified line position by making it visible."""
    global borrowing_circles

    if line_position in borrowing_circles:
        # Restore the circle to its normal blue color (alpha = 255)
        borrowing_circles[line_position].setColor(Color.BLUE)


def move_circle_off_screen(line_position):
    """Move circle off-screen when note is turned off."""
    global borrowing_circles

    if line_position in borrowing_circles:
        # Move circle to a position off-screen (negative coordinates)
        diagram_display.move(borrowing_circles[line_position], -100, -100)


def generate_and_play_borrowed_chord():
    """Generate and play the current borrowed chord based on all active borrowings."""
    global current_selected_chord, BORROWING_STATE

    if not current_selected_chord:
        return

    # Start with original chord
    original_pitches = sorted(current_selected_chord.pitches)
    borrowed_pitches = original_pitches.copy()

    # Apply all active borrowings
    opposite_element = ELEMENTAL_RELATIONSHIPS.get(current_selected_chord.name, [None])[0]
    if opposite_element:
        opposite_chord = get_elemental_chord(opposite_element)
        if opposite_chord:
            opposite_pitches = opposite_chord.pitches

            # Get root position mapping for this chord
            root_position_mapping = get_root_position_mapping(current_selected_chord)

            for line_position in range(1, 5):
                # Skip notes that are turned off
                if BORROWING_STATE['note_states'][line_position] == 'off':
                    continue

                if BORROWING_STATE['circle_positions'][line_position] != 'line':
                    direction = BORROWING_STATE['borrowing_directions'][line_position]
                    target_note_index = root_position_mapping[line_position]

                    if target_note_index < len(borrowed_pitches):
                        target_pitch = borrowed_pitches[target_note_index]

                        if direction == 'up':
                            replacement = find_next_higher_note(target_pitch, opposite_pitches)
                        else:  # down
                            replacement = find_next_lower_note(target_pitch, opposite_pitches)

                        borrowed_pitches[target_note_index] = replacement

    # Create borrowing name
    borrowing_name = create_borrowing_name(current_selected_chord.name, BORROWING_STATE)

    # Filter out notes that are turned off for playback
    active_pitches = []
    root_position_mapping = get_root_position_mapping(current_selected_chord)

    for line_position in range(1, 5):
        if BORROWING_STATE['note_states'][line_position] == 'on':
            note_index = root_position_mapping[line_position]
            if note_index < len(borrowed_pitches):
                active_pitches.append(borrowed_pitches[note_index])

    # Play the modified chord (only active notes) - this will also update display
    # But we need to override the display to show all notes with proper visibility
    play_chord(active_pitches)

    # Override the chord display to show all notes, but hide turned-off ones
    update_chord_display_with_note_states(borrowed_pitches)

    # Update chord info display with borrowing name
    update_chord_info_display_with_name(borrowing_name, current_selected_chord.traditional_name)

    # Create active spelling based on current state
    active_spelling = create_active_spelling(current_selected_chord, BORROWING_STATE)

    # Print borrowing information to console
    print(f"| {borrowing_name:^30} | {current_selected_chord.traditional_name:^20} | "
          f"{active_spelling:^20} |")
    print(TABLE_SEPARATOR)

    # Update state
    BORROWING_STATE['active'] = any(pos != 'line' for pos in BORROWING_STATE['circle_positions'].values())
    BORROWING_STATE['chord_name'] = current_selected_chord.name
    BORROWING_STATE['borrowed_notes'] = active_pitches
    BORROWING_STATE['original_notes'] = original_pitches


def handle_borrowing_click(x, y):
    """Handle clicks on borrowing controls."""
    # Check if click is within borrowing control area
    if is_borrowing_click(x, y):
        line_position, direction = get_clicked_borrowing_control(x, y)
        if line_position is not None:
            activate_borrowing(line_position, direction)
            return True
    return False


def reset_borrowing_circles():
    """Reset all circles to their line positions."""
    global BORROWING_STATE

    # Reset state
    BORROWING_STATE['circle_positions'] = {1: 'line', 2: 'line', 3: 'line', 4: 'line'}
    BORROWING_STATE['borrowing_directions'] = {1: None, 2: None, 3: None, 4: None}
    BORROWING_STATE['note_states'] = {1: 'on', 2: 'on', 3: 'on', 4: 'on'}
    BORROWING_STATE['active'] = False

    # Move all circles back to lines and make them visible
    for line_position in range(1, 5):
        move_circle_to_line(line_position)
        show_circle(line_position)


def restore_borrowing_state(chord_name):
    """Restore borrowing state for a specific chord from history."""
    global BORROWING_STATE

    # Reset to default state first
    reset_borrowing_circles()

    # Check if this chord has borrowing history
    if chord_name in BORROWING_STATE['borrowing_history']:
        chord_borrowing = BORROWING_STATE['borrowing_history'][chord_name]

        # Apply each borrowing state
        for line_position, direction in chord_borrowing.items():
            if direction in ['up', 'down']:
                BORROWING_STATE['circle_positions'][line_position] = direction
                BORROWING_STATE['borrowing_directions'][line_position] = direction
                BORROWING_STATE['note_states'][line_position] = 'on'  # Borrowed notes are always on
                move_circle_to_arrow(line_position, direction)
            elif direction == 'line':
                # Keep line position (already set by reset_borrowing_circles)
                BORROWING_STATE['circle_positions'][line_position] = 'line'
                BORROWING_STATE['borrowing_directions'][line_position] = None
                BORROWING_STATE['note_states'][line_position] = 'on'  # Line position means note is on
            elif direction == 'off':
                # Restore turned-off note
                BORROWING_STATE['circle_positions'][line_position] = 'off'
                BORROWING_STATE['borrowing_directions'][line_position] = 'off'
                BORROWING_STATE['note_states'][line_position] = 'off'
                hide_circle(line_position)

        # Update active state
        BORROWING_STATE['active'] = any(pos != 'line' for pos in BORROWING_STATE['circle_positions'].values())

        # Generate and play the borrowed chord (always call this to handle turned-off notes)
        generate_and_play_borrowed_chord()

    # Update visual display (always call this)
    update_borrowing_display()


def update_borrowing_display():
    """Update visual indicators for borrowing state."""
    global borrowing_circles, current_selected_chord

    # Check if this is a fundamental chord (Earth, Wind, Fire) - make circles gray
    if current_selected_chord and current_selected_chord.name in ["Earth", "Wind", "Fire"]:
        for line_num, circle in borrowing_circles.items():
            circle.setColor(Color.GRAY)
        return

    # Update circle colors and visibility based on borrowing state
    for line_num, circle in borrowing_circles.items():
        if BORROWING_STATE['circle_positions'][line_num] == 'off':
            # Note is off - hide circle with transparent color
            circle.setColor(TRANSPARENT_COLOR)
        else:
            # Note is on - show circle with appropriate color
            if BORROWING_STATE['circle_positions'][line_num] != 'line':
                # Active borrowing - make circle green
                circle.setColor(Color.GREEN)
            else:
                # No borrowing - keep blue
                circle.setColor(Color.BLUE)


# endregion Borrowing Functions ###############################################
# endregion Functions #########################################################


# region Main #################################################################
def initialize_application():
    """Initialize the main application displays and setup."""
    global diagram_display, chord_display, CLOCK_X, CLOCK_Y, CLOCK_RADIUS
    global NODE_RADIUS, BIG_TICK_RADIUS, SMALL_TICK_RADIUS, LABEL_DISTANCE
    global DISPLAY_HEIGHT, CLOCK_WIDTH, selected_chord_dot

    # Calculate effective screen dimensions (accounting for scaling)
    EFFECTIVE_WIDTH = SCREEN_WIDTH / DISPLAY_SCALE
    EFFECTIVE_HEIGHT = SCREEN_HEIGHT / DISPLAY_SCALE

    # Layout: Diagram takes 2/3 width, Clock takes 1/3 width, both take 3/4 height
    # Use 95% of screen width to leave margins on sides
    TOTAL_WIDTH = int(EFFECTIVE_WIDTH * 0.95)  # 95% of effective width
    DIAGRAM_WIDTH = int(TOTAL_WIDTH * 2 / 3)  # 2/3 of the 95% width
    CLOCK_WIDTH = int(TOTAL_WIDTH * 1 / 3)    # 1/3 of the 95% width
    DISPLAY_HEIGHT = int(EFFECTIVE_HEIGHT * 3 / 4)

    # Center vertically on screen
    VERTICAL_CENTER = (EFFECTIVE_HEIGHT - DISPLAY_HEIGHT) / 2

    # Center horizontally on screen with 95% width
    HORIZONTAL_CENTER = (EFFECTIVE_WIDTH - TOTAL_WIDTH) / 2
    DIAGRAM_X = HORIZONTAL_CENTER
    CLOCK_X = HORIZONTAL_CENTER + DIAGRAM_WIDTH

    # Create main display with diagram image
    diagram_display = Display("Movemental", DIAGRAM_WIDTH, DISPLAY_HEIGHT,
                              DIAGRAM_X, VERTICAL_CENTER)
    diagram = Icon("./images/diagram.jpg", DIAGRAM_WIDTH, DISPLAY_HEIGHT)
    diagram_display.add(diagram)
    # diagram_display.showMouseCoordinates()

    # Create a circle that marks the active chord
    selected_chord_dot = Circle(DIAGRAM_WIDTH // 2, DISPLAY_HEIGHT // 2, 8, Color.BLUE, fill=True)
    diagram_display.add(selected_chord_dot)

    # Create separate display for chord visualization
    chord_display = Display("Chord Visualization", CLOCK_WIDTH, DISPLAY_HEIGHT,
                            CLOCK_X, VERTICAL_CENTER, Color.BLACK)

    # Recalculate chord positioning based on new dimensions
    CLOCK_X = CLOCK_WIDTH // 2
    CLOCK_Y = DISPLAY_HEIGHT // 2

    # Recalculate radius and other constants
    CLOCK_RADIUS = calculate_safe_radius(CLOCK_WIDTH, DISPLAY_HEIGHT)
    NODE_RADIUS = max(MIN_NODE_RADIUS, int(CLOCK_RADIUS * 0.1))
    BIG_TICK_RADIUS = max(MIN_TICK_RADIUS, int(CLOCK_RADIUS * 0.04))
    SMALL_TICK_RADIUS = max(MIN_SMALL_TICK_RADIUS, int(CLOCK_RADIUS * 0.02))
    LABEL_DISTANCE = max(MIN_LABEL_DISTANCE, int(CLOCK_RADIUS * 0.20))

    # Create the clock-like chord display
    create_chord_display()

    # Create borrowing controls
    create_borrowing_controls()


def main():
    """Main application entry point with settings GUI."""
    # Show user settings GUI - everything else happens via callback
    # print("Loading Movemental User Settings...")
    show_user_settings_gui()


if __name__ == "__main__":
    main()
# endregion Main ##############################################################
