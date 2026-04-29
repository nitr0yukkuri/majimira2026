// Shared neon color palette used across the city scene
import * as THREE from "three";

/** CSS hex strings for neon colors */
export const NEON_HEX = ["#ff00ff", "#00ffff", "#ffff00", "#ff8800"] as const;

/** Pre-instantiated THREE.Color objects for GPU-bound operations (e.g. InstancedMesh) */
export const NEON_COLORS_THREE = NEON_HEX.map((c) => new THREE.Color(c));

/** Colors used specifically for light trails */
export const TRAIL_COLORS = ["#ff3366", "#00ffcc", "#ff00ff", "#ffff00", "#ffffff"] as const;

/** CSS hex strings used for traffic signal lamps */
export const SIGNAL_GREEN  = "#00ffcc";
export const SIGNAL_YELLOW = "#ffff00";
export const SIGNAL_RED    = "#ff0055";
