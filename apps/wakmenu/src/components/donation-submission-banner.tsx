"use client";

import { Gift } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { colorForNickname } from "@stream/ui";
import type { DonationSubmissionEntry, WakmenuPhase } from "@stream/wakmenu";
import { eulOrReul } from "@/lib/korean";

const DISPLAY_MS = 3200;

export function DonationSubmissionBanner({
  entries,
  phase,
}: {
  entries: DonationSubmissionEntry[];
  phase: WakmenuPhase;
}) {
  const [current, setCurrent] = useState<DonationSubmissionEntry | null>(
    null,
  );
  const queueRef = useRef<DonationSubmissionEntry[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number | undefined>(undefined);

  const advance = () => {
    const next = queueRef.current.shift();
    setCurrent(next ?? null);
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
        <Gift size={24} />
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
