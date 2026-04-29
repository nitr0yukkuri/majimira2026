"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";
import { NEON_COLORS_THREE } from "@/constants/neon";
import type { Building } from "@/types/city";

// ─── Building generation ────────────────────────────────────────────────

const GRID_RANGE = 5;
const GRID_SPACING = 2;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 4;

function generateBuildings(): Building[] {
    const list: Building[] = [];
    for (let x = -GRID_RANGE; x <= GRID_RANGE; x++) {
        for (let z = -GRID_RANGE; z <= GRID_RANGE; z++) {
            const isRoad = x === 0 || z === 0;
            const skipRandom = Math.random() > 0.5;
            if (isRoad || skipRandom) continue;
            list.push({
                id: `${x}-${z}`,
                x: x * GRID_SPACING,
                z: z * GRID_SPACING,
                h: Math.random() * MAX_HEIGHT + MIN_HEIGHT,
            });
        }
    }
    return list;
}

// ─── Window data generation ─────────────────────────────────────────────

const WINDOW_SIZE = 0.12;
const WINDOW_COLS = 3;
const WINDOW_SPACING = 1 / WINDOW_COLS;
const FLOOR_HEIGHT = 0.4;
const WALL_OFFSET = 0.501;

interface WindowData {
    matrices: THREE.Matrix4[];
    buildingIndices: number[];
}

function generateWindowData(buildings: Building[]): WindowData {
    const matrices: THREE.Matrix4[] = [];
    const buildingIndices: number[] = [];

    const addWindow = (px: number, py: number, pz: number, ry: number, bIdx: number) => {
        const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(px, py, pz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
            new THREE.Vector3(WINDOW_SIZE, WINDOW_SIZE, WINDOW_SIZE)
        );
        matrices.push(matrix);
        buildingIndices.push(bIdx);
    };

    buildings.forEach((b, bIdx) => {
        const floors = Math.floor(b.h / FLOOR_HEIGHT);
        for (let f = 0; f < floors; f++) {
            const py = f * FLOOR_HEIGHT + 0.2;
            for (let c = 0; c < WINDOW_COLS; c++) {
                const lx = -0.5 + (c + 0.5) * WINDOW_SPACING;
                addWindow(b.x + lx,        py, b.z + WALL_OFFSET,  0,           bIdx);
                addWindow(b.x + lx,        py, b.z - WALL_OFFSET,  Math.PI,     bIdx);
                addWindow(b.x + WALL_OFFSET, py, b.z + lx,          Math.PI / 2, bIdx);
                addWindow(b.x - WALL_OFFSET, py, b.z + lx,         -Math.PI / 2, bIdx);
            }
        }
    });

    return { matrices, buildingIndices };
}

// ─── Camera helpers ─────────────────────────────────────────────────────

function computeOrbitPosition(
    building: Building,
    t: number,
    chorusMultiplier: number
): THREE.Vector3 {
    const ORBIT_RADIUS = 6;
    const cx = building.x + Math.sin(t * chorusMultiplier) * ORBIT_RADIUS;
    const cz = building.z + Math.cos(t * chorusMultiplier) * ORBIT_RADIUS;
    const cy = building.h / 2 + 1.5 + Math.sin(t * 0.8) * 1.5 * chorusMultiplier;
    return new THREE.Vector3(cx, cy, cz);
}

// ─── Sub-components ─────────────────────────────────────────────────────

function BuildingMeshes({ buildings }: { buildings: Building[] }) {
    return (
        <>
            {buildings.map((b) => (
                <mesh key={b.id} position={[b.x, b.h / 2, b.z]}>
                    <boxGeometry args={[1, b.h, 1]} />
                    <meshStandardMaterial color="#020813" roughness={0.8} metalness={0.2} />
                    <Edges color="#00ffcc" threshold={15} />
                </mesh>
            ))}
        </>
    );
}

function Windows({
    count,
    instancedMeshRef,
}: {
    count: number;
    instancedMeshRef: React.RefObject<THREE.InstancedMesh | null>;
}) {
    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, count]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
    );
}

function GroundPlane() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <planeGeometry args={[100, 100]} />
            <MeshReflectorMaterial
                color="#020813"
                roughness={0.4}
                metalness={0.6}
                mirror={0.5}
                blur={[400, 200]}
                resolution={512}
                mixBlur={1.0}
                mixStrength={0.8}
                depthScale={1.0}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
            />
        </mesh>
    );
}

