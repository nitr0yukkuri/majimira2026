"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";

interface SyncCue {
    color: string;
    worldX: number;
    worldZ: number;
    at: number;
}

export default function Lyrics({ syncCue: _syncCue = null }: { syncCue?: SyncCue | null }) {
    void _syncCue;

    const { player, isPlaying } = usePlayer();
    const groupRef = useRef<THREE.Group>(null);
    const lastPhraseStartRef = useRef<number | null>(null);
    const [phraseText, setPhraseText] = useState("");

    useFrame((state, delta) => {
        const group = groupRef.current;
        if (!group) return;

        // Keep lyrics in front of the camera for plain readable display.
        const forward = new THREE.Vector3();
        state.camera.getWorldDirection(forward);
        const up = new THREE.Vector3().copy(state.camera.up).normalize();
        const target = new THREE.Vector3()
            .copy(state.camera.position)
            .addScaledVector(forward, 4.2)
            .addScaledVector(up, 1.2);

        group.position.lerp(target, 1 - Math.exp(-delta * 10));
        group.lookAt(state.camera.position);

        if (!player?.video || !isPlaying) {
            if (lastPhraseStartRef.current !== null) {
                lastPhraseStartRef.current = null;
                setPhraseText("");
            }
            return;
        }

        const pos = player.timer.position;
        const phrase = player.video.findPhrase(pos) || null;
        const phraseStart = phrase?.startTime ?? null;

        if (phraseStart !== lastPhraseStartRef.current) {
            lastPhraseStartRef.current = phraseStart;
            setPhraseText(phrase?.text ?? "");
        }
    });

    return (
        <group ref={groupRef}>
            <Text
                fontSize={0.72}
                lineHeight={1.0}
                letterSpacing={-0.01}
                anchorX="center"
                anchorY="middle"
                color="#ffffff"
                outlineColor="#00fff0"
                outlineWidth={0.01}
                strokeColor="#ffffff"
                strokeWidth={0.007}
                fillOpacity={1}
                maxWidth={8.8}
                textAlign="center"
            >
                {phraseText}
            </Text>
        </group>
    );
}
