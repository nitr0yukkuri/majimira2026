"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";
import { NEON_COLORS_THREE } from "@/constants/neon";
import type { Building } from "@/types/city";

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
            list.push({ id: `${x}-${z}`, x: x * GRID_SPACING, z: z * GRID_SPACING, h: Math.random() * MAX_HEIGHT + MIN_HEIGHT });
        }
    }
    return list;
}

const WINDOW_SIZE = 0.12;
const WINDOW_COLS = 3;
const WINDOW_SPACING = 1 / WINDOW_COLS;
const FLOOR_HEIGHT = 0.4;
const WALL_OFFSET = 0.5;

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
        const floors = Math.max(1, Math.floor(b.h / FLOOR_HEIGHT));
        for (let f = 0; f < floors; f++) {
            const py = f * FLOOR_HEIGHT + FLOOR_HEIGHT / 2;
            for (let c = 0; c < WINDOW_COLS; c++) {
                const lx = -0.5 + (c + 0.5) * WINDOW_SPACING;
                addWindow(b.x + lx, py, b.z + WALL_OFFSET, 0, bIdx);
                addWindow(b.x + lx, py, b.z - WALL_OFFSET, Math.PI, bIdx);
                addWindow(b.x + WALL_OFFSET, py, b.z + lx, Math.PI / 2, bIdx);
                addWindow(b.x - WALL_OFFSET, py, b.z + lx, -Math.PI / 2, bIdx);
            }
        }
    });

    return { matrices, buildingIndices };
}

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

function Windows({ count, meshRef }: { count: number; meshRef: React.RefObject<THREE.InstancedMesh | null> }) {
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
    );
}

function GroundPlane() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#020813" roughness={0.45} metalness={0.05} />
        </mesh>
    );
}

export default function Buildings({ testMode }: { testMode: boolean }) {
    const { player, isPlaying } = usePlayer();
    const groupRef = useRef<THREE.Group>(null);

    const buildings = useMemo(generateBuildings, []);
    const windowData = useMemo(() => generateWindowData(buildings), [buildings]);

    const windowsMeshRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;
        const black = new THREE.Color("#000000");
        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setMatrixAt(i, windowData.matrices[i]);
            mesh.setColorAt(i, black);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }, [windowData]);

    const litWindows = useRef<Set<number>>(new Set());
    const lastWordId = useRef<number | null>(null);
    const lastPhraseId = useRef<number | null>(null);
    const targetBuilding = useRef(0);
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));

    useFrame((state, delta) => {
        const pos = isPlaying && player?.video ? player.timer.position : 0;
        if (isPlaying && player?.video) {
            const word = player.video.findWord(pos);
            if (word && word.startTime !== lastWordId.current) {
                lastWordId.current = word.startTime;
                const mesh = windowsMeshRef.current;
                if (mesh) {
                    const unlit: number[] = [];
                    for (let i = 0; i < windowData.buildingIndices.length; i++) {
                        if (windowData.buildingIndices[i] === targetBuilding.current && !litWindows.current.has(i)) unlit.push(i);
                    }
                    const count = Math.min(unlit.length, Math.floor(Math.random() * 4) + 3);
                    for (let c = 0; c < count; c++) {
                        const rnd = Math.floor(Math.random() * unlit.length);
                        const idx = unlit.splice(rnd, 1)[0];
                        litWindows.current.add(idx);
                        mesh.setColorAt(idx, NEON_COLORS_THREE[Math.floor(Math.random() * NEON_COLORS_THREE.length)]);
                    }
                    if (count > 0 && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
                }
            }
            const phrase = player.video.findPhrase(pos);
            if (phrase && phrase.startTime !== lastPhraseId.current) {
                lastPhraseId.current = phrase.startTime;
                targetBuilding.current = Math.floor(Math.random() * buildings.length);
            }
        }
        if (!testMode) {
            const target = buildings[targetBuilding.current] ?? buildings[0];
            if (target) {
                const lookAt = new THREE.Vector3(target.x, target.h / 2, target.z);
                cameraTarget.current.lerp(lookAt, 1.5 * delta);
                state.camera.lookAt(cameraTarget.current);
                const t = performance.now() / 2000;
                const orbit = new THREE.Vector3(target.x + Math.sin(t) * 6, target.h / 2 + 1.5, target.z + Math.cos(t) * 6);
                state.camera.position.lerp(orbit, 1.0 * delta);
            }
        }
    });

    return (
        <>
            <group ref={groupRef}>
                <BuildingMeshes buildings={buildings} />
                {windowData.matrices.length > 0 && (
                    <Windows count={windowData.matrices.length} meshRef={windowsMeshRef} />
                )}
            </group>
            <GroundPlane />
        </>
    );
}
