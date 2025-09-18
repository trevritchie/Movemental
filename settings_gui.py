"""
Settings GUI Module for Movemental.py

This module contains the UserSettingsGUI class for handling user settings
configuration before the main application starts.

Author: Trevor Ritchie
Date: 2025-09-16
"""

from gui import *
from music import *
from config import config, NOTE_NAMES_FLAT


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
            self._fallback_to_defaults()

    def _fallback_to_defaults(self):
        """Fall back to default settings and start main application."""
        # Import here to avoid circular imports
        from Movemental import apply_user_settings, initialize_application

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
                # Import here to avoid circular imports
                from Movemental import apply_user_settings, initialize_application, show_cli_info

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
