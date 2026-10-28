"use client";

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { getVisibleEvents, type Scenario } from "@/lib/mock-vault";
import type { RemoteCommand, SecurityEvent } from "@/types/vault";

interface MockSession {
  scenario: Scenario;
  setScenario: Dispatch<SetStateAction<Scenario>>;
  commands: RemoteCommand[];
  setCommands: Dispatch<SetStateAction<RemoteCommand[]>>;
  visibleEvents: SecurityEvent[];
}

const MockSessionContext = createContext<MockSession | null>(null);

export function MockSessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [scenario, setScenario] = useState<Scenario>("secured");
  const [commands, setCommands] = useState<RemoteCommand[]>([]);
  const visibleEvents = getVisibleEvents(scenario, commands);
  return (
    <MockSessionContext.Provider value={{ scenario, setScenario, commands, setCommands, visibleEvents }}>
      {children}
    </MockSessionContext.Provider>
  );
}

export function useMockSession(): MockSession {
  const session = useContext(MockSessionContext);
  if (!session) throw new Error("Mock session provider is missing.");
  return session;
}
