"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";

function CityScene() {
    const { isPlaying, currentWord, currentPhrase } = usePlayer();
    const boxGroupRef = useRef<THREE.Group>(null);

    // Generate window texture
    const [windowTexture] = useState(() => {
        if (typeof document === "undefined") return null;
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d")!;
        
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 128, 128);

        ctx.fillStyle = "#ffffff";
        // 現実的なオフィスビルのように、横長の大きな窓（帯）をまばらに配置する
        for (let y = 0; y < 128; y += 32) {
            // フロアごとに点灯パターンを変える
            if (Math.random() > 0.4) {
                // 横幅の広い窓
                for (let x = 0; x < 128; x += 64) {
                    // 窓の点灯率を下げる (40%の確率で点灯)
                    if (Math.random() > 0.6) {
                        ctx.fillRect(x + 8, y + 8, 48, 16);
                    }
                }
            } else if (Math.random() > 0.8) {
                // たまにフロア全体が点灯している横帯
                ctx.fillRect(0, y + 8, 128, 16);
            }
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        return tex;
    });

    // Generate some grid boxes
    const [buildings] = useState(() => {
        const list = [];
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                if (Math.random() > 0.5) continue;
                const height = Math.random() * 4 + 1;
                list.push({ x: x * 2, z: z * 2, h: height, id: `${x}-${z}` });
            }
        }
        return list;
    });

    // Determine which buildings should light up for the current word
    const activeIndices = React.useMemo(() => {
        if (!currentWord) return [];
        const seed = currentWord.startTime;
        // Pick 4 pseudo-random buildings based on the word's start time
        return [
            seed % buildings.length,
            (seed * 3) % buildings.length,
            (seed * 7) % buildings.length,
            (seed * 11) % buildings.length,
        ];
    }, [currentWord, buildings.length]);

    // Animate over time based on the music playing
    useFrame((state, delta) => {
        if (boxGroupRef.current) {
            const time = performance.now() / 1000;
            boxGroupRef.current.position.y = Math.sin(time * (isPlaying ? 2 : 0.5)) * 0.2;

            boxGroupRef.current.children.forEach((child, index) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material as THREE.MeshStandardMaterial;
                    const isActive = currentWord && activeIndices.includes(index);

                    // React to the music / word presence
                    if (isActive) {
                        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 3.5, 0.3);
                        material.color.lerp(new THREE.Color("#0a192f"), 0.2);
                    } else {
                        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 0.1, 0.05);
                        material.color.lerp(new THREE.Color("#01040a"), 0.05);
                    }
                }
            });
        }
    });

    return (
        <>
            <ambientLight intensity={isPlaying ? 1 : 0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            <group ref={boxGroupRef}>
                {buildings.map((b) => {
                    const tex = windowTexture?.clone();
                    if (tex) {
                        tex.repeat.set(1, Math.ceil(b.h));
                        tex.needsUpdate = true;
                    }

                    return (
                        <mesh key={b.id} position={[b.x, b.h / 2, b.z]}>
                            <boxGeometry args={[1, b.h, 1]} />
                            <meshStandardMaterial
                                color="#020813"
                                emissive="#00ffcc"
                                emissiveIntensity={0.3}
                                emissiveMap={tex}
                                roughness={0.8}
                                metalness={0.2}
                            />
                        </mesh>
                    );
                })}
            </group>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#020813" />
            </mesh>
        </>
    );
}

export default function Scene() {
    return (
        <Canvas>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
            <OrbitControls autoRotate={false} maxPolarAngle={Math.PI / 2 - 0.1} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <CityScene />
        </Canvas>
    );
}
