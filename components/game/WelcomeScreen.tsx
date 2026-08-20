"use client";

import { Button } from "@/components/ui/button";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Anyone, but Me</h1>
      <p className="text-muted-foreground">간단한 내기의 당첨자를 정하는 미니게임</p>
      <Button size="lg" onClick={onStart}>
        시작하기
      </Button>
    </div>
  );
}
