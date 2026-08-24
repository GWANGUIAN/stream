"use client";

import type { MenuAnswer } from "@stream/wakmenu";
import { useEffect, useRef, useState } from "react";
import type { WakmenuStore } from "@/lib/store";

const MOCK_NICKNAMES = [
  "왁타버스팬",
  "밥순이",
  "야옹이",
  "고양이집사",
  "라디오스타",
  "우주최강귀요미",
  "지나가던시청자",
  "밥도둑",
  "채팅봇아님",
  "찌개러버",
  "야식러",
  "새벽감성",
];
const WRONG_ANSWERS = [
  "탕수육",
  "짜장면",
  "피자",
  "치킨",
  "ㅋㅋㅋㅋ",
  "몰라요",
  "그냥밥",
  "asdf",
  "정답이뭐야",
  "물",
];

function randomItem<T>(list: T[]): T {
  const item = list[Math.floor(Math.random() * list.length)];
  if (item === undefined) throw new Error("randomItem called with empty list");
  return item;
}

function randomNickname(): string {
  const base = randomItem(MOCK_NICKNAMES);
  return Math.random() < 0.6
    ? `${base}${Math.floor(Math.random() * 9999)}`
    : base;
}

function randomSubmission(answers: MenuAnswer[]): string {
  const wantsCorrect = answers.length > 0 && Math.random() < 0.5;
  if (wantsCorrect) {
    const menu = randomItem(answers);
    const names = [menu.label, ...menu.aliases];
    return randomItem(names);
  }
  return randomItem(WRONG_ANSWERS);
}

const DONATION_AMOUNTS = [50, 100, 150, 300, 500];

export function AutoRehearsalFeed({
  store,
  active,
  answers,
}: {
  store: WakmenuStore;
  active: boolean;
  answers: MenuAnswer[];
}) {
  const [running, setRunning] = useState(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    if (!active || !running) return;
    let timeoutId: number;
    const tick = () => {
      const burstSize = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burstSize; i++) {
        const text = randomSubmission(answersRef.current);
        store.engine.injectRehearsal(`!밥 ${text}`, randomNickname());
      }
      timeoutId = window.setTimeout(tick, 50 + Math.random() * 150);
    };
    tick();
    return () => window.clearTimeout(timeoutId);
  }, [active, running, store]);

  useEffect(() => {
    if (!active) setRunning(false);
  }, [active]);

  if (!active) return null;

  const sendTestDonation = () => {
    const text = randomSubmission(answersRef.current);
    const nickname = randomNickname();
    store.engine.injectRehearsal(`!밥 ${text}`, nickname);
    store.engine.injectRehearsalDonation(nickname, randomItem(DONATION_AMOUNTS));
  };

  return (
    <div className="rehearsal-feed">
      <button type="button" onClick={() => setRunning((value) => !value)}>
        {running ? "모의 채팅 정지" : "모의 채팅 자동 주입 시작"}
      </button>
      <button type="button" onClick={sendTestDonation}>
        테스트 후원 보내기
      </button>
      <small>개발용 · 인기 방송 채팅 속도로 정답/오답을 섞어 전송합니다</small>
    </div>
  );
}
