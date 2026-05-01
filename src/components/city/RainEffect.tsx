"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";

type RainDrop = {
    x: number;
    y: number;
    z: number;
    speed: number;
    length: number;
    sway: number;
    phase: number;
};

const RAIN_COUNT = 240;
const RAIN_WIDTH = 40;
const RAIN_DEPTH = 40;
const RAIN_TOP = 28;
const RAIN_BOTTOM = -2.5;

function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function respawnDrop(drop: RainDrop, topOnly = false) {
    drop.x = randomBetween(-RAIN_WIDTH, RAIN_WIDTH);
    drop.z = randomBetween(-RAIN_DEPTH, RAIN_DEPTH);
    drop.y = topOnly ? randomBetween(8, RAIN_TOP) : randomBetween(10, RAIN_TOP);
    drop.speed = randomBetween(9, 17);
    drop.length = randomBetween(0.35, 1.05);
    drop.sway = randomBetween(0.8, 1.9);
    drop.phase = Math.random() * Math.PI * 2;
}

function createRainDrops(count: number) {
    const drops: RainDrop[] = [];
    for (let i = 0; i < count; i++) {
        const drop = {
            x: 0,
            y: 0,
            z: 0,
            speed: 0,
            length: 0,
            sway: 0,
            phase: 0,
        } satisfies RainDrop;
        respawnDrop(drop, true);
        drops.push(drop);
    }
    return drops;
}

function WetRoadLayer() {
    return (
        <group renderOrder={0.2}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.048, 0]}>
                <planeGeometry args={[100, 3.7]} />
                <meshStandardMaterial
                    color="#06131d"
                    roughness={0.08}
                    metalness={0.95}
                    transparent
                    opacity={0.1}
                    depthWrite={false}
                />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.047, 0]}>
                <planeGeometry args={[3.7, 100]} />
                <meshStandardMaterial
                    color="#06131d"
                    roughness={0.08}
                    metalness={0.95}
                    transparent
                    opacity={0.1}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}

export default function RainEffect() {
    const { player, isPlaying } = usePlayer();
    const rainMeshRef = useRef<THREE.InstancedMesh>(null);
    const rainMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const mistMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const drops = useMemo(() => createRainDrops(RAIN_COUNT), []);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state, delta) => {
        const rainMesh = rainMeshRef.current;
        if (!rainMesh) return;

        const active = isPlaying && !!player?.video;
        const position = active ? Number(player?.timer?.position ?? 0) : 0;
        const chorus = active ? !!player.findChorus(position) : false;
        const intensity = active ? (chorus ? 1.35 : 1) : 0.25;
        const drift = Math.sin(state.clock.elapsedTime * 0.45) * 0.16;

        for (let i = 0; i < drops.length; i++) {
            const drop = drops[i];
            drop.y -= drop.speed * delta * intensity;
            drop.x += Math.sin(state.clock.elapsedTime * drop.sway + drop.phase) * delta * 0.18 + drift * delta;

            if (drop.y < RAIN_BOTTOM) {
                respawnDrop(drop, true);
                drop.y = RAIN_TOP + randomBetween(0, 7);
            }

            dummy.position.set(drop.x, drop.y, drop.z);
            dummy.rotation.set(0, 0, 0.12 + Math.sin(drop.phase + state.clock.elapsedTime * 1.2) * 0.05);
            dummy.scale.set(1, drop.length * (0.85 + intensity * 0.12), 1);
            dummy.updateMatrix();
            rainMesh.setMatrixAt(i, dummy.matrix);
        }

        rainMesh.instanceMatrix.needsUpdate = true;

        if (rainMaterialRef.current) {
            rainMaterialRef.current.opacity = active ? (chorus ? 0.5 : 0.38) : 0.16;
        }
        if (mistMaterialRef.current) {
            mistMaterialRef.current.opacity = active ? (chorus ? 0.07 : 0.04) : 0.02;
        }
    });

    return (
        <>
            <fog attach="fog" args={['#020814', 24, 92]} />

            <WetRoadLayer />

            <mesh position={[0, 4.2, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0.1}>
                <planeGeometry args={[120, 120]} />
                <meshBasicMaterial
                    ref={mistMaterialRef}
                    color="#00fff0"
                    transparent
                    opacity={0.02}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <instancedMesh ref={rainMeshRef} args={[undefined, undefined, RAIN_COUNT]} renderOrder={2} frustumCulled={false}>
                <cylinderGeometry args={[0.007, 0.007, 1, 4]} />
                <meshBasicMaterial
                    ref={rainMaterialRef}
                    color="#a7f8ff"
                    transparent
                    opacity={0.38}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </instancedMesh>
        </>
    );
}