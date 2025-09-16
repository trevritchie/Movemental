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
from config import config, NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, TRANSPARENT_COLOR, TABLE_SEPARATOR
from musical_core import (
    chord_manager, musical_calculations, borrowing_logic,
    Chord, ChordManager, PerformanceCache,
    initialize_chord_dictionary, get_position_on_chord_circle, pitch_to_angle,
    create_chord_color_gradient, get_root_position_mapping, generate_active_pitches,
    find_next_higher_note, find_next_lower_note, get_chord_by_name, get_elemental_chord,
    set_clock_dimensions
)
from borrowing_system import BorrowingController
from display_manager import DisplayManager
# endregion Imports ###########################################################


# Configuration is now managed by the config module
# All settings and constants have been moved to config.py









# get_root_position_mapping now imported from musical_core


# create_borrowing_name now handled by BorrowingController


# generate_active_pitches now imported from musical_core


def create_spelling_from_pitches(pitches):
    """
    Create chord spelling from a list of MIDI pitches (already voiced).

    Args:
        pitches (list): List of MIDI pitch values (already voiced and filtered)

    Returns:
        str: Spelling of the pitches sorted from low to high
    """
    if not pitches:
        return "No notes"

    # Sort by actual MIDI pitch values (low to high)
    sorted_pitches = sorted(pitches)
    note_names = [NOTE_NAMES_FLAT[pitch % 12] for pitch in sorted_pitches]

    return "  ".join(f"{name:<2}" for name in note_names)





# region Classes ##############################################################


class UserSettingsGUI:
    """GUI class for user settings configuration before main application."""

    def __init__(self):
        """Initialize the settings GUI with default values from global variables."""
        # Convert global variables to GUI-friendly strings
        tonal_center_name = NOTE_NAMES_FLAT[config.DEFAULT_TONAL_CENTER_OFFSET % 12]

        # Convert duration constant to string
        duration_map = {WN: "Whole Note", HN: "Half Note", QN: "Quarter Note",
                       EN: "Eighth Note", SN: "Sixteenth Note"}
        chord_duration_name = duration_map.get(config.DEFAULT_CHORD_DURATION, "Half Note")

        # Convert instrument constant to string
        instrument_map = {RHODES_PIANO: "Rhodes Keyboard", PIANO: "Piano", SYNTH: "Synth",
                         CELLO: "Cello", DX_PIANO: "DX Keyboard", SHAKUHACHI: "Shakuhachi",
                         MUSIC_BOX: "Music Box"}
        instrument_name = instrument_map.get(config.DEFAULT_INSTRUMENT, "Rhodes Keyboard")

        # Convert display scale to string
        scale_name = f"{config.DEFAULT_DISPLAY_SCALE}x ({int(config.DEFAULT_DISPLAY_SCALE * 100)}%)"

        # Convert resolution to string
        resolution_name = f"{config.DEFAULT_SCREEN_WIDTH}x{config.DEFAULT_SCREEN_HEIGHT}"

        self.settings = {
            'tonal_center': tonal_center_name,
            'octave_range': config.DEFAULT_OCTAVE_RANGE,
            'voicing': config.DEFAULT_VOICING,
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
        try:
            # Create settings display window - smaller size to fit on any display
            # Center on smallest common display (1366x768)
            window_width = 600
            window_height = 450
            center_x = 1366 // 2 - window_width // 2
            center_y = 768 // 2 - window_height // 2

            self.display = Display("Movemental - User Settings", window_width, 
                                  window_height, center_x, center_y, 
                                  Color(40, 40, 50))

            # Create dropdowns in grid layout
            self._create_dropdowns()

            # Create Done button with callback to start main application
            self.done_button = Button("Start", self._on_done_clicked)
            self.display.add(self.done_button, window_width // 2 - 50, 
                           window_height - 60)
            
        except Exception as e:
            print(f"Error creating settings GUI: {e}")
            # Fall back to default settings and start main application
            apply_user_settings({
                'tonal_center': 'C',
                'octave_range': 3,
                'voicing': 'Drop 2 and 4',
                'chord_duration': 'Half Note',
                'instrument': 'Piano',
                'screen_resolution': '1920x1200',
                'display_scale': '1.5x (150%)'
            })
            initialize_application()

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
        try:
            if self.display:
                # Apply user settings with validation
                apply_user_settings(self.settings)

                # Initialize main application (includes mouse click handler registration)
                initialize_application()

                # Show CLI info
                show_cli_info()

                # Close settings window
                self.display.close()
                
        except Exception as e:
            print(f"Error starting main application: {e}")
            # Try to close settings window even if there's an error
            try:
                if self.display:
                    self.display.close()
            except:
                pass


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
    try:
        # Apply basic settings to config object
        config.update_settings(
            TONAL_CENTER_OFFSET=string_to_tonal_center_offset(
                settings_dict['tonal_center']),
            OCTAVE_RANGE=settings_dict['octave_range'],
            VOICING=settings_dict['voicing'],
            CHORD_DURATION=string_to_duration(
                settings_dict['chord_duration']),
            INSTRUMENT=string_to_instrument(settings_dict['instrument'])
        )

        # Apply screen settings
        screen_width, screen_height = parse_resolution(settings_dict['screen_resolution'])
        display_scale = parse_display_scale(settings_dict['display_scale'])
        
        config.update_settings(
            SCREEN_WIDTH=screen_width,
            SCREEN_HEIGHT=screen_height,
            DISPLAY_SCALE=display_scale
        )

        # Validate all settings
        config.validate_settings()

        # Initialize chord dictionary with the new tonal center
        initialize_chord_dictionary()
        
    except Exception as e:
        print(f"Error applying user settings: {e}")
        # Fall back to defaults if there's an error
        config.__init__()


def show_user_settings_gui():
    """Show the user settings GUI."""
    settings_gui = UserSettingsGUI()
    settings_gui.show_settings_gui()
    # The GUI will handle everything through callbacks
    # No need to return anything or wait


def show_cli_info():
    """Display CLI information and ASCII art."""
    # CLI Info
    tonal_center = NOTE_NAMES_FLAT[config.get_tonal_center_pitch_class()]
    relative_minor = NOTE_NAMES_FLAT[(config.get_tonal_center_pitch_class() - 3) % 12]

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


# Chord class now imported from musical_core
# endregion Classes ###########################################################


# Coordinates to chords mapping now handled by musical_core.chord_manager
# endregion Coordinates to Chords #############################################


# Chord functions now imported from musical_core
# endregion chord Functions ###################################################


# region GUI Setup Functions ##################################################
# GUI setup functions now handled by DisplayManager


# Global variables - now managed by DisplayManager and BorrowingController
display_manager = None
borrowing_controller = None
# endregion GUI Setup Functions ###############################################


# region Functions ############################################################
# distance and find_closest_point now handled by DisplayManager


def play_chord(chord_or_pitches):
    """Play the provided chord or list of pitch classes.
    
    Args:
        chord_or_pitches: Either a Chord object or a list of pitch classes (0-11)
    """
    global DISPLAY_HEIGHT, CLOCK_WIDTH
    
    try:
        print("DEBUG: play_chord called - generating MIDI phrase")
        
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
            # Skip null values (turned-off notes)
            if pitches[i] is None:
                continue
            
            # Place the pitch class into the correct octave range
            adjusted_pitch = pitches[i] + config.get_octave_offset()
            
            # For the chosen voicing, raise the appropriate notes up an octave
            if i in config.VOICING_TO_INDICES.get(config.VOICING):
                if adjusted_pitch + config.OCTAVE <= config.MAX_VOICING_PITCH:
                    adjusted_pitch += config.OCTAVE
            
            # Add correctly placed pitch
            adjusted_pitches.append(adjusted_pitch)
            # Play.note(adjusted_pitch, 0, 1000, 120)
        
        print(f"DEBUG: Adjusted pitches: {adjusted_pitches}")
        
        # Create the chord
        phrase = Phrase()
        phrase.addChord(adjusted_pitches, config.CHORD_DURATION, 120)
        
        print("DEBUG: Playing MIDI phrase via Play.midi()")
        # Play the chord!
        Play.midi(phrase)
        
        # Update chord display with the chord pitches and info
        display_manager.update_chord_display(adjusted_pitches)
        if chord_info:
            display_manager.update_chord_info_display(chord_info)
        print("DEBUG: Chord display updated - nodes/lines/labels positioned")
            
    except Exception as e:
        print(f"Error playing chord: {e}")
        # Try to stop any notes that might be playing
        try:
            Play.allNotesOff()
        except:
            pass


def select_chord_visually(x, y):
    """Create and place a circle at the coordinates.
    
    Args:
        x (float): X coordinate for the visual indicator (relative 0-1)
        y (float): Y coordinate for the visual indicator (relative 0-1)
    """
    print(f"DEBUG: select_chord_visually called - placing dot at relative ({x}, {y})")
    display_manager.select_chord_visually(x, y)


# Display functions now handled by DisplayManager


first_time = True
# make a bar of dashes with | in the same places as header
TABLE_SEPARATOR = "|" + "-" * 32 + "|" + "-" * 22 + "|" + "-" * 22 + "|"


def select_chord(x, y):
    """Find the closest chord and play it.
    
    Args:
        x (int): X coordinate of the click (absolute)
        y (int): Y coordinate of the click (absolute)
    """
    global first_time, current_selected_chord
    
    print(f"DEBUG: select_chord called for click at ({x}, {y})")
    
    if first_time:
        first_time = False
        voicing_header = config.VOICING + " Voicing"
        header = (f"| {'Elemental Name':^30} | {'Traditional Name':^20} | "
                  f"{voicing_header:^20} |")
        print("\n" + header)
        
        print(TABLE_SEPARATOR)
    
    # Find the closest point (returns relative coordinates)
    point = display_manager.find_closest_point([x, y], chord_manager.get_all_coordinates())
    
    # Get chord info
    chord = chord_manager.get_chord_by_coordinates(point)
    print(f"DEBUG: Closest chord found: {chord.name}")
    
    # Update current selected chord for borrowing
    borrowing_controller.set_current_chord(chord)
    
    # Place a dot on the selection (point is already relative)
    select_chord_visually(point[0], point[1])
    
    # Handle borrowing state for this chord
    if chord.name in ["Earth", "Wind", "Fire"]:
        print("DEBUG: Elemental chord selected - resetting borrowing and playing original")
        # Fundamental chords - reset borrowing and make circles gray
        borrowing_controller.reset_borrowing_circles()
        borrowing_controller.update_borrowing_display()
        display_name = chord.name
        
        # Play the original chord
        print("DEBUG: Calling play_chord directly for elemental chord")
        play_chord(chord)
        print("DEBUG: Elemental chord played directly")
    else:
        print("DEBUG: Child chord selected, calling restore...")
        # Regular chords - restore borrowing state
        borrowing_controller.restore_borrowing_state(chord.name, lambda: None)
        
        # Generate and play the borrowed chord directly (like the working version)
        borrowing_controller.generate_and_play_borrowed_chord(
            play_chord,
            display_manager.update_chord_display_with_note_states,
            display_manager.update_chord_info_display_with_name
        )
        print("DEBUG: restore_borrowing_state and generate_and_play_borrowed_chord completed")
        # Create borrowing name for display
        display_name = borrowing_controller.create_borrowing_name(chord.name, config.BORROWING_STATE)
    
    # Create active spelling based on current state
    # For normal chord selection, we need to generate the active pitches
    print("DEBUG: Calling generate_active_pitches")
    active_pitches = generate_active_pitches(chord, config.BORROWING_STATE)
    print(f"DEBUG: active_pitches: {active_pitches}")
    active_spelling = create_spelling_from_pitches(active_pitches)
    
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
    print(f"DEBUG: choose_action called - mouse click at ({x}, {y}) registered")
    # print(f'{x/diagram_display.getWidth():.3f}, {y/diagram_display.getHeight():.3f}')
    
    # First check for borrowing control clicks
    def generate_callback():
        print("DEBUG: Borrowing generate_callback invoked")
        borrowing_controller.generate_and_play_borrowed_chord(
            play_chord,
            display_manager.update_chord_display_with_note_states,
            display_manager.update_chord_info_display_with_name
        )
    
    if borrowing_controller.handle_borrowing_click(x, y, generate_callback):
        print("DEBUG: Borrowing click handled")
        return
    
    # Original chord selection logic
    point = display_manager.find_closest_point([x, y], chord_manager.get_all_coordinates())
    new_x, new_y = point
    
    # Test if key holds type is a chord
    chord = chord_manager.get_chord_by_coordinates(point)
    if isinstance(chord, Chord):  # test if value is a Chord
        print("DEBUG: Chord detected - calling select_chord")
        # If a chord, call play chord function (pass original absolute
        # coordinates)
        select_chord(x, y)
    else:
        print("DEBUG: No chord detected at click position")


# region Borrowing Functions ##################################################
# Borrowing functions now handled by BorrowingController

# Utility functions that are still used in main file
from borrowing_system import get_borrowed_chord, get_borrowed_chord_from_ui_click

# endregion Borrowing Functions ###############################################
# endregion Functions #########################################################


# region Main #################################################################
def initialize_application():
    """Initialize the main application displays and setup."""
    global display_manager, borrowing_controller

    try:
        # Configure screen settings
        screen_config = {
            'width': config.SCREEN_WIDTH,
            'height': config.SCREEN_HEIGHT,
            'scale': config.DISPLAY_SCALE
        }
        
        # Calculate clock dimensions before display creation (required for musical_core)
        effective_width = screen_config['width'] / screen_config['scale']
        effective_height = screen_config['height'] / screen_config['scale']
        
        # Layout: Diagram takes 2/3 width, Clock takes 1/3 width, both take 3/4 height
        # Use 95% of screen width to leave margins on sides
        total_width = int(effective_width * 0.95)
        clock_width = int(total_width * 1 / 3)
        display_height = int(effective_height * 3 / 4)
        
        # Clock positioning (relative to chord display)
        clock_x = clock_width // 2
        clock_y = display_height // 2
        
        # Calculate safe radius (copied from DisplayManager logic)
        available_space = min(clock_width, display_height)
        max_radius = int(available_space * 0.3)
        note_label_space = int(max_radius * 0.15)
        chord_info_space = int(note_label_space * 2.5)
        padding = config.MIN_PADDING
        total_required_space = (max_radius + note_label_space + chord_info_space + padding)
        if total_required_space > available_space:
            max_radius = int((available_space - padding) / (1 + 0.15 + 0.15 * 2.5))
        clock_radius = max(config.MIN_RADIUS, max_radius)
        
        # Set clock dimensions for musical_core before display creation
        set_clock_dimensions(clock_radius, clock_x, clock_y)
        
        # Initialize display manager
        display_manager = DisplayManager()
        
        # Initialize displays
        if not display_manager.initialize_displays(screen_config):
            raise RuntimeError("Failed to initialize displays")
        
        # Initialize borrowing controller
        borrowing_controller = BorrowingController(display_manager.get_diagram_display())
        borrowing_controller.create_borrowing_controls()
        
        # Set display optimization - reduce 20ms update delays to 10ms
        display_manager.set_update_throttle(10)  # 10ms throttle for better performance
        
        # Register mouse click handler immediately after initialization
        if display_manager and display_manager.get_diagram_display():
            display_manager.get_diagram_display().onMouseClick(choose_action)
            print("Mouse click handler registered successfully")
        else:
            print("Error: Could not register mouse click handler")
        
    except Exception as e:
        print(f"Error initializing application: {e}")
        raise RuntimeError(f"Failed to initialize application: {e}")


def main():
    """Main application entry point with settings GUI."""
    # Show user settings GUI - everything else happens via callback
    # print("Loading Movemental User Settings...")
    show_user_settings_gui()


if __name__ == "__main__":
    main()
# endregion Main ##############################################################
