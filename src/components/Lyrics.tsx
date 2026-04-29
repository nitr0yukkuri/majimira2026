"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";
import type { IPhrase, IWord } from "textalive-app-api";

const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

function LyricWord({ word, isActive, index }: { word: IWord; isActive: boolean; index: number }) {
    const ref = useRef<any>(null);
    const { camera } = useThree();

    // base position seeded by word text/time
    const base = useMemo(() => {
        const seed = hash((word.startTime ?? index).toString() + word.text);
        const x = (seed % 200) / 200 * 8 - 4; // -4 .. 4
        const z = ((seed >> 3) % 200) / 200 * 8 - 4; // -4 .. 4
        const y = 1 + ((seed >> 6) % 30) / 30; // 1 .. 2
        return new THREE.Vector3(x, y, z);
    }, [word, index]);

    const smoothedPosition = useRef(base.clone());
    const smoothedScale = useRef(isActive ? 1.2 : 0.85);
    const isInitialized = useRef(false);

    useFrame((state, delta) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().copy(camera.up).normalize();

        const center = new THREE.Vector3()
            .copy(camera.position)
            .addScaledVector(forward, 4.5)
            .addScaledVector(up, 1.4);

        const spread = (index - 0.5) * 1.1;
        const floatY = Math.sin(t * 1.2 + index) * 0.08 + (isActive ? 0.14 : 0);
        const sway = Math.sin(t * 0.7 + index) * 0.03;

        const targetPosition = center
            .addScaledVector(right, spread + sway)
            .addScaledVector(up, floatY);

        if (!isInitialized.current) {
            smoothedPosition.current.copy(targetPosition);
            isInitialized.current = true;
        }

        smoothedPosition.current.lerp(targetPosition, 1 - Math.exp(-delta * 10));
        ref.current.position.copy(smoothedPosition.current);

        // always face camera
        ref.current.lookAt(camera.position);

        // scale/interpolation for active
        const targetScale = isActive ? 1.2 : 0.85;
        smoothedScale.current = THREE.MathUtils.damp(smoothedScale.current, targetScale, 10, delta);
        ref.current.scale.setScalar(smoothedScale.current);
    });

    // color/emissive based on active
    const color = isActive ? new THREE.Color("#ffffff") : new THREE.Color("#cfefff");
    const emissive = isActive ? new THREE.Color("#00fff0") : new THREE.Color("#002233");

    return (
        <group ref={ref}>
            <Text
                fontSize={0.6}
                lineHeight={0.9}
                letterSpacing={-0.02}
                anchorX="center"
                anchorY="middle"
                color={color}
                outlineColor={isActive ? "#00fff0" : "#0c2130"}
                outlineWidth={isActive ? 0.015 : 0.008}
                outlineBlur={0.001}
                fillOpacity={1}
                strokeOpacity={0.9}
                strokeWidth={0.01}
                strokeColor="#ffffff"
            >
                {word.text}
            </Text>
        </group>
    );
}

export default function Lyrics() {
    const { player } = usePlayer();
    const [currentPhrase, setCurrentPhrase] = useState<IPhrase | null>(null);
    const [activeWordStartTime, setActiveWordStartTime] = useState<number | null>(null);
    const lastPhraseId = useRef<number | null>(null);
    const lastWordId = useRef<number | null>(null);

    useEffect(() => {
        if (!player) return;

        let frameId = 0;
        const tick = () => {
            if (!player.video) {
                frameId = requestAnimationFrame(tick);
                return;
            }

            const pos = player.timer.position;
            const phrase = player.video.findPhrase(pos) || player.video.firstPhrase || null;
            const word = player.video.findWord(pos) || player.video.firstWord || null;

            if (phrase?.startTime !== lastPhraseId.current) {
                lastPhraseId.current = phrase?.startTime ?? null;
                setCurrentPhrase(phrase);
            }

            if ((word?.startTime ?? null) !== lastWordId.current) {
                lastWordId.current = word?.startTime ?? null;
                setActiveWordStartTime(word?.startTime ?? null);
            }

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [player]);

    const currentWords = useMemo(() => (currentPhrase?.children || []) as IWord[], [currentPhrase]);

    return (
        <group>
            {currentWords.map((w: any, i: number) => {
                const isActive = w.startTime === activeWordStartTime;
                return <LyricWord key={w.startTime ?? i} word={w} index={i} isActive={isActive} />;
            })}

            {/* Simple lines connecting active->next and word neighbors */}
            {currentWords.map((w: any, i: number) => {
                const next = currentWords[i + 1];
                if (!next) return null;
                // positions must match LyricWord base positions - recompute same seed logic
                const seedA = hash((w.startTime ?? i).toString() + w.text);
                const a = new THREE.Vector3((seedA % 200) / 200 * 8 - 4, 1 + ((seedA >> 6) % 30) / 30, ((seedA >> 3) % 200) / 200 * 8 - 4);
                const seedB = hash((next.startTime ?? (i + 1)).toString() + next.text);
                const b = new THREE.Vector3((seedB % 200) / 200 * 8 - 4, 1 + ((seedB >> 6) % 30) / 30, ((seedB >> 3) % 200) / 200 * 8 - 4);

                return <Line key={`line-${i}`} points={[a, b]} color={w.startTime === activeWordStartTime ? "#00fff0" : "#004466"} lineWidth={2} transparent opacity={0.8} />;
            })}
        </group>
    );
}
