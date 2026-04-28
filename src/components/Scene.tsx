"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera, Edges } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";

function CityScene() {
    const { isPlaying, currentWord, currentPhrase } = usePlayer();
    const boxGroupRef = useRef<THREE.Group>(null);
    const windowsRef = useRef<THREE.InstancedMesh>(null);

    // Generate some grid boxes
    const buildings = useMemo(() => {
        const list = [];
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                if (Math.random() > 0.5) continue;
                const height = Math.random() * 4 + 1;
                list.push({ x: x * 2, z: z * 2, h: height, id: `${x}-${z}` });
            }
        }
        return list;
    }, []);

    // Generate Window Instances Data
    const windowData = useMemo(() => {
        const matrices: THREE.Matrix4[] = [];
        const buildingIndices: number[] = [];
        const windowSize = 0.12;
        const cols = 3;
        const spacing = 1 / cols;

        buildings.forEach((b, bIdx) => {
            const addWindow = (px: number, py: number, pz: number, ry: number) => {
                const matrix = new THREE.Matrix4();
                const position = new THREE.Vector3(px, py, pz);
                const rotation = new THREE.Euler(0, ry, 0);
                const scale = new THREE.Vector3(windowSize, windowSize, windowSize);
                matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
                matrices.push(matrix);
                buildingIndices.push(bIdx);
            };

            const floors = Math.floor(b.h / 0.4);
            for (let f = 0; f < floors; f++) {
                const py = f * 0.4 + 0.2;
                for (let c = 0; c < cols; c++) {
                    const lx = -0.5 + (c + 0.5) * spacing;
                    addWindow(b.x + lx, py, b.z + 0.501, 0);
                    addWindow(b.x + lx, py, b.z - 0.501, Math.PI);
                    addWindow(b.x + 0.501, py, b.z + lx, Math.PI / 2);
                    addWindow(b.x - 0.501, py, b.z + lx, -Math.PI / 2);
                }
            }
        });
        return { matrices, buildingIndices };
    }, [buildings]);

    // Initialize all window colors to black (transparent essentially)
    useEffect(() => {
        if (!windowsRef.current) return;
        const black = new THREE.Color("#000000");
        for (let i = 0; i < windowData.matrices.length; i++) {
            windowsRef.current.setMatrixAt(i, windowData.matrices[i]);
            windowsRef.current.setColorAt(i, black);
        }
        windowsRef.current.instanceMatrix.needsUpdate = true;
        if (windowsRef.current.instanceColor) {
            windowsRef.current.instanceColor.needsUpdate = true;
        }
    }, [windowData]);

    const litWindows = useRef<Set<number>>(new Set());
    const lastWordId = useRef<number | string | null>(null);
    const neonColors = useMemo(() => ['#ff00ff', '#00ffff', '#ffff00', '#ff8800'].map(c => new THREE.Color(c)), []);

    // Camera targets
    const [targetBuildingIndex, setTargetBuildingIndex] = useState(0);
    const lastPhraseId = useRef<number | string | null>(null);
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));

    useFrame((state, delta) => {
        // 1. Group bouncing
        if (boxGroupRef.current) {
            const time = performance.now() / 1000;
            boxGroupRef.current.position.y = Math.sin(time * (isPlaying ? 2 : 0.5)) * 0.2;
        }

        // 2. Sequential Window Lighting
        if (currentWord && currentWord.id !== lastWordId.current && windowsRef.current) {
            lastWordId.current = currentWord.id;
            
            const unlit = [];
            for (let i = 0; i < windowData.buildingIndices.length; i++) {
                if (windowData.buildingIndices[i] === targetBuildingIndex && !litWindows.current.has(i)) {
                    unlit.push(i);
                }
            }
            
            // Light up 3-6 windows per word
            const count = Math.min(unlit.length, Math.floor(Math.random() * 4) + 3);
            for (let c = 0; c < count; c++) {
                const rnd = Math.floor(Math.random() * unlit.length);
                const idx = unlit[rnd];
                unlit.splice(rnd, 1);
                
                litWindows.current.add(idx);
                const color = neonColors[Math.floor(Math.random() * neonColors.length)];
                windowsRef.current.setColorAt(idx, color);
            }
            if (count > 0 && windowsRef.current.instanceColor) {
                windowsRef.current.instanceColor.needsUpdate = true;
            }
        }

        // 3. Phrase transition logic (change target building)
        if (currentPhrase && currentPhrase.id !== lastPhraseId.current) {
            lastPhraseId.current = currentPhrase.id;
            setTargetBuildingIndex(Math.floor(Math.random() * buildings.length));
        }

        // 4. Cinematic Camera Work
        const targetB = buildings[targetBuildingIndex];
        if (targetB) {
            const targetPos = new THREE.Vector3(targetB.x, targetB.h / 2, targetB.z);
            cameraTarget.current.lerp(targetPos, 1.5 * delta);
            state.camera.lookAt(cameraTarget.current);
            
            // Fly around the target building
            const time = performance.now() / 1000;
            const radius = 6;
            const cx = targetB.x + Math.sin(time * 0.3) * radius;
            const cz = targetB.z + Math.cos(time * 0.3) * radius;
            const cy = targetB.h / 2 + 1.5 + Math.sin(time * 0.5) * 1;

            const desiredCameraPos = new THREE.Vector3(cx, cy, cz);
            state.camera.position.lerp(desiredCameraPos, 1.0 * delta);
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
                        <meshStandardMaterial color="#020813" roughness={0.8} metalness={0.2} />
                        <Edges color="#00ffcc" threshold={15} />
                    </mesh>
                ))}
                
                {/* Instanced Mesh for Windows */}
                {windowData.matrices.length > 0 && (
                    <instancedMesh ref={windowsRef} args={[undefined, undefined, windowData.matrices.length]}>
                        <planeGeometry args={[1, 1]} />
                        <meshBasicMaterial toneMapped={false} />
                    </instancedMesh>
                )}
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
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <CityScene />
        </Canvas>
    );
}
