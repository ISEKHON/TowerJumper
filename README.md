# Helix Tower Jumper

A 3D arcade game built with Three.js and Cannon-es.

## Setup

1.  **Install Node.js**: Ensure you have Node.js installed.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
4.  **Open Browser**: Visit the URL shown in the terminal (usually `http://localhost:5173`).

## Controls

*   **Mouse/Touch Drag**: Rotate the tower to align gaps with the bouncing ball.
*   **Goal**: Reach the bottom of the tower without hitting the red zones.

## Architecture

*   `src/Game.js`: Main entry point and loop.
*   `src/managers/`: Handles Physics, Input, UI.
*   `src/objects/`: Game entities (Ball, Tower, Platform).
*   `src/utils/`: Helper functions.

## Technologies

*   **Three.js**: Rendering.
*   **Cannon-es**: Physics simulation.
*   **Vite**: Build tool.
