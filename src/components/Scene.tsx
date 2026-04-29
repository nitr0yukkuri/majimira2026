"use client";

/**
 * Scene.tsx — Canvas entry point
 *
 * Single responsibility: set up the WebGL Canvas, camera, controls,
 * post-processing, and mount <CityScene>.
 * All city-specific logic lives under components/city/.
 */

import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import CityScene from "@/components/city/CityScene";

// ─── Test mode toggle ───────────────────────────────────────────────────

/** Press "T" to toggle between cinematic camera and free OrbitControls. */
function useTestMode() {
    const [testMode, setTestMode] = useState(false);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "t") {
                e.preventDefault();
                setTestMode((prev) => !prev);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return testMode;
}

// ─── Root export ────────────────────────────────────────────────────────

export default function Scene() {
    const testMode = useTestMode();

    return (
        <Canvas
            gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
            linear
        >
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
            <OrbitControls makeDefault enabled={testMode} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <CityScene testMode={testMode} />

            {/* Post-processing: Bloom makes all emissive/BasicMaterial objects glow */}
            <EffectComposer>
                <Bloom
                    luminanceThreshold={0.1}
                    luminanceSmoothing={0.3}
                    intensity={1.8}
                    blendFunction={BlendFunction.ADD}
                />
            </EffectComposer>
        </Canvas>
    );
}
