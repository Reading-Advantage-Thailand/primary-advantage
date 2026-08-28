"use client";

import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getAudioUrl } from "@/lib/storage-config";
import type { Article } from "@/types";

type SourceFlashcardRow = {
  words?: unknown;
  wordsUrl?: string | null;
};

type TutorFlashcardWord = {
  word: string;
  definition: Record<string, string>;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getDefinition(raw: Record<string, unknown>) {
  const definition = asRecord(raw.definition);
  if (definition) {
    return Object.fromEntries(
      Object.entries(definition).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
  }

  const translation = asRecord(raw.translation);
  if (translation) {
    return Object.fromEntries(
      Object.entries(translation).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
  }

  const translatedText = asString(raw.translation) || asString(raw.meaning);
  return translatedText ? { en: translatedText } : {};
}

function getArticleWords(article: Article | null | undefined): TutorFlashcardWord[] {
  const row = article?.sentencsAndWordsForFlashcard?.[0] as unknown as
    | SourceFlashcardRow
    | undefined;
  const sourceWords = Array.isArray(row?.words)
    ? row.words.map(asRecord).filter((word): word is Record<string, unknown> => Boolean(word))
    : [];

  return sourceWords
    .map((raw, index): TutorFlashcardWord | null => {
      const word = asString(raw.vocabulary) || asString(raw.word) || asString(raw.text);
      if (!word) return null;

      const startTime = asNumber(raw.startTime) ?? asNumber(raw.timeSeconds);
      const nextWord = sourceWords[index + 1];
      const nextStartTime = nextWord
        ? asNumber(nextWord.startTime) ?? asNumber(nextWord.timeSeconds)
        : undefined;
      const endTime =
        asNumber(raw.endTime) ??
        (startTime !== undefined
          ? nextStartTime ?? startTime + 10
          : undefined);

      return {
        word,
        definition: getDefinition(raw),
        audioUrl:
          asString(raw.audioUrl) ||
          asString(raw.audio_url) ||
          row?.wordsUrl ||
          undefined,
        startTime,
        endTime,
      };
    })
    // Keep every curated vocabulary item from the article. The lesson should
    // not silently drop words just because the Tutor preview used a 12-card cap.
    .filter((word): word is TutorFlashcardWord => word !== null);
}

function getMeaning(word: TutorFlashcardWord, locale: string) {
  const language = locale.split("-")[0];
  return (
    word.definition[language] ||
    word.definition.th ||
    word.definition.en ||
    Object.values(word.definition)[0] ||
    "ยังไม่มีคำแปล"
  );
}

function getPlayableAudioUrl(audioUrl: string) {
  return /^https?:\/\//i.test(audioUrl) ? audioUrl : getAudioUrl(audioUrl);
}

function FlashcardAudioButton({
  audioUrl,
  startTime,
  endTime,
  label,
}: {
  audioUrl: string;
  startTime?: number;
  endTime?: number;
  label: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const segmentStart = startTime ?? 0;

  const stop = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      stop();
      return;
    }

    audio.currentTime = segmentStart;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (endTime !== undefined && endTime > segmentStart) {
      const audio = audioRef.current;
      if (audio && audio.currentTime >= endTime) stop();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg backdrop-blur transition hover:bg-white/25 active:scale-90"
      aria-label={label}
      title={label}
    >
      <audio
        ref={audioRef}
        src={getPlayableAudioUrl(audioUrl)}
        preload="metadata"
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
      />
      <Volume2 size={20} className={isPlaying ? "animate-pulse text-amber-300" : ""} />
    </button>
  );
}

/**
 * Primary-adapted version of Tutor Advantage's FlashcardTeachingGame.
 * It keeps the Tutor flip-card interaction while reading the article's
 * curated flashcard words from Primary Advantage's existing article payload.
 */
export default function TutorFlashcardTeachingGame({
  article,
}: {
  article: Article | null | undefined;
}) {
  const t = useTranslations("Lesson.VocabularyFlashcards");
  const locale = useLocale();
  const cards = useMemo(() => getArticleWords(article), [article]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = cards[index];

  if (!current) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-amber-400/30 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-10 text-center text-white shadow-2xl">
        <div>
          <BookOpen className="mx-auto mb-4 size-14 text-amber-300" />
          <h2 className="text-2xl font-black">{t("empty.title")}</h2>
          <p className="mt-2 text-white/60">{t("empty.description")}</p>
        </div>
      </div>
    );
  }

  const progress = ((index + 1) / cards.length) * 100;

  return (
    <div className="flex min-h-0 flex-col gap-7 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-4 text-white shadow-2xl sm:p-6 lg:p-8">
      <section className="flex w-full flex-col items-center justify-center">
        <div className="mb-5 flex w-full max-w-2xl items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">
              Phase 2 · Vocabulary Flashcards
            </p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              {t("playing.header")}
            </h2>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-right backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Card
            </p>
            <p className="text-xl font-black">
              {t("playing.cardOf", { current: index + 1, total: cards.length })}
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-2xl">
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            className="group relative min-h-[320px] w-full overflow-hidden rounded-[32px] border border-amber-300/30 bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 p-1 text-left shadow-[0_22px_70px_rgba(245,158,11,0.25)] transition-transform hover:scale-[1.01]"
            aria-label="พลิกการ์ดคำศัพท์"
          >
            <div className="flex h-full min-h-[312px] flex-col items-center justify-center rounded-[28px] bg-slate-950/85 px-8 text-center backdrop-blur-xl">
              <div className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-amber-300/15 text-amber-300 shadow-inner">
                {flipped ? <Sparkles size={30} /> : <BookOpen size={30} />}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/45">
                {flipped ? "Meaning" : "Vocabulary"}
              </p>
              <p
                className={`mt-4 font-black leading-tight ${
                  flipped
                    ? "text-3xl text-amber-200 sm:text-4xl"
                    : "text-5xl text-white sm:text-6xl"
                }`}
              >
                {flipped ? getMeaning(current, locale) : current.word}
              </p>
              <p className="mt-7 text-xs font-bold text-white/45">
                คลิกเพื่อ {flipped ? "กลับไปดูคำศัพท์" : "เปิดดูความหมาย"}
              </p>
            </div>
          </button>

          {current.audioUrl && (
            <div className="absolute right-5 top-5">
              <FlashcardAudioButton
                audioUrl={current.audioUrl}
                startTime={current.startTime}
                endTime={current.endTime}
                label={`ฟังการออกเสียง ${current.word}`}
              />
            </div>
          )}
        </div>

        <div className="mt-5 w-full max-w-2xl">
          <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
            <span>{t("playing.progress")}</span>
            <span>{t("playing.percentComplete", { percent: Math.round(progress) })}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex w-full max-w-2xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setIndex((value) => Math.max(0, value - 1));
              setFlipped(false);
            }}
            disabled={index === 0}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black transition hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft size={18} /> ก่อนหน้า
          </button>
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-300 px-6 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-200"
          >
            <RotateCcw size={17} /> {flipped ? "ดูคำศัพท์" : "เปิดเฉลย"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIndex((value) => Math.min(cards.length - 1, value + 1));
              setFlipped(false);
            }}
            disabled={index === cards.length - 1}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black transition hover:bg-white/20 disabled:opacity-30"
          >
            ถัดไป <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <aside className="w-full rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-300">
              <Trophy className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black">Flashcard mission</h3>
                <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                  Ready
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
                ทบทวนคำศัพท์สำคัญจากบทความทีละใบ แล้วเปิดดูความหมายเพื่อเช็กความเข้าใจ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 lg:min-w-44">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/45">
                Current card
              </p>
              <p className="text-2xl font-black text-amber-200">
                {index + 1}<span className="text-sm text-white/45">/{cards.length}</span>
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/45">
                In lesson
              </p>
              <p className="text-sm font-bold text-white/75">{cards.length} cards</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/45">
              <span>Mission progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              เลือกการ์ดจากรายการด้านข้างเพื่อข้ามไปทบทวนคำศัพท์ได้ทันที
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black text-white/80">Cards in this lesson</p>
              <p className="text-[10px] font-bold text-white/40">เลือกการ์ดเพื่อเปิดดู</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {cards.map((card, cardIndex) => (
                <button
                  type="button"
                  key={`${card.word}-${cardIndex}`}
                  onClick={() => {
                    setIndex(cardIndex);
                    setFlipped(false);
                  }}
                  className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                    cardIndex === index
                      ? "border-amber-300/40 bg-amber-300/15 shadow-[0_8px_24px_rgba(245,158,11,0.12)]"
                      : "border-white/10 bg-black/10 hover:bg-white/10"
                  }`}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-black">
                    {cardIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-[11px] leading-tight font-bold text-white/75">
                    {card.word}
                  </span>
                  {cardIndex < index && <span className="text-sm text-emerald-300">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
