"use client";

import { usePlayer, PlayerProvider } from "@/contexts/PlayerContext";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import React from 'react';
import { IPhrase, IWord } from "textalive-app-api";

// Disable SSR for 3D component and APIs using browser globals
const Scene = dynamic(() => import("@/components/Scene").then(mod => mod.default), { ssr: false });

const neonColors = ['text-[#ff00ff]', 'text-[#00ffff]', 'text-[#ffff00]', 'text-[#ff8800]'];
const glowColors = ['drop-shadow-[0_0_15px_#ff00ff]', 'drop-shadow-[0_0_15px_#00ffff]', 'drop-shadow-[0_0_15px_#ffff00]', 'drop-shadow-[0_0_15px_#ff8800]'];

const hash = (str: string) => {
    let h = 0;
    for(let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

function UIOverlay() {
  const { player, isPlaying, isReady, play, pause } = usePlayer();
  const [currentPhrase, setCurrentPhrase] = useState<IPhrase | null>(null);
  const [currentWord, setCurrentWord] = useState<IWord | null>(null);

  useEffect(() => {
    if (!player || !player.video || !isPlaying) return;
    let reqId: number;
    const loop = () => {
      const pos = player.timer.position;
      setCurrentPhrase(player.video!.findPhrase(pos) || null);
      setCurrentWord(player.video!.findWord(pos) || null);
      reqId = requestAnimationFrame(loop);
    };
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [player, isPlaying]);

  const renderLyrics = () => {
    if (!currentPhrase) {
      return <p className="text-gray-500 text-lg uppercase tracking-widest animate-pulse">Waiting for Signal...</p>;
    }

    const words = currentPhrase.children || [];
    const activeIndex = words.findIndex((w: any) => w.startTime === currentWord?.startTime);

    return (
      <div className="relative w-full max-w-5xl mx-auto flex flex-wrap justify-center items-center content-center gap-2 px-8">
        {words.map((word: any, index: number) => {
          const isPast = activeIndex !== -1 && index <= activeIndex;
          const isActive = activeIndex === index;

          if (!isPast && !isActive) {
            return <span key={word.startTime ?? index} className="opacity-0">{word.text}</span>;
          }

          const seed = hash((word.startTime ?? index).toString() + word.text);
          const colorIdx = seed % neonColors.length;
          const colorClass = neonColors[colorIdx];
          const glowClass = glowColors[colorIdx];
          
          const rotate = (seed % 30) - 15; // -15 to +15 degrees
          const offsetY = (seed % 60) - 30; // -30px to +30px

          return (
            <span 
              key={word.startTime ?? index} 
              className={`inline-block text-5xl md:text-7xl font-black transition-all duration-75 ${colorClass} ${glowClass} ${isActive ? 'scale-125 brightness-150 z-10' : 'scale-100 opacity-90 z-0'}`}
              style={{
                transform: `rotate(${rotate}deg) translateY(${offsetY}px)`,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8">
      <header className="flex justify-between items-center text-white">
        <h1 className="text-3xl font-bold tracking-tighter shadow-sm text-cyan-400">NEO-CITY AWAKENING</h1>
        <div className="pointer-events-auto">
          {isPlaying ? (
            <button onClick={pause} className="px-5 py-2 bg-red-500 hover:bg-red-400 rounded-full font-bold transition">PAUSE</button>
          ) : (
            <button disabled={!isReady} onClick={play} className={`px-5 py-2 border-2 border-cyan-500 rounded-full font-bold transition ${isReady ? 'hover:bg-cyan-500 hover:text-black text-cyan-500 cursor-pointer' : 'opacity-50 cursor-not-allowed text-cyan-500'}`}>PLAY</button>
          )}
        </div>
      </header>

      <main className="grow flex items-center justify-center pointer-events-none z-50">
        {renderLyrics()}
      </main>

      <footer className="text-gray-400 text-sm">
        <p>TextAlive App API Prototype</p>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <PlayerProvider>
      <main className="w-screen h-screen bg-black overflow-hidden relative font-sans">

        {/* The 3D World */}
        <div className="absolute inset-0 z-0 bg-black pointer-events-auto">
          <Scene />
        </div>

        {/* UI Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <UIOverlay />
        </div>

      </main>
    </PlayerProvider>
  );
}