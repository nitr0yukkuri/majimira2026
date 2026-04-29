"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRAIL_COLORS } from "@/constants/neon";
import type { Trail } from "@/types/city";

// ─── Trail definitions ─────────────────────────────────────────────────

/** 12 pre-defined trails alternating NS / EW lanes. */
const TRAILS: Trail[] = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    axis: i % 2 === 0 ? "NS" : "EW",
    lane: i % 3 === 0 ? -0.65 : i % 3 === 1 ? 0 : 0.65,
    speed: 15 + (i * 7.3) % 25,
    color: TRAIL_COLORS[i % TRAIL_COLORS.length],
    length: 1.5 + (i * 0.4) % 2.5,
}));

const ROAD_HALF_LENGTH = 55; // trails wrap around at ±55

// ─── Component ─────────────────────────────────────────────────────────

/**
 * Renders neon light trails that simulate high-speed vehicles
 * moving along the NS and EW roads.
 *
 * Each trail is a thin plane mesh updated imperatively in useFrame
 * to avoid per-frame React re-renders.
 */
export default function LightTrails() {
    // Each trail's current position along its axis
    const positions = useRef<number[]>(
        TRAILS.map((_, i) => -ROAD_HALF_LENGTH + (i * 17) % (ROAD_HALF_LENGTH * 2))
    );
    const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

    useFrame((_, delta) => {
        TRAILS.forEach((trail, i) => {
            // Advance position
            positions.current[i] += trail.speed * delta;
            if (positions.current[i] > ROAD_HALF_LENGTH) {
                positions.current[i] = -ROAD_HALF_LENGTH;
            }

            const mesh = meshRefs.current[i];
            if (!mesh) return;

            const p = positions.current[i];
            if (trail.axis === "NS") {
                mesh.position.set(trail.lane, 0.02, p);
            } else {
                mesh.position.set(p, 0.02, trail.lane);
            }
        });
    });

    // Reset ref array each render so stale refs don't accumulate
    meshRefs.current = [];

    return (
        <>
            {TRAILS.map((trail, i) => (
                <mesh
                    key={trail.id}
                    ref={(el) => { meshRefs.current[i] = el; }}
                    rotation={[-Math.PI / 2, 0, trail.axis === "NS" ? 0 : Math.PI / 2]}
                >
                    <planeGeometry args={[0.08, trail.length]} />
                    <meshBasicMaterial
                        color={trail.color}
                        transparent
                        opacity={0.85}
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </>
    );
}
