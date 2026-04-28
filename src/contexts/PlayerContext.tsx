"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Player, IPlayerApp, IPhrase, IWord } from "textalive-app-api";

interface PlayerContextType {
    player: Player | null;
    isPlaying: boolean;
    isReady: boolean;
    currentPhrase: IPhrase | null;
    currentWord: IWord | null;
    play: () => void;
    pause: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [player, setPlayer] = useState<Player | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [currentPhrase, setCurrentPhrase] = useState<IPhrase | null>(null);
    const [currentWord, setCurrentWord] = useState<IWord | null>(null);
    const playerRef = useRef<Player | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || playerRef.current) return;

        const mediaEl = document.querySelector("#media");
        
        const newPlayer = new Player({
            app: {
                appAuthor: "NeoCity Awaken",
                appName: "Prototype",
                token: "test", // 実際の運用時は正規のデベロッパートークンに置き換えてください
            },
            mediaElement: mediaEl as HTMLElement,
        });

        newPlayer.addListener({
            onAppReady: (app: IPlayerApp) => {
                if (!app.managed) {
                    // Use a known valid URL from TextAlive official tutorials (Loading Memories / secon)
                    newPlayer.createFromSongUrl("https://piapro.jp/t/RoPB/20220122172830");
                }
            },
            onVideoReady: () => {
                console.log("Video is ready!");
            },
            onTimerReady: () => {
                console.log("Timer is ready!");
                setIsReady(true);
            },
            onPlay: () => setIsPlaying(true),
            onPause: () => setIsPlaying(false),
            onStop: () => setIsPlaying(false),

            onTimeUpdate: (position: number) => {
                const video = newPlayer.video;
                if (!video) return;

                const phrase = video.findPhrase(position);
                setCurrentPhrase(phrase);

                const word = video.findWord(position);
                setCurrentWord(word);
            },
        });

        playerRef.current = newPlayer;
        setPlayer(newPlayer);

        return () => {
            newPlayer.dispose();
            playerRef.current = null;
        };
    }, []);

    const play = () => player?.requestPlay();
    const pause = () => player?.requestPause();

    return (
        <PlayerContext.Provider value={{ player, isPlaying, isReady, currentPhrase, currentWord, play, pause }}>
            {children}
            <div id="media" className="hidden"></div>
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
    return ctx;
}
