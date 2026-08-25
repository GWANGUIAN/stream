"use client";

import { Balloon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { colorForNickname } from "@stream/ui";
import type { DonationSubmissionEntry, WakmenuPhase } from "@stream/wakmenu";
import { eulOrReul } from "@/lib/korean";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/wakmenu";
const DISPLAY_MS = 3200;
// 파일이 늘어나면(예: donation-7.mp3) 이 숫자만 올리면 자동으로 순환 목록에 포함된다.
const DONATION_SFX_COUNT = 6;
const BIG_DONATION_SFX_COUNT = 1;
const BIG_DONATION_MIN_BALLOONS = 500;

/** `${prefix}-1.mp3`부터 `${prefix}-${count}.mp3`까지 순서대로 돌아가며 재생하는 재생기를 만든다. */
function useSequentialSfx(prefix: string, count: number) {
  const audiosRef = useRef<HTMLAudioElement[] | null>(null);
  const indexRef = useRef(0);
  return () => {
    if (!audiosRef.current) {
      audiosRef.current = Array.from({ length: count }, (_, i) => {
        const audio = new Audio(`${BASE}/${prefix}-${i + 1}.mp3`);
        audio.preload = "auto";
        return audio;
      });
    }
    const audios = audiosRef.current;
    const audio = audios[indexRef.current % audios.length];
    indexRef.current += 1;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  };
}

export function DonationSubmissionBanner({
  entries,
  phase,
}: {
  entries: DonationSubmissionEntry[];
  phase: WakmenuPhase;
}) {
  const [current, setCurrent] = useState<DonationSubmissionEntry | null>(null);
  const queueRef = useRef<DonationSubmissionEntry[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number | undefined>(undefined);
  const playDonationSfx = useSequentialSfx("donation", DONATION_SFX_COUNT);
  const playBigDonationSfx = useSequentialSfx(
    "big-donation",
    BIG_DONATION_SFX_COUNT,
  );

  const advance = () => {
    const next = queueRef.current.shift();
    setCurrent(next ?? null);
    if (next) {
      if (next.amount >= BIG_DONATION_MIN_BALLOONS) playBigDonationSfx();
      else playDonationSfx();
    }
    timeoutRef.current = next
      ? window.setTimeout(advance, DISPLAY_MS)
      : undefined;
  };

  useEffect(() => {
    let hasNew = false;
    for (const entry of entries) {
      if (!seenIdsRef.current.has(entry.id)) {
        seenIdsRef.current.add(entry.id);
        queueRef.current.push(entry);
        hasNew = true;
      }
    }
    if (hasNew && timeoutRef.current == null) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  useEffect(() => {
    if (phase === "running") return;
    queueRef.current = [];
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    setCurrent(null);
  }, [phase]);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  if (!current) return null;

  return (
    <div className="donation-banner" key={current.id} aria-live="polite">
      <span className="donation-banner-badge">
        <Balloon size={24} />
      </span>
      <p>
        <b style={{ color: colorForNickname(current.nickname) }}>
          {current.nickname}
        </b>
        <span>님이 별풍선 </span>
        <strong>{current.amount.toLocaleString("ko-KR")}</strong>
        <span>개로 </span>
        {current.imageUrl && (
          <img
            className="donation-banner-thumb"
            src={current.imageUrl}
            alt=""
          />
        )}
        <strong>{current.submittedText}</strong>
        <span>{eulOrReul(current.submittedText)} 제출했습니다.</span>
      </p>
    </div>
  );
}
