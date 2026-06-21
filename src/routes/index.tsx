import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import musicAsset from "@/assets/music.mp3.asset.json";
import {
  generatePoem,
  createCheckout,
  confirmPayment,
  getGift,
  type PoemResult,
} from "@/lib/heartfelt.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Heartfelt — Gift a Poem" },
      {
        name: "description",
        content:
          "Send a personalised AI-written poem as a beautiful gift link. Music, animation, and words from the heart.",
      },
      { property: "og:title", content: "Heartfelt — Gift a Poem" },
      {
        property: "og:description",
        content:
          "A heartfelt AI-written poem, wrapped as a gift link with music and a reveal animation.",
      },
      { name: "theme-color", content: "#150e12" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover" },
    ],
  }),
  component: HeartfeltPage,
  errorComponent: ({ error, reset }) => (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#150e12", color: "#fff", padding: 24, textAlign: "center", fontFamily: "Georgia, serif" }}>
      <div>
        <h1 style={{ fontStyle: "italic", marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ opacity: 0.7, marginBottom: 16, fontSize: 13 }}>{error.message}</p>
        <button onClick={reset} style={{ background: "#9B2242", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer" }}>Try again</button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40, color: "#fff" }}>Not found</div>,
});

// ===== Themes / Occasions =====
const THEMES: Record<string, { from: string; to: string; accent: string; label: string }> = {
  love: { from: "#FFF0F3", to: "#FFD6DF", accent: "#9B2242", label: "Love" },
  gratitude: { from: "#FDF6EE", to: "#F5E6D0", accent: "#7A4F2D", label: "Gratitude" },
  birthday: { from: "#FDF4FF", to: "#F5CFFE", accent: "#6B21A8", label: "Birthday" },
  comfort: { from: "#EFF6FF", to: "#DBEAFE", accent: "#1E3A8A", label: "Comfort" },
  nostalgia: { from: "#FEFCE8", to: "#FEF08A", accent: "#713F12", label: "Nostalgia" },
  miss: { from: "#F5F3FF", to: "#EDE9FE", accent: "#4C1D95", label: "Miss You" },
  congrats: { from: "#ECFDF5", to: "#A7F3D0", accent: "#065F46", label: "Congrats" },
};

const OCCASIONS = [
  { id: "birthday", emoji: "🎂", chip: "Birthday", prompt: "Birthday", themeHint: "birthday" },
  { id: "anniversary", emoji: "💍", chip: "Anniversary", prompt: "Anniversary", themeHint: "love" },
  { id: "thankyou", emoji: "🙏", chip: "Thank You", prompt: "Thank you and appreciation", themeHint: "gratitude" },
  { id: "justbecause", emoji: "💫", chip: "Just Because", prompt: "Just because no occasion", themeHint: "love" },
  { id: "getwell", emoji: "🌻", chip: "Get Well", prompt: "Get well soon", themeHint: "comfort" },
  { id: "congrats", emoji: "🎉", chip: "Congrats", prompt: "Congratulations on achievement", themeHint: "congrats" },
  { id: "missyou", emoji: "🌙", chip: "Miss You", prompt: "Missing them long distance", themeHint: "miss" },
];

function fitPoemLine(line: string) {
  const len = line.trim().length;
  if (len >= 70) return 8.4;
  if (len >= 58) return 9.2;
  if (len >= 48) return 10.0;
  if (len >= 38) return 11.2;
  if (len >= 30) return 12.5;
  if (len >= 22) return 13.6;
  return 15.0;
}

// ===== Decorative SVGs =====
function Wave({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 20" width="150" height="15" style={{ display: "block" }}>
      <path d="M0 10 Q25 2 50 10 Q75 18 100 10 Q125 2 150 10 Q175 18 200 10" stroke={color} strokeWidth="1.2" fill="none" opacity="0.7" />
      <circle cx="100" cy="10" r="3" fill={color} opacity="0.8" />
      <circle cx="50" cy="10" r="1.5" fill={color} opacity="0.5" />
      <circle cx="150" cy="10" r="1.5" fill={color} opacity="0.5" />
    </svg>
  );
}

function Floral({ flip, flipY, color, opacity }: { flip?: boolean; flipY?: boolean; color: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 120 120" width="80" height="80" style={{ transform: `scale(${flip ? -1 : 1},${flipY ? -1 : 1})`, opacity: opacity ?? 0.25, display: "block", pointerEvents: "none" }}>
      <path d="M10 110 Q30 60 80 20" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M10 110 Q50 80 90 50" stroke={color} strokeWidth="1" fill="none" />
      <circle cx="80" cy="20" r="5" fill={color} />
      <circle cx="55" cy="45" r="3.5" fill={color} />
      <circle cx="35" cy="70" r="2.5" fill={color} />
      <path d="M80 20 Q88 8 96 14 Q88 22 80 20Z" fill={color} />
      <path d="M55 45 Q63 33 71 39 Q63 47 55 45Z" fill={color} />
    </svg>
  );
}

// ===== Gift Reveal =====
function GiftReveal({ result, occasion, onOpened, onPlayMusic }: { result: PoemResult; photo: string | null; occasion: string | null; onOpened: () => void; onPlayMusic: () => void }) {
  const th = THEMES[result.theme] || THEMES.gratitude;
  const occ = OCCASIONS.find((o) => o.id === occasion);
  const [opened, setOpened] = useState(false);
  const [burst, setBurst] = useState(false);

  const handleOpen = () => {
    if (opened) return;
    onPlayMusic();
    setOpened(true);
    setBurst(true);
    setTimeout(() => onOpened(), 950);
  };

  return (
    <div style={{ minHeight: "100dvh", background: `linear-gradient(145deg,${th.from},${th.to})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", fontSize: 20, opacity: 0.1, left: `${5 + ((i * 87) % 85)}%`, top: `${5 + ((i * 61) % 85)}%`, transform: `rotate(${i * 37}deg)`, userSelect: "none" }}>❀</div>
      ))}
      <div style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}><Floral color={th.accent} /></div>
      <div style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none" }}><Floral flip color={th.accent} /></div>
      <div style={{ position: "absolute", bottom: 0, left: 0, pointerEvents: "none" }}><Floral flipY color={th.accent} /></div>
      <div style={{ position: "absolute", bottom: 0, right: 0, pointerEvents: "none" }}><Floral flip flipY color={th.accent} /></div>
      <div style={{ position: "absolute", inset: 14, border: `1px solid ${th.accent}`, borderRadius: 4, opacity: 0.18, pointerEvents: "none" }} />
      <p style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: th.accent, opacity: 0.6, marginBottom: 8, textAlign: "center" }}>
        {result.sender ? `From ${result.sender}` : "A gift for you"}
      </p>
      <p style={{ fontSize: 17, fontStyle: "italic", color: th.accent, marginBottom: 36, opacity: 0.8, textAlign: "center" }}>
        {occ ? `${occ.emoji} ` : ""}You have received something special
      </p>
      <button onClick={handleOpen} disabled={opened} style={{ background: "none", border: "none", cursor: opened ? "default" : "pointer", position: "relative", width: 160, height: 190, marginBottom: 28 }}>
        {burst && ["❤️", "✨", "🌸", "💛", "💜", "🌟", "💗", "🍃"].map((em, i) => (
          <div key={i} style={{ position: "absolute", fontSize: 22, top: "50%", left: "50%", animation: `burst${i} 0.75s ease-out forwards`, pointerEvents: "none" }}>{em}</div>
        ))}
        <div style={{ width: 148, height: 54, borderRadius: "12px 12px 0 0", background: th.accent, position: "absolute", top: 14, transition: "transform 0.65s cubic-bezier(.68,-0.55,.27,1.55),opacity 0.45s", transform: opened ? "translateY(-65px) rotate(14deg)" : "translateY(0)", opacity: opened ? 0 : 1, transformOrigin: "bottom center" }} />
        <div style={{ width: 148, height: 120, borderRadius: "0 0 14px 14px", background: th.accent, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.4s", transform: opened ? "scale(0.94)" : "scale(1)", position: "absolute", bottom: 0 }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 22, height: 174, background: "rgba(255,255,255,0.32)", zIndex: 1, transition: "opacity 0.35s", opacity: opened ? 0 : 1 }} />
        <div style={{ position: "absolute", top: -8, left: "50%", transform: opened ? "translateX(-50%) translateY(-44px) rotate(45deg)" : "translateX(-50%)", fontSize: 44, transition: "transform 0.55s,opacity 0.4s", opacity: opened ? 0 : 1, zIndex: 2 }}>🎀</div>
      </button>
      <p style={{ fontSize: 16, color: th.accent, fontStyle: "italic", opacity: opened ? 0 : 0.75, transition: "opacity 0.3s", textAlign: "center" }}>Tap to open your gift</p>
      {opened && <p style={{ fontSize: 14, color: th.accent, opacity: 0.6, textAlign: "center" }}>Opening…</p>}
    </div>
  );
}

// ===== Poem viewer =====
function PoemViewer({ result, photo, occasion, musicPlaying, onPlayMusic }: { result: PoemResult; photo: string | null; occasion: string | null; musicPlaying?: boolean; onPlayMusic?: () => void }) {
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX = useRef<number | null>(null);
  const th = THEMES[result.theme] || THEMES.gratitude;
  const stanzas = result.poem.split("\n\n");
  const occ = OCCASIONS.find((o) => o.id === occasion);

  useEffect(() => {
    if (slide !== 0) return;
    timerRef.current = setTimeout(() => setSlide(1), 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slide]);

  const goTo = (n: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSlide(n);
  };


  return (
    <div style={{ minHeight: "100dvh", background: "#150e12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 16px 28px", boxSizing: "border-box", position: "relative" }}>
      <div style={{ width: "100%", maxWidth: 360, position: "relative" }}>
        {onPlayMusic && !musicPlaying && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlayMusic(); }}
            aria-label="Play music"
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 84, height: 84, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 30, boxShadow: "0 12px 36px rgba(0,0,0,0.55)" }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
          </button>
        )}
        <div
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx < -40 && slide < 1) goTo(1);
            if (dx > 40 && slide > 0) goTo(0);
            touchX.current = null;
          }}
          style={{ width: "100%", aspectRatio: "9/16", borderRadius: 22, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.65)", position: "relative", userSelect: "none" }}
        >
          {slide === 0 ? (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(160deg,${th.from},${th.to})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ position: "absolute", fontSize: 16, opacity: 0.1, left: `${5 + ((i * 87) % 85)}%`, top: `${5 + ((i * 61) % 85)}%`, transform: `rotate(${i * 37}deg)` }}>❀</div>
              ))}
              <div style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}><Floral color={th.accent} /></div>
              <div style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none" }}><Floral flip color={th.accent} /></div>
              <div style={{ position: "absolute", bottom: 0, left: 0, pointerEvents: "none" }}><Floral flipY color={th.accent} /></div>
              <div style={{ position: "absolute", bottom: 0, right: 0, pointerEvents: "none" }}><Floral flip flipY color={th.accent} /></div>
              <div style={{ position: "absolute", inset: 14, border: `1px solid ${th.accent}`, borderRadius: 4, opacity: 0.2, pointerEvents: "none" }} />
              {photo && (
                <div style={{ width: 168, height: 220, borderRadius: 14, overflow: "hidden", marginBottom: 18, border: `3px solid ${th.accent}`, flexShrink: 0, background: th.from, boxShadow: `0 10px 30px ${th.accent}30` }}>
                  <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                </div>
              )}
              {occ && <p style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: th.accent, opacity: 0.6, marginBottom: 10, fontStyle: "italic" }}>{occ.emoji} {occ.chip}</p>}
              <h1 style={{ fontSize: result.titleLine.length > 18 ? 27 : result.titleLine.length > 12 ? 36 : 46, fontWeight: 400, color: th.accent, fontStyle: "italic", textAlign: "center", padding: "0 20px", marginBottom: 18, lineHeight: 1.2 }}>{result.titleLine}</h1>
              <Wave color={th.accent} />
              <p style={{ marginTop: 12, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: th.accent, opacity: 0.4 }}>A message from the heart</p>

              <div style={{ position: "absolute", bottom: 20, right: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <svg width="34" height="34" viewBox="0 0 34 34">
                  <circle cx="17" cy="17" r="14" fill="none" stroke={th.accent} strokeWidth="2" opacity="0.15" />
                  <circle cx="17" cy="17" r="14" fill="none" stroke={th.accent} strokeWidth="2.5" opacity="0.65" strokeDasharray={dash} strokeDashoffset={dash * (countdown / 3)} strokeLinecap="round" transform="rotate(-90 17 17)" style={{ transition: "stroke-dashoffset 1s linear" }} />
                  <text x="17" y="21" textAnchor="middle" fontSize="11" fill={th.accent} fontFamily="Georgia,serif" opacity="0.8">{countdown}</text>
                </svg>
                <p style={{ fontSize: 8, color: th.accent, opacity: 0.35, margin: 0 }}>swipe</p>
              </div>
            </div>
          ) : (
            <div style={{ width: "100%", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", background: `linear-gradient(175deg,${th.to},${th.from} 55%,${th.to})` }}>
              {photo && (
                <div style={{ width: "100%", height: 260, overflow: "hidden", flexShrink: 0, position: "relative", background: "#000" }}>
                  <img src={photo} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.55) saturate(1.1)", transform: "scale(1.15)" }} />
                  <img src={photo} alt="" style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", display: "block", zIndex: 1 }} />
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom,transparent 0%,transparent 65%,${th.from} 100%)`, zIndex: 2, pointerEvents: "none" }} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: photo ? "8px 22px 44px" : "34px 22px 44px", boxSizing: "border-box" }}>
                <p style={{ fontSize: 17, fontStyle: "italic", color: th.accent, marginBottom: 12, textAlign: "center" }}>{result.titleLine},</p>
                <Wave color={th.accent} />
                <div style={{ marginTop: 20, marginBottom: 20, width: "100%" }}>
                  {stanzas.map((s, si) => (
                    <div key={si} style={{ marginBottom: 18, textAlign: "center" }}>
                      {s.trim().split("\n").map((line, li) => (
                        <p key={li} style={{ fontSize: fitPoemLine(line), lineHeight: 1.9, color: th.accent, margin: 0, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>{line.trim()}</p>
                      ))}
                    </div>
                  ))}
                </div>
                <Wave color={th.accent} />
                <p style={{ marginTop: 14, fontSize: 15, fontStyle: "italic", color: th.accent, textAlign: "center" }}>{result.closing}</p>
                {result.sender && <p style={{ marginTop: 6, fontSize: 12, color: th.accent, opacity: 0.5, textAlign: "right", width: "100%", fontStyle: "italic" }}>{`— ${result.sender}`}</p>}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => goTo(0)} disabled={slide === 0} style={{ position: "absolute", left: -16, top: "50%", transform: "translateY(-50%)", background: slide === 0 ? "#2a1820" : th.accent, border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: slide === 0 ? "default" : "pointer", opacity: slide === 0 ? 0.18 : 1 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="15,18 9,12 15,6" /></svg>
        </button>
        <button onClick={() => goTo(1)} disabled={slide === 1} style={{ position: "absolute", right: -16, top: "50%", transform: "translateY(-50%)", background: slide === 1 ? "#2a1820" : th.accent, border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: slide === 1 ? "default" : "pointer", opacity: slide === 1 ? 0.18 : 1 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="9,18 15,12 9,6" /></svg>
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {[0, 1].map((i) => (
          <div key={i} onClick={() => goTo(i)} style={{ width: slide === i ? 20 : 8, height: 8, borderRadius: 4, background: slide === i ? th.accent : "#3a2530", cursor: "pointer", transition: "all 0.25s" }} />
        ))}
      </div>
      <p style={{ color: "#3d2d35", fontSize: 11, marginTop: 8, textAlign: "center" }}>Swipe or tap arrows to navigate</p>
    </div>
  );
}

// ===== Main Page =====
function HeartfeltPage() {
  const router = useRouter();
  const generate = useServerFn(generatePoem);
  const startCheckout = useServerFn(createCheckout);
  const confirm = useServerFn(confirmPayment);
  const fetchGift = useServerFn(getGift);

  const [step, setStep] = useState<"form" | "preview">("form");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PoemResult | null>(null);
  const [paying, setPaying] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [giftView, setGiftView] = useState(false);
  const [showPoem, setShowPoem] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = document.createElement("audio");
    audio.src = musicAsset.url;
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.style.position = "fixed";
    audio.style.left = "0";
    audio.style.top = "0";
    audio.style.width = "1px";
    audio.style.height = "1px";
    audio.style.opacity = "0";
    audio.style.pointerEvents = "none";
    audio.addEventListener("playing", () => setMusicPlaying(true));
    audio.addEventListener("pause", () => setMusicPlaying(false));
    audio.addEventListener("error", () => setMusicBlocked(true));
    document.body.appendChild(audio);
    audioRef.current = audio;
    return audio;
  }, []);

  const unlockMusic = useCallback((audible = false) => {
    if (typeof window === "undefined") return;
    const audio = ensureAudio();
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = audible ? 1 : 0.01;
    audio.setAttribute("playsinline", "true");
    (window as unknown as { __heartfeltAudioDebug?: Record<string, unknown> }).__heartfeltAudioDebug = {
      attemptedAt: new Date().toISOString(),
      audible,
      src: audio.src,
    };
    audio.play()
      .then(() => {
        setMusicPlaying(true);
        setMusicBlocked(false);
      })
      .catch((error: unknown) => {
        console.warn("Heartfelt music blocked", error);
        setMusicPlaying(false);
        setMusicBlocked(true);
      });
  }, [ensureAudio]);

  const makeMusicAudible = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) {
      unlockMusic(true);
      return;
    }
    audio.muted = false;
    audio.volume = 1;
    setMusicPlaying(true);
    setMusicBlocked(false);
  }, [unlockMusic]);

  const stopMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setMusicPlaying(false);
  }, []);

  useEffect(() => () => {
    const audio = audioRef.current;
    audio?.pause();
    audio?.remove();
    audioRef.current = null;
  }, []);

  // On mount: handle ?gift=ID (recipient) or ?paid=1&gift=ID&session_id=... (sender just paid)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const giftId = params.get("gift");
    const paid = params.get("paid");
    const sessionId = params.get("session_id");

    if (paid === "1" && giftId && sessionId) {
      setConfirming(true);
      confirm({ data: { sessionId, giftId } })
        .then((r) => {
          if (r.paid) {
            const link = `${window.location.origin}/?gift=${giftId}`;
            setShareLink(link);
            setPaidSuccess(true);
            try {
              localStorage.setItem("heartfelt_last_gift", giftId);
              const savedRecipient = localStorage.getItem("heartfelt_last_recipient");
              if (savedRecipient && !recipientName) setRecipientName(savedRecipient);
            } catch {}
            // clean url
            window.history.replaceState({}, "", "/");
          } else {
            setError("Payment not yet confirmed by Stripe. Please refresh.");
          }
        })
        .catch((e) => setError(e?.message || "Could not confirm payment"))
        .finally(() => setConfirming(false));
      return;
    }

    // Recover last share link if user closed the tab after paying
    if (!giftId) {
      try {
        const last = localStorage.getItem("heartfelt_last_gift");
        if (last) {
          setShareLink(`${window.location.origin}/?gift=${last}`);
          setPaidSuccess(true);
        }
      } catch {}
    }

    if (giftId) {
      setLoading(true);
      fetchGift({ data: { id: giftId } })
        .then((row) => {
          if (row) {
            setResult({ ...(row.poem as PoemResult), sender: row.sender || "" });
            setPhoto(row.photo || null);
            setOccasion(row.occasion || null);
            setGiftView(true);
          } else {
            setError("This gift link is invalid or has expired.");
          }
        })
        .catch(() => setError("Could not load gift."))
        .finally(() => setLoading(false));
    }
  }, [confirm, fetchGift]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Downscale to keep payload reasonable
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPhoto(canvas.toDataURL("image/jpeg", 0.82));
        } else {
          setPhoto(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    setShareLink(null);
    // music is started manually via the play button on the poem

    try {
      const poem = await generate({
        data: {
          senderName,
          recipientName,
          description,
          occasion: null,
          themeHint: "gratitude",
        },
      });
      setResult(poem);
      setStep("preview");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    if (!result) return;
    setPaying(true);
    setError(null);
    try {
      try {
        localStorage.setItem("heartfelt_last_recipient", recipientName.trim());
        if (senderEmail.trim()) localStorage.setItem("heartfelt_last_sender_email", senderEmail.trim());
      } catch {}
      const { url } = await startCheckout({
        data: {
          result,
          photo,
          occasion,
          recipient: recipientName.trim(),
          origin: window.location.origin,
        },
      });
      if (url) window.location.href = url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      setError(msg);
      setPaying(false);
    }
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const musicButton = null;


  const withAudio = (content: ReactNode) => (
    <>
      {content}
      {musicButton}
    </>
  );

  if (confirming) {
    return withAudio(
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#150e12", color: "#fff", fontFamily: "Georgia,serif" }}>
        <p style={{ fontStyle: "italic", opacity: 0.85 }}>Confirming your payment…</p>
      </div>
    );
  }

  if (giftView && result) {
    return withAudio(
      showPoem
        ? <PoemViewer result={result} photo={photo} occasion={occasion} musicPlaying={musicPlaying} onPlayMusic={makeMusicAudible} />
        : <GiftReveal result={result} photo={photo} occasion={occasion} onOpened={() => setShowPoem(true)} onPlayMusic={makeMusicAudible} />
    );
  }

  if (paidSuccess && shareLink) {
    const recipientLabel = recipientName.trim() || "them";
    const savedEmail = (() => {
      try { return localStorage.getItem("heartfelt_last_sender_email") || ""; } catch { return ""; }
    })();
    const emailTo = senderEmail.trim() || savedEmail;
    const subject = encodeURIComponent(`Your Heartfelt gift link for ${recipientLabel}`);
    const body = encodeURIComponent(
      `Here's your Heartfelt gift link — keep it safe and send it to ${recipientLabel} whenever you're ready:\n\n${shareLink}\n\nWith love,\nHeartfelt 🎁`
    );
    const mailto = `mailto:${emailTo}?subject=${subject}&body=${body}`;
    const waText = encodeURIComponent(`A little something for you 💝 ${shareLink}`);
    const startOver = () => {
      try { localStorage.removeItem("heartfelt_last_gift"); } catch {}
      setPaidSuccess(false);
      setShareLink(null);
      setResult(null);
      setStep("form");
    };
    return withAudio(
      <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#150e12,#2a1820)", padding: "32px 18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxSizing: "border-box", color: "#fff", fontFamily: "Georgia,serif" }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#1e1218", borderRadius: 22, padding: "28px 22px", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎁</div>
          <h1 style={{ fontSize: 24, fontStyle: "italic", margin: "0 0 6px", color: "#fff" }}>Thank you!</h1>
          <p style={{ fontSize: 14, opacity: 0.75, margin: "0 0 22px" }}>
            Your gift link for <span style={{ color: "#F5CFFE", fontStyle: "italic" }}>{recipientLabel}</span> is ready. Save it somewhere safe — this is the only place it lives.
          </p>

          <div style={{ background: "#2a1820", borderRadius: 12, padding: "12px 14px", fontSize: 12, color: "#e5d4dc", wordBreak: "break-all", marginBottom: 10, textAlign: "left" }}>
            {shareLink}
          </div>
          <button onClick={copyLink} style={{ width: "100%", background: copied ? "#22c55e" : "#9B2242", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", minHeight: 48, marginBottom: 10 }}>
            {copied ? "✓ Link copied" : "📋 Copy link"}
          </button>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={() => navigator.share({ title: "A Heartfelt gift for you", text: `A little something for you 💝`, url: shareLink }).catch(() => {})}
              style={{ width: "100%", background: "#3D1F2A", color: "#fff", border: "1px solid #5a3543", borderRadius: 12, padding: "13px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", minHeight: 48, marginBottom: 10 }}
            >
              📤 Share…
            </button>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" style={{ flex: 1, background: "#25D366", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46 }}>
              WhatsApp
            </a>
            <a href={`sms:?&body=${waText}`} style={{ flex: 1, background: "#3D1F2A", color: "#fff", border: "1px solid #5a3543", borderRadius: 12, padding: "12px", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46 }}>
              SMS
            </a>
          </div>

          <div style={{ borderTop: "1px solid #3a2530", paddingTop: 18, marginBottom: 14, textAlign: "left" }}>
            <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 8px", textAlign: "center" }}>
              ✉️ Email the link to yourself so you never lose it
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder={savedEmail || "you@example.com"}
                style={{ flex: 1, border: "1px solid #3a2530", background: "#2a1820", color: "#fff", borderRadius: 10, padding: "11px 12px", fontSize: 14, outline: "none", fontFamily: "inherit" }}
              />
              <a
                href={mailto}
                onClick={(e) => { if (!emailTo) { e.preventDefault(); setError("Enter an email first"); } else { try { localStorage.setItem("heartfelt_last_sender_email", emailTo); } catch {} } }}
                style={{ background: "#9B2242", color: "#fff", border: "none", borderRadius: 10, padding: "11px 14px", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, fontFamily: "inherit" }}
              >
                Email me
              </a>
            </div>
          </div>

          <a href={shareLink} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", color: "#F5CFFE", fontSize: 13, fontStyle: "italic", textDecoration: "none", marginBottom: 14 }}>
            👁 Preview what {recipientLabel} will see →
          </a>

          <button onClick={startOver} style={{ background: "none", color: "#9a8a8e", border: "none", fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
            Send another gift
          </button>

          {error && <p style={{ fontSize: 12, color: "#fca5a5", marginTop: 10 }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (step === "form") {
    return withAudio(
      <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#FDF6EE,#FAF0E6)", padding: "20px 16px 48px", display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 24, marginTop: 8 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div>
            <h1 style={{ fontSize: 28, fontWeight: 400, fontStyle: "italic", color: "#3D1F2A", marginBottom: 4 }}>Heartfelt</h1>
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 16 }}>
            {([
              ["Your name", "e.g. Alex", senderName, setSenderName] as const,
              ["Their name or relationship", "e.g. Hari, Mom, my sister Sarah", recipientName, setRecipientName] as const,
            ]).map(([lbl, ph, val, set]) => (
              <div key={lbl}>
                <label style={{ fontSize: 11, color: "#78716c", display: "block", marginBottom: 5, letterSpacing: "0.07em", textTransform: "uppercase" }}>{lbl}</label>
                <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={{ width: "100%", border: "1px solid #e7e5e4", borderRadius: 12, padding: "13px 14px", fontSize: 16, color: "#3D1F2A", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: "#78716c", display: "block", marginBottom: 5, letterSpacing: "0.07em", textTransform: "uppercase" }}>You tell the situation</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Who are they to you? A memory, a reason, a feeling you want to capture. The more you share, the more personal the poem." style={{ width: "100%", border: "1px solid #e7e5e4", borderRadius: 12, padding: "13px 14px", fontSize: 14, color: "#3D1F2A", resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.65, fontFamily: "inherit" }} />
            </div>
            <div>
              <label htmlFor="fphoto" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#78716c", border: "1px dashed #d6d3d1", borderRadius: 12, padding: "13px 14px", cursor: "pointer", minHeight: 48 }}>
                📷 {photo ? "Change photo" : "Add a photo (appears in the gift)"}
              </label>
              <input id="fphoto" type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              {photo && <img src={photo} alt="" style={{ marginTop: 8, width: 64, height: 64, borderRadius: 12, objectFit: "cover" }} />}
            </div>
            <button onPointerDown={() => { if (!loading) unlockMusic(true); }} onMouseDown={() => { if (!loading) unlockMusic(true); }} onTouchStart={() => { if (!loading) unlockMusic(true); }} onClick={onGenerate} disabled={loading} style={{ width: "100%", background: "#3D1F2A", color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 16, fontStyle: "italic", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, fontFamily: "inherit", touchAction: "manipulation" }}>
              {loading ? "Writing your poem…" : "🎁 Preview for free"}
            </button>
            {error && <p style={{ fontSize: 12, color: "#b91c1c", textAlign: "center" }}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Preview step
  if (!result) return null;
  const th = THEMES[result.theme] || THEMES.gratitude;
  const titleShort = result.titleLine.replace("Dear ", "").replace("For ", "").replace("To ", "");
  return withAudio(
    <div style={{ minHeight: "100dvh", background: "#150e12", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 16px 32px", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => { stopMusic(); setStep("form"); setResult(null); setShareLink(null); router.invalidate(); }} style={{ background: "none", border: "none", color: "#9a8a8e", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, minHeight: 40, padding: "4px 0", fontFamily: "inherit" }}>
          ← Back
        </button>
        <span style={{ color: "#9a8a8e", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>{th.label} · preview</span>
        <div style={{ width: 60 }} />
      </div>
      <PoemViewer result={result} photo={photo} occasion={occasion} musicPlaying={musicPlaying} onPlayMusic={makeMusicAudible} />
      <div style={{ width: "100%", maxWidth: 360, marginTop: 16 }}>
        {shareLink ? (
          <div style={{ background: "#1e1218", borderRadius: 16, padding: 16 }}>
            <p style={{ color: th.accent, fontSize: 13, fontStyle: "italic", textAlign: "center", marginBottom: 12 }}>🎁 Gift link ready — send to {titleShort}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, background: "#2a1820", borderRadius: 10, padding: "11px 12px", fontSize: 11, color: "#9a8a8e", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{shareLink}</div>
              <button onClick={copyLink} style={{ background: copied ? "#22c55e" : th.accent, color: "#fff", border: "none", borderRadius: 10, padding: "11px 16px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", minHeight: 44, minWidth: 70, fontFamily: "inherit" }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p style={{ color: "#5a4550", fontSize: 11, textAlign: "center", marginBottom: 10 }}>They open the link, gift box opens, music plays, poem slides in</p>
            <a href={shareLink} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", textDecoration: "none", background: "#2a1820", color: th.accent, border: `1px solid ${th.accent}33`, borderRadius: 10, padding: "11px", fontSize: 13, fontStyle: "italic", minHeight: 44 }}>
              Preview what they see →
            </a>
          </div>
        ) : (
          <button onClick={onShare} disabled={paying} style={{ width: "100%", background: th.accent, color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 16, fontStyle: "italic", cursor: paying ? "not-allowed" : "pointer", opacity: paying ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, fontFamily: "inherit" }}>
            {paying ? "Redirecting to Stripe…" : "🔗 Share as gift · A$5"}
          </button>
        )}
        {error && <p style={{ fontSize: 12, color: "#fca5a5", textAlign: "center", marginTop: 8 }}>{error}</p>}
        <p style={{ color: "#3d2d35", fontSize: 11, marginTop: 8, textAlign: "center" }}>Read free · A$5 sends a gift reveal with your music</p>
      </div>
    </div>
  );
}
