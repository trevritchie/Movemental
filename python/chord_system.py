# chord_system.py
#
# This module contains the core musical logic including the Chord class,
# ChordManager, and all musical calculation functions with performance
# optimizations through caching.

from music import *
from gui import Color
from math import cos, sin
import time
from config import config, NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, CHORD_COLORS, CHORD_GRADIENT_SIZE, CHORD_PATTERN_REPEAT


class PerformanceCache:
    """
    Performance optimization cache for expensive musical calculations.

    Implements caching for:
    - Trigonometric calculations (sin/cos lookup tables)
    - Pitch-to-angle conversions
    - Chord coordinate mappings
    """

    def __init__(self):
        """Initialize performance caches."""
        self._trig_cache = {}
        self._pitch_angle_cache = {}
        self._coordinate_cache = {}
        self._chord_cache = {}
        self._initialize_trig_lookup_tables()

    def _initialize_trig_lookup_tables(self):
        """Pre-calculate trigonometric values for 12 pitch classes."""
        # Pre-calculate for all 12 pitch classes and common angles
        for i in range(12):
            angle = (i / 12.0) * config.PI_TIMES_2
            adjusted_angle = angle - config.PI_OVER_2

            self._trig_cache[angle] = {
                'cos': cos(adjusted_angle),
                'sin': sin(adjusted_angle),
                'adjusted_angle': adjusted_angle
            }

    def get_trig_values(self, angle):
        """Get cached trigonometric values for an angle."""
        if angle not in self._trig_cache:
            adjusted_angle = angle - config.PI_OVER_2
            self._trig_cache[angle] = {
                'cos': cos(adjusted_angle),
                'sin': sin(adjusted_angle),
                'adjusted_angle': adjusted_angle
            }
        return self._trig_cache[angle]

    def get_pitch_angle(self, pitch, tonal_center_pitch_class):
        """Get cached pitch-to-angle conversion."""
        cache_key = (pitch % 12, tonal_center_pitch_class)
        if cache_key not in self._pitch_angle_cache:
            pitch_class = pitch % 12
            adjusted_pitch_class = (pitch_class - tonal_center_pitch_class) % 12
            angle = (adjusted_pitch_class / 12.0) * config.PI_TIMES_2
            self._pitch_angle_cache[cache_key] = angle
        return self._pitch_angle_cache[cache_key]

    def get_chord_coordinates(self, chord_name, pitches):
        """Get cached chord coordinate mapping."""
        cache_key = (chord_name, tuple(sorted(pitches)))
        if cache_key not in self._coordinate_cache:
            # This will be populated by ChordManager
            pass
        return self._coordinate_cache.get(cache_key)

    def cache_chord_coordinates(self, chord_name, pitches, coordinates):
        """Cache chord coordinate mapping."""
        cache_key = (chord_name, tuple(sorted(pitches)))
        self._coordinate_cache[cache_key] = coordinates

    def clear_cache(self):
        """Clear all caches (useful when tonal center changes)."""
        self._pitch_angle_cache.clear()
        self._coordinate_cache.clear()
        self._chord_cache.clear()
        # Keep trig cache as it's angle-independent


