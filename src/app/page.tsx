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
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
};

function UIOverlay() {
  const { player, isPlaying, isReady, play, pause } = usePlayer();


  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8">
      <header className="flex justify-between items-center text-white">
        <div className="pointer-events-auto">
          {isPlaying ? (
            <button onClick={pause} className="px-5 py-2 bg-red-500 hover:bg-red-400 rounded-full font-bold transition">PAUSE</button>
          ) : (
            <button disabled={!isReady} onClick={play} className={`px-5 py-2 border-2 border-cyan-500 rounded-full font-bold transition ${isReady ? 'hover:bg-cyan-500 hover:text-black text-cyan-500 cursor-pointer' : 'opacity-50 cursor-not-allowed text-cyan-500'}`}>PLAY</button>
          )}
        </div>
      </header>

      <main className="grow flex items-center justify-center pointer-events-none z-50">
        {/* Lyrics are rendered in-world via the R3F Scene (src/components/Lyrics.tsx) */}
      </main>

      <footer className="text-gray-400 text-sm" />
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