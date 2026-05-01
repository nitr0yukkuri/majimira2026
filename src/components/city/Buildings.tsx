"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";
import { NEON_HEX } from "@/constants/neon";
import type { Building } from "@/types/city";

const GRID_RANGE = 5;
const GRID_SPACING = 2.5; // 道路幅 ±1.75 + ビル半幅 0.5 + 余白 0.25 = 2.5 以上必要
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
    const geomRef = React.useRef<THREE.PlaneGeometry>(null);

    React.useEffect(() => {
        if (!geomRef.current) return;
        if (!geomRef.current.attributes.color) {
            const colors = new Float32Array(count * 3);
            for (let i = 0; i < colors.length; i++) {
                colors[i] = 1;
            }
            geomRef.current.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        }
    }, [count]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <planeGeometry ref={geomRef} args={[1, 1]} />
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
        const black = new THREE.Color("#000000");

        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setMatrixAt(i, windowData.matrices[i]);
            mesh.setColorAt(i, black);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }, [windowData]);

    const litWindows = useRef<Set<number>>(new Set());
    const litWindowColors = useRef<Map<number, THREE.Color>>(new Map());
    const lastWordId = useRef<number | null>(null);
    const lastBuildingPhraseId = useRef<number | null>(null);
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));
    const targetBuilding = useRef(0);
    const lastPlaybackPosRef = useRef(0);
    const lastChorusState = useRef<boolean>(false);
    const songEndedRef = useRef(false);

    const resetWindows = () => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;

        const black = new THREE.Color("#000000");
        litWindows.current.clear();
        litWindowColors.current.clear();

        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setColorAt(i, black);
        }
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
    };

    const lightUpAllWindows = () => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;

        const white = new THREE.Color("#ffffff");
        litWindows.current.clear();
        litWindowColors.current.clear();

        for (let i = 0; i < windowData.matrices.length; i++) {
            litWindows.current.add(i);
            litWindowColors.current.set(i, white);
            mesh.setColorAt(i, white);
        }
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
    };

    const applyLitWindowColors = (mesh: THREE.InstancedMesh, chorus: boolean, pulse: number) => {
        const chorusFactor = chorus ? 1.15 + pulse * 0.85 : 1;

        for (const idx of litWindows.current) {
            const baseColor = litWindowColors.current.get(idx);
            if (!baseColor) continue;

            const displayColor = baseColor.clone().multiplyScalar(chorusFactor);
            mesh.setColorAt(idx, displayColor);
        }

        if (litWindows.current.size > 0 && mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
    };

    useFrame((state, delta) => {
        const posRaw = Number(player?.timer?.position ?? 0);
        const pos = isPlaying && player?.video ? posRaw : 0;

        if (songEndedRef.current && isPlaying && posRaw === 0) {
            resetWindows();
            songEndedRef.current = false;
            lastWordId.current = null;
            lastBuildingPhraseId.current = null;
            lastChorusState.current = false;
        }

        if (posRaw === 0 && lastPlaybackPosRef.current > 0 && !songEndedRef.current) {
            resetWindows();
            lastWordId.current = null;
            lastBuildingPhraseId.current = null;
            lastChorusState.current = false;
        }
        lastPlaybackPosRef.current = posRaw;

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
                    const chorus = !!player.findChorus(pos);
                    for (let c = 0; c < count; c++) {
                        const rnd = Math.floor(Math.random() * unlit.length);
                        const idx = unlit.splice(rnd, 1)[0];
                        const colorHex = NEON_HEX[Math.floor(Math.random() * NEON_HEX.length)];
                        const color = new THREE.Color(colorHex);
                        litWindows.current.add(idx);
                        litWindowColors.current.set(idx, color);

                        // 新しい窓を点灯する時に、すでに chorus 状態を反映
                        const displayColor = color.clone().multiplyScalar(chorus ? 1.15 : 1);
                        mesh.setColorAt(idx, displayColor);
                    }
                    if (count > 0 && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

                    // 新しい窓が点灯した時点で chorus 状態を更新
                    lastChorusState.current = chorus;
                }
            }

            const mesh = windowsMeshRef.current;
            if (mesh) {
                const chorus = !!player.findChorus(pos);
                const beat = player.findBeat(pos);
                const beatPulse = beat
                    ? 1 - Math.min(1, Math.max(0, (pos - beat.startTime) / Math.max(beat.duration, 0.001)))
                    : 0;

                // サビ中はビートに合わせて点滅する。サビ外では固定表示に戻す。
                if (chorus) {
                    const pulse = 0.65 + Math.sin((1 - beatPulse) * Math.PI * 4) * 0.35;
                    applyLitWindowColors(mesh, true, Math.max(0.2, pulse));
                } else if (chorus !== lastChorusState.current) {
                    applyLitWindowColors(mesh, false, 0);
                }

                lastChorusState.current = chorus;
            }

            const phrase = player.video.findPhrase(pos);
            if (phrase && phrase.startTime !== lastBuildingPhraseId.current) {
                lastBuildingPhraseId.current = phrase.startTime;
                targetBuilding.current = Math.floor(Math.random() * buildings.length);
            }

            const duration = Number(player.video.duration ?? 0);
            if (duration > 0 && posRaw >= duration - 120 && !songEndedRef.current) {
                lightUpAllWindows();
                songEndedRef.current = true;
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
