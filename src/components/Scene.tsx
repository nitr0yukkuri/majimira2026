"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";

function CityScene() {
    const { isPlaying, currentWord, currentPhrase } = usePlayer();
    const boxGroupRef = useRef<THREE.Group>(null);

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
                        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 2, 0.1);
                        material.wireframe = false;
                    } else {
                        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 0, 0.05);
                        material.wireframe = !isPlaying; // wireframe when stopped!
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
                {buildings.map((b) => (
                    <mesh key={b.id} position={[b.x, b.h / 2, b.z]}>
                        <boxGeometry args={[1, b.h, 1]} />
                        <meshStandardMaterial
                            color="#0a192f"
                            emissive="#00ffcc"
                            emissiveIntensity={0}
                            wireframe={true}
                        />
                    </mesh>
                ))}
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
