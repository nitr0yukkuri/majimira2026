"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";
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
    positions: THREE.Vector3[];
}

function generateWindowData(buildings: Building[]): WindowData {
    const matrices: THREE.Matrix4[] = [];
    const buildingIndices: number[] = [];
    const positions: THREE.Vector3[] = [];

    const addWindow = (px: number, py: number, pz: number, ry: number, bIdx: number) => {
        const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(px, py, pz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
            new THREE.Vector3(WINDOW_SIZE, WINDOW_SIZE, WINDOW_SIZE)
        );
        matrices.push(matrix);
        buildingIndices.push(bIdx);
        positions.push(new THREE.Vector3(px, py, pz));
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

    return { matrices, buildingIndices, positions };
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
            <meshBasicMaterial toneMapped={false} vertexColors />
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

export default function Buildings({
    testMode,
}: {
    testMode: boolean;
}) {
    const { player, isPlaying } = usePlayer();
    const groupRef = useRef<THREE.Group>(null);

    const buildings = useMemo(() => generateBuildings(), []);
    const windowData = useMemo(() => generateWindowData(buildings), [buildings]);

    const windowsMeshRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;
        const dim = new THREE.Color("#06111a");
        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setMatrixAt(i, windowData.matrices[i]);
            mesh.setColorAt(i, dim);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }, [windowData]);

    const pulseStartAt = useRef(0);
    const chorusPulseStartAt = useRef(0);
    const lastChorusActive = useRef(false);
    const dimColor = useRef(new THREE.Color("#06111a"));
    const brightColor = useRef(new THREE.Color("#8ffcff"));
    const lastPhraseId = useRef<number | null>(null);
    const targetBuilding = useRef(0);
    const pulseOriginBuilding = useRef(0);
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));

    useFrame((state, delta) => {
        const pos = isPlaying && player?.video ? player.timer.position : 0;
        if (isPlaying && player?.video) {
            const phrase = player.video.findPhrase(pos);
            if (phrase && phrase.startTime !== lastPhraseId.current) {
                lastPhraseId.current = phrase.startTime;
                targetBuilding.current = Math.floor(Math.random() * buildings.length);
                pulseOriginBuilding.current = targetBuilding.current;
                pulseStartAt.current = performance.now();
            }

            const chorus = !!player.findChorus(pos);
            if (chorus && !lastChorusActive.current) {
                chorusPulseStartAt.current = performance.now();
            }
            lastChorusActive.current = chorus;
        }

        const mesh = windowsMeshRef.current;
        if (mesh) {
            const now = performance.now();
            const phraseAge = Math.max(0, now - pulseStartAt.current);
            const chorusAge = Math.max(0, now - chorusPulseStartAt.current);
            const pulseRadius = phraseAge / 130;
            const chorusRadius = chorusAge / 150;

            for (let i = 0; i < windowData.positions.length; i++) {
                const buildingIdx = windowData.buildingIndices[i];
                const windowPos = windowData.positions[i];
                const originBuilding = buildings[pulseOriginBuilding.current] ?? buildings[0];
                const originPos = originBuilding ? new THREE.Vector3(originBuilding.x, 1.2, originBuilding.z) : new THREE.Vector3(0, 1.2, 0);
                const distance = windowPos.distanceTo(originPos);
                const wave = Math.max(0, 1 - Math.abs(distance - pulseRadius));

                const chorusOrigin = buildings[targetBuilding.current] ?? originBuilding;
                const chorusPos = chorusOrigin ? new THREE.Vector3(chorusOrigin.x, 1.2, chorusOrigin.z) : originPos;
                const chorusDistance = windowPos.distanceTo(chorusPos);
                const chorusWave = Math.max(0, 1 - Math.abs(chorusDistance - chorusRadius));

                const baseGlow = 0.12;
                const pulseGlow = wave * 0.7;
                const chorusGlow = chorusWave * 0.35;
                const floorGlow = Math.max(0, 1 - windowPos.y / 6) * 0.06;
                const totalGlow = THREE.MathUtils.clamp(baseGlow + pulseGlow + chorusGlow + floorGlow, 0, 1);

                const targetColor = dimColor.current.clone().lerp(brightColor.current, totalGlow);
                if (buildingIdx === targetBuilding.current) {
                    targetColor.lerp(new THREE.Color("#ff6aff"), 0.08);
                }

                mesh.setColorAt(i, targetColor);
            }
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
