"""
Configuration module for Movemental.py

This module contains all constants, default settings, and configuration
management for the Movemental application.
"""

from music import *
from gui import Color
from math import pi


class ApplicationConfig:
    """
    Configuration management class for Movemental application.
    
    This class manages all default settings, runtime variables, and constants
    used throughout the application. It provides methods to update settings
    and recalculate derived values.
    """
    
    def __init__(self):
        """Initialize configuration with default values."""
        self._initialize_defaults()
        self._initialize_runtime_variables()
        self._initialize_constants()
        self._initialize_borrowing_state()
    
    def _initialize_defaults(self):
        """Initialize default settings."""
        # Default Settings - If the user clicks no drop down menus, these will be used
        self.DEFAULT_TONAL_CENTER_OFFSET = BF0  # 0 = C, 2 = D, -2 = Bb, 10 = Bb etc.
        self.DEFAULT_OCTAVE_RANGE = 3  # which octave to place chords in
        self.DEFAULT_VOICING = "Drop 2 and 4"  # Close, Drop 2, Drop 3, Drop 2 and 4
        self.DEFAULT_CHORD_DURATION = HN  # how long to play each chord
        
        # For all instrument constants, see:
        # https://jythonmusic.me/api/midi-constants/instrument/
        self.DEFAULT_INSTRUMENT = PIANO
        
        # Screen dimensions
        # Laptop screen
        self.DEFAULT_SCREEN_WIDTH = 1920  # pixels
        self.DEFAULT_SCREEN_HEIGHT = 1200  # pixels
        self.DEFAULT_DISPLAY_SCALE = 1.5  # Ex. Windows 150% scaling = 1.5
        
        # Lab monitor alternatives (commented out)
        # self.DEFAULT_SCREEN_WIDTH = 3440  # pixels
        # self.DEFAULT_SCREEN_HEIGHT = 1440  # pixels
        # self.DEFAULT_DISPLAY_SCALE = 1.0  # Ex. Windows 150% scaling = 1.5
    
    def _initialize_runtime_variables(self):
        """Initialize runtime variables that will be updated by user settings."""
        self.TONAL_CENTER_OFFSET = self.DEFAULT_TONAL_CENTER_OFFSET
        self.OCTAVE_RANGE = self.DEFAULT_OCTAVE_RANGE
        self.VOICING = self.DEFAULT_VOICING
        self.CHORD_DURATION = self.DEFAULT_CHORD_DURATION
        self.INSTRUMENT = self.DEFAULT_INSTRUMENT
        self.SCREEN_WIDTH = self.DEFAULT_SCREEN_WIDTH
        self.SCREEN_HEIGHT = self.DEFAULT_SCREEN_HEIGHT
        self.DISPLAY_SCALE = self.DEFAULT_DISPLAY_SCALE
    
    def _initialize_borrowing_state(self):
        """Initialize borrowing state management."""
        self.BORROWING_STATE = {
            'active': False,
            'chord_name': None,
            'borrowed_notes': [],
            'original_notes': [],
            'circle_positions': {1: 'line', 2: 'line', 3: 'line', 4: 'line'},
            'borrowing_directions': {1: None, 2: None, 3: None, 4: None},
            'note_states': {1: 'on', 2: 'on', 3: 'on', 4: 'on'},
            'borrowing_history': {}
        }
    
    def _initialize_constants(self):
        """Initialize all mathematical and UI constants."""
        # Voicing configuration
        self.VOICING_TO_INDICES = {
            "Close": [],
            "Drop 2": [1],
            "Drop 3": [1, 2],
            "Drop 2 and 4": [1, 3]
        }
        
        # Intervals in semitones
        self.MINOR_THIRD = 3
        self.TRITONE = 6
        self.OCTAVE = 12
        
        # Magic number constants
        self.MAX_MIDI_PITCH = 127
        self.MAX_VOICING_PITCH = 120
        self.LARGE_DISTANCE = 1000000
        self.MIN_RADIUS = 50
        self.MIN_NODE_RADIUS = 8
        self.MIN_TICK_RADIUS = 3
        self.MIN_SMALL_TICK_RADIUS = 2
        self.MIN_LABEL_DISTANCE = 15
        self.MIN_FONT_SIZE = 12
        self.MIN_FONT_HEIGHT = 16
        self.MIN_PADDING = 40
        self.MIN_TOP_MARGIN = 10
        self.MIN_BOTTOM_MARGIN = 30
        
        # Scales of chords by "pitch class". Semitones are assigned to 0-11.
        self.MAJOR_SIXTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 9, 11]
        self.MAJOR_SIXTH_DIMINISHED_SCALE_FROM_THIRD = [0, 1, 3, 4, 5, 7, 8, 10]
        self.MAJOR_SIXTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 2, 4, 5, 7, 9, 10]
        self.MAJOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [
            0, 2, 3, 5, 7, 8, 10, 11]  # aka minor seventh diminished
        
        self.MINOR_SIXTH_DIMINISHED_SCALE = [0, 2, 3, 5, 7, 8, 9, 11]
        self.MINOR_SIXTH_DIMINISHED_SCALE_FROM_THIRD = [0, 2, 4, 5, 6, 8, 9, 11]
        self.MINOR_SIXTH_DIMINISHED_SCALE_FROM_FIFTH = [0, 1, 2, 4, 5, 7, 8, 10]
        # aka minor seventh flat five diminished
        self.MINOR_SIXTH_DIMINISHED_SCALE_FROM_SIXTH = [0, 2, 3, 5, 6, 8, 10, 11]
        
        self.DOMINANT_SEVENTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 10, 11]
        self.DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_THIRD = [
            0, 1, 3, 4, 6, 7, 8, 10]
        self.DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_FIFTH = [
            0, 1, 3, 4, 5, 7, 9, 10]
        self.DOMINANT_SEVENTH_DIMINISHED_SCALE_FROM_SEVENTH = [
            0, 1, 2, 4, 6, 7, 9, 10]
        
        self.DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE = [
            0, 2, 4, 5, 6, 8, 10, 11]  # same as from flat fifth
        self.DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_SCALE_FROM_THIRD = [
            0, 1, 2, 4, 6, 7, 8, 10]  # same as from seventh
        
        self.DOMINANT_ROOTS_AND_THEIR_DIMINISHED = [
            0, 2, 3, 5, 6, 8, 9, 11]  # aka whole-half diminished
        self.DIMINISHED_AND_ITS_DOMINANT_ROOTS = [
            0, 1, 3, 4, 6, 7, 9, 10]  # aka half-whole diminished
        
        # Chord qualities
        self.MAJOR_SIXTH_CHORD = [0, 4, 7, 9]
        self.MAJOR_SIXTH_CHORD_FROM_THIRD = [0, 3, 5, 8]
        self.MAJOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 9]
        self.MAJOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 7, 10]  # aka minor seventh chord
        
        self.MINOR_SIXTH_CHORD = [0, 3, 7, 9]
        self.MINOR_SIXTH_CHORD_FROM_THIRD = [0, 4, 6, 9]
        self.MINOR_SIXTH_CHORD_FROM_FIFTH = [0, 2, 5, 8]
        self.MINOR_SIXTH_CHORD_FROM_SIXTH = [0, 3, 6, 10]  # aka minor seventh flat five
        
        self.DOMINANT_SEVENTH_CHORD = [0, 4, 7, 10]
        self.DOMINANT_SEVENTH_CHORD_FROM_THIRD = [0, 3, 6, 8]
        self.DOMINANT_SEVENTH_CHORD_FROM_FIFTH = [0, 3, 5, 9]
        self.DOMINANT_SEVENTH_CHORD_FROM_SEVENTH = [0, 2, 6, 9]
        
        self.DOMINANT_SEVENTH_FLAT_FIVE_CHORD = [0, 4, 6, 10]  # same as from flat fifth
        self.DOMINANT_SEVENTH_FLAT_FIVE_CHORD_FROM_THIRD = [
            0, 2, 6, 8]  # same as from seventh
        
        self.DIMINISHED_CHORD = [0, 3, 6, 9]
        
        # Relative positioning constants (as ratios of radius)
        self.LABEL_DISTANCE_RATIO = 1.2  # How far outside circle to place note labels
        self.SMALL_TICK_RATIO = 0.95     # How close to center to place small ticks
        self.TITLE_DISTANCE_RATIO = 1.4  # How far above circle to place title
        
        # Math constants for faster calculations
        self.PI_OVER_6 = pi / 6
        self.PI_OVER_3 = pi / 3
        self.PI_OVER_2 = pi / 2
        self.PI_TIMES_2 = 2 * pi
        
        # Borrowing system constants
        self.ELEMENTAL_RELATIONSHIPS = {
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
        self.NOTE_POSITION_MAPPING = {
            1: 0,  # Line 1 → Lowest note (index 0)
            2: 1,  # Line 2 → Second lowest note (index 1)
            3: 2,  # Line 3 → Third lowest note (index 2)
            4: 3   # Line 4 → Highest note (index 3)
        }
        
        # Borrowing control UI constants
        self.BORROWING_CONTROLS = {
            'circle_radius': 8,  # Same as selected_chord_dot
            'arrow_size': 6      # Size of arrow indicators
        }
        
        # Borrowing control coordinates (relative coordinates for scaling)
        # Base line positions for each note (where circles start)
        # Original coordinates captured on 1200x720 diagram image
        # Converted to relative (0-1) coordinates: x/1200, y/720
        self.BORROWING_LINE_COORDINATES = {
            1: (0.036, 0.902),  # Line 1 - affects lowest note (bass)
            2: (0.110, 0.903),  # Line 2 - affects second lowest note (tenor)
            3: (0.188, 0.905),  # Line 3 - affects second highest note (alto)
            4: (0.267, 0.908),  # Line 4 - affects highest note (soprano)
        }
        
        # Arrow positions for each line (up and down)
        # Original coordinates captured on 1200x720 diagram image
        # Converted to relative (0-1) coordinates: x/1200, y/720
        self.BORROWING_ARROW_COORDINATES = {
            1: {'up': (0.035, 0.828), 'down': (0.038, 0.977)},
            2: {'up': (0.109, 0.828), 'down': (0.111, 0.980)},
            3: {'up': (0.189, 0.833), 'down': (0.185, 0.970)},
            4: {'up': (0.268, 0.835), 'down': (0.268, 0.975)},
        }
    
    def get_tonal_center_pitch_class(self):
        """Get the current tonal center pitch class (0-11)."""
        return self.TONAL_CENTER_OFFSET % 12
    
    def get_octave_offset(self):
        """Get the current octave offset for chord placement."""
        return self.OCTAVE * self.OCTAVE_RANGE
    
    def update_settings(self, **kwargs):
        """
        Update configuration settings and recalculate derived values.
        
        Args:
            **kwargs: Settings to update (e.g., TONAL_CENTER_OFFSET=5)
        """
        try:
            for key, value in kwargs.items():
                if hasattr(self, key):
                    setattr(self, key, value)
                else:
                    raise ValueError(f"Unknown setting: {key}")
            
            # Set instrument if updated
            if 'INSTRUMENT' in kwargs:
                Play.setInstrument(self.INSTRUMENT)
                
        except Exception as e:
            raise RuntimeError(f"Failed to update settings: {e}")
    
    def validate_settings(self):
        """
        Validate current settings for consistency and safety.
        
        Returns:
            bool: True if all settings are valid
            
        Raises:
            ValueError: If any setting is invalid
        """
        try:
            # Validate octave range
            if not (1 <= self.OCTAVE_RANGE <= 8):
                raise ValueError("OCTAVE_RANGE must be between 1 and 8")
            
            # Validate screen dimensions
            if self.SCREEN_WIDTH <= 0 or self.SCREEN_HEIGHT <= 0:
                raise ValueError("Screen dimensions must be positive")
            
            # Validate display scale
            if not (0.5 <= self.DISPLAY_SCALE <= 3.0):
                raise ValueError("DISPLAY_SCALE must be between 0.5 and 3.0")
            
            # Validate voicing
            if self.VOICING not in self.VOICING_TO_INDICES:
                raise ValueError(f"Invalid voicing: {self.VOICING}")
            
            return True
            
        except Exception as e:
            raise ValueError(f"Settings validation failed: {e}")


# Global configuration instance
config = ApplicationConfig()

# Note letter names
NOTE_NAMES_SHARP = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
]

NOTE_NAMES_FLAT = [
    "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"
]

# Transparent color for hiding circles (alpha = 0)
TRANSPARENT_COLOR = Color(0, 0, 0, 0)

# Table separator for console output
TABLE_SEPARATOR = "|" + "-" * 32 + "|" + "-" * 22 + "|" + "-" * 22 + "|"


def calculate_distance(point1, point2):
    """
    Calculate the euclidean distance between two points.
    
    Args:
        point1 (tuple): First point as (x, y)
        point2 (tuple): Second point as (x, y)
    
    Returns:
        float: Euclidean distance between the points
    """
    from math import hypot
    return hypot(point2[0] - point1[0], point2[1] - point1[1])


# Color constants for chord gradient
CHORD_COLORS = {
    'BROWN': (139, 90, 60),      # Rich brown - like fertile soil
    'LIGHT_BLUE': (135, 206, 235),  # Light blue - like clear sky
    'RED': (220, 50, 50),        # Deep red - like burning embers
}

# Chord display constants
CHORD_GRADIENT_SIZE = 24
CHORD_PATTERN_REPEAT = 3