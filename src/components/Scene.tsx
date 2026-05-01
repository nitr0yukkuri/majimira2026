"use client";

/**
 * Scene.tsx — Canvas entry point
 *
 * Single responsibility: set up the WebGL Canvas, camera, controls,
 * post-processing, and mount <CityScene>.
 * All city-specific logic lives under components/city/.
 */

import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
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

// ─── WASD camera movement ───────────────────────────────────────────────

/**
 * Canvas内コンポーネント。useFrame でカメラとOrbitControlsターゲットを
 * 同量移動させることで、OrbitControlsの軌道基点もずれずに追従する。
 */
function WASDControls({
    enabled,
    orbitRef,
}: {
    enabled: boolean;
    // OrbitControlsのrefはtargetプロパティを持つ
    orbitRef: React.RefObject<{ target: THREE.Vector3 } | null>;
}) {
    const keys = useRef({ w: false, a: false, s: false, d: false });

    // Vector3をframeごとにnewしないよう事前確保
    const _forward = useRef(new THREE.Vector3());
    const _right   = useRef(new THREE.Vector3());
    const _move    = useRef(new THREE.Vector3());
    const _up      = useRef(new THREE.Vector3(0, 1, 0));

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!enabled) return;
            switch (e.key.toLowerCase()) {
                case "w": e.preventDefault(); keys.current.w = true; break;
                case "a": e.preventDefault(); keys.current.a = true; break;
                case "s": e.preventDefault(); keys.current.s = true; break;
                case "d": e.preventDefault(); keys.current.d = true; break;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case "w": keys.current.w = false; break;
                case "a": keys.current.a = false; break;
                case "s": keys.current.s = false; break;
                case "d": keys.current.d = false; break;
            }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            // モード離脱時にキー状態をリセット
            keys.current = { w: false, a: false, s: false, d: false };
        };
    }, [enabled]);

    useFrame((state, delta) => {
        if (!enabled) return;
        const { w, a, s, d } = keys.current;
        if (!w && !a && !s && !d) return;

        const camera = state.camera;
        const speed  = 15 * delta;

        // カメラの向きからY成分を除いた水平forwardを取得
        camera.getWorldDirection(_forward.current);
        _forward.current.y = 0;
        if (_forward.current.lengthSq() < 1e-10) return; // 真上/真下を向いている場合はスキップ
        _forward.current.normalize();

        // right = forward × up
        _right.current.crossVectors(_forward.current, _up.current).normalize();

        _move.current.set(0, 0, 0);
        if (w) _move.current.addScaledVector(_forward.current,  speed);
        if (s) _move.current.addScaledVector(_forward.current, -speed);
        if (a) _move.current.addScaledVector(_right.current,   -speed);
        if (d) _move.current.addScaledVector(_right.current,    speed);

        // カメラ位置とOrbitControls基点を同量移動（基点がズレると引き戻しが起きる）
        camera.position.add(_move.current);
        if (orbitRef.current) {
            orbitRef.current.target.add(_move.current);
        }
    });

    return null;
}

// ─── Root export ────────────────────────────────────────────────────────

export default function Scene() {
    const testMode  = useTestMode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orbitRef  = useRef<any>(null);
    return (
        <Canvas
            gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
            linear
        >
            <color attach="background" args={["#000000"]} />
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
            <OrbitControls ref={orbitRef} makeDefault enabled={testMode} />
            <WASDControls enabled={testMode} orbitRef={orbitRef} />

            <Suspense fallback={null}>
                <CityScene testMode={testMode} />
            </Suspense>

        </Canvas>
    );
}
