"use client";

import { useState } from "react";
import {
  DEFAULT_PARTICIPANT_COUNT,
  DEFAULT_WINNERS_COUNT,
  defaultParticipants,
  type Participant,
} from "@/lib/game/setup";
import { ArenaView } from "./ArenaView";
import { ResultsScreen } from "./ResultsScreen";
import { SetupScreen } from "./SetupScreen";
import { useMatchSession } from "./useMatchSession";
import { WelcomeScreen } from "./WelcomeScreen";

type Screen = "welcome" | "setup" | "match";

export function Game() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [participants, setParticipants] = useState<Participant[]>(() =>
    defaultParticipants(DEFAULT_PARTICIPANT_COUNT)
  );
  const [winnersCount, setWinnersCount] = useState(DEFAULT_WINNERS_COUNT);
  const match = useMatchSession();

  if (screen === "welcome") {
    return <WelcomeScreen onStart={() => setScreen("setup")} />;
  }

  if (screen === "setup") {
    return (
      <SetupScreen
        participants={participants}
        winnersCount={winnersCount}
        onChangeParticipants={setParticipants}
        onChangeWinnersCount={setWinnersCount}
        onSubmit={() => {
          match.start(participants, winnersCount);
          setScreen("match");
        }}
      />
    );
  }

  const session = match.state;
  if (!session) return null;

  if (session.finished) {
    return (
      <ResultsScreen
        participants={session.participants}
        eliminatedOrder={session.eliminatedOrder}
        onReplay={() => match.start(session.participants, session.winnersCount)}
        onNewGame={() => {
          match.reset();
          setParticipants(defaultParticipants(DEFAULT_PARTICIPANT_COUNT));
          setWinnersCount(DEFAULT_WINNERS_COUNT);
          setScreen("setup");
        }}
      />
    );
  }

  return (
    <ArenaView
      participants={session.participants}
      remaining={session.remaining}
      round={session.round}
      onRoundComplete={match.completeRound}
    />
  );
}
