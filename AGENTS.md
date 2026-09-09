# Primary Documentation
This repository is well-documented. **Before making any structural changes, modifying React components, or altering audio logic, you must read:**

*   `README.md`: Contains the domain architecture, Tone.js DSP data flow, tilt voicing engine details, and deployment instructions.
*   `CONTRIBUTING.md`: Contains strict non-negotiable rules regarding module layout, React context boundaries (`ChordContext` vs `SoundDesignContext`), and the playback hot path.

Do not guess or apply generic React patterns; strictly adhere to the context boundaries, performance rules, and cross-file utility conventions defined in `CONTRIBUTING.md`.
