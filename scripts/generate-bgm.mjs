import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SAMPLE_RATE = 22_050;
const DURATION_SECONDS = 24;
const FADE_SECONDS = 1.2;
const OUTPUT_DIR = path.resolve(process.cwd(), "public/audio/bgm");
const TEMP_DIR = path.join(OUTPUT_DIR, ".wav");

// The synthesis uses only oscillators and generated noise: no external samples,
// recordings, or copyrighted melodies are included in the shipped tracks.
const TRACKS = [
  { key: "home", root: 174.61, intervals: [0, 4, 7, 11], bpm: 52, pad: 0.22, pluck: 0.08, air: 0.012, seed: 11 },
  { key: "saju", root: 110, intervals: [0, 3, 7, 10], bpm: 44, pad: 0.28, pluck: 0.13, air: 0.008, seed: 17 },
  { key: "astro", root: 220, intervals: [0, 2, 7, 9], bpm: 58, pad: 0.16, pluck: 0.15, air: 0.016, seed: 23 },
  { key: "tarot", root: 146.83, intervals: [0, 3, 6, 10], bpm: 48, pad: 0.26, pluck: 0.12, air: 0.006, seed: 31 },
  { key: "numerology", root: 164.81, intervals: [0, 2, 4, 7, 9], bpm: 66, pad: 0.19, pluck: 0.1, air: 0.009, seed: 37 },
  { key: "psychometrics", root: 196, intervals: [0, 4, 7, 9], bpm: 60, pad: 0.2, pluck: 0.07, air: 0.007, seed: 41 },
  { key: "jungian", root: 155.56, intervals: [0, 3, 7, 11], bpm: 50, pad: 0.23, pluck: 0.1, air: 0.008, seed: 47 },
  { key: "darktriad", root: 103.83, intervals: [0, 1, 6, 8], bpm: 42, pad: 0.3, pluck: 0.09, air: 0.004, seed: 53 },
  { key: "attachment", root: 130.81, intervals: [0, 4, 7, 9], bpm: 46, pad: 0.3, pluck: 0.08, air: 0.01, seed: 59 },
  { key: "eq", root: 174.61, intervals: [0, 4, 7, 12], bpm: 56, pad: 0.24, pluck: 0.11, air: 0.013, seed: 61 },
  { key: "cognitive", root: 207.65, intervals: [0, 2, 5, 9], bpm: 72, pad: 0.16, pluck: 0.08, air: 0.006, seed: 67 },
  { key: "horoscope", root: 246.94, intervals: [0, 4, 7, 11], bpm: 64, pad: 0.17, pluck: 0.16, air: 0.018, seed: 71 },
  { key: "compatibility", root: 138.59, intervals: [0, 4, 7, 14], bpm: 52, pad: 0.27, pluck: 0.1, air: 0.01, seed: 79 },
];

function seededNoise(index, seed) {
  const value = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43_758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function envelope(time) {
  const fadeIn = Math.min(1, time / FADE_SECONDS);
  const fadeOut = Math.min(1, (DURATION_SECONDS - time) / FADE_SECONDS);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function synthesize(config) {
  const frameCount = Math.floor(SAMPLE_RATE * DURATION_SECONDS);
  const samples = new Float32Array(frameCount);
  const beatLength = 60 / config.bpm;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const beat = time / beatLength;
    const beatIndex = Math.floor(beat);
    const localBeat = beat - beatIndex;
    let value = 0;

    config.intervals.forEach((interval, voice) => {
      const frequency = config.root * 2 ** (interval / 12);
      const drift = Math.sin((2 * Math.PI * time) / (DURATION_SECONDS * (1.7 + voice * 0.23)) + voice) * 0.012;
      value += Math.sin(2 * Math.PI * (frequency + drift) * time) * (config.pad / (1 + voice * 0.35));
      value += Math.sin(2 * Math.PI * frequency * 2 * time) * (config.pad * 0.08 / (1 + voice));
    });

    // A very soft note at each pulse gives every lens a different sense of pace
    // without becoming a drum loop or competing with spoken content.
    const noteInterval = config.intervals[beatIndex % config.intervals.length] ?? 0;
    const noteFrequency = config.root * 2 ** (noteInterval / 12);
    const attack = Math.min(1, localBeat / 0.035);
    const decay = attack * Math.exp(-localBeat * 8.5);
    value += Math.sin(2 * Math.PI * noteFrequency * (time - beatIndex * beatLength)) * config.pluck * decay;
    value += Math.sin(2 * Math.PI * noteFrequency * 1.5 * (time - beatIndex * beatLength)) * config.pluck * 0.16 * decay;

    const lowPulse = Math.sin(2 * Math.PI * config.root * 0.5 * time) * config.pad * 0.12;
    value += lowPulse;
    value += seededNoise(index, config.seed) * config.air;
    samples[index] = value * envelope(time);
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > 0 ? 0.62 / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= gain;
  return samples;
}

function writeWav(filePath, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function encodeMp3(inputPath, outputPath, key) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      String(SAMPLE_RATE),
      "-c:a",
      "libmp3lame",
      "-b:a",
      "80k",
      "-metadata",
      `title=LUMINA ${key} BGM`,
      "-metadata",
      "artist=LUMINA procedural audio",
      outputPath,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed while encoding ${key}.mp3`);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

try {
  for (const config of TRACKS) {
    const wavPath = path.join(TEMP_DIR, `${config.key}.wav`);
    const mp3Path = path.join(OUTPUT_DIR, `${config.key}.mp3`);
    writeWav(wavPath, synthesize(config));
    encodeMp3(wavPath, mp3Path, config.key);
    console.log(`generated ${path.relative(process.cwd(), mp3Path)}`);
  }
} finally {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