class Chord:
    """
    Represents a musical chord with elemental naming and traditional theory.

    Optimized version with caching support for better performance.
    """

    def __init__(self, name, pitches, cache=None):
        """
        Initialize a Chord with name and pitches.

        Args:
            name (str): The elemental name of the chord
            pitches (list): List of pitch values for the chord
            cache (PerformanceCache): Optional cache for performance optimization
        """
        self.name = name
        self._cache = cache

        # Store root pitch class from original chord definition (before tonal center offset)
        root_pitch_class = pitches[0] % 12

        # Convert to pitch classes (0-11) then add tonal center offset
        self.pitches = [(x % 12) + config.get_tonal_center_pitch_class()
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
        transposed_root_pitch_class = (root_pitch_class + config.get_tonal_center_pitch_class()) % 12
        self.root_position_index = 0  # Default to first position
        for i, pitch in enumerate(self.pitches):
            if pitch % 12 == transposed_root_pitch_class:
                self.root_position_index = i
                break

        # Apply voicing transformations to get the actual note ordering
        voiced_pitches = []
        for i in range(len(self.pitches)):
            # Place the pitch class into the correct octave range
            adjusted_pitch = self.pitches[i] + config.get_octave_offset()

            # For the chosen voicing, raise the appropriate notes up an octave
            if i in config.VOICING_TO_INDICES.get(config.VOICING):
                if adjusted_pitch + config.OCTAVE <= config.MAX_MIDI_PITCH:
                    adjusted_pitch += config.OCTAVE

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


class ChordManager:
    """
    Manages all chord operations with performance optimizations.

    Handles chord dictionary initialization, coordinate mapping,
    and provides cached access to chord operations.
    """

    def __init__(self):
        """Initialize the ChordManager with performance cache."""
        self.cache = PerformanceCache()
        self.coordinates_to_chord = {}
        self._initialization_time = None
        self._is_initialized = False

    def initialize_chord_dictionary(self):
        """
        Initialize the chord dictionary with all chord definitions.

        This function must be called after user settings are applied so that
        the correct tonal center is used when creating Chord objects.

        Returns:
            float: Time taken for initialization (for performance monitoring)
        """
        start_time = time.time()

        # Clear any existing chords and cache
        self.coordinates_to_chord = {}
        self.cache.clear_cache()

        # Elemental Diminished Chords
        self.coordinates_to_chord[(0.091, 0.158)] = Chord("Earth", [C4, EF4, FS4, A4], self.cache)
        self.coordinates_to_chord[(0.878, 0.157)] = Chord("Wind", [DF4, E4, G4, BF4], self.cache)
        self.coordinates_to_chord[(0.471, 0.889)] = Chord("Fire", [D4, F4, AF4, B4], self.cache)

        # Earth-Wind Combinations
        # Trunk (min 6)
        self.coordinates_to_chord[(0.277, 0.101)] = Chord("Trunk", [C4, EF4, G4, A4], self.cache)
        self.coordinates_to_chord[(0.238, 0.165)] = Chord("Brother Trunk",
                                                         [EF4, GF4, BF4, C5], self.cache)
        self.coordinates_to_chord[(0.280, 0.161)] = Chord("Twin Trunk",
                                                         [GF4, A4, DF5, EF5], self.cache)
        self.coordinates_to_chord[(0.317, 0.160)] = Chord("Sister Trunk",
                                                         [A3, C4, E4, FS4], self.cache)
        # Branch (maj 6)
        self.coordinates_to_chord[(0.493, 0.042)] = Chord("Branch", [C4, E4, G4, A4], self.cache)
        self.coordinates_to_chord[(0.442, 0.094)] = Chord("Brother Branch",
                                                         [EF4, G4, BF4, C5], self.cache)
        self.coordinates_to_chord[(0.488, 0.094)] = Chord("Twin Branch",
                                                         [GF4, BF4, DF5, EF5], self.cache)
        self.coordinates_to_chord[(0.533, 0.094)] = Chord("Sister Branch",
                                                         [A3, CS4, E4, FS4], self.cache)
        # Sand-Storm (dom 7 b5) (default=twin and brother=sister)
        self.coordinates_to_chord[(0.494, 0.221)] = Chord("Sand-Storm", [C4, E4, GF4, BF4], self.cache)
        self.coordinates_to_chord[(0.442, 0.282)] = Chord("Brother Sand-Storm",
                                                         [EF4, G4, A4, DF5], self.cache)
        self.coordinates_to_chord[(0.499, 0.283)] = Chord("Twin Sand-Storm",
                                                         [GF4, BF4, C5, E5], self.cache)
        self.coordinates_to_chord[(0.558, 0.283)] = Chord("Sister Sand-Storm",
                                                         [A3, DF4, EF4, G4], self.cache)
        # Leaf (dom 7)
        self.coordinates_to_chord[(0.683, 0.113)] = Chord("Leaf", [C4, E4, G4, BF4], self.cache)
        self.coordinates_to_chord[(0.658, 0.171)] = Chord("Brother Leaf",
                                                         [EF4, G4, BF4, DF5], self.cache)
        self.coordinates_to_chord[(0.693, 0.161)] = Chord("Twin Leaf",
                                                         [GF4, BF4, DF5, E5], self.cache)
        self.coordinates_to_chord[(0.726, 0.165)] = Chord("Sister Leaf",
                                                         [A3, CS4, E4, G4], self.cache)

        # Wind-Fire Combinations
        # Smoke (min 6)
        self.coordinates_to_chord[(0.833, 0.310)] = Chord("Smoke", [G4, BF4, D5, E5], self.cache)
        self.coordinates_to_chord[(0.785, 0.360)] = Chord("Brother Smoke",
                                                         [BF4, DF5, F5, G5], self.cache)
        self.coordinates_to_chord[(0.825, 0.360)] = Chord("Twin Smoke",
                                                         [DF5, E5, AF5, BF5], self.cache)
        self.coordinates_to_chord[(0.864, 0.371)] = Chord("Sister Smoke",
                                                         [E4, G4, B4, CS5], self.cache)
        # Ember (maj 6)
        self.coordinates_to_chord[(0.929, 0.475)] = Chord("Ember", [G4, B4, D5, E5], self.cache)
        self.coordinates_to_chord[(0.873, 0.533)] = Chord("Brother Ember",
                                                         [BF4, D5, F5, G5], self.cache)
        self.coordinates_to_chord[(0.919, 0.528)] = Chord("Twin Ember",
                                                         [DF5, F5, AF5, BF5], self.cache)
        self.coordinates_to_chord[(0.962, 0.532)] = Chord("Sister Ember",
                                                         [E4, GS4, B4, CS5], self.cache)
        # Fire-Storm (dom 7 b5)
        self.coordinates_to_chord[(0.627, 0.444)] = Chord("Fire-Storm", [G4, B4, DF5, F5], self.cache)
        self.coordinates_to_chord[(0.561, 0.511)] = Chord("Brother Fire-Storm",
                                                         [BF4, D5, E5, AF5], self.cache)
        self.coordinates_to_chord[(0.630, 0.501)] = Chord("Twin Fire-Storm",
                                                         [DF5, F5, G5, B5], self.cache)
        self.coordinates_to_chord[(0.686, 0.504)] = Chord("Sister Fire-Storm",
                                                         [E4, AF4, BF4, D5], self.cache)
        # Flame (dom 7)
        self.coordinates_to_chord[(0.680, 0.738)] = Chord("Flame", [G4, B4, D5, F5], self.cache)
        self.coordinates_to_chord[(0.623, 0.794)] = Chord("Brother Flame",
                                                         [BF4, D5, F5, AF5], self.cache)
        self.coordinates_to_chord[(0.675, 0.792)] = Chord("Twin Flame",
                                                         [DF5, F5, AF5, B5], self.cache)
        self.coordinates_to_chord[(0.728, 0.796)] = Chord("Sister Flame",
                                                         [E4, GS4, B4, D5], self.cache)

        # Fire-Earth Combinations
        # Magma (min 6)
        self.coordinates_to_chord[(0.283, 0.690)] = Chord("Magma", [D4, F4, A4, B5], self.cache)
        self.coordinates_to_chord[(0.233, 0.754)] = Chord("Brother Magma",
                                                         [F4, AF4, C5, D5], self.cache)
        self.coordinates_to_chord[(0.284, 0.754)] = Chord("Twin Magma",
                                                         [AF4, CF5, EF5, F5], self.cache)
        self.coordinates_to_chord[(0.328, 0.751)] = Chord("Sister Magma",
                                                         [B3, D4, FS4, GS4], self.cache)
        # Glass (maj 6)
        self.coordinates_to_chord[(0.069, 0.468)] = Chord("Glass", [F4, A4, C5, D5], self.cache)
        self.coordinates_to_chord[(0.028, 0.533)] = Chord("Brother Glass",
                                                         [AF4, C4, EF5, F5], self.cache)
        self.coordinates_to_chord[(0.072, 0.528)] = Chord("Twin Glass",
                                                         [B4, DS5, FS5, GS5], self.cache)
        self.coordinates_to_chord[(0.109, 0.525)] = Chord("Sister Glass",
                                                         [D4, FS4, A4, B5], self.cache)
        # Forest-Fire (dom 7 b5)
        self.coordinates_to_chord[(0.392, 0.432)] = Chord("Forest-Fire", [F4, A4, CF5, EF5], self.cache)
        self.coordinates_to_chord[(0.348, 0.493)] = Chord("Brother Forest-Fire",
                                                         [AF4, C5, D5, GF5], self.cache)
        self.coordinates_to_chord[(0.393, 0.487)] = Chord("Twin Forest-Fire",
                                                         [CF5, EF5, F5, A5], self.cache)
        self.coordinates_to_chord[(0.438, 0.485)] = Chord("Sister Forest-Fire",
                                                         [D4, GF4, AF4, C5], self.cache)
        # Charcoal (dom 7)
        self.coordinates_to_chord[(0.196, 0.326)] = Chord("Charcoal", [F4, A4, C5, EF5], self.cache)
        self.coordinates_to_chord[(0.144, 0.381)] = Chord("Brother Charcoal",
                                                         [AF4, C4, EF5, GF5], self.cache)
        self.coordinates_to_chord[(0.193, 0.378)] = Chord("Twin Charcoal",
                                                         [B4, DS5, FS5, A5], self.cache)
        self.coordinates_to_chord[(0.241, 0.381)] = Chord("Sister Charcoal",
                                                         [D4, FS4, A4, C5], self.cache)

        # Cache coordinate mappings for performance
        for coord, chord in self.coordinates_to_chord.items():
            self.cache.cache_chord_coordinates(chord.name, chord.pitches, coord)

        end_time = time.time()
        self._initialization_time = end_time - start_time
        self._is_initialized = True

        return self._initialization_time

    def get_chord_by_coordinates(self, coordinates):
        """Get chord by coordinates with caching."""
        return self.coordinates_to_chord.get(coordinates)

    def get_chord_by_name(self, chord_name):
        """Find chord by name in coordinates_to_chord."""
        for chord in self.coordinates_to_chord.values():
            if chord.name == chord_name:
                return chord
        return None

    def get_elemental_chord(self, element_name):
        """Get one of the three primary elemental chords."""
        elemental_chords = ["Earth", "Wind", "Fire"]
        if element_name in elemental_chords:
            return self.get_chord_by_name(element_name)
        return None

    def get_all_coordinates(self):
        """Get all chord coordinates for closest point calculations."""
        return list(self.coordinates_to_chord.keys())

    def get_initialization_time(self):
        """Get the time taken for the last initialization."""
        return self._initialization_time

    def is_initialized(self):
        """Check if the chord dictionary has been initialized."""
        return self._is_initialized


class MusicalCalculations:
    """
    Core musical calculation functions with performance optimizations.

    Handles pitch-to-angle conversions, coordinate calculations,
    and other mathematical operations with caching support.
    """

    def __init__(self, cache=None):
        """Initialize with optional performance cache."""
        self.cache = cache or PerformanceCache()

    def get_position_on_chord_circle(self, angle, clock_radius, clock_x, clock_y):
        """
        Returns x,y coordinates on the chord circle for a given angle.

        Args:
            angle (float): Angle in radians (0 = 12 o'clock, increases clockwise)
            clock_radius (int): Radius of the chord circle
            clock_x (int): X center of the chord circle
            clock_y (int): Y center of the chord circle

        Returns:
            tuple: (x, y) coordinates on the circle
        """
        # Use cached trigonometric values for better performance
        trig_values = self.cache.get_trig_values(angle)

        # Calculate coordinates relative to center
        new_x = clock_radius * trig_values['cos'] + clock_x
        new_y = clock_radius * trig_values['sin'] + clock_y

        return (int(new_x), int(new_y))

    def pitch_to_angle(self, pitch):
        """
        Convert MIDI pitch to angle on the circle with caching.

        Args:
            pitch (int): MIDI pitch value

        Returns:
            float: Angle in radians (0-2π)
        """
        tonal_center_pitch_class = config.get_tonal_center_pitch_class()
        return self.cache.get_pitch_angle(pitch, tonal_center_pitch_class)

    def create_chord_color_gradient(self):
        """
        Create a 24-color array for the chord display.

        Uses a repeating pattern of elemental colors around the clock face:
        - Brown, Light Blue, Red, Brown, Light Blue, Red, etc.

        Returns:
            list: List of Color objects
        """
        # Define the three elemental colors from config
        brown = Color(*CHORD_COLORS['BROWN'])        # Rich brown - like fertile soil
        light_blue = Color(*CHORD_COLORS['LIGHT_BLUE'])  # Light blue - like clear sky
        red = Color(*CHORD_COLORS['RED'])          # Deep red - like burning embers

        # Create gradient colors with repeating pattern: Brown, Red, Light Blue
        gradient = []

        for i in range(CHORD_GRADIENT_SIZE):
            if i % CHORD_PATTERN_REPEAT == 0:      # Positions 0, 3, 6, 9, 12, 15, 18, 21
                gradient.append(brown)
            elif i % CHORD_PATTERN_REPEAT == 1:    # Positions 1, 4, 7, 10, 13, 16, 19, 22
                gradient.append(red)
            else:               # Positions 2, 5, 8, 11, 14, 17, 20, 23
                gradient.append(light_blue)

        return gradient


class BorrowingLogic:
    """
    Handles all borrowing-related musical logic and calculations.

    Manages note borrowing between elemental chords with performance
    optimizations and caching.
    """

    def __init__(self, chord_manager):
        """Initialize with reference to chord manager."""
        self.chord_manager = chord_manager

    def get_root_position_mapping(self, chord):
        """
        Generate mapping from borrowing lines to chord notes in root position order.

        Args:
            chord (Chord): The chord object with root_position_index

        Returns:
            dict: Mapping from line number (1-4) to sorted pitch index
        """
        if not hasattr(chord, 'root_position_index'):
            # Fallback to original mapping if root position not available
            return config.NOTE_POSITION_MAPPING

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

    def find_next_higher_note(self, reference_pitch, available_pitches):
        """Find the next higher note from available pitches, guaranteeing higher absolute pitch."""
        # Convert to pitch classes for comparison
        reference_pc = reference_pitch % 12
        reference_octave = reference_pitch // 12
        available_pcs = [pitch % 12 for pitch in available_pitches]

        # Find pitches higher than reference pitch class
        higher_pcs = [pc for pc in available_pcs if pc > reference_pc]

        if higher_pcs:
            # Return the lowest higher pitch class in the same octave
            return min(higher_pcs) + (reference_octave * 12)
        else:
            # Wrap around to the lowest available pitch class in the next octave
            return min(available_pcs) + ((reference_octave + 1) * 12)

    def find_next_lower_note(self, reference_pitch, available_pitches):
        """Find the next lower note from available pitches, guaranteeing lower absolute pitch."""
        # Convert to pitch classes for comparison
        reference_pc = reference_pitch % 12
        reference_octave = reference_pitch // 12
        available_pcs = [pitch % 12 for pitch in available_pitches]

        # Find pitches lower than reference pitch class
        lower_pcs = [pc for pc in available_pcs if pc < reference_pc]

        if lower_pcs:
            # Return the highest lower pitch class in the same octave
            return max(lower_pcs) + (reference_octave * 12)
        else:
            # Wrap around to the highest available pitch class in the previous octave
            return max(available_pcs) + ((reference_octave - 1) * 12)

    def generate_active_pitches(self, chord, borrowing_state):
        """
        Generate the active (voiced) pitches for a chord based on borrowing state.
        This is the core logic shared between playback and spelling.

        Args:
            chord (Chord): The chord object
            borrowing_state (dict): Current borrowing state

        Returns:
            list: List of voiced MIDI pitches for active notes
        """
        # Start with original chord pitches
        original_pitches = sorted(chord.pitches)
        borrowed_pitches = original_pitches.copy()

        # Apply borrowing transformations (same logic as generate_and_play_borrowed_chord)
        opposite_element = config.ELEMENTAL_RELATIONSHIPS.get(chord.name, [None])[0]
        if opposite_element:
            opposite_chord = self.chord_manager.get_elemental_chord(opposite_element)
            if opposite_chord:
                opposite_pitches = opposite_chord.pitches
                root_position_mapping = self.get_root_position_mapping(chord)

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
                                replacement = self.find_next_higher_note(target_pitch, opposite_pitches)
                            else:  # down
                                replacement = self.find_next_lower_note(target_pitch, opposite_pitches)

                            borrowed_pitches[target_note_index] = replacement

        # Create a 4-note structure with null values for turned-off notes
        # This ensures voicing is applied to the correct positions
        full_pitch_structure = [None] * 4
        root_position_mapping = self.get_root_position_mapping(chord)

        for line_position in range(1, 5):
            if borrowing_state['note_states'][line_position] == 'on':
                note_index = root_position_mapping[line_position]
                if note_index < len(borrowed_pitches):
                    full_pitch_structure[note_index] = borrowed_pitches[note_index]

        # Apply voicing transformations to all notes first (same as play_chord function)
        # This ensures voicing is applied to the correct positions in the 4-note structure
        voiced_pitches = []
        for i in range(len(full_pitch_structure)):
            if full_pitch_structure[i] is None:
                # Skip turned-off notes
                continue

            # Place the pitch class into the correct octave range
            adjusted_pitch = full_pitch_structure[i] + config.get_octave_offset()

            # For the chosen voicing, raise the appropriate notes up an octave
            if i in config.VOICING_TO_INDICES.get(config.VOICING):
                if adjusted_pitch + config.OCTAVE <= config.MAX_VOICING_PITCH:
                    adjusted_pitch += config.OCTAVE

            voiced_pitches.append(adjusted_pitch)

        return voiced_pitches


# Global instances for the musical core
chord_manager = ChordManager()
musical_calculations = MusicalCalculations(chord_manager.cache)
borrowing_logic = BorrowingLogic(chord_manager)


def initialize_chord_dictionary():
    """
    Initialize the chord dictionary - wrapper function for compatibility.

    Returns:
        float: Time taken for initialization
    """
    return chord_manager.initialize_chord_dictionary()


# Clock dimensions - will be set by main module
_clock_radius = None
_clock_x = None
_clock_y = None


def set_clock_dimensions(radius, center_x, center_y):
    """
    Set the clock dimensions for coordinate calculations.

    Args:
        radius (int): Clock radius
        center_x (int): Clock center X coordinate
        center_y (int): Clock center Y coordinate
    """
    global _clock_radius, _clock_x, _clock_y
    _clock_radius = radius
    _clock_x = center_x
    _clock_y = center_y


def get_position_on_chord_circle(angle):
    """
    Get position on chord circle using set dimensions.

    Args:
        angle (float): Angle in radians

    Returns:
        tuple: (x, y) coordinates
    """
    if _clock_radius is None or _clock_x is None or _clock_y is None:
        raise ValueError("Clock dimensions not set - call set_clock_dimensions() first")

    return musical_calculations.get_position_on_chord_circle(angle, _clock_radius, _clock_x, _clock_y)


def pitch_to_angle(pitch):
    """
    Wrapper function for pitch to angle conversion.

    Args:
        pitch (int): MIDI pitch value

    Returns:
        float: Angle in radians
    """
    return musical_calculations.pitch_to_angle(pitch)


def create_chord_color_gradient():
    """
    Wrapper function for chord color gradient creation.

    Returns:
        list: List of Color objects
    """
    return musical_calculations.create_chord_color_gradient()


def get_root_position_mapping(chord):
    """
    Wrapper function for root position mapping.

    Args:
        chord (Chord): The chord object

    Returns:
        dict: Mapping from line number to pitch index
    """
    return borrowing_logic.get_root_position_mapping(chord)


def generate_active_pitches(chord, borrowing_state):
    """
    Wrapper function for active pitch generation.

    Args:
        chord (Chord): The chord object
        borrowing_state (dict): Current borrowing state

    Returns:
        list: List of voiced MIDI pitches
    """
    return borrowing_logic.generate_active_pitches(chord, borrowing_state)


def find_next_higher_note(reference_pitch, available_pitches):
    """
    Wrapper function for finding next higher note.

    Args:
        reference_pitch (int): Reference MIDI pitch
        available_pitches (list): Available pitches to choose from

    Returns:
        int: Next higher MIDI pitch
    """
    return borrowing_logic.find_next_higher_note(reference_pitch, available_pitches)


def find_next_lower_note(reference_pitch, available_pitches):
    """
    Wrapper function for finding next lower note.

    Args:
        reference_pitch (int): Reference MIDI pitch
        available_pitches (list): Available pitches to choose from

    Returns:
        int: Next lower MIDI pitch
    """
    return borrowing_logic.find_next_lower_note(reference_pitch, available_pitches)


def get_chord_by_name(chord_name):
    """
    Wrapper function for getting chord by name.

    Args:
        chord_name (str): Name of the chord

    Returns:
        Chord: The chord object or None if not found
    """
    return chord_manager.get_chord_by_name(chord_name)


def get_elemental_chord(element_name):
    """
    Wrapper function for getting elemental chord.

    Args:
        element_name (str): Name of the element ('Earth', 'Wind', 'Fire')

    Returns:
        Chord: The elemental chord object or None if not found
    """
    return chord_manager.get_elemental_chord(element_name)


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