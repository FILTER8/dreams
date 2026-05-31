"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type VisualMotion = {
  orbitSpeed?: string;
  driftSpeed?: string;
  ditherTempo?: string;
};

type VisualTraits = {
  mood: number;
  moodName?: string;
  blobCount: number;
  ditherCount: number;
  contourCount: number;
  satelliteCount: number;
  bgColor: number;
};

type DreamAmbientPlayerProps = {
  tokenId: string;
  dreamSeed?: string;
  palette: string[];
  motion?: VisualMotion;
  foregroundColor: string;
  visualScale?: number;
  visualTraits?: VisualTraits;
};

type TrackName = "chords" | "bass" | "melody" | "sparkle";
type TrackState = Record<TrackName, boolean>;

const C64_NOTES = [
  36, 38, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60, 62,
];

const JAZZ_CHORDS = {
  quietMajor7: [0, 4, 7, 11],
  major9: [0, 4, 7, 11, 14],
  minor9: [0, 3, 7, 10, 14],
  sus9: [0, 5, 7, 10, 14],
  dense13: [0, 4, 7, 11, 14, 21],
};

const JAZZ_TENSIONS = [10, 14, 17, 21];

const DREAM_STATES: TrackState[] = [
  { chords: true, bass: false, melody: false, sparkle: false },
  { chords: true, bass: false, melody: true, sparkle: false },
  { chords: true, bass: true, melody: false, sparkle: false },
  { chords: true, bass: false, melody: false, sparkle: true },
  { chords: true, bass: true, melody: true, sparkle: false },
  { chords: true, bass: true, melody: false, sparkle: true },
  { chords: true, bass: false, melody: true, sparkle: true },
  { chords: true, bass: true, melody: true, sparkle: true },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getScaleVolume(visualScale = 1) {
  return clamp(0.2 + visualScale * 0.36, 0.28, 1.0);
}

function hexToInt(seed?: string) {
  if (!seed) return 1;

  try {
    return Number(BigInt(seed) % BigInt(2147483647));
  } catch {
    return 1;
  }
}

function seedBigInt(seed?: string) {
  if (!seed) return BigInt(1);

  try {
    return BigInt(seed);
  } catch {
    return BigInt(1);
  }
}

function shift(value: bigint, bits: number) {
  return value / BigInt(2) ** BigInt(bits);
}

function colorIndex(color?: string) {
  if (!color) return 0;

  const value = parseInt(color.replace("#", ""), 16);
  return Number.isFinite(value) ? value % 16 : 0;
}

function fallbackTraits(dreamSeed?: string, palette?: string[]): VisualTraits {
  const g = seedBigInt(dreamSeed);

  const bgColor = palette?.[0]
    ? colorIndex(palette[0])
    : Number(g % BigInt(16));

  const mood = Number(shift(g, 72) % BigInt(5));

  let blobCount = 1 + Number(shift(g, 16) % BigInt(3));
  if (mood === 0 && blobCount > 2) blobCount = 2;
  if (mood === 1 && blobCount < 2) blobCount = 2;
  if (mood === 4) blobCount = 3;

  const ditherRaw = Number(shift(g, 136) % BigInt(10));
  const contourRaw = Number(shift(g, 120) % BigInt(10));

  return {
    mood,
    moodName:
      mood === 0
        ? "Quiet Monolith"
        : mood === 1
          ? "Layered Organism"
          : mood === 2
            ? "Fractured Relic"
            : mood === 3
              ? "Soft Satellite"
              : "Dense Artifact",
    blobCount,
    ditherCount:
      ditherRaw < 2 ? 0 : ditherRaw < 6 ? 1 : ditherRaw < 9 ? 2 : 3,
    contourCount:
      contourRaw < 3 ? 0 : contourRaw < 7 ? 1 : contourRaw < 9 ? 2 : 3,
    satelliteCount: Number(shift(g, 32) % BigInt(7)),
    bgColor,
  };
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function todayNumber() {
  const now = new Date();

  return (
    now.getUTCFullYear() * 10000 +
    (now.getUTCMonth() + 1) * 100 +
    now.getUTCDate()
  );
}

function pick<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length)];
}

function stateWeightsForMood(mood: number, satelliteCount: number) {
  if (mood === 0) return [26, 18, 18, 12, 14, 6, 4, 2];
  if (mood === 1) return [10, 18, 12, 10, 25, 10, 10, 5];
  if (mood === 2) return [16, 12, 12, 18, 15, 10, 12, 5];
  if (mood === 3 || satelliteCount >= 4) return [8, 18, 8, 18, 18, 8, 16, 6];

  return [8, 12, 10, 10, 20, 14, 12, 14];
}

function pickWeightedState(random: () => number, weights: number[]): TrackState {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;

  for (let i = 0; i < DREAM_STATES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return DREAM_STATES[i];
  }

  return DREAM_STATES[0];
}

export function DreamAmbientPlayer({
  tokenId,
  dreamSeed,
  palette,
  motion,
  foregroundColor,
  visualScale = 1,
  visualTraits,
}: DreamAmbientPlayerProps) {
  const audioRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const feedbackRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const crackleTimerRef = useRef<number | null>(null);
  const scheduleRef = useRef<() => void>(() => {});
  const scheduleCracklesRef = useRef<() => void>(() => {});
  const stepRef = useRef(0);
  const nextTimeRef = useRef(0);
  const playingRef = useRef(false);
  const currentStateRef = useRef<TrackState>(DREAM_STATES[4]);

  const trackGainsRef = useRef<Record<TrackName, GainNode | null>>({
    chords: null,
    bass: null,
    melody: null,
    sparkle: null,
  });

  const [playing, setPlaying] = useState(false);

  const soundState = useMemo(() => {
    const tokenBase = Number(tokenId || 1);
    const seedBase = hexToInt(dreamSeed);
    const traits = visualTraits ?? fallbackTraits(dreamSeed, palette);

    const dailySeed = tokenBase * 1000003 + seedBase + todayNumber();
    const random = mulberry32(dailySeed);

    const root = C64_NOTES[traits.bgColor % C64_NOTES.length];

    const chord =
      traits.mood === 0
        ? JAZZ_CHORDS.quietMajor7
        : traits.mood === 1
          ? JAZZ_CHORDS.major9
          : traits.mood === 2
            ? JAZZ_CHORDS.minor9
            : traits.mood === 3
              ? JAZZ_CHORDS.sus9
              : JAZZ_CHORDS.dense13;

    const chordDensity = clamp(traits.blobCount + 2, 3, chord.length);
    const activeChord = chord.slice(0, chordDensity);

    const orbit = Number(motion?.orbitSpeed ?? 120);
    const drift = Number(motion?.driftSpeed ?? 100);

    return {
      random,
      root,
      chord: activeChord,
      mood: traits.mood,
      blobCount: traits.blobCount,
      ditherCount: traits.ditherCount,
      contourCount: traits.contourCount,
      satelliteCount: traits.satelliteCount,
      stateWeights: stateWeightsForMood(traits.mood, traits.satelliteCount),

      tempo: clamp(2.2 - orbit / 300, 0.95, 1.85),
      driftRate: clamp(drift / 170, 0.55, 1.15),

      delay: 0.48 + traits.contourCount * 0.14,
      feedback: 0.3 + traits.contourCount * 0.09,
      filter: 620 + traits.bgColor * 90 + traits.blobCount * 80,
    };
  }, [dreamSeed, motion, palette, tokenId, visualTraits]);

  const fadeTracks = useCallback((tracks: TrackState, time: number) => {
    const targets: Record<TrackName, number> = {
      chords: tracks.chords ? 1 : 0.08,
      bass: tracks.bass ? 0.72 : 0.025,
      melody: tracks.melody ? 0.78 : 0.035,
      sparkle: tracks.sparkle ? 0.56 : 0.025,
    };

    (Object.keys(targets) as TrackName[]).forEach((name) => {
      const node = trackGainsRef.current[name];
      if (!node) return;

      node.gain.cancelScheduledValues(time);
      node.gain.setTargetAtTime(targets[name], time, 3.2);
    });
  }, []);

  const playPianoTone = useCallback(
    (
      ctx: AudioContext,
      track: TrackName,
      freq: number,
      time: number,
      duration: number,
      gain: number,
      pan = 0,
      detune = 0,
    ) => {
      const trackGain = trackGainsRef.current[track];
      if (!trackGain) return;

      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const amp = ctx.createGain();
      const tone = ctx.createBiquadFilter();
      const panner = ctx.createStereoPanner();

      oscA.type = "triangle";
      oscB.type = "sine";

      oscA.frequency.setValueAtTime(freq, time);
      oscB.frequency.setValueAtTime(freq * 2, time);

      oscA.detune.setValueAtTime(detune, time);
      oscB.detune.setValueAtTime(detune - 4, time);

      tone.type = "lowpass";
      tone.frequency.setValueAtTime(1100, time);
      tone.frequency.exponentialRampToValueAtTime(480, time + duration * 0.68);
      tone.Q.value = 0.58;

      amp.gain.setValueAtTime(0.0001, time);
      amp.gain.linearRampToValueAtTime(gain, time + 0.024);
      amp.gain.exponentialRampToValueAtTime(
        gain * 0.38,
        time + duration * 0.25,
      );
      amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      panner.pan.setValueAtTime(pan, time);

      oscA.connect(amp);
      oscB.connect(amp);
      amp.connect(tone);
      tone.connect(panner);
      panner.connect(trackGain);

      oscA.start(time);
      oscB.start(time);
      oscA.stop(time + duration + 0.05);
      oscB.stop(time + duration + 0.05);
    },
    [],
  );

  const playCrackle = useCallback(
    (ctx: AudioContext, time: number) => {
      const duration = 0.008 + Math.random() * 0.024;
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let reg = 0x7fff;

      for (let i = 0; i < bufferSize; i++) {
        const bit = (reg ^ (reg >> 1)) & 1;
        reg = (reg >> 1) | (bit << 14);

        const noise = reg & 1 ? 1 : -1;
        const fade = Math.pow(1 - i / bufferSize, 6);

        data[i] = noise * fade;
      }

      const source = ctx.createBufferSource();
      const amp = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "highpass";
      filter.frequency.value = 1400 + Math.random() * 3200;

      amp.gain.setValueAtTime(0.0001, time);
      amp.gain.linearRampToValueAtTime(
        0.004 + Math.random() * 0.008 + soundState.ditherCount * 0.002,
        time + 0.002,
      );
      amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      source.buffer = buffer;
      source.connect(filter);
      filter.connect(amp);
      amp.connect(ctx.destination);

      source.start(time);
    },
    [soundState.ditherCount],
  );

  const createAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    const ctx = new AudioContextClass();

    const master = ctx.createGain();
    master.gain.value = 0.0001;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = soundState.filter;
    filter.Q.value = 0.75 + soundState.contourCount * 0.18;

    const delay = ctx.createDelay(2);
    delay.delayTime.value = soundState.delay;

    const feedback = ctx.createGain();
    feedback.gain.value = soundState.feedback;

    const chords = ctx.createGain();
    const bass = ctx.createGain();
    const melody = ctx.createGain();
    const sparkle = ctx.createGain();

    chords.gain.value = 0.0001;
    bass.gain.value = 0.0001;
    melody.gain.value = 0.0001;
    sparkle.gain.value = 0.0001;

    chords.connect(master);
    bass.connect(master);
    melody.connect(master);
    sparkle.connect(master);

    master.connect(filter);
    filter.connect(ctx.destination);

    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(ctx.destination);

    audioRef.current = ctx;
    masterRef.current = master;
    delayRef.current = delay;
    feedbackRef.current = feedback;
    filterRef.current = filter;
    trackGainsRef.current = { chords, bass, melody, sparkle };

    return ctx;
  }, [
    soundState.contourCount,
    soundState.delay,
    soundState.feedback,
    soundState.filter,
  ]);

  const playFloatingArp = useCallback(
    (ctx: AudioContext, root: number, chord: number[], time: number) => {
      const pattern = [...chord, ...JAZZ_TENSIONS].slice(0, 6);
      const stepTime = 0.13 + soundState.random() * 0.08;

      pattern.forEach((degree, index) => {
        playPianoTone(
          ctx,
          "sparkle",
          midiToFreq(root + degree + 24),
          time + index * stepTime,
          1.2 + index * 0.18,
          0.012,
          -0.7 + index * 0.28,
          -10 + soundState.random() * 20,
        );
      });
    },
    [playPianoTone, soundState],
  );

  const scheduleCrackles = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || !playingRef.current) return;

    const chance = 0.9 - soundState.ditherCount * 0.08;

    if (soundState.random() > chance) {
      playCrackle(ctx, ctx.currentTime + soundState.random() * 0.2);
    }

    const next = 2800 - soundState.ditherCount * 420 + soundState.random() * 7600;

    crackleTimerRef.current = window.setTimeout(() => {
      scheduleCracklesRef.current();
    }, next);
  }, [playCrackle, soundState]);

