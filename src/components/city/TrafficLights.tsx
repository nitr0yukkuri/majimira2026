"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";
import { SIGNAL_GREEN, SIGNAL_YELLOW, SIGNAL_RED } from "@/constants/neon";

// ─── Signal state helpers ───────────────────────────────────────────────

/**
 * Signal cycle:
 *   0 → NS Green  / EW Red
 *   1 → NS Yellow / EW Red
 *   2 → NS Red    / EW Green
 *   3 → NS Red    / EW Yellow
 */
type SignalState = 0 | 1 | 2 | 3;

function getVehicleColor(state: SignalState, axis: "NS" | "EW"): string {
    if (axis === "NS") {
        if (state === 0) return SIGNAL_GREEN;
        if (state === 1) return SIGNAL_YELLOW;
        return SIGNAL_RED;
    }
    if (state === 2) return SIGNAL_GREEN;
    if (state === 3) return SIGNAL_YELLOW;
    return SIGNAL_RED;
}

function getPedestrianColor(state: SignalState, axis: "NS" | "EW"): string {
    // Pedestrians walk when the perpendicular vehicle traffic has green/yellow
    const walkStates: SignalState[] = axis === "NS" ? [2, 3] : [0, 1];
    return walkStates.includes(state) ? SIGNAL_GREEN : SIGNAL_RED;
}

// ─── Sub-components ─────────────────────────────────────────────────────

function NeonLamp({
    position,
    rotation,
    color,
    isActive,
    distance,
    lightRef,
}: {
    position: [number, number, number];
    rotation: [number, number, number];
    color: string;
    isActive: boolean;
    distance: number;
    lightRef: (el: THREE.PointLight | null) => void;
}) {
    return (
        <mesh position={position} rotation={rotation}>
            <cylinderGeometry args={[0.05, 0.05, 0.02]} />
            {isActive ? (
                <>
                    <meshBasicMaterial color={color} />
                    <pointLight ref={lightRef} color={color} distance={distance} intensity={0.5} />
                </>
            ) : (
                <meshStandardMaterial color="#333" />
            )}
        </mesh>
    );
}

function VehicleSignalHead({
    color,
    lightRef,
}: {
    color: string;
    lightRef: (el: THREE.PointLight | null) => void;
}) {
    return (
        <group position={[0.4, 2.8, 0]}>
            {/* Arm */}
            <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {/* Housing */}
            <mesh>
                <boxGeometry args={[0.7, 0.25, 0.2]} />
                <meshStandardMaterial color="#222" roughness={0.9} />
                <Edges color="#00ffcc" threshold={15} />
            </mesh>
            {/* Visors */}
            {[-0.2, 0, 0.2].map((lx, i) => (
                <mesh key={i} position={[lx, 0.05, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.06, 0.06, 0.1, 16, 1, true, 0, Math.PI]} />
                    <meshStandardMaterial color="#111" side={THREE.DoubleSide} />
                </mesh>
            ))}
            {/* Lamps: Green / Yellow / Red */}
            <NeonLamp position={[-0.2, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]} color={SIGNAL_GREEN} isActive={color === SIGNAL_GREEN} distance={3} lightRef={lightRef} />
            <NeonLamp position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]} color={SIGNAL_YELLOW} isActive={color === SIGNAL_YELLOW} distance={3} lightRef={lightRef} />
            <NeonLamp position={[0.2, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]} color={SIGNAL_RED} isActive={color === SIGNAL_RED} distance={3} lightRef={lightRef} />
        </group>
    );
}

function PedestrianSignalHead({
    color,
    lightRef,
}: {
    color: string;
    lightRef: (el: THREE.PointLight | null) => void;
}) {
    return (
        <group position={[0.1, 1.5, 0.1]} rotation={[0, Math.PI / 4, 0]}>
            <mesh>
                <boxGeometry args={[0.2, 0.4, 0.15]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            {/* Red (stop) lamp */}
            <mesh position={[0, 0.1, 0.08]}>
                <planeGeometry args={[0.1, 0.1]} />
                {color === SIGNAL_RED ? (
                    <>
                        <meshBasicMaterial color={SIGNAL_RED} />
                        <pointLight ref={lightRef} color={SIGNAL_RED} distance={1.5} intensity={0.5} />
                    </>
                ) : (
                    <meshStandardMaterial color="#333" />
                )}
            </mesh>
            {/* Green (walk) lamp */}
            <mesh position={[0, -0.1, 0.08]}>
                <planeGeometry args={[0.1, 0.1]} />
                {color === SIGNAL_GREEN ? (
                    <>
                        <meshBasicMaterial color={SIGNAL_GREEN} />
                        <pointLight ref={lightRef} color={SIGNAL_GREEN} distance={1.5} intensity={0.5} />
                    </>
                ) : (
                    <meshStandardMaterial color="#333" />
                )}
            </mesh>
        </group>
    );
}

function SignalPole({
    x,
    z,
    rotationY,
    vehicleColor,
    pedColor,
    lightRef,
}: {
    x: number;
    z: number;
    rotationY: number;
    vehicleColor: string;
    pedColor: string;
    lightRef: (el: THREE.PointLight | null) => void;
}) {
    return (
        <group position={[x, 0.12, z]} rotation={[0, rotationY, 0]}>
            {/* Main pole */}
            <mesh position={[0, 2.0, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 4]} />
                <meshStandardMaterial color="#111" roughness={0.8} />
            </mesh>
            {/* Street lamp overhang */}
            <group position={[0, 3.8, 0]}>
                <mesh position={[0.5, 0.2, 0]} rotation={[0, 0, Math.PI / 2.2]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.2]} />
                    <meshStandardMaterial color="#111" roughness={0.8} />
                </mesh>
                <mesh position={[1.0, 0.4, 0]}>
                    <boxGeometry args={[0.4, 0.05, 0.2]} />
                    <meshBasicMaterial color="#fff" />
                </mesh>
            </group>
            <VehicleSignalHead color={vehicleColor} lightRef={lightRef} />
            <PedestrianSignalHead color={pedColor} lightRef={lightRef} />
        </group>
    );
}

// ─── Public export ──────────────────────────────────────────────────────

/**
 * Four signal poles at the intersection corners.
 * Signal state advances once per phrase.
 * Light intensity pulses on every beat and intensifies during chorus.
 */
export default function TrafficLights({
    onSyncEvent,
}: {
    onSyncEvent?: (event: { color: string; worldX: number; worldZ: number }) => void;
}) {
    const { player } = usePlayer();
    const [signalState, setSignalState] = useState<SignalState>(0);
    const lastPhraseId = useRef<number | null>(null);
    const lightRefs = useRef<(THREE.PointLight | null)[]>([]);

    useFrame(() => {
        if (!player?.video) return;
        const pos = player.timer.position;

        // Advance signal once per phrase
        const phrase = player.video.findPhrase(pos);
        if (phrase && phrase.startTime !== lastPhraseId.current) {
            lastPhraseId.current = phrase.startTime;
            const nextState = ((signalState + 1) % 4) as SignalState;
            setSignalState(nextState);

            if (onSyncEvent) {
                const axis = nextState === 0 || nextState === 1 ? "NS" : "EW";
                const color = getVehicleColor(nextState, axis);
                onSyncEvent({
                    color,
                    worldX: axis === "NS" ? 0 : 1.35,
                    worldZ: axis === "NS" ? -1.35 : 0,
                });
            }
        }

        // Pulse intensity on beat, boost during chorus
        let intensity = 0.5;
        const beat = player.findBeat(pos);
        if (beat) {
            const t = Math.max(0, Math.min(1, (pos - beat.startTime) / beat.duration));
            intensity = 0.5 + Math.pow(1 - t, 3) * 3;
        }
        const chorus = player.findChorus(pos);
        if (chorus) intensity *= 1.5;

        lightRefs.current.forEach((light) => {
            if (light) light.intensity = intensity;
        });
    });

    // Reset ref array each render
    lightRefs.current = [];
    const pushRef = (el: THREE.PointLight | null) => { if (el) lightRefs.current.push(el); };

    const nsVehicle = getVehicleColor(signalState, "NS");
    const ewVehicle = getVehicleColor(signalState, "EW");
    const nsPed = getPedestrianColor(signalState, "NS");
    const ewPed = getPedestrianColor(signalState, "EW");

    return (
        <group>
            <SignalPole x={-1.35} z={-1.35} rotationY={0} vehicleColor={nsVehicle} pedColor={ewPed} lightRef={pushRef} />
            <SignalPole x={1.35} z={1.35} rotationY={Math.PI} vehicleColor={nsVehicle} pedColor={ewPed} lightRef={pushRef} />
            <SignalPole x={1.35} z={-1.35} rotationY={-Math.PI / 2} vehicleColor={ewVehicle} pedColor={nsPed} lightRef={pushRef} />
            <SignalPole x={-1.35} z={1.35} rotationY={Math.PI / 2} vehicleColor={ewVehicle} pedColor={nsPed} lightRef={pushRef} />
        </group>
    );
}
