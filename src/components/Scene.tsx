"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera, Edges } from "@react-three/drei";
import * as THREE from "three";
import { usePlayer } from "@/contexts/PlayerContext";

function IntersectionAndRoads() {
    return (
        <group>
            {/* Main Roads - dark slightly glowing paths */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <planeGeometry args={[100, 3.5]} />
                <meshBasicMaterial color="#001122" transparent opacity={0.8} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
                <planeGeometry args={[3.5, 100]} />
                <meshBasicMaterial color="#001122" transparent opacity={0.8} />
            </mesh>

            {/* Crosswalks at intersection (0,0) */}
            {/* NS Crosswalks */}
            {[-1.75, 1.75].map((z, i) => (
                <group key={`cw-ns-${i}`} position={[0, -0.03, z]}>
                    {[-1.2, -0.6, 0, 0.6, 1.2].map((x, j) => (
                        <mesh key={j} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.3, 0.8]} />
                            <meshBasicMaterial color="#00ffcc" transparent opacity={0.9} />
                        </mesh>
                    ))}
                </group>
            ))}
            {/* EW Crosswalks */}
            {[-1.75, 1.75].map((x, i) => (
                <group key={`cw-ew-${i}`} position={[x, -0.03, 0]}>
                    {[-1.2, -0.6, 0, 0.6, 1.2].map((z, j) => (
                        <mesh key={j} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                            <planeGeometry args={[0.3, 0.8]} />
                            <meshBasicMaterial color="#00ffcc" transparent opacity={0.9} />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* Road Markings */}
            <group position={[0, -0.02, 0]}>
                {/* NS Centerlines (Dashed) */}
                {Array.from({ length: 20 }).map((_, i) => (
                    <group key={`cl-ns-${i}`}>
                        <mesh position={[0, 0, -3.5 - i * 2]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.05, 1]} />
                            <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                        </mesh>
                        <mesh position={[0, 0, 3.5 + i * 2]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.05, 1]} />
                            <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                        </mesh>
                    </group>
                ))}
                
                {/* EW Centerlines (Dashed) */}
                {Array.from({ length: 20 }).map((_, i) => (
                    <group key={`cl-ew-${i}`}>
                        <mesh position={[3.5 + i * 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                            <planeGeometry args={[0.05, 1]} />
                            <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                        </mesh>
                        <mesh position={[-3.5 - i * 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                            <planeGeometry args={[0.05, 1]} />
                            <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
                        </mesh>
                    </group>
                ))}

                {/* Stop Lines */}
                <mesh position={[-0.875, 0, 2.3]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[1.65, 0.2]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[0.875, 0, -2.3]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[1.65, 0.2]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[-2.3, 0, 0.875]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                    <planeGeometry args={[1.65, 0.2]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[2.3, 0, -0.875]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                    <planeGeometry args={[1.65, 0.2]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>

                {/* Intersection Center Diamond */}
                <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                    <planeGeometry args={[0.4, 0.4]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
                </mesh>

                {/* Straight/Turn Arrows */}
                <group position={[-0.875, 0, 4]}>
                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.1, 1.5]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                    <mesh position={[0, 0, -0.75]} rotation={[-Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0, 0.2, 0.4, 3]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                </group>
                <group position={[0.875, 0, -4]} rotation={[0, Math.PI, 0]}>
                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.1, 1.5]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                    <mesh position={[0, 0, -0.75]} rotation={[-Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0, 0.2, 0.4, 3]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                </group>
                <group position={[-4, 0, 0.875]} rotation={[0, -Math.PI / 2, 0]}>
                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.1, 1.5]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                    <mesh position={[0, 0, -0.75]} rotation={[-Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0, 0.2, 0.4, 3]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                </group>
                <group position={[4, 0, -0.875]} rotation={[0, Math.PI / 2, 0]}>
                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.1, 1.5]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                    <mesh position={[0, 0, -0.75]} rotation={[-Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0, 0.2, 0.4, 3]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                    </mesh>
                </group>
            </group>

            {/* Sidewalks (4 quadrants) */}
            {[
                [25, 25],
                [-25, 25],
                [-25, -25],
                [25, -25]
            ].map((pos, i) => (
                <group key={`sw-${i}`} position={[pos[0], -0.02, pos[1]]}>
                    <mesh>
                        <boxGeometry args={[46.5, 0.04, 46.5]} />
                        <meshBasicMaterial color="#010a12" />
                    </mesh>
                    {/* Curb highlight (Neon glow along edge) */}
                    <mesh position={[0, 0.02, Math.sign(pos[1]) * -23.25]}>
                        <boxGeometry args={[46.5, 0.02, 0.05]} />
                        <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} />
                    </mesh>
                    <mesh position={[Math.sign(pos[0]) * -23.25, 0.02, 0]}>
                        <boxGeometry args={[0.05, 0.02, 46.5]} />
                        <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} />
                    </mesh>
                </group>
            ))}
            
            {/* Neon Grid over everything below */}
            <gridHelper args={[100, 50, "#004466", "#002233"]} position={[0, -0.08, 0]} />
        </group>
    );
}

function TrafficLights() {
    const { player } = usePlayer();
    const [signalState, setSignalState] = useState(0);
    const lastPhraseId = useRef<number | null>(null);

    useFrame(() => {
        if (!player || !player.video) return;
        const pos = player.timer.position;
        const phrase = player.video.findPhrase(pos);
        if (phrase && phrase.startTime !== lastPhraseId.current) {
            lastPhraseId.current = phrase.startTime;
            setSignalState((prev) => (prev + 1) % 4);
        }
    });

    // signalState: 0=NS Green/EW Red, 1=NS Yellow/EW Red, 2=NS Red/EW Green, 3=NS Red/EW Yellow
    const nsColor = signalState === 0 ? "#00ffcc" : signalState === 1 ? "#ffff00" : "#ff0055";
    const ewColor = signalState === 2 ? "#00ffcc" : signalState === 3 ? "#ffff00" : "#ff0055";

    const pedColorNS = (signalState === 0 || signalState === 1) ? "#00ffcc" : "#ff0055"; 
    const pedColorEW = (signalState === 2 || signalState === 3) ? "#00ffcc" : "#ff0055";

    const createPole = (x: number, z: number, rotationY: number, color: string, pedColor: string) => (
        <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
            {/* Main Pole */}
            <mesh position={[0, 2.0, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 4]} />
                <meshStandardMaterial color="#111" roughness={0.8} />
            </mesh>
            
            {/* Street Lamp (Overhang) */}
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

            {/* Vehicular Traffic Light */}
            <group position={[0.4, 2.8, 0]}>
                {/* Arm */}
                <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                {/* Box */}
                <mesh>
                    <boxGeometry args={[0.7, 0.25, 0.2]} />
                    <meshStandardMaterial color="#222" roughness={0.9} />
                    <Edges color="#00ffcc" threshold={15} />
                </mesh>
                {/* Hoods (Visors) */}
                {[-0.2, 0, 0.2].map((lx, i) => (
                    <mesh key={i} position={[lx, 0.05, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.06, 0.06, 0.1, 16, 1, true, 0, Math.PI]} />
                        <meshStandardMaterial color="#111" side={THREE.DoubleSide} />
                    </mesh>
                ))}
                {/* Active Light Lamp */}
                <mesh position={[-0.2, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.02]} />
                    {color === "#00ffcc" ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color="#333" />}
                </mesh>
                <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.02]} />
                    {color === "#ffff00" ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color="#333" />}
                </mesh>
                <mesh position={[0.2, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.02]} />
                    {color === "#ff0055" ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color="#333" />}
                </mesh>
            </group>

            {/* Pedestrian Traffic Light */}
            <group position={[0.1, 1.5, 0.1]} rotation={[0, Math.PI / 4, 0]}>
                {/* Box */}
                <mesh>
                    <boxGeometry args={[0.2, 0.4, 0.15]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                {/* Pedestrian Active Light */}
                <mesh position={[0, 0.1, 0.08]}>
                    <planeGeometry args={[0.1, 0.1]} />
                    {pedColor === "#ff0055" ? <meshBasicMaterial color={pedColor} /> : <meshStandardMaterial color="#333" />}
                </mesh>
                <mesh position={[0, -0.1, 0.08]}>
                    <planeGeometry args={[0.1, 0.1]} />
                    {pedColor === "#00ffcc" ? <meshBasicMaterial color={pedColor} /> : <meshStandardMaterial color="#333" />}
                </mesh>
            </group>
        </group>
    );

    return (
        <group>
            {createPole(-1.9, -1.9, 0, nsColor, pedColorEW)}
            {createPole(1.9, 1.9, Math.PI, nsColor, pedColorEW)}
            {createPole(1.9, -1.9, -Math.PI / 2, ewColor, pedColorNS)}
            {createPole(-1.9, 1.9, Math.PI / 2, ewColor, pedColorNS)}
        </group>
    );
}

function CityScene({ testMode }: { testMode: boolean }) {
    const { player, isPlaying } = usePlayer();
    const boxGroupRef = useRef<THREE.Group>(null);
    const windowsRef = useRef<THREE.InstancedMesh>(null);

    // Generate some grid boxes
    const buildings = useMemo(() => {
        const list = [];
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                if (x === 0 || z === 0) continue; // Leave center cross space for the main roads
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
    const lastWordId = useRef<number | null>(null);
    const neonColors = useMemo(() => ['#ff00ff', '#00ffff', '#ffff00', '#ff8800'].map(c => new THREE.Color(c)), []);

    // Camera targets
    const targetBuildingIndex = useRef(0);
    const lastPhraseId = useRef<number | null>(null);
    const cameraTarget = useRef(new THREE.Vector3(0, 2, 0));

    useFrame((state, delta) => {
        let pos = 0;
        if (player && player.video && isPlaying) {
            pos = player.timer.position;
        }

        if (isPlaying && player && player.video) {
            // 1. Group bouncing synced to the Beat
            const beat = player.findBeat(pos);
            if (beat && boxGroupRef.current) {
                let beatProgress = (pos - beat.startTime) / beat.duration;
                if (beatProgress < 0) beatProgress = 0;
                if (beatProgress > 1) beatProgress = 1;

                // Easing out curve for a sharp musical pulse
                const pulse = Math.pow(1 - beatProgress, 3);
                boxGroupRef.current.position.y = pulse * 0.25;
            }

            // 2. Sequential Window Lighting synced to Words
            const word = player.video.findWord(pos);
            if (word && word.startTime !== lastWordId.current && windowsRef.current) {
                lastWordId.current = word.startTime;
                
                const unlit = [];
                for (let i = 0; i < windowData.buildingIndices.length; i++) {
                    if (windowData.buildingIndices[i] === targetBuildingIndex.current && !litWindows.current.has(i)) {
                        unlit.push(i);
                    }
                }
                
                // Light up windows
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

            // 3. Phrase transition logic (change target building and reset windows)
            const phrase = player.video.findPhrase(pos);
            if (phrase && phrase.startTime !== lastPhraseId.current) {
                lastPhraseId.current = phrase.startTime;
                targetBuildingIndex.current = Math.floor(Math.random() * buildings.length);
                
                // Clear all lit windows on phrase change for dynamic contrast
                litWindows.current.clear();
                const black = new THREE.Color("#000000");
                for (let i = 0; i < windowData.matrices.length; i++) {
                    windowsRef.current?.setColorAt(i, black);
                }
                if (windowsRef.current?.instanceColor) {
                    windowsRef.current.instanceColor.needsUpdate = true;
                }
            }
        } else if (boxGroupRef.current) {
            // Idle bounce when not playing
            const time = performance.now() / 1000;
            boxGroupRef.current.position.y = Math.sin(time * 0.5) * 0.1;
        }

        // 4. Cinematic Camera Work
        if (!testMode) {
            const targetB = buildings[targetBuildingIndex.current] || buildings[0];
            if (targetB) {
                const targetPos = new THREE.Vector3(targetB.x, targetB.h / 2, targetB.z);
                cameraTarget.current.lerp(targetPos, 1.5 * delta);
                state.camera.lookAt(cameraTarget.current);
                
                // Fly around the target building
                let chorusMultiplier = 1;
                if (isPlaying && player && player.video) {
                    const chorus = player.findChorus(pos);
                    if (chorus) chorusMultiplier = 1.5;
                }

                const t = isPlaying ? (pos / 1000) * 0.5 : performance.now() / 2000;
                const radius = 6;
                const cx = targetB.x + Math.sin(t * chorusMultiplier) * radius;
                const cz = targetB.z + Math.cos(t * chorusMultiplier) * radius;
                const cy = targetB.h / 2 + 1.5 + Math.sin(t * 0.8) * 1.5 * chorusMultiplier;

                const desiredCameraPos = new THREE.Vector3(cx, cy, cz);
                state.camera.position.lerp(desiredCameraPos, 1.0 * delta);
            }
        }
    });

    return (
        <>
            <ambientLight intensity={isPlaying ? 1 : 0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            <IntersectionAndRoads />
            <TrafficLights />

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
    const [testMode, setTestMode] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 't') {
                e.preventDefault();
                setTestMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <Canvas>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
            <OrbitControls makeDefault enabled={testMode} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <CityScene testMode={testMode} />
        </Canvas>
    );
}