useEffect(() => {
  scheduleCracklesRef.current = scheduleCrackles;
}, [scheduleCrackles]);

  const schedule = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || !playingRef.current) return;

    while (nextTimeRef.current < ctx.currentTime + 1.25) {
      const step = stepRef.current;
      const chord = soundState.chord;
      const harmonicPhase = Math.floor(step / 64);

      const rootShift =
        harmonicPhase % 4 === 0
          ? 0
          : harmonicPhase % 4 === 1
            ? -5
            : harmonicPhase % 4 === 2
              ? -3
              : 2;

      const root = soundState.root + rootShift;

      if (step % 24 === 0) {
        const nextState = pickWeightedState(
          soundState.random,
          soundState.stateWeights,
        );
        currentStateRef.current = nextState;
        fadeTracks(nextState, nextTimeRef.current);
      }

      const tracks = currentStateRef.current;

      if (tracks.chords && step % 8 === 0) {
        chord.forEach((degree, index) => {
          playPianoTone(
            ctx,
            "chords",
            midiToFreq(root + degree),
            nextTimeRef.current + index * 0.04,
            3.8 + soundState.random() * 2.4,
            0.024 + soundState.blobCount * 0.002,
            -0.42 + index * 0.2,
            -9 + soundState.random() * 18,
          );
        });
      }

      if (tracks.bass && step % 16 === 0) {
        playPianoTone(
          ctx,
          "bass",
          midiToFreq(root - 24),
          nextTimeRef.current,
          2.7,
          0.075,
          -0.1,
        );

        if (soundState.random() > 0.38) {
          playPianoTone(
            ctx,
            "bass",
            midiToFreq(root + 7 - 24),
            nextTimeRef.current + soundState.tempo * 0.75,
            1.9,
            0.05,
            0.08,
          );
        }
      }

      const melodyChance = clamp(
        0.26 - soundState.satelliteCount * 0.025,
        0.08,
        0.28,
      );

      if (
        tracks.melody &&
        step % 4 === 0 &&
        soundState.random() > melodyChance
      ) {
        const melodyPool = [...chord, ...JAZZ_TENSIONS];
        const degree = pick(melodyPool, soundState.random);

        playPianoTone(
          ctx,
          "melody",
          midiToFreq(root + degree + 12),
          nextTimeRef.current + soundState.random() * 0.14,
          1.6 + soundState.random() * 1.7,
          0.032,
          -0.65 + soundState.random() * 1.3,
          -5 + soundState.random() * 10,
        );
      }

      const sparkleChance = clamp(
        0.44 - soundState.satelliteCount * 0.03,
        0.16,
        0.44,
      );

      if (
        tracks.sparkle &&
        step % 7 === 0 &&
        soundState.random() > sparkleChance
      ) {
        const extension = pick(JAZZ_TENSIONS, soundState.random);

        playPianoTone(
          ctx,
          "sparkle",
          midiToFreq(root + extension + 24),
          nextTimeRef.current + 0.05 + soundState.random() * 0.16,
          1.4 + soundState.random() * 2.2,
          0.017,
          Math.cos(step * 0.45),
          -12 + soundState.random() * 24,
        );
      }

      if (
        tracks.sparkle &&
        soundState.satelliteCount >= 3 &&
        step % 32 === 0 &&
        soundState.random() > 0.72
      ) {
        playFloatingArp(ctx, root, chord, nextTimeRef.current + 0.12);
      }

      nextTimeRef.current += soundState.tempo * soundState.driftRate;
      stepRef.current += 1;
    }

    timerRef.current = window.setTimeout(() => {
      scheduleRef.current();
    }, 110);
  }, [fadeTracks, playFloatingArp, playPianoTone, soundState]);

useEffect(() => {
  scheduleRef.current = schedule;
}, [schedule]);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (crackleTimerRef.current) {
      window.clearTimeout(crackleTimerRef.current);
      crackleTimerRef.current = null;
    }

    const ctx = audioRef.current;
    if (!ctx) return;

    masterRef.current?.gain.cancelScheduledValues(ctx.currentTime);
    masterRef.current?.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);

    (Object.keys(trackGainsRef.current) as TrackName[]).forEach((name) => {
      const node = trackGainsRef.current[name];
      if (!node) return;

      node.gain.cancelScheduledValues(ctx.currentTime);
      node.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
    });
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const ctx = audioRef.current;
    const master = masterRef.current;

    if (!ctx || !master || !playingRef.current) return;

    master.gain.setTargetAtTime(
      getScaleVolume(visualScale),
      ctx.currentTime,
      0.16,
    );
  }, [visualScale]);

  const toggle = useCallback(async () => {
    if (playingRef.current) {
      stop();
      return;
    }

    const ctx = createAudio();

    if (ctx.state === "suspended") await ctx.resume();

    filterRef.current?.frequency.setTargetAtTime(
      soundState.filter,
      ctx.currentTime,
      0.25,
    );
    delayRef.current?.delayTime.setTargetAtTime(
      soundState.delay,
      ctx.currentTime,
      0.25,
    );
    feedbackRef.current?.gain.setTargetAtTime(
      soundState.feedback,
      ctx.currentTime,
      0.25,
    );

    stepRef.current = 0;
    nextTimeRef.current = ctx.currentTime + 0.08;
    currentStateRef.current = DREAM_STATES[4];

    playingRef.current = true;
    setPlaying(true);

    masterRef.current?.gain.setTargetAtTime(
      getScaleVolume(visualScale),
      ctx.currentTime,
      0.08,
    );

    fadeTracks(currentStateRef.current, ctx.currentTime);
    scheduleRef.current();
    scheduleCracklesRef.current();
  }, [
    createAudio,
    fadeTracks,
    soundState.delay,
    soundState.feedback,
    soundState.filter,
    stop,
    visualScale,
  ]);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        toggle();
      }}
      aria-label={playing ? "Pause dream sound" : "Play dream sound"}
      className="inline-flex h-9 w-9 items-center justify-center opacity-60 transition hover:opacity-100"
      style={{ color: foregroundColor }}
    >
      {playing ? <Volume2 size={22} /> : <VolumeX size={22} />}
    </button>
  );
}