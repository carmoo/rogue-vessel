# Technical Design Document: Rogue Vessel

This document outlines the technical architecture, design decisions, implementation details, and engineering challenges encountered during the development of *Rogue Vessel*, a real-time 3D first-person tactical shooter built for the web.

---

## 1. Technical Decisions & Project Philosophy

The primary objective was to build a highly responsive, atmospheric 3D game that runs directly in any modern web browser without requiring external plugins, native builds, or heavy server-side processing.

### Graphics Engine: BabylonJS vs. Three.js
**BabylonJS v5.x** was selected as the graphics engine over Three.js. While Three.js is a versatile rendering library, BabylonJS functions as a comprehensive game engine with standard game-development features available out-of-the-box:
*   **Built-in FPS Physics:** Integrates gravity and ellipsoid-based camera collision detection natively, facilitating first-person player controller setup.
*   **Input Management:** Offers robust abstraction layer for hardware inputs (mouse, keyboard) and viewport handling.
*   **Post-Processing Pipeline:** Provides optimized, production-ready rendering pipelines (`DefaultRenderingPipeline`) for effects like Bloom, Chromatic Aberration, Grain, and Vignette.

### Architecture: Vanilla JavaScript & Zero Frameworks
The game is written in **Vanilla JS (ES6)** with no heavy framework dependencies (e.g., React, Vue, Angular). Because the application consists of a single canvas with high-frequency rendering loops, a framework virtual DOM would introduce unnecessary garbage collection and lifecycle overhead. Direct DOM updates via native JavaScript (`document.getElementById`) are utilized to manage the HUD overlays (HP, ammo, stamina, floating score cues), ensuring consistent 60 FPS performance.

### Audio System: Procedural Web Audio API Synthesis
To minimize package size and bypass local Cross-Origin Resource Sharing (CORS) blocks when running from a filesystem, the game relies entirely on real-time sound synthesis via the **Web Audio API**. No audio files are downloaded. The game synthesizes sound effects programmatically using AudioContext nodes:
*   **Laser Firing:** A sine-wave oscillator sweeps exponentially from 800 Hz to 200 Hz over 0.1 seconds, combined with rapid gain attenuation.
*   **Impact Feedback:** A square-wave oscillator sweeps from 300 Hz to 100 Hz over 0.15 seconds.
*   **Hacking/Reprogramming:** A dual-oscillator digital chime (square + sine) rises exponentially from 400 Hz/800 Hz to 1600 Hz/2000 Hz in 0.3 seconds.

---

## 2. Core Game Architecture & Game Loop

The system operates on an entity-component-like structure driven by a central update loop.

### The Game Loop
The render cycle is managed via BabylonJS's `scene.registerBeforeRender` hook, executing the following logic every frame:
1.  **Player Controller Updates:** Tracks camera position, calculates stamina expenditure/regeneration, applies speed changes, and updates the minimap pointer.
2.  **Collectible State:** Updates floating and rotational animation matrices for the active Override Codes.
3.  **Active AI Processing:** Computes pathfinding vectors, handles physics-based collision avoidance, rotates meshes towards the player, and executes attacks.
4.  **Temporal States:** Manages active timers (e.g., enemy stun periods).

### Entity Management
Active synthetics are stored in a global `enemies` array. Each enemy entity is defined by an object containing:
*   A reference to the root 3D transform node (`root`).
*   An array of active `AnimationGroup` objects cloned from the asset container.
*   State variables (`alive`, `hacked`, `stunned`, `health`, `speed`).
*   Dedicated collider volumes for body and head components.

### Hitscan Detection System
For gunplay mechanics, a **Hitscan (Raycasting)** model was chosen. When the player triggers a shot, a ray is projected from the camera's center in the direction of the gaze vector:
```javascript
var forward = camera.getDirection(BABYLON.Vector3.Forward());
var ray = new BABYLON.Ray(camera.position, forward, 100);
var hit = scene.pickWithRay(ray);
```
If the ray intersects an enemy's head collider volume, it scores a headshot (tripled damage with distinct audio feedback); otherwise, it registers as a body hit. The hitscan approach delivers immediate visual and tactical feedback, which is key for fast-paced gameplay. If the ray hits structural meshes, it spawns a bullet hole decal and starts a brief particle burst.

---

## 3. Adaptive AI System

To challenge simple pathfinding-exploit tactics (such as kiting), the AI monitors player actions in real-time and adapts its behavior dynamically.

### Playstyle Identification
Every frame, the system analyzes the ratio of moving vs. stationary player frames:
$$\text{Ratio} = \frac{\text{framesMoving}}{\text{framesMoving} + \text{framesStanding}}$$

Based on this evaluation:
*   **Static Play ("Camper") Detection ($\text{Ratio} < 0.3$):** If the player remains stationary, the AI enters a "Rushing" mode, increasing its movement speed by 50% to flush the player out of cover.
*   **High Mobility ("Aggressive") Detection ($\text{Ratio} > 0.7$):** If the player runs constantly, the AI enters a "Flanking" mode. Instead of heading straight for the camera, enemies move with a sinusoidal sideways offset to disrupt player aim.
*   **Balanced Play ($\text{0.3} \le \text{Ratio} \le \text{0.7}$):** The AI pursues the player along the shortest path at default speeds.

---

## 4. Tactical Hacking Core Loop

Rather than using traditional combat destruction, *Rogue Vessel* uses a reprogramming game loop:
1.  **Override Code Collection:** Players gather glowing override codes (rendered as procedural diamond meshes with glowing particle emitters) spawning across the arena.
2.  **Stun vs. Reprogram:** 
    *   If the player shoots a synthetic until its firewall breaks but *does not* hold an Override Code, the robot is **stunned** for 3 seconds, disabling its movement.
    *   If the player possesses an Override Code and reduces the synthetic's health to zero, one code is consumed to permanently **hack** and reprogram it.
3.  **Reprogrammed State:** The synthetic's eyes turn from red to green, its animations stop, it stops attacking, and it is removed from the active hostile count. The wave is cleared once all enemies are hacked.

---

## 5. Technical Challenges & Solutions

### 1. Complex Collision Handling & Mesh Clipping
**Problem:** The 3D model of the synthetic had a complex shape and visual width that did not match standard thin cylinder colliders. Consequently, enemies frequently clipped through the map's structural pillars or got stuck on corners.
**Solution:**
A multi-layered obstacle-avoidance model was implemented:
*   **Raycast Look-ahead:** The AI projects a 3.0-unit ray forward. If a pillar or wall is detected, it projects secondary side rays to find a clear path.
*   **Hard AABB Repulsion Pass:** To prevent any clipping if the look-ahead fails, a strict Axis-Aligned Bounding Box (AABB) check runs post-movement. If an enemy's position overlaps with a pillar's boundary (taking into account the physical radius of the synthetic, scaled up to 1.8), it is pushed back along the axis of minimum penetration:
```javascript
var dx = enemyPos.x - col.x;
var dz = enemyPos.z - col.z;
if (Math.abs(dx) < margin && Math.abs(dz) < margin) {
    var overlapX = margin - Math.abs(dx);
    var overlapZ = margin - Math.abs(dz);
    if (overlapX < overlapZ) {
        enemyPos.x += (dx > 0 ? overlapX : -overlapX);
    } else {
        enemyPos.z += (dz > 0 ? overlapZ : -overlapZ);
    }
}
```

### 2. Pointer Lock Interface Conflicts
**Problem:** To capture the cursor for FPS aim, the browser must call `requestPointerLock()`. However, calling this directly upon clicking "START" prevented players from reading the mission parameters or interacting with the menu correctly.
**Solution:**
The game flow was restructured. The start menu fades out to reveal the mission briefing page with pointer capture disabled. Once the player acknowledges the objective and clicks anywhere (or presses a key), pointer lock is requested, activating the camera controller and starting the game wave.

### 3. GLTF Asset Rendering Failures (Keycard Glitch)
**Problem:** Loading an external `keycard.glb` asset and applying glow/particle trails caused critical rendering bugs in BabylonJS (large screen-space visual artifacts) due to material shader conflicts.
**Solution:**
The keycard GLB was replaced with a procedurally generated mesh using `BABYLON.MeshBuilder.CreateCylinder` (configured with low tessellation to form a diamond). This procedural crystal structure is fully compatible with standard glow layers, lightweight to load, and matches the sci-fi aesthetic.

---

## 6. Implementation Highlights

*   **Zero-Dependency Assets:** Fully procedural sound synthesis and geometric assets result in immediate loading speeds and complete safety from external asset delivery failures.
*   **Interactive CRT Filter:** The post-processing configuration (chromatic aberration, vignette, and grain) simulates a retro terminal interface, enhancing the sci-fi atmosphere.
*   **Adaptive Gameplay Loop:** The playstyle heuristic creates dynamic pacing, preventing linear, predictable pathing exploits.
