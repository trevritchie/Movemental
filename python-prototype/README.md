# Movemental

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![CreativePython](https://img.shields.io/badge/dependency-CreativePython-green.svg)](https://pypi.org/project/CreativePython/)

An interactive musical chord exploration tool that visualizes chord relationships through an elemental system inspired by Dr. Barry Harris's harmonic concepts.

**Author:** Trevor Ritchie

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- **Interactive chord playing**: Click anywhere on the diagram to play chords
- **Multiple voicings**: Choose from Close, Drop 2, Drop 3, or Drop 2 and 4 voicings
- **Tonal center adjustment**: Set any note as your tonal center (default: A)
- **Real-time visualization**: See chord relationships and note positions instantly
- **Elemental chord system**: Explore chords through the Earth, Wind, and Fire elemental framework
- **Dual-panel interface**: Diagram display for chord selection and clock-face visualization
- **Musical theory integration**: Based on Dr. Barry Harris's harmonic movement concepts

## Screenshots

*Screenshots coming soon...*

## Installation

### Prerequisites

- Python 3.12 or higher
- CreativePython library

### Quick Start

1. Install the required dependency:
```bash
pip install CreativePython
```

2. Clone the repository:
```bash
git clone https://github.com/trevritchie/Movemental
cd movemental
```

3. Run Movemental:
```bash
python -i Movemental.py
```

### Running Movemental

**Important**: Movemental must be run in Python's interactive mode using the `-i` flag:

```bash
python -i Movemental.py
```

On some systems, you may also use:
```bash
py -i Movemental.py
```

You can create a convenient alias for easier execution:
```bash
# Create an alias (add to your shell profile)
alias pyi="python -i"

# Then simply run:
pyi Movemental.py
```

### Virtual Environment Setup (Optional)

For a clean development environment:

```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install the required library
pip install CreativePython

# Run Movemental
python -i Movemental.py
```

## Usage

Movemental consists of two main displays that work together to provide an intuitive chord exploration experience.

### Diagram Display
The left panel shows an interactive diagram where you can click on different chord positions to play and explore various chord types. Each position represents a different chord with elemental names like "Earth", "Wind", "Fire", and their combinations (e.g., "Trunk", "Branch", "Smoke", "Ember", etc.).

### Chord Visualization (Clock Face)
The right panel displays a circular clock-like interface that shows:
- **Note positions**: 12 semitones arranged around the circle, with your chosen tonal center at 12 o'clock
- **Active chord visualization**: When you click a chord on the diagram, four colored nodes appear on the clock face showing the chord's constituent notes
- **Connecting lines**: Lines connect all chord notes to each other, creating a visual representation of the chord's structure
- **Chord information**: Elemental name and traditional music theory name are displayed above and below the circle

### Getting Started
1. Run the program: `python -i Movemental.py`
2. Click on any chord position in the diagram to hear and visualize it
3. Experiment with different chord combinations and voicings
4. Use the clock face to understand chord structures and relationships

## Configuration

*Configuration options coming soon...*

## API Reference

*API documentation coming soon...*

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Dr. Barry Harris**: For pioneering the harmonic movement concepts that inspired this tool
- **Pangur Brougham-Cook and Bill Manaris**: For the chord visualization inspiration from TetraChordTuner
- **____ and Bill Manaris**: For the interface inspiration from tonnetz
- **CreativePython**: For providing the musical framework
- **Contributors**: Trevor Ritchie

---

## Musical Concepts

**REMEMBER!**
- The major 6th chord (Ex. C maj6) is the same as the relative minor 7th (Ex. A min7), and the minor 6th chord (Ex. C min6) is the same as the relative minor 7th flat 5 (Ex. A min7♭5).
- Each "child" chord (those between Earth, Wind, and Fire) contains DNA from two parents (Earth, Wind, Fire), which is why each child chord has three siblings sharing the same ratio of DNA from each parent.
- Any chord may be combined with the element (Earth, Wind, or Fire) opposite from it, creating an 8-note "scale of chords" that alternates between resolution and tension (Ex. C maj6 + D dim7 (Branch + Fire) = C maj6 diminished scale).
- When playing a chord, "borrowing" some notes from the opposite element (not one of the parents) can produce beautiful results (Ex. C maj7, C maj7#5, perhaps grandchildren?).
- These concepts were pioneered by Dr. Barry Harris. In his memory, let's play beautiful movements, not static chords, and remember to play with our family!!!