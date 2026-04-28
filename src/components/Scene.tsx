"use client";

import { useEffect, useRef, useState } from "react";
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
        for (let y = 8; y < 128; y += 16) {
            for (let x = 8; x < 128; x += 16) {
                // 70% chance of a window being lit
                if (Math.random() > 0.3) {
                    ctx.fillRect(x, y, 10, 10);
                }
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

    // Animate over time based on the music playing
    useFrame((state, delta) => {
        if (boxGroupRef.current) {
            const time = performance.now() / 1000;
            boxGroupRef.current.position.y = Math.sin(time * (isPlaying ? 2 : 0.5)) * 0.2;

            boxGroupRef.current.children.forEach((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material as THREE.MeshStandardMaterial;
                    // React to the music / word presence
                    if (currentWord) {
                        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 2.5, 0.2);
                        material.color.lerp(new THREE.Color("#0a192f"), 0.1);
                    } else {
                        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 0.3, 0.05);
                        material.color.lerp(new THREE.Color("#020813"), 0.05);
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
                        tex.repeat.set(2, Math.ceil(b.h * 2));
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
