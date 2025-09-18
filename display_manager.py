# display_manager.py
#
# This module handles all display-related functionality including:
# - Dual-display coordination logic
# - Chord visualization and update functions
# - Coordinate conversion and positioning logic
# - Display optimization for better performance


from gui import *
from math import hypot, pi, cos, sin
import time
from config import config, NOTE_NAMES_FLAT, TRANSPARENT_COLOR, calculate_distance
from chord_system import (
    get_position_on_chord_circle, pitch_to_angle, create_chord_color_gradient,
    get_root_position_mapping
)


class DisplayManager:
    """
    Manager class for handling all display operations and coordination.

    This class encapsulates:
    - Dual-display coordination
    - Chord visualization updates
    - Display element caching for performance
    - Coordinate conversion utilities
    """

    def __init__(self):
        """Initialize the display manager."""
        # Display references
        self.diagram_display = None
        self.chord_display = None

        # Display dimensions and positioning
        self.clock_x = 0
        self.clock_y = 0
        self.clock_radius = 0
        self.clock_width = 0
        self.display_height = 0

        # Visual elements (cached for performance optimization)
        self.clock_color_gradient = None
        self.clock_path = None
        self.note_nodes = []
        self.note_connection_lines = []
        self.chord_info_text = {'elemental': None, 'traditional': None}
        self.note_labels = []
        self.selected_chord_dot = None

        # Performance optimization - cache display elements
        self._cached_lines = []
        self._cached_circles = []
        self._last_update_time = 0
        self._update_throttle = 0.02  # 20ms minimum between updates

        # Display constants (will be set during initialization)
        self.node_radius = 0
        self.big_tick_radius = 0
        self.small_tick_radius = 0
        self.label_distance = 0

    def initialize_displays(self, screen_config):
        """
        Initialize both diagram and chord displays.

        Args:
            screen_config: Dictionary containing screen configuration
        """
        try:
            # Calculate effective screen dimensions (accounting for scaling)
            effective_width = screen_config['width'] / screen_config['scale']
            effective_height = screen_config['height'] / screen_config['scale']

            # Layout: Diagram takes 2/3 width, Clock takes 1/3 width, both take 3/4 height
            # Use 95% of screen width to leave margins on sides
            total_width = int(effective_width * 0.95)
            diagram_width = int(total_width * 2 / 3)
            self.clock_width = int(total_width * 1 / 3)
            self.display_height = int(effective_height * 3 / 4)

            # Center vertically on screen
            vertical_center = (effective_height - self.display_height) / 2

            # Center horizontally on screen with 95% width
            horizontal_center = (effective_width - total_width) / 2
            diagram_x = horizontal_center
            clock_x = horizontal_center + diagram_width

            # Create main display with diagram image
            self.diagram_display = Display("Movemental", diagram_width, self.display_height,
                                         diagram_x, vertical_center)
            diagram = Icon("./images/diagram.jpg", diagram_width, self.display_height)
            self.diagram_display.add(diagram)

            # Create a circle that marks the active chord
            self.selected_chord_dot = Circle(diagram_width // 2, self.display_height // 2,
                                           8, Color.BLUE, fill=True)
            self.diagram_display.add(self.selected_chord_dot)

            # Create separate display for chord visualization
            self.chord_display = Display("Chord Visualization", self.clock_width,
                                       self.display_height, clock_x, vertical_center,
                                       Color.BLACK)

            # Recalculate chord positioning based on new dimensions
            self.clock_x = self.clock_width // 2
            self.clock_y = self.display_height // 2

            # Recalculate radius and other constants
            self.clock_radius = self._calculate_safe_radius(self.clock_width, self.display_height)
            self.node_radius = max(config.MIN_NODE_RADIUS, int(self.clock_radius * 0.1))
            self.big_tick_radius = max(config.MIN_TICK_RADIUS, int(self.clock_radius * 0.04))
            self.small_tick_radius = max(config.MIN_SMALL_TICK_RADIUS, int(self.clock_radius * 0.02))
            self.label_distance = max(config.MIN_LABEL_DISTANCE, int(self.clock_radius * 0.20))

            # Create the clock-like chord display
            self._create_chord_display()

            return True

        except Exception as e:
            print(f"Error initializing displays: {e}")
            return False

    def _calculate_safe_radius(self, clock_width, display_height):
        """Calculate the maximum safe radius that leaves room for all labels."""
        # Available space is the smaller dimension of the clock display
        available_space = min(clock_width, display_height)

        # Estimate space needed for labels
        # Note labels extend beyond circle by LABEL_DISTANCE (15% of radius)
        # Chord info labels need 2.5x that space to avoid overlap
        # So total space needed = radius + note_label_space + chord_info_space + padding

        # Start with a conservative estimate and refine
        # Start with 30% of available space
        max_radius = int(available_space * 0.3)

        # Calculate required space for this radius
        note_label_space = int(max_radius * 0.15)  # 15% of radius
        chord_info_space = int(note_label_space * 2.5)  # 2.5x note label space
        padding = config.MIN_PADDING  # Minimum padding

        total_required_space = (max_radius + note_label_space + chord_info_space + padding)

        # If we need more space than available, reduce the radius
        if total_required_space > available_space:
            # Calculate maximum radius that fits
            max_radius = int((available_space - padding) / (1 + 0.15 + 0.15 * 2.5))

        return max(config.MIN_RADIUS, max_radius)  # Minimum radius

    def _create_chord_display(self):
        """Create the chord visualization display."""
        # Create color gradient
        self.clock_color_gradient = create_chord_color_gradient()

        # Create the circular path
        self.clock_path = Circle(self.clock_x, self.clock_y, self.clock_radius,
                               Color(120, 120, 130), False, 2)  # Sophisticated dark gray
        self.chord_display.add(self.clock_path)

        # Create background elements
        self._create_background_lines()
        self._create_tick_marks_and_labels()
        self._create_chord_nodes_and_lines()

        # Add chord information display at the top
        self.chord_info_text = {
            'elemental': None,
            'traditional': None
        }

    def _create_background_lines(self):
        """Create the background grid lines connecting all tick marks."""
        # Calculate tick mark coordinates
        big_tick_coords = []
        for i in range(12):  # 12 semitones
            angle = (i / 12.0) * config.PI_TIMES_2
            x, y = get_position_on_chord_circle(angle)
            big_tick_coords.append((x, y))

        # Draw background lines connecting all big ticks (like chordTuner)
        trans_gray = Color(180, 180, 190, 80)  # More visible light gray
        for i, (x1, y1) in enumerate(big_tick_coords):
            for j, (x2, y2) in enumerate(big_tick_coords):
                if i != j:  # Don't draw line to itself
                    line = self.chord_display.drawLine(x1, y1, x2, y2, trans_gray, 1)
                    self._cached_lines.append(line)  # Cache for performance

    def _create_tick_marks_and_labels(self):
        """Create tick marks and note labels around the circle."""
        self.note_labels = []

        for i in range(12):  # 12 semitones
            angle = (i / 12.0) * config.PI_TIMES_2  # 0 to 2π radians
            x, y = get_position_on_chord_circle(angle)

            # Major tick marks (every semitone)
            color = self.clock_color_gradient[i * 2]  # Use every other color
            tick = Circle(x, y, self.big_tick_radius, color, True)
            self.chord_display.add(tick)
            self._cached_circles.append(tick)  # Cache for performance

            # Add note names positioned outside the circle
            # Adjust note index so tonal center appears at 12 o'clock
            note_index = (i + config.get_tonal_center_pitch_class()) % 12
            note_name = NOTE_NAMES_FLAT[note_index]

            # Position labels at a consistent distance outside the circle
            # Use relative positioning based on radius for better scaling
            label_radius = self.clock_radius + self.label_distance
            label_angle = angle - config.PI_OVER_2  # Convert to standard coordinates

            # Calculate position for label center
            label_x = int(self.clock_x + label_radius * cos(label_angle))
            label_y = int(self.clock_y + label_radius * sin(label_angle))

            # Adjust y position based on vertical position to compensate
            # for text bottom-alignment. Labels at the top need to be
            # pushed further away, and labels at bottom pulled closer.
            y_adjustment = int(sin(label_angle) * 3)  # Ranges from -3 to +3
            adjusted_label_y = label_y - 7 + y_adjustment

            # Create a properly centered label
            note_label = Label(note_name, CENTER, Color.WHITE)
            self.chord_display.add(note_label, label_x - 8, adjusted_label_y - 5)
            self.note_labels.append(note_label)

    def _create_chord_nodes_and_lines(self):
        """Create the chord nodes and connection lines."""
        # Initialize four nodes (will be positioned when chords are played)
        self.note_nodes = []
        for i in range(4):
            # Create node
            node = Circle(self.clock_x, self.clock_y, self.node_radius, Color.WHITE, True)
            self.chord_display.add(node)
            self.note_nodes.append(node)

        # Initialize connecting lines
        # (6 lines needed to connect all pairs of 4 nodes)
        self.note_connection_lines = []
        for i in range(6):  # 6 lines needed to connect all pairs of 4 nodes
            line = Line(self.clock_x, self.clock_y, self.clock_x, self.clock_y, Color.WHITE, 2)
            self.chord_display.add(line)
            self.note_connection_lines.append(line)

    def distance(self, point1, point2):
        """Calculate the euclidean distance between two points."""
        return calculate_distance(point1, point2)

    def find_closest_point(self, here, points):
        """
        Find the closest point among all points to the given location.

        Args:
            here (tuple): The reference point as (x, y) coordinates
            points (list): List of points to search through (relative coordinates)

        Returns:
            tuple: The closest point as (x, y) coordinates (relative)
        """
        # Get display dimensions
        display_width = self.diagram_display.getWidth()
        display_height = self.diagram_display.getHeight()

        # Convert relative coordinates to absolute for comparison
        here_abs = here  # here is already in absolute coordinates

        # Keep track of the closest distance and point so far
        closest_distance_so_far = config.LARGE_DISTANCE
        closest_point_so_far = None

        # Iterate through all points looking for closest one
        for point in points:
            # Convert relative point to absolute coordinates
            point_abs = (point[0] * display_width, point[1] * display_height)

            this_distance = self.distance(here_abs, point_abs)  # calculate distance
            if this_distance < closest_distance_so_far:  # is this closer?
                # Yes, so update
                closest_distance_so_far = this_distance
                closest_point_so_far = point  # Keep the relative coordinates
        # Now, closest_point_so_far contains the closest point overall.
        closest_point = closest_point_so_far

        return closest_point

    def select_chord_visually(self, x, y):
        """
        Create and place a circle at the coordinates.

        Args:
            x (float): X coordinate for the visual indicator (relative 0-1)
            y (float): Y coordinate for the visual indicator (relative 0-1)
        """
        # Convert relative coordinates to absolute
        display_width = self.diagram_display.getWidth()
        display_height = self.diagram_display.getHeight()
        abs_x = int(x * display_width)
        abs_y = int(y * display_height)

        self.diagram_display.move(self.selected_chord_dot, abs_x, abs_y)

    def _should_throttle_update(self):
        """Check if display update should be throttled for performance."""
        current_time = time.time()
        if current_time - self._last_update_time < self._update_throttle:
            return True
        self._last_update_time = current_time
        return False

    def update_chord_display(self, pitches):
        """
        Update the chord display with the four notes of a chord.
        Optimized version that reuses objects instead of recreating them.

        Args:
            pitches (list): List of four MIDI pitch values
        """
        # Performance optimization - throttle updates
        if self._should_throttle_update():
            return

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
            color_index = int((angle / config.PI_TIMES_2) * 24) % 24
            colors.append(self.clock_color_gradient[color_index])

        # Update node positions and colors (reuse existing nodes)
        for i in range(4):
            if i < len(positions):
                x, y = positions[i]
                self.note_nodes[i].setColor(colors[i])
                self.chord_display.move(self.note_nodes[i], x, y)
            else:
                # Hide unused nodes
                self.chord_display.move(self.note_nodes[i], self.clock_x, self.clock_y)

        # Update connecting lines to connect all nodes to each other
        if len(positions) >= 4:
            # Connect every node to every other node (complete graph)
            line_connections = [(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)]

            for i, (start_idx, end_idx) in enumerate(line_connections):
                start_x, start_y = positions[start_idx]
                end_x, end_y = positions[end_idx]

                # Optimized: Update line position instead of recreating
                line = self.note_connection_lines[i]
                # Remove old line and add new one (more efficient than recreation)
                self.chord_display.remove(line)
                new_line = Line(start_x, start_y, end_x, end_y, Color.WHITE, 2)
                self.chord_display.add(new_line)
                self.note_connection_lines[i] = new_line
        else:
            # Hide lines if not enough notes by moving them off-screen
            for i, line in enumerate(self.note_connection_lines):
                # Optimized: Reuse line objects
                self.chord_display.remove(line)
                new_line = Line(self.clock_x, self.clock_y, self.clock_x, self.clock_y,
                              Color.WHITE, 2)
                self.chord_display.add(new_line)
                self.note_connection_lines[i] = new_line

    def update_chord_display_with_note_states(self, pitches, borrowing_state, current_chord):
        """
        Update the chord display with all notes, but hide turned-off ones.
        Optimized version for borrowing system.

        Args:
            pitches (list): List of four MIDI pitch values (including turned-off notes)
            borrowing_state (dict): Current borrowing state
            current_chord: Current selected chord object
        """
        # Skip throttling for borrowing operations - they need immediate visual feedback
        # Performance optimization - throttle updates (disabled for borrowing)
        # if self._should_throttle_update():
        #     return

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
            color_index = int((angle / config.PI_TIMES_2) * 24) % 24
            colors.append(self.clock_color_gradient[color_index])

        # Update node positions and colors, but hide turned-off notes
        root_position_mapping = get_root_position_mapping(current_chord)

        # Track which nodes are active for line connections
        active_node_indices = []

        for i in range(4):
            if i < len(positions):
                # Check if this note is turned off
                note_is_off = False
                for line_position in range(1, 5):
                    if (borrowing_state['note_states'][line_position] == 'off' and
                        root_position_mapping[line_position] == i):
                        note_is_off = True
                        break

                if note_is_off:
                    # Hide turned-off note by moving to center and making transparent
                    self.note_nodes[i].setColor(TRANSPARENT_COLOR)
                    self.chord_display.move(self.note_nodes[i], self.clock_x, self.clock_y)
                else:
                    # Show active note
                    x, y = positions[i]
                    self.note_nodes[i].setColor(colors[i])
                    self.chord_display.move(self.note_nodes[i], x, y)
                    active_node_indices.append(i)
            else:
                # Hide unused nodes
                self.note_nodes[i].setColor(TRANSPARENT_COLOR)
                self.chord_display.move(self.note_nodes[i], self.clock_x, self.clock_y)

        # Update connecting lines to connect only active nodes
        active_positions = []
        for i in active_node_indices:
            active_positions.append(positions[i])

        if len(active_positions) >= 2:
            # Connect active nodes to each other
            line_connections = []
            for i in range(len(active_positions)):
                for j in range(i + 1, len(active_positions)):
                    line_connections.append((i, j))

            # Update connection lines (optimized)
            for i, (start_idx, end_idx) in enumerate(line_connections):
                if i < len(self.note_connection_lines):
                    start_x, start_y = active_positions[start_idx]
                    end_x, end_y = active_positions[end_idx]

                    # Optimized: Reuse line objects
                    self.chord_display.remove(self.note_connection_lines[i])
                    new_line = Line(start_x, start_y, end_x, end_y, Color.WHITE, 2)
                    self.chord_display.add(new_line)
                    self.note_connection_lines[i] = new_line

            # Hide unused connection lines
            for i in range(len(line_connections), len(self.note_connection_lines)):
                self.chord_display.remove(self.note_connection_lines[i])
                new_line = Line(self.clock_x, self.clock_y, self.clock_x, self.clock_y,
                              Color.WHITE, 2)
                self.chord_display.add(new_line)
                self.note_connection_lines[i] = new_line
        else:
            # Hide all lines if not enough active notes
            for i, line in enumerate(self.note_connection_lines):
                self.chord_display.remove(line)
                new_line = Line(self.clock_x, self.clock_y, self.clock_x, self.clock_y,
                              Color.WHITE, 2)
                self.chord_display.add(new_line)
                self.note_connection_lines[i] = new_line

    def _get_precise_label_position(self, text, font_size, window_center):
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

    def _calculate_label_positions(self):
        """Calculate vertical positions for chord info labels."""
        # Font sizes - scale with display size for better readability
        # 3% of display height, minimum
        base_font_size = max(config.MIN_FONT_SIZE, int(self.display_height * 0.03))
        # 2.5% of display height, minimum
        font_height = max(config.MIN_FONT_HEIGHT, int(self.display_height * 0.025))

        # Center horizontally in the clock window
        horizontal_center = self.clock_width // 2

        # Calculate vertical positions with more generous spacing from
        # circle. Circle center and radius are dynamic based on
        # display size.
        circle_top = self.clock_y - self.clock_radius
        circle_bottom = self.clock_y + self.clock_radius

        # Calculate spacing to ensure chord info labels don't overlap with
        # note labels. Note labels extend LABEL_DISTANCE beyond the circle.
        note_label_extension = self.label_distance
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
        top_y = max(config.MIN_TOP_MARGIN, top_y)
        # At least minimum margin from bottom of display
        bottom_y = min(self.display_height - config.MIN_BOTTOM_MARGIN, bottom_y)

        return base_font_size, horizontal_center, top_y, bottom_y

    def _create_chord_labels(self, chord, font_size, horizontal_center, top_y, bottom_y):
        """Create and position the chord name labels."""
        # Elemental name (top center, perfectly centered for any length)
        elemental_label = Label(chord.name, CENTER, Color.WHITE)
        elemental_label.setFont(Font("Arial", Font.BOLD, font_size))
        self.chord_info_text['elemental'] = elemental_label

        # Calculate precise position for perfect centering
        nudge = 0
        if chord.name[-6:] == "Branch":
            nudge = -6
        elif chord.name == "Fire":
            nudge = 12
        elif chord.name[-5:] == "Magma":
            nudge = -12

        elemental_x = self._get_precise_label_position(
            chord.name, font_size, horizontal_center)
        self.chord_display.add(elemental_label, elemental_x + nudge, top_y)

        # Traditional name (bottom center, perfectly centered for any length)
        traditional_label = Label(chord.traditional_name, CENTER, Color.WHITE)
        traditional_label.setFont(Font("Arial", Font.BOLD, font_size))
        self.chord_info_text['traditional'] = traditional_label

        # Calculate precise position for perfect centering
        traditional_x = self._get_precise_label_position(
            chord.traditional_name, font_size, horizontal_center)
        self.chord_display.add(traditional_label, traditional_x, bottom_y - 5)

    def _create_custom_chord_labels(self, elemental_name, traditional_name,
                                  font_size, horizontal_center, top_y, bottom_y):
        """Create and position custom chord name labels."""
        # Elemental name (top center, perfectly centered for any length)
        elemental_label = Label(elemental_name, CENTER, Color.WHITE)
        elemental_label.setFont(Font("Arial", Font.BOLD, font_size))
        self.chord_info_text['elemental'] = elemental_label

        # Calculate precise position for perfect centering
        elemental_x = self._get_precise_label_position(
            elemental_name, font_size, horizontal_center)
        self.chord_display.add(elemental_label, elemental_x, top_y)

        # Traditional name (bottom center, perfectly centered for any length)
        traditional_label = Label(traditional_name, CENTER, Color.WHITE)
        traditional_label.setFont(Font("Arial", Font.BOLD, font_size))
        self.chord_info_text['traditional'] = traditional_label

        # Calculate precise position for perfect centering
        traditional_x = self._get_precise_label_position(
            traditional_name, font_size, horizontal_center)
        self.chord_display.add(traditional_label, traditional_x, bottom_y - 5)

    def update_chord_info_display(self, chord):
        """
        Update the chord information text at the top of the chord display.

        Args:
            chord (Chord): The chord object containing name and info
        """
        # Remove old labels if they exist
        if self.chord_info_text['elemental']:
            self.chord_display.remove(self.chord_info_text['elemental'])
        if self.chord_info_text['traditional']:
            self.chord_display.remove(self.chord_info_text['traditional'])

        # Calculate positions and create labels
        font_size, horizontal_center, top_y, bottom_y = self._calculate_label_positions()
        self._create_chord_labels(chord, font_size, horizontal_center, top_y, bottom_y)

    def update_chord_info_display_with_name(self, elemental_name, traditional_name):
        """
        Update the chord information text with custom names.

        Args:
            elemental_name (str): The elemental name to display
            traditional_name (str): The traditional name to display
        """
        # Remove old labels if they exist
        if self.chord_info_text['elemental']:
            self.chord_display.remove(self.chord_info_text['elemental'])
        if self.chord_info_text['traditional']:
            self.chord_display.remove(self.chord_info_text['traditional'])

        # Calculate positions and create labels
        font_size, horizontal_center, top_y, bottom_y = self._calculate_label_positions()

        # Create custom labels
        self._create_custom_chord_labels(elemental_name, traditional_name,
                                       font_size, horizontal_center, top_y, bottom_y)

    def get_diagram_display(self):
        """Get the diagram display object."""
        return self.diagram_display

    def get_chord_display(self):
        """Get the chord display object."""
        return self.chord_display

    def get_clock_dimensions(self):
        """Get the clock dimensions for musical_core."""
        return self.clock_radius, self.clock_x, self.clock_y

    def clear_cached_elements(self):
        """Clear cached display elements for memory management."""
        self._cached_lines.clear()
        self._cached_circles.clear()

    def set_update_throttle(self, throttle_ms):
        """
        Set the display update throttle time.

        Args:
            throttle_ms (int): Throttle time in milliseconds
        """
        self._update_throttle = throttle_ms / 1000.0  # Convert to seconds