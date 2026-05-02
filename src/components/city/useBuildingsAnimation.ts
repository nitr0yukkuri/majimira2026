"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";
import { NEON_HEX } from "@/constants/neon";
import type { Building } from "@/types/city";
import type { WindowData } from "./buildingsData";

const ORBIT_RADIUS_MIN = 3;
const ORBIT_RADIUS_MAX = 10;
const ORBIT_DUR_MIN = 1500;
const ORBIT_DUR_MAX = 6000;

export function useBuildingsAnimation({
    testMode,
    buildings,
    windowData,
    windowsMeshRef,
}: {
    testMode: boolean;
    buildings: Building[];
    windowData: WindowData;
    windowsMeshRef: React.RefObject<THREE.InstancedMesh | null>;
}) {
    const { player, isPlaying } = usePlayer();
    const groupRef = useRef<THREE.Group>(null);

    const litWindows = useRef<Set<number>>(new Set());
    const litWindowColors = useRef<Map<number, THREE.Color>>(new Map());
    const currentWindowColors = useRef<Map<number, THREE.Color>>(new Map());
    const lastWordId = useRef<number | null>(null);
    const lastBuildingPhraseId = useRef<number | null>(null);
    const pendingBuildingSwitch = useRef<{ nextBuilding: number; switchAt: number } | null>(null);
    const idleWindowAccumulator = useRef(0);
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));
    const targetBuilding = useRef(0);
    const lastPlaybackPosRef = useRef(0);
    const songEndedRef = useRef(false);

    const _scratch = useRef(new THREE.Color());
    const _camLookAt = useRef(new THREE.Vector3());
    const _camOrbit = useRef(new THREE.Vector3());
    const targetOrbitRadius = useRef(6);
    const currentOrbitRadius = useRef(6);
    const windowsByBuilding = windowData.windowsByBuilding;

    // 点灯済みの窓は、内部状態だけでなくメッシュ色も即座に同期する。
    // ここを分けると、点灯直後に黒からの補間が入って「一瞬光っていない」見え方になる。
    const commitLitWindow = (windowIndex: number, color: THREE.Color) => {
        litWindows.current.add(windowIndex);
        litWindowColors.current.set(windowIndex, color.clone());
        currentWindowColors.current.set(windowIndex, color.clone());

        const mesh = windowsMeshRef.current;
        if (!mesh) return;

        mesh.setColorAt(windowIndex, color);
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    const resetWindows = () => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;

        const black = new THREE.Color(0, 0, 0);
        litWindows.current.clear();
        litWindowColors.current.clear();
        currentWindowColors.current.clear();
        pendingBuildingSwitch.current = null;
        idleWindowAccumulator.current = 0;

        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setColorAt(i, black);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    const lightUpAllWindows = () => {
        const white = new THREE.Color(1, 1, 1);
        litWindows.current.clear();
        litWindowColors.current.clear();

        for (let i = 0; i < windowData.matrices.length; i++) {
            commitLitWindow(i, white);
        }
    };

    const getUnlitWindowsForBuilding = (buildingIndex: number) => {
        const source = windowsByBuilding[buildingIndex] ?? [];
        const result: number[] = [];
        for (let i = 0; i < source.length; i++) {
            const windowIndex = source[i];
            if (!litWindows.current.has(windowIndex)) {
                result.push(windowIndex);
            }
        }
        return result;
    };

    const hasUnlitWindowsForBuilding = (buildingIndex: number) => {
        const source = windowsByBuilding[buildingIndex] ?? [];
        for (let i = 0; i < source.length; i++) {
            if (!litWindows.current.has(source[i])) {
                return true;
            }
        }
        return false;
    };

    useFrame((state, delta) => {
        const posRaw = Number(player?.timer?.position ?? 0);
        const pos = isPlaying && player?.video ? posRaw : 0;

        if (!isPlaying && posRaw === 0 && lastPlaybackPosRef.current > 0) {
            resetWindows();
            songEndedRef.current = false;
            lastWordId.current = null;
            lastBuildingPhraseId.current = null;
            pendingBuildingSwitch.current = null;
            idleWindowAccumulator.current = 0;
        }
        lastPlaybackPosRef.current = posRaw;

        const lightIdleWindowsForTargetBuilding = (count: number) => {
            const candidates = getUnlitWindowsForBuilding(targetBuilding.current);
            if (candidates.length === 0) return;

            const actualCount = Math.min(count, candidates.length);
            for (let i = 0; i < actualCount; i++) {
                const rnd = Math.floor(Math.random() * candidates.length);
                const idx = candidates.splice(rnd, 1)[0];
                const colorHex = NEON_HEX[Math.floor(Math.random() * NEON_HEX.length)];
                const idleColor = new THREE.Color(colorHex);
                commitLitWindow(idx, idleColor);
            }
        };

        const advanceToNextCameraBuilding = () => {
            for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
                if (bIdx === targetBuilding.current) continue;
                if (!hasUnlitWindowsForBuilding(bIdx)) continue;

                targetBuilding.current = bIdx;
                lastWordId.current = null;
                idleWindowAccumulator.current = 0;
                return;
            }

            for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
                if (bIdx === targetBuilding.current) continue;

                targetBuilding.current = bIdx;
                lastWordId.current = null;
                idleWindowAccumulator.current = 0;
                return;
            }
        };

        if (player?.video) {
            let hasActivePhrase = false;
            let phrase = null;

            if (isPlaying) {
                phrase = player.video.findPhrase(pos);
                const phraseDuration = Number(phrase?.duration ?? 0);
                hasActivePhrase = !!phrase && phraseDuration > 0 && pos >= phrase.startTime && pos <= phrase.startTime + phraseDuration;

                if (hasActivePhrase) {
                    const word = player.video.findWord(pos);
                    if (word && word.startTime !== lastWordId.current) {
                        lastWordId.current = word.startTime;

                        const unlit = getUnlitWindowsForBuilding(targetBuilding.current);

                        if (unlit.length === 0) {
                            if (!pendingBuildingSwitch.current && phrase) {
                                let next = Math.floor(Math.random() * buildings.length);
                                while (next === targetBuilding.current && buildings.length > 1) {
                                    next = Math.floor(Math.random() * buildings.length);
                                }

                                const phraseDuration = Number(phrase.duration ?? 0);
                                const switchAt = phraseDuration > 0
                                    ? Number(phrase.startTime + phraseDuration)
                                    : posRaw;

                                pendingBuildingSwitch.current = {
                                    nextBuilding: next,
                                    switchAt,
                                };
                            }
                        } else {
                            const count = Math.min(unlit.length, Math.floor(Math.random() * 7) + 8);
                            for (let c = 0; c < count; c++) {
                                const rnd = Math.floor(Math.random() * unlit.length);
                                const idx = unlit.splice(rnd, 1)[0];
                                const colorHex = NEON_HEX[Math.floor(Math.random() * NEON_HEX.length)];
                                commitLitWindow(idx, new THREE.Color(colorHex));
                            }
                        }
                    }
                }

                const pendingSwitch = pendingBuildingSwitch.current;
                if (pendingSwitch && posRaw >= pendingSwitch.switchAt) {
                    targetBuilding.current = pendingSwitch.nextBuilding;
                    pendingBuildingSwitch.current = null;
                    lastWordId.current = null;
                }

                if (hasActivePhrase && phrase && phrase.startTime !== lastBuildingPhraseId.current) {
                    lastBuildingPhraseId.current = phrase.startTime;

                    const phraseDur = Number(phrase.duration ?? ORBIT_DUR_MAX);

                    const tNorm = Math.min(1, Math.max(0,
                        (phraseDur - ORBIT_DUR_MIN) / (ORBIT_DUR_MAX - ORBIT_DUR_MIN)
                    ));
                    targetOrbitRadius.current = ORBIT_RADIUS_MIN + tNorm * (ORBIT_RADIUS_MAX - ORBIT_RADIUS_MIN);
                }

                const duration = Number(player.video.duration ?? 0);
                if (duration > 0 && posRaw >= duration - 120 && !songEndedRef.current) {
                    lightUpAllWindows();
                    songEndedRef.current = true;
                }
            }

            // Idle window lighting: activate when video is loaded, regardless of isPlaying
            if (!hasActivePhrase) {
                const targetCandidates = getUnlitWindowsForBuilding(targetBuilding.current);

                if (targetCandidates.length > 0) {
                    idleWindowAccumulator.current += delta * 1000;
                    while (idleWindowAccumulator.current >= 850) {
                        idleWindowAccumulator.current -= 850;
                        lightIdleWindowsForTargetBuilding(1 + (Math.random() < 0.35 ? 1 : 0));
                    }
                    if (!hasUnlitWindowsForBuilding(targetBuilding.current)) {
                        advanceToNextCameraBuilding();
                    }
                } else {
                    idleWindowAccumulator.current = 0;
                }
            }
        }

        const mesh = windowsMeshRef.current;
        if (mesh && litWindows.current.size > 0) {
            const chorus = isPlaying && player?.video ? !!player.findChorus(pos) : false;
            const beat = isPlaying && player?.video ? player.findBeat(pos) : null;
            const beatPulse = beat
                ? 1 - Math.min(1, Math.max(0, (pos - beat.startTime) / Math.max(beat.duration, 0.001)))
                : 0;
            const chorusFactor = chorus
                ? 1.0 + (0.65 + Math.sin((1 - beatPulse) * Math.PI * 4) * 0.35) * 1.0
                : 1.0;

            const FADE_SPEED = chorus ? 3.0 : 2.3;
            const alpha = Math.min(1, FADE_SPEED * delta);

            let needsUpdate = false;
            for (const idx of litWindows.current) {
                const target = litWindowColors.current.get(idx);
                const current = currentWindowColors.current.get(idx);
                if (!target || !current) continue;

                current.lerp(target, alpha);
                _scratch.current.copy(current).multiplyScalar(chorusFactor);
                mesh.setColorAt(idx, _scratch.current);
                needsUpdate = true;
            }
            if (needsUpdate && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        }

        if (!testMode) {
            const target = buildings[targetBuilding.current] ?? buildings[0];
            if (target) {
                currentOrbitRadius.current +=
                    (targetOrbitRadius.current - currentOrbitRadius.current) * Math.min(1, 1.5 * delta);
                const r = currentOrbitRadius.current;

                _camLookAt.current.set(target.x, target.h / 2, target.z);
                cameraTarget.current.lerp(_camLookAt.current, 1.5 * delta);
                state.camera.lookAt(cameraTarget.current);
                const t = performance.now() / 2000;
                _camOrbit.current.set(target.x + Math.sin(t) * r, target.h / 2 + 1.5, target.z + Math.cos(t) * r);
                state.camera.position.lerp(_camOrbit.current, 1.0 * delta);
            }
        }
    });

    return { groupRef, targetBuilding };
}
