# borrowing_system.py
#
# This module handles all borrowing-related functionality including:
# - Borrowing state management
# - UI controls for borrowing interactions
# - Chord borrowing logic and calculations
# - Visual feedback for borrowing operations

from gui import *
from config import config, TRANSPARENT_COLOR, TABLE_SEPARATOR, calculate_distance
from chord_system import (
    get_chord_by_name, get_elemental_chord, get_root_position_mapping,
    find_next_higher_note, find_next_lower_note, generate_active_pitches
)


class BorrowingController:
    """
    Controller class for managing all borrowing operations and state.

    This class encapsulates:
    - Borrowing state management
    - UI control creation and interaction
    - Chord borrowing calculations
    - Visual feedback and display updates
    """

    def __init__(self, diagram_display):
        """
        Initialize the borrowing controller.

        Args:
            diagram_display: The main diagram display object
        """
        self.diagram_display = diagram_display
        self.borrowing_circles = {}
        self.current_selected_chord = None

    def create_borrowing_controls(self):
        """Create the borrowing control UI elements - just the blue circles."""
        # Initialize borrowing circles dictionary
        self.borrowing_circles = {}

        # Create 4 blue circles, one for each note position
        for line_num in range(1, 5):
            # Get line coordinates
            line_coord = config.BORROWING_LINE_COORDINATES[line_num]
            line_x, line_y = self._relative_to_absolute(line_coord)

            # Create blue circle (starts on line)
            circle = Circle(line_x, line_y, config.BORROWING_CONTROLS['circle_radius'],
                          Color.BLUE, True)
            self.diagram_display.add(circle)
            self.borrowing_circles[line_num] = circle

    def _relative_to_absolute(self, coord):
        """Convert relative coordinates to absolute coordinates."""
        display_width = self.diagram_display.getWidth()
        display_height = self.diagram_display.getHeight()
        return int(coord[0] * display_width), int(coord[1] * display_height)

    def _distance(self, point1, point2):
        """Calculate the euclidean distance between two points."""
        return calculate_distance(point1, point2)

    def is_borrowing_click(self, x, y):
        """Check if click is within borrowing control area."""
        # Only check if we have borrowing controls initialized
        if not self.borrowing_circles:
            return False

        # Don't allow borrowing clicks for fundamental chords
        if (self.current_selected_chord and
            self.current_selected_chord.name in ["Earth", "Wind", "Fire"]):
            return False

        # Check if click is near any arrow position with larger detection radius
        for line_num in range(1, 5):
            # Check up arrow
            up_coord = config.BORROWING_ARROW_COORDINATES[line_num]['up']
            up_x, up_y = self._relative_to_absolute(up_coord)
            up_distance = self._distance((x, y), (up_x, up_y))
            if up_distance < 25:  # Larger detection radius
                return True

            # Check down arrow
            down_coord = config.BORROWING_ARROW_COORDINATES[line_num]['down']
            down_x, down_y = self._relative_to_absolute(down_coord)
            down_distance = self._distance((x, y), (down_x, down_y))
            if down_distance < 25:  # Larger detection radius
                return True

            # Check line position (to reset borrowing)
            line_coord = config.BORROWING_LINE_COORDINATES[line_num]
            line_x, line_y = self._relative_to_absolute(line_coord)
            line_distance = self._distance((x, y), (line_x, line_y))
            if line_distance < 25:  # Larger detection radius
                return True

        return False

    def get_clicked_borrowing_control(self, x, y):
        """Determine which borrowing control was clicked."""
        closest_line = None
        closest_direction = None
        min_distance = float('inf')

        for line_num in range(1, 5):
            # Check up arrow
            up_coord = config.BORROWING_ARROW_COORDINATES[line_num]['up']
            up_x, up_y = self._relative_to_absolute(up_coord)
            up_distance = self._distance((x, y), (up_x, up_y))
            if up_distance < min_distance and up_distance < 25:
                min_distance = up_distance
                closest_line = line_num
                closest_direction = 'up'

            # Check down arrow
            down_coord = config.BORROWING_ARROW_COORDINATES[line_num]['down']
            down_x, down_y = self._relative_to_absolute(down_coord)
            down_distance = self._distance((x, y), (down_x, down_y))
            if down_distance < min_distance and down_distance < 25:
                min_distance = down_distance
                closest_line = line_num
                closest_direction = 'down'

            # Check line position (to reset borrowing)
            line_coord = config.BORROWING_LINE_COORDINATES[line_num]
            line_x, line_y = self._relative_to_absolute(line_coord)
            line_distance = self._distance((x, y), (line_x, line_y))
            if line_distance < min_distance and line_distance < 25:
                min_distance = line_distance
                closest_line = line_num
                closest_direction = 'line'

        if closest_line:
            return closest_line, closest_direction

        return None, None

    def activate_borrowing(self, line_position, direction):
        """Activate borrowing for the specified line and direction."""
        BORROWING_STATE = config.BORROWING_STATE

        # Get current selected chord
        if not self.current_selected_chord:
            return

        # Check if this is a fundamental chord (Earth, Wind, Fire) - no borrowing allowed
        if self.current_selected_chord.name in ["Earth", "Wind", "Fire"]:
            return

        # Handle line click when circle is already on line - toggle note off
        if (direction == 'line' and
            BORROWING_STATE['circle_positions'][line_position] == 'line'):
            # Toggle note off
            BORROWING_STATE['circle_positions'][line_position] = 'off'
            BORROWING_STATE['borrowing_directions'][line_position] = 'off'
            BORROWING_STATE['note_states'][line_position] = 'off'

            # Hide circle
            self._hide_circle(line_position)

            # Update history for this chord
            chord_name = self.current_selected_chord.name
            if chord_name not in BORROWING_STATE['borrowing_history']:
                BORROWING_STATE['borrowing_history'][chord_name] = {}
            BORROWING_STATE['borrowing_history'][chord_name][line_position] = 'off'

            return True  # Indicate that borrowing was activated

        # Handle clicking on off note to turn it back on (line click)
        if (direction == 'line' and
            BORROWING_STATE['circle_positions'][line_position] == 'off'):
            # Turn note back on
            BORROWING_STATE['circle_positions'][line_position] = 'line'
            BORROWING_STATE['borrowing_directions'][line_position] = None
            BORROWING_STATE['note_states'][line_position] = 'on'

            # Show circle back on line
            self._show_circle(line_position)
            self._move_circle_to_line(line_position)

            # Update history for this chord
            chord_name = self.current_selected_chord.name
            if chord_name not in BORROWING_STATE['borrowing_history']:
                BORROWING_STATE['borrowing_history'][chord_name] = {}
            BORROWING_STATE['borrowing_history'][chord_name][line_position] = 'line'

            return True  # Indicate that borrowing was activated

        # Handle clicking arrow when note is off - turn note on and move to arrow
        if (direction in ['up', 'down'] and
            BORROWING_STATE['circle_positions'][line_position] == 'off'):
            # Turn note back on
            BORROWING_STATE['note_states'][line_position] = 'on'

            # Show circle and move to arrow position
            self._show_circle(line_position)
            self._move_circle_to_arrow(line_position, direction)

            # Update borrowing state
            BORROWING_STATE['circle_positions'][line_position] = direction
            BORROWING_STATE['borrowing_directions'][line_position] = direction

            # Store borrowing state in history for this chord
            chord_name = self.current_selected_chord.name
            if chord_name not in BORROWING_STATE['borrowing_history']:
                BORROWING_STATE['borrowing_history'][chord_name] = {}
            BORROWING_STATE['borrowing_history'][chord_name][line_position] = direction

            return True  # Indicate that borrowing was activated

        # Handle line click (reset borrowing for this line) - original behavior
        if direction == 'line':
            # Reset this line to no borrowing
            BORROWING_STATE['circle_positions'][line_position] = 'line'
            BORROWING_STATE['borrowing_directions'][line_position] = None

            # Update history for this chord
            chord_name = self.current_selected_chord.name
            if chord_name not in BORROWING_STATE['borrowing_history']:
                BORROWING_STATE['borrowing_history'][chord_name] = {}
            BORROWING_STATE['borrowing_history'][chord_name][line_position] = 'line'

            # Move circle back to line
            self._move_circle_to_line(line_position)

            return True  # Indicate that borrowing was activated

        # Determine opposite element
        opposite_element = config.ELEMENTAL_RELATIONSHIPS.get(
            self.current_selected_chord.name, [None])[0]
        if not opposite_element:
            return False

        # Update borrowing state for this line
        BORROWING_STATE['circle_positions'][line_position] = direction
        BORROWING_STATE['borrowing_directions'][line_position] = direction

        # Store borrowing state in history for this chord
        chord_name = self.current_selected_chord.name
        if chord_name not in BORROWING_STATE['borrowing_history']:
            BORROWING_STATE['borrowing_history'][chord_name] = {}
        BORROWING_STATE['borrowing_history'][chord_name][line_position] = direction

        # Move the circle to the arrow position
        self._move_circle_to_arrow(line_position, direction)

        return True  # Indicate that borrowing was activated

    def _move_circle_to_arrow(self, line_position, direction):
        """Move a circle to the specified arrow position."""
        if line_position in self.borrowing_circles:
            # Get the arrow coordinates
            arrow_coord = config.BORROWING_ARROW_COORDINATES[line_position][direction]
            abs_x, abs_y = self._relative_to_absolute(arrow_coord)

            # Move the circle
            self.diagram_display.move(self.borrowing_circles[line_position], abs_x, abs_y)

    def _move_circle_to_line(self, line_position):
        """Move a circle back to its line position."""
        if line_position in self.borrowing_circles:
            # Get the line coordinates
            line_coord = config.BORROWING_LINE_COORDINATES[line_position]
            abs_x, abs_y = self._relative_to_absolute(line_coord)

            # Move the circle
            self.diagram_display.move(self.borrowing_circles[line_position], abs_x, abs_y)

    def _hide_circle(self, line_position):
        """Hide the circle for the specified line position by making it transparent."""
        if line_position in self.borrowing_circles:
            # Use global transparent color to hide the circle
            self.borrowing_circles[line_position].setColor(TRANSPARENT_COLOR)

    def _show_circle(self, line_position):
        """Show the circle for the specified line position by making it visible."""
        if line_position in self.borrowing_circles:
            # Restore the circle to its normal blue color (alpha = 255)
            self.borrowing_circles[line_position].setColor(Color.BLUE)

    def generate_and_play_borrowed_chord(self, play_callback, update_display_callback,
                                       update_info_callback):
        """
        Generate and play the current borrowed chord based on all active borrowings.

        Args:
            play_callback: Function to call to play the chord
            update_display_callback: Function to call to update chord display
            update_info_callback: Function to call to update chord info display
        """
        BORROWING_STATE = config.BORROWING_STATE

        if not self.current_selected_chord:
            return

        # Start with original chord
        original_pitches = sorted(self.current_selected_chord.pitches)
        borrowed_pitches = original_pitches.copy()

        # Apply all active borrowings
        opposite_element = config.ELEMENTAL_RELATIONSHIPS.get(
            self.current_selected_chord.name, [None])[0]
        if opposite_element:
            opposite_chord = get_elemental_chord(opposite_element)
            if opposite_chord:
                opposite_pitches = opposite_chord.pitches

                # Get root position mapping for this chord
                root_position_mapping = get_root_position_mapping(self.current_selected_chord)

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
        borrowing_name = self.create_borrowing_name(
            self.current_selected_chord.name, BORROWING_STATE)

        # Create a 4-note structure with null values for turned-off notes
        # This ensures voicing is applied to the correct positions
        full_pitch_structure = [None] * 4
        root_position_mapping = get_root_position_mapping(self.current_selected_chord)

        for line_position in range(1, 5):
            if BORROWING_STATE['note_states'][line_position] == 'on':
                note_index = root_position_mapping[line_position]
                if note_index < len(borrowed_pitches):
                    full_pitch_structure[note_index] = borrowed_pitches[note_index]

        # Play the modified chord with proper voicing structure
        play_callback(full_pitch_structure)

        # Override the chord display to show all notes, but hide turned-off ones
        update_display_callback(borrowed_pitches, BORROWING_STATE, self.current_selected_chord)

        # Update chord info display with borrowing name
        update_info_callback(borrowing_name, self.current_selected_chord.traditional_name)

        # Generate the active pitches for spelling and state
        active_pitches = generate_active_pitches(self.current_selected_chord, BORROWING_STATE)

        # Create active spelling using the same active_pitches that were played
        active_spelling = self._create_spelling_from_pitches(active_pitches)

        # Print borrowing information to console
        print(f"| {borrowing_name:^30} | {self.current_selected_chord.traditional_name:^20} | "
              f"{active_spelling:^20} |")
        print(TABLE_SEPARATOR)

        # Update state
        BORROWING_STATE['active'] = any(pos != 'line' for pos in
                                      BORROWING_STATE['circle_positions'].values())
        BORROWING_STATE['chord_name'] = self.current_selected_chord.name
        BORROWING_STATE['borrowed_notes'] = active_pitches
        BORROWING_STATE['original_notes'] = original_pitches

    def handle_borrowing_click(self, x, y, generate_callback):
        """
        Handle clicks on borrowing controls.

        Args:
            x, y: Click coordinates
            generate_callback: Callback to generate and play borrowed chord

        Returns:
            bool: True if click was handled, False otherwise
        """
        # Check if click is within borrowing control area
        if self.is_borrowing_click(x, y):
            line_position, direction = self.get_clicked_borrowing_control(x, y)
            if line_position is not None:
                if self.activate_borrowing(line_position, direction):
                    # Generate and play borrowed chord
                    generate_callback()

                    # Update visual display
                    self.update_borrowing_display()
                    return True
        return False

    def reset_borrowing_circles(self):
        """Reset all circles to their line positions."""
        BORROWING_STATE = config.BORROWING_STATE

        # Reset state
        BORROWING_STATE['circle_positions'] = {1: 'line', 2: 'line', 3: 'line', 4: 'line'}
        BORROWING_STATE['borrowing_directions'] = {1: None, 2: None, 3: None, 4: None}
        BORROWING_STATE['note_states'] = {1: 'on', 2: 'on', 3: 'on', 4: 'on'}
        BORROWING_STATE['active'] = False

        # Move all circles back to lines and make them visible
        for line_position in range(1, 5):
            self._move_circle_to_line(line_position)
            self._show_circle(line_position)

    def restore_borrowing_state(self, chord_name, generate_callback=None):
        """
        Restore borrowing state for a specific chord from history.

        Args:
            chord_name: Name of the chord to restore state for
            generate_callback: Optional callback (for compatibility)
        """
        BORROWING_STATE = config.BORROWING_STATE

        # Reset to default state first
        self.reset_borrowing_circles()

        # Check if this chord has borrowing history
        if chord_name in BORROWING_STATE['borrowing_history']:
            chord_borrowing = BORROWING_STATE['borrowing_history'][chord_name]

            # Apply each borrowing state
            for line_position, direction in chord_borrowing.items():
                if direction in ['up', 'down']:
                    BORROWING_STATE['circle_positions'][line_position] = direction
                    BORROWING_STATE['borrowing_directions'][line_position] = direction
                    BORROWING_STATE['note_states'][line_position] = 'on'  # Borrowed notes are always on
                    self._move_circle_to_arrow(line_position, direction)
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
                    self._hide_circle(line_position)

            # Update active state
            BORROWING_STATE['active'] = any(pos != 'line' for pos in
                                          BORROWING_STATE['circle_positions'].values())

        # Update visual display (always call this)
        self.update_borrowing_display()

    def update_borrowing_display(self):
        """Update visual indicators for borrowing state."""
        # Check if this is a fundamental chord (Earth, Wind, Fire) - make circles gray
        if (self.current_selected_chord and
            self.current_selected_chord.name in ["Earth", "Wind", "Fire"]):
            for line_num, circle in self.borrowing_circles.items():
                circle.setColor(Color.GRAY)
            return

        # Update circle colors and visibility based on borrowing state
        BORROWING_STATE = config.BORROWING_STATE
        for line_num, circle in self.borrowing_circles.items():
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

    def create_borrowing_name(self, original_chord_name, borrowing_state):
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
        opposite_element = config.ELEMENTAL_RELATIONSHIPS.get(original_chord_name, [None])[0]

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

    def _create_spelling_from_pitches(self, pitches):
        """
        Create chord spelling from a list of MIDI pitches (already voiced).

        Args:
            pitches (list): List of MIDI pitch values (already voiced and filtered)

        Returns:
            str: Spelling of the pitches sorted from low to high
        """
        from config import NOTE_NAMES_FLAT

        if not pitches:
            return "No notes"

        # Sort by actual MIDI pitch values (low to high)
        sorted_pitches = sorted(pitches)
        note_names = [NOTE_NAMES_FLAT[pitch % 12] for pitch in sorted_pitches]

        return "  ".join(f"{name:<2}" for name in note_names)

    def set_current_chord(self, chord):
        """Set the current selected chord for borrowing operations."""
        self.current_selected_chord = chord

    def get_current_chord(self):
        """Get the current selected chord."""
        return self.current_selected_chord


# Utility functions for borrowing operations
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