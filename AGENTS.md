# Movemental: AI Agent Instructions

This repository contains Movemental, an interactive audio application. These instructions are for AI coding assistants operating within this codebase.

## 1. Primary Documentation
This repository is well-documented. **Before making any structural changes, modifying React components, or altering audio logic, you must read:**

*   `README.md`: Contains the domain architecture, Tone.js DSP data flow, tilt voicing engine details, and deployment instructions.
*   `CONTRIBUTING.md`: Contains strict non-negotiable rules regarding module layout, React context boundaries (`ChordContext` vs `SoundDesignContext`), and the playback hot path.

Do not guess or apply generic React patterns; strictly adhere to the context boundaries, performance rules, and cross-file utility conventions defined in `CONTRIBUTING.md`.

## 2. Verification Rules
Before considering a task complete, writing a commit, or presenting a final solution, you must verify your changes by running the following commands locally:

1.  **Lint:** `npm run lint`
2.  **Unit Tests:** `npm test` (Runs the fast, mocked test suite)

Do not bypass these checks. Ensure both commands exit successfully before concluding your work.
