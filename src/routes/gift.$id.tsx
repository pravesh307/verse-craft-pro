import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import musicAsset from "@/assets/music.mp3.asset.json";
import { getGift, type PoemResult } from "@/lib/heartfelt.functions";
import { GiftReveal, PoemViewer } from "./index";

const SITE_ORIGIN = "https://verse-craft-pro.lovable.app";

export const Route = createFileRoute("/gift/$id")({
  loader: async ({ params }) => {
    const row = await getGift({ data: { id: params.id } });
    if (!row) throw notFound();
    return row as {
      id: string;
      poem: PoemResult;
      photo: string | null;
      occasion: string | null;
      sender: string | null;
      recipient: string | null;
    };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_ORIGIN}/gift/${params.id}`;
    const ogImage = `${SITE_ORIGIN}/api/public/og/${params.id}`;
    const sender = loaderData?.sender?.trim();
    const recipient = loaderData?.recipient?.trim();
    const title = recipient
      ? `A heartfelt gift for ${recipient}${sender ? ` — from ${sender}` : ""}`
      : "A heartfelt gift for you";
    const description = sender
      ? `${sender} sent you a personalised poem, wrapped with music and a reveal animation. Tap to open.`
      : "Someone sent you a personalised poem, wrapped with music and a reveal animation. Tap to open.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "theme-color", content: "#150e12" },
        { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },

        { property: "og:url", content: url },
        { property: "og:site_name", content: "Heartfelt" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: GiftPage,
  notFoundComponent: () => (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#150e12", color: "#fff", padding: 24, textAlign: "center", fontFamily: "Georgia, serif" }}>
      <div>
        <h1 style={{ fontStyle: "italic", marginBottom: 8 }}>Gift not found</h1>
        <p style={{ opacity: 0.6, fontSize: 13 }}>This link is invalid or has expired.</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#150e12", color: "#fff", padding: 24, textAlign: "center", fontFamily: "Georgia, serif" }}>
      <div>
        <h1 style={{ fontStyle: "italic", marginBottom: 8 }}>Couldn't load gift</h1>
        <p style={{ opacity: 0.6, fontSize: 13 }}>{error.message}</p>
      </div>
    </div>
  ),
});

function GiftPage() {
  const row = Route.useLoaderData();
  const result: PoemResult = { ...row.poem, sender: row.sender || "" };
  const [showPoem, setShowPoem] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = document.createElement("audio");
    audio.src = musicAsset.url;
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.addEventListener("playing", () => setMusicPlaying(true));
    audio.addEventListener("pause", () => setMusicPlaying(false));
    document.body.appendChild(audio);
    audioRef.current = audio;
    return audio;
  }, []);

  const playMusic = useCallback(() => {
    const audio = ensureAudio();
    audio.muted = false;
    audio.volume = 1;
    audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
  }, [ensureAudio]);

  useEffect(() => () => {
    const audio = audioRef.current;
    audio?.pause();
    audio?.remove();
    audioRef.current = null;
  }, []);

  if (showPoem) {
    return <PoemViewer result={result} photo={row.photo} occasion={row.occasion} musicPlaying={musicPlaying} onPlayMusic={playMusic} />;
  }
  return <GiftReveal result={result} photo={row.photo} occasion={row.occasion} onOpened={() => setShowPoem(true)} onPlayMusic={playMusic} />;
}
