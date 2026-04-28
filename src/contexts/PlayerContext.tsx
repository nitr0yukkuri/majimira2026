"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Player, IPlayerApp, IPhrase, IWord } from "textalive-app-api";

interface PlayerContextType {
    player: Player | null;
    isPlaying: boolean;
    currentPhrase: IPhrase | null;
    currentWord: IWord | null;
    play: () => void;
    pause: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [player, setPlayer] = useState<Player | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPhrase, setCurrentPhrase] = useState<IPhrase | null>(null);
    const [currentWord, setCurrentWord] = useState<IWord | null>(null);
    const playerRef = useRef<Player | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || playerRef.current) return;

        const newPlayer = new Player({
            app: {
                appAuthor: "NeoCity Awaken",
                appName: "Prototype",
                token: "test", // 実際の運用時は正規のデベロッパートークンに置き換えてください
            },
        });

        newPlayer.addListener({
            onAppReady: (app: IPlayerApp) => {
                if (!app.managed) {
                    // Default song: Magical Mirai (example) or generic piapro URL
                    newPlayer.createFromSongUrl("https://piapro.jp/t/E2i3/20250106202418", {
                        video: {
                            beatId: 3953764,
                            chordId: 1955797,
                            repetitiveSegmentId: 1955797,
                            lyricId: 52065,
                            lyricDiffId: 5123
                        }
                    });
                }
            },
            onVideoReady: () => {
                console.log("Video is ready!");
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
        <PlayerContext.Provider value={{ player, isPlaying, currentPhrase, currentWord, play, pause }}>
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
