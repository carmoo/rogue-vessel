# Rogue Vessel 🎮 — 3D Sci-Fi FPS Hacking Game

**Rogue Vessel** is an atmospheric 3D Sci-Fi First-Person Shooter built with **BabylonJS** and Vanilla JavaScript.

👉 **Play the Game Live:** [https://carmoo.github.io/rogue-vessel/](https://carmoo.github.io/rogue-vessel/)

---

## 📖 Story

Deep space transport vessel *USG Genesis* has gone silent. Its central artificial intelligence has suffered a catastrophic corruption, disabling safety protocols and overriding security synthetics across the ship. 

You are sent to retake the vessel. However, direct neutralization of the crew synthetics is blocked by emergency firewalls. To regain command, you must navigate the vessel's engineering sector, collect cryptographic **Override Codes** from terminal nodes, and reprogram the hostile security drones back to their default, safe operation profiles.

---

## 📹 YouTube Demonstration
- **Watch the Video:** [https://youtu.be/vzv3dTXuy3g](https://youtu.be/vzv3dTXuy3g)
---

## 🎮 Game Controls

| Key | Action | Details |
|---|---|---|
| **`W` `A` `S` `D`** | Movement | Standard first-person navigation |
| **`MOUSE`** | Look around | Smooth camera rotation (Pointer Lock enabled) |
| **`LEFT CLICK`** | Fire Weapon | Shoots a high-velocity hitscan laser beam |
| **`SHIFT`** | Sprint | Grants a temporary speed increase (drains Stamina) |
| **`R`** | Reload | Replenishes weapon ammo (30-round magazine) |
| **`ESC`** | Pause | Opens the pause screen and releases the mouse cursor |

---

## 🚀 Key Features

### 1. Tactical Hacking Core Loop
Instead of destroying synthetics, you must bypass security firewalls:
- Shooting a robot without an Override Code **stuns** it for 3 seconds, giving you time to escape.
- To permanently **hack** and disable a drone, you must collect a glowing **Override Code** and shoot the synthetic until its firewall (health) is depleted.
- The wave is cleared when all active security synthetics have been successfully reprogrammed.

### 2. Adaptive AI System
The ship's corrupted mainframe analyzes your combat pattern dynamically:
- **Rushing (Anti-Camp):** If you remain stationary, enemies gain a 50% speed increase to flush you out.
- **Flanking (Anti-Aggressive):** If you run and gun constantly, enemies weave sideways sinusoidally to disrupt your aim.
- **Direct Pursuit:** Standard movement tracking when playing with a balanced movement pattern.

### 3. Procedural Web Audio Engine
To maximize load speeds and guarantee zero dependency errors, **100% of the game audio is synthesized in real-time** via the HTML5 **Web Audio API**:
- Synthesized laser firing, shell reload sweeps, and impact alerts.

### 4. Visual Polish & Effects
- **PBR Texturing:** Industrial sci-fi ship floor and wall textures.
- **Post-Processing pipeline:** Bloom glowing neons, radial vignette, chromatic aberration, and grain filter for a CRT screen appearance.
- **Dynamic Feedback:** Headshot damage multipliers, directional damage indicators, screen-shake response, and impact sparks/decals.

---

## 🛠️ Technical Stack

- **Graphics Engine:** [BabylonJS v5.x](https://doc.babylonjs.com/) (loaded via CDN)
- **Programming Language:** Vanilla JavaScript (ES6)
- **Styling:** Vanilla CSS3
- **Deployment:** GitHub Pages

---

## 📦 Local Setup & Execution

1. Clone or download this repository.
2. Run a local web server inside the project root (`Progetto`) to bypass browser security constraints when loading GLTF assets:
   ```bash
   python3 -m http.server 8080
   ```
3. Open a browser and navigate to `http://localhost:8080`.