// ─── Public export ──────────────────────────────────────────────────────

/**
 * Renders buildings with glowing windows and the ground plane.
 * Also owns the cinematic camera system (orbit around target building).
 *
 * Window lighting is driven by music:
 *   - On each new word → lights up a few more windows on the target building
 *   - On each new phrase → target building changes (windows keep accumulating)
 */
export default function Buildings({ testMode }: { testMode: boolean }) {
    const { player, isPlaying } = usePlayer();
    const groupRef = useRef<THREE.Group>(null);

    // Static city layout (generated once)
    const buildings = useMemo(generateBuildings, []);
    const windowData = useMemo(() => generateWindowData(buildings), [buildings]);

    // InstancedMesh reference
    const windowsMeshRef = useRef<THREE.InstancedMesh>(null);

    // Initialize InstancedMesh and all windows to black
    useEffect(() => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;

        const black = new THREE.Color("#000000");
        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setMatrixAt(i, windowData.matrices[i]);
            mesh.setColorAt(i, black);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }, [windowData]);

    // Music-driven state (no React state → imperative refs for perf)
    const litWindows   = useRef<Set<number>>(new Set());
    const lastWordId   = useRef<number | null>(null);
    const lastPhraseId = useRef<number | null>(null);
    const targetBuilding = useRef(0);

    // Camera orbit state
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));

    useFrame((state, delta) => {
        const pos = isPlaying && player?.video ? player.timer.position : 0;

        if (isPlaying && player?.video) {
            lightWindowsOnWord(pos);
            changeTargetOnPhrase(pos);
        } else {
            idleGroupBob();
        }

        if (!testMode) {
            updateCamera(state, delta, pos);
        }
    });

    function lightWindowsOnWord(pos: number) {
        const mesh = windowsMeshRef.current;
        if (!mesh || !player?.video) return;

        const word = player.video.findWord(pos);
        if (!word || word.startTime === lastWordId.current) return;
        lastWordId.current = word.startTime;

        // Collect unlit windows for current target building
        const unlit: number[] = [];
        for (let i = 0; i < windowData.buildingIndices.length; i++) {
            if (
                windowData.buildingIndices[i] === targetBuilding.current &&
                !litWindows.current.has(i)
            ) {
                unlit.push(i);
            }
        }

        // Light up 3–6 random unlit windows
        const count = Math.min(unlit.length, Math.floor(Math.random() * 4) + 3);
        for (let c = 0; c < count; c++) {
            const rnd = Math.floor(Math.random() * unlit.length);
            const idx = unlit.splice(rnd, 1)[0];
            litWindows.current.add(idx);
            mesh.setColorAt(idx, NEON_COLORS_THREE[Math.floor(Math.random() * NEON_COLORS_THREE.length)]);
        }
        if (count > 0 && mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
    }

    function changeTargetOnPhrase(pos: number) {
        if (!player?.video) return;
        const phrase = player.video.findPhrase(pos);
        if (!phrase || phrase.startTime === lastPhraseId.current) return;
        lastPhraseId.current = phrase.startTime;
        targetBuilding.current = Math.floor(Math.random() * buildings.length);
        // Windows keep accumulating (intentional — user requested this)
    }

    function idleGroupBob() {
        if (!groupRef.current) return;
        const t = performance.now() / 1000;
        groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
    }

    function updateCamera(state: any, delta: number, pos: number) {
        const target = buildings[targetBuilding.current] ?? buildings[0];
        if (!target) return;

        // Smoothly pan the look-at point toward the target building
        const lookAtPos = new THREE.Vector3(target.x, target.h / 2, target.z);
        cameraTarget.current.lerp(lookAtPos, 1.5 * delta);
        state.camera.lookAt(cameraTarget.current);

        // Orbit speed doubles during chorus
        const chorusMultiplier = (isPlaying && player?.video && player.findChorus(pos)) ? 1.5 : 1;
        const t = isPlaying ? (pos / 1000) * 0.5 : performance.now() / 2000;
        const desiredPos = computeOrbitPosition(target, t, chorusMultiplier);
        state.camera.position.lerp(desiredPos, 1.0 * delta);
    }

    return (
        <>
            <group ref={groupRef}>
                <BuildingMeshes buildings={buildings} />
                {windowData.matrices.length > 0 && (
                    <Windows count={windowData.matrices.length} instancedMeshRef={windowsMeshRef} />
                )}
            </group>
            <GroundPlane />
        </>
    );
}
