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
const MIN_HEIGHT = 2;
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

/**
 * instanceColor のみで色管理する。vertexColors は使わない。
 * setColorAt → instanceColor.needsUpdate の組み合わせだけで完結する。
 */
function Windows({ count, meshRef }: { count: number; meshRef: React.RefObject<THREE.InstancedMesh | null> }) {
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
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

    // litWindowColors  : 各窓の「目標色」（フルブライト、コーラス係数適用前）
    // currentWindowColors: 各窓の「現在の表示色」。黒→目標色へ毎フレームlerpする
    const litWindows = useRef<Set<number>>(new Set());
    const litWindowColors = useRef<Map<number, THREE.Color>>(new Map());
    const currentWindowColors = useRef<Map<number, THREE.Color>>(new Map());
    const lastWordId = useRef<number | null>(null);
    const lastBuildingPhraseId = useRef<number | null>(null);
    const pendingBuildingSwitch = useRef<{ nextBuilding: number; switchAt: number } | null>(null);
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));
    const targetBuilding = useRef(0); // 現在注目中のビルインデックス
    const lastPlaybackPosRef = useRef(0);
    const lastChorusState = useRef<boolean>(false);
    const songEndedRef = useRef(false);

    // useFrame内でVector3/Colorをnewしないよう再利用バッファ
    const _scratch = useRef(new THREE.Color());
    // カメラ用スクラッチVector3（毎フレームnewしないため）
    const _camLookAt = useRef(new THREE.Vector3());
    const _camOrbit = useRef(new THREE.Vector3());

    // ── カメラ軌道半径: フレーズ長で決まる目標値と、毎フレームlerpする現在値 ──
    // 短いフレーズ → 近い(3)、長いフレーズ → 遠い(10)
    const ORBIT_RADIUS_MIN = 3;   // フレーズが短い(≤1500ms)ときの最小半径
    const ORBIT_RADIUS_MAX = 10;  // フレーズが長い(≥6000ms)ときの最大半径
    const ORBIT_DUR_MIN = 1500; // ms: これ以下は最近距離
    const ORBIT_DUR_MAX = 6000; // ms: これ以上は最遠距離
    const targetOrbitRadius = useRef(6); // フレーズ検出時に更新する目標半径
    const currentOrbitRadius = useRef(6); // 毎フレームlerpして実際に使う半径

    const resetWindows = () => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;

        const black = new THREE.Color(0, 0, 0);
        litWindows.current.clear();
        litWindowColors.current.clear();
        currentWindowColors.current.clear();
        pendingBuildingSwitch.current = null;

        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setColorAt(i, black);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    const lightUpAllWindows = () => {
        // 目標色を白に設定するだけ。実際の点灯はuseFrameのlerpが担う。
        const white = new THREE.Color(1, 1, 1);
        litWindows.current.clear();
        litWindowColors.current.clear();
        // currentWindowColors はそのまま残し、lerpの起点として使う

        for (let i = 0; i < windowData.matrices.length; i++) {
            litWindows.current.add(i);
            litWindowColors.current.set(i, white.clone());
            if (!currentWindowColors.current.has(i)) {
                currentWindowColors.current.set(i, new THREE.Color(0, 0, 0));
            }
        }
    };

    useFrame((state, delta) => {
        const posRaw = Number(player?.timer?.position ?? 0);
        const pos = isPlaying && player?.video ? posRaw : 0;

        // ── リセット条件: 再生停止中(isPlaying=false)かつposRawが0になった時のみ ──
        // isPlaying=true 中は posRaw が一時的に 0 になっても絶対にリセットしない。
        // TextAlive の timer.position は再生中でも瞬間的に 0 を返すことがあるため。
        if (!isPlaying && posRaw === 0 && lastPlaybackPosRef.current > 0) {
            resetWindows();
            songEndedRef.current = false;
            lastWordId.current = null;
            lastBuildingPhraseId.current = null;
            lastChorusState.current = false;
            pendingBuildingSwitch.current = null;
        }
        lastPlaybackPosRef.current = posRaw;

        if (isPlaying && player?.video) {
            const phrase = player.video.findPhrase(pos);
            const pendingSwitch = pendingBuildingSwitch.current;
            const shouldAdvanceBuilding = !!pendingSwitch && posRaw >= pendingSwitch.switchAt;

            if (shouldAdvanceBuilding && pendingSwitch) {
                targetBuilding.current = pendingSwitch.nextBuilding;
                pendingBuildingSwitch.current = null;
                lastWordId.current = null;
            }

            if (!shouldAdvanceBuilding) {
                // ── 単語検出: 目標色を登録するだけ。即時setColorAtはしない ──
                const word = player.video.findWord(pos);
                if (word && word.startTime !== lastWordId.current) {
                    lastWordId.current = word.startTime;

                    // ターゲットビルの未点灯窓を収集
                    const unlit: number[] = [];
                    for (let i = 0; i < windowData.buildingIndices.length; i++) {
                        if (windowData.buildingIndices[i] === targetBuilding.current && !litWindows.current.has(i)) unlit.push(i);
                    }

                    if (unlit.length === 0) {
                        // 全窓点灯済み → フレーズ終端まで保留してから次のビルへ移行する
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
                            litWindows.current.add(idx);
                            litWindowColors.current.set(idx, new THREE.Color(colorHex));
                            if (!currentWindowColors.current.has(idx)) {
                                currentWindowColors.current.set(idx, new THREE.Color(0, 0, 0));
                            }
                        }
                    }
                }
            }

            // ── フレーズ検出: 軌道半径の更新のみ（ビル切り替えはフレーズ終端で遅延実行） ──
            if (phrase && phrase.startTime !== lastBuildingPhraseId.current) {
                lastBuildingPhraseId.current = phrase.startTime;

                const phraseDur = Number(phrase.duration ?? ORBIT_DUR_MAX);

                // 軌道半径はフレーズ長に関わらず常に更新
                const tNorm = Math.min(1, Math.max(0,
                    (phraseDur - ORBIT_DUR_MIN) / (ORBIT_DUR_MAX - ORBIT_DUR_MIN)
                ));
                targetOrbitRadius.current = ORBIT_RADIUS_MIN + tNorm * (ORBIT_RADIUS_MAX - ORBIT_RADIUS_MIN);
            }

            // ── 曲終了: 全窓を徐々に白く ──
            const duration = Number(player.video.duration ?? 0);
            if (duration > 0 && posRaw >= duration - 120 && !songEndedRef.current) {
                lightUpAllWindows();
                songEndedRef.current = true;
            }
        }

        // ── 毎フレーム: currentColor → targetColor へ lerp し setColorAt ──
        // currentWindowColors は純粋に「ネオン色への収束」にのみ使う。
        // chorusFactor は setColorAt 時に一時適用するだけで current の値を汚染しない。
        const mesh = windowsMeshRef.current;
        if (mesh && litWindows.current.size > 0) {
            // コーラス・ビートによるブライトネス係数を計算
            const chorus = isPlaying && player?.video ? !!player.findChorus(pos) : false;
            const beat = isPlaying && player?.video ? player.findBeat(pos) : null;
            const beatPulse = beat
                ? 1 - Math.min(1, Math.max(0, (pos - beat.startTime) / Math.max(beat.duration, 0.001)))
                : 0;
            // サビ外: 1.0、サビ中: ビートに合わせて 1.0〜2.0 の間でパルス
            const chorusFactor = chorus
                ? 1.0 + (0.65 + Math.sin((1 - beatPulse) * Math.PI * 4) * 0.35) * 1.0
                : 1.0;

            // lerpの速度: 値が大きいほど速く点灯（3.0 ≈ 約0.5秒で95%）
            const FADE_SPEED = 3.0;
            const alpha = Math.min(1, FADE_SPEED * delta);

            let needsUpdate = false;
            for (const idx of litWindows.current) {
                const target = litWindowColors.current.get(idx);
                const current = currentWindowColors.current.get(idx);
                if (!target || !current) continue;

                // ① current を純粋な target に向かって lerp（chorusFactor は混ぜない）
                current.lerp(target, alpha);

                // ② 表示時だけ chorusFactor を掛けたスクラッチ色を GPU に送る
                //    current 自体は変えないので、次フレームの lerp 起点が汚染されない
                _scratch.current.copy(current).multiplyScalar(chorusFactor);
                mesh.setColorAt(idx, _scratch.current);
                needsUpdate = true;
            }
            if (needsUpdate && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

            lastChorusState.current = chorus;
        }

        if (!testMode) {
            const target = buildings[targetBuilding.current] ?? buildings[0];
            if (target) {
                // 軌道半径を目標値へ滑らかに補間（急な切り替わりでもカメラが暴れない）
                currentOrbitRadius.current +=
                    (targetOrbitRadius.current - currentOrbitRadius.current) * Math.min(1, 1.5 * delta);
                const r = currentOrbitRadius.current;

                // 毎フレーム new しないようスクラッチ ref を再利用
                _camLookAt.current.set(target.x, target.h / 2, target.z);
                cameraTarget.current.lerp(_camLookAt.current, 1.5 * delta);
                state.camera.lookAt(cameraTarget.current);
                const t = performance.now() / 2000;
                _camOrbit.current.set(target.x + Math.sin(t) * r, target.h / 2 + 1.5, target.z + Math.cos(t) * r);
                state.camera.position.lerp(_camOrbit.current, 1.0 * delta);
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
