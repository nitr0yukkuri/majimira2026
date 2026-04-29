"use client";

import React from "react";
import { MeshReflectorMaterial } from "@react-three/drei";

// ─── Sub-components ───────────────────────────────────────────────────

function ReflectiveRoad({ width, depth, y }: { width: number; depth: number; y: number }) {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
            <planeGeometry args={[width, depth]} />
            <MeshReflectorMaterial
                color="#001122"
                roughness={0.15}
                metalness={0.9}
                mirror={0.85}
                blur={[300, 100]}
                resolution={512}
                mixBlur={0.8}
                mixStrength={1.5}
                depthScale={1.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
            />
        </mesh>
    );
}

function NSCrosswalks() {
    const STRIPE_X_POSITIONS = [-1.2, -0.6, 0, 0.6, 1.2];
    const CROSSWALK_Z_POSITIONS = [-1.75, 1.75];

    return (
        <>
            {CROSSWALK_Z_POSITIONS.map((z, i) => (
                <group key={`cw-ns-${i}`} position={[0, -0.03, z]}>
                    {STRIPE_X_POSITIONS.map((x, j) => (
                        <mesh key={j} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.3, 0.8]} />
                            <meshBasicMaterial color="#00ffcc" transparent opacity={0.9} />
                        </mesh>
                    ))}
                </group>
            ))}
        </>
    );
}

function EWCrosswalks() {
    const STRIPE_Z_POSITIONS = [-1.2, -0.6, 0, 0.6, 1.2];
    const CROSSWALK_X_POSITIONS = [-1.75, 1.75];

    return (
        <>
            {CROSSWALK_X_POSITIONS.map((x, i) => (
                <group key={`cw-ew-${i}`} position={[x, -0.03, 0]}>
                    {STRIPE_Z_POSITIONS.map((z, j) => (
                        <mesh key={j} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                            <planeGeometry args={[0.3, 0.8]} />
                            <meshBasicMaterial color="#00ffcc" transparent opacity={0.9} />
                        </mesh>
                    ))}
                </group>
            ))}
        </>
    );
}

function CenterlineDashes({ count = 20 }) {
    return (
        <group position={[0, -0.02, 0]}>
            {/* NS Centerlines */}
            {Array.from({ length: count }).map((_, i) => (
                <group key={`cl-ns-${i}`}>
                    <mesh position={[0, 0, -3.5 - i * 2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, 1]} />
                        <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                    </mesh>
                    <mesh position={[0, 0, 3.5 + i * 2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, 1]} />
                        <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                    </mesh>
                </group>
            ))}
            {/* EW Centerlines */}
            {Array.from({ length: count }).map((_, i) => (
                <group key={`cl-ew-${i}`}>
                    <mesh position={[3.5 + i * 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                        <planeGeometry args={[0.05, 1]} />
                        <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                    </mesh>
                    <mesh position={[-3.5 - i * 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                        <planeGeometry args={[0.05, 1]} />
                        <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

function StopLinesAndArrows() {
    return (
        <group position={[0, -0.02, 0]}>
            {/* Stop Lines */}
            <mesh position={[-0.875, 0, 2.3]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.65, 0.2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
            <mesh position={[0.875, 0, -2.3]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.65, 0.2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
            <mesh position={[-2.3, 0, 0.875]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[1.65, 0.2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
            <mesh position={[2.3, 0, -0.875]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[1.65, 0.2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>

            {/* Intersection Center Diamond */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                <planeGeometry args={[0.4, 0.4]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
            </mesh>

            {/* Turn Arrows (one per approach) */}
            {[
                { pos: [-0.875, 0, 4],   rot: [0, 0,           0] as [number, number, number] },
                { pos: [0.875,  0, -4],  rot: [0, Math.PI,      0] as [number, number, number] },
                { pos: [-4,     0, 0.875], rot: [0, -Math.PI/2,  0] as [number, number, number] },
                { pos: [4,      0, -0.875], rot: [0, Math.PI/2,  0] as [number, number, number] },
            ].map(({ pos, rot }, i) => (
                <group key={i} position={pos as [number,number,number]} rotation={rot}>
                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.1, 1.5]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                    <mesh position={[0, 0, -0.75]} rotation={[-Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0, 0.2, 0.4, 3]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

function Sidewalks() {
    const QUADRANT_CENTERS: [number, number][] = [
        [25, 25], [-25, 25], [-25, -25], [25, -25],
    ];

    return (
        <>
            {QUADRANT_CENTERS.map(([cx, cz], i) => (
                <group key={`sw-${i}`} position={[cx, -0.02, cz]}>
                    <mesh>
                        <boxGeometry args={[46.5, 0.04, 46.5]} />
                        <meshBasicMaterial color="#010a12" />
                    </mesh>
                    {/* Neon curb highlights */}
                    <mesh position={[0, 0.02, Math.sign(cz) * -23.25]}>
                        <boxGeometry args={[46.5, 0.02, 0.05]} />
                        <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} />
                    </mesh>
                    <mesh position={[Math.sign(cx) * -23.25, 0.02, 0]}>
                        <boxGeometry args={[0.05, 0.02, 46.5]} />
                        <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} />
                    </mesh>
                </group>
            ))}
        </>
    );
}

// ─── Public export ─────────────────────────────────────────────────────

/**
 * Renders the full intersection: roads, crosswalks, lane markings,
 * stop lines, arrows, sidewalks, and the neon grid overlay.
 */
export default function IntersectionAndRoads() {
    return (
        <group>
            {/* Wet reflective road surfaces */}
            <ReflectiveRoad width={100} depth={3.5} y={-0.05} />
            <ReflectiveRoad width={3.5}  depth={100} y={-0.04} />

            <NSCrosswalks />
            <EWCrosswalks />
            <CenterlineDashes />
            <StopLinesAndArrows />
            <Sidewalks />

            {/* Neon grid overlay */}
            <gridHelper args={[100, 50, "#004466", "#002233"]} position={[0, -0.08, 0]} />
        </group>
    );
}
