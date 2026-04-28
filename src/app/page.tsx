"use client";

import { usePlayer, PlayerProvider } from "@/contexts/PlayerContext";
import dynamic from "next/dynamic";
import { useState } from "react";
import React from 'react';

// Disable SSR for 3D component and APIs using browser globals
const Scene = dynamic(() => import("@/components/Scene").then(mod => mod.default), { ssr: false });

function UIOverlay() {
  const { player, isPlaying, isReady, play, pause, currentPhrase } = usePlayer();

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

      <main className="grow flex items-center justify-center pointer-events-none z-50 mix-blend-difference">
        {currentPhrase ? (
          <h2 className="text-5xl md:text-7xl font-black text-white text-center leading-snug tracking-wider">
            {currentPhrase.text}
          </h2>
        ) : (
          <p className="text-gray-500 text-lg uppercase tracking-widest animate-pulse">Waiting for Signal...</p>
        )}
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