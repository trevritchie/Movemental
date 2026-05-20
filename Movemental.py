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
import time
from config import config, NOTE_NAMES_FLAT, TABLE_SEPARATOR
from chord_system import (
    chord_manager, Chord, initialize_chord_dictionary,
    generate_active_pitches, set_clock_dimensions,
    create_spelling_from_pitches
)
from borrowing_system import BorrowingController
from display_manager import DisplayManager
from settings_gui import SettingsGUI
# endregion Imports ###########################################################


# region Global Variables #####################################################
display_manager = None
borrowing_controller = None
first_time = True
# make a bar of dashes with | in the same places as header
TABLE_SEPARATOR = "|" + "-" * 32 + "|" + "-" * 22 + "|" + "-" * 22 + "|"
# endregion Global Variables ##################################################


# region Settings Conversion Utilities ########################################
def string_to_tonal_center_offset(note_name):
    """Convert note name string to tonal center offset value."""
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
# endregion Settings Conversion Utilities ####################################


# region Settings Logic #######################################################
def apply_user_settings(settings_dict):
    """Apply user settings to runtime variables and recalculate constants."""
    try:
        # Apply basic settings to config object
        # Note: Instrument is set directly in settings GUI, not here
        config.update_settings(
            TONAL_CENTER_OFFSET=string_to_tonal_center_offset(
                settings_dict['tonal_center']),
            OCTAVE_RANGE=settings_dict['octave_range'],
            VOICING=settings_dict['voicing'],
            CHORD_DURATION=string_to_duration(
                settings_dict['chord_duration'])
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
# endregion Settings Logic ####################################################


# region UI Functions #########################################################
def show_user_settings_gui():
    """Show the user settings GUI."""
    settings_gui = SettingsGUI()
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
# endregion UI Functions ######################################################


# region Chord Selection ######################################################
def play_chord(chord_or_pitches):
    """Play the provided chord or list of pitch classes.

    Args:
        chord_or_pitches: Either a Chord object or a list of pitch classes (0-11)
    """
    global DISPLAY_HEIGHT, CLOCK_WIDTH

    try:
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

        # Create the chord
        phrase = Phrase()
        phrase.addChord(adjusted_pitches, config.CHORD_DURATION, 120)

        # Play the chord!
        Play.midi(phrase)

        # Update chord display with the chord pitches and info
        display_manager.update_chord_display(adjusted_pitches)
        if chord_info:
            display_manager.update_chord_info_display(chord_info)

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
    display_manager.select_chord_visually(x, y)


def select_chord(x, y):
    """Find the closest chord and play it.

    Args:
        x (int): X coordinate of the click (absolute)
        y (int): Y coordinate of the click (absolute)
    """
    global first_time, current_selected_chord


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

    # Update current selected chord for borrowing
    borrowing_controller.set_current_chord(chord)

    # Place a dot on the selection (point is already relative)
    select_chord_visually(point[0], point[1])

    # Handle borrowing state for this chord
    if chord.name in ["Earth", "Wind", "Fire"]:
        # Fundamental chords - reset borrowing and make circles gray
        borrowing_controller.reset_borrowing_circles()
        borrowing_controller.update_borrowing_display()
        display_name = chord.name

        # Play the original chord
        play_chord(chord)
    else:
        # Regular chords - restore borrowing state
        borrowing_controller.restore_borrowing_state(chord.name, lambda: None)

        # Generate and play the borrowed chord directly (like the working version)
        borrowing_controller.generate_and_play_borrowed_chord(
            play_chord,
            display_manager.update_chord_display_with_note_states,
            display_manager.update_chord_info_display_with_name
        )
        # Create borrowing name for display
        display_name = borrowing_controller.create_borrowing_name(chord.name, config.BORROWING_STATE)

    # Create active spelling based on current state
    # For normal chord selection, we need to generate the active pitches
    active_pitches = generate_active_pitches(chord, config.BORROWING_STATE)
    active_spelling = create_spelling_from_pitches(active_pitches)

    # Only print for elemental chords (child chords print from borrowing_system)
    if chord.name in ["Earth", "Wind", "Fire"]:
        print(f"| {display_name:^30} | {chord.traditional_name:^20} | "
              f"{active_spelling:^20} |")
        print(TABLE_SEPARATOR)
# endregion Chord Selection ###################################################


# region User Interaction Functions ###########################################
def choose_action(x, y):
    """Handle mouse click actions.

    TODO: only need this if I add a different click function

    Args:
        x (int): X coordinate of the click (absolute)
        y (int): Y coordinate of the click (absolute)
    """
    # print(f'{x/diagram_display.getWidth():.3f}, {y/diagram_display.getHeight():.3f}')

    # First check for borrowing control clicks
    def generate_callback():
        borrowing_controller.generate_and_play_borrowed_chord(
            play_chord,
            display_manager.update_chord_display_with_note_states,
            display_manager.update_chord_info_display_with_name
        )

    if borrowing_controller.handle_borrowing_click(x, y, generate_callback):
        return

    # Original chord selection logic
    point = display_manager.find_closest_point([x, y], chord_manager.get_all_coordinates())
    new_x, new_y = point

    # Test if key holds type is a chord
    chord = chord_manager.get_chord_by_coordinates(point)
    if isinstance(chord, Chord):  # test if value is a Chord
        # If a chord, call play chord function (pass original absolute
        # coordinates)
        select_chord(x, y)
# endregion User Interaction Functions ########################################


# region Application Initialization ###########################################

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
            display_manager.get_diagram_display().onMouseDown(choose_action)
            # print("Mouse click handler registered successfully")
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
# endregion Application Initialization ########################################
