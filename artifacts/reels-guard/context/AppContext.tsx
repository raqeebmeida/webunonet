import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "reelsguard_state";

interface StoredState {
  isOnboarded: boolean;
  timeLimitMinutes: number;
  usedSeconds: number;
  lastResetDate: string;
  quizBankIndex: number;
}

interface AppContextType {
  isOnboarded: boolean;
  timeLimitMinutes: number;
  usedSeconds: number;
  isSessionActive: boolean;
  quizBankIndex: number;
  isBlocked: boolean;
  remainingSeconds: number;
  progressPercent: number;
  startSession: () => void;
  endSession: () => void;
  setTimeLimitMinutes: (minutes: number) => Promise<void>;
  completeOnboarding: (minutes: number) => Promise<void>;
  advanceQuizBank: () => Promise<void>;
  resetAllData: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

function todayString(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

const DEFAULT_STATE: StoredState = {
  isOnboarded: false,
  timeLimitMinutes: 30,
  usedSeconds: 0,
  lastResetDate: todayString(),
  quizBankIndex: 0,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutesState] = useState(30);
  const [usedSeconds, setUsedSeconds] = useState(0);
  const [lastResetDate, setLastResetDate] = useState(todayString());
  const [quizBankIndex, setQuizBankIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionStartRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveState = useCallback(
    async (partial: Partial<StoredState>) => {
      const current: StoredState = {
        isOnboarded,
        timeLimitMinutes,
        usedSeconds,
        lastResetDate,
        quizBankIndex,
        ...partial,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    },
    [isOnboarded, timeLimitMinutes, usedSeconds, lastResetDate, quizBankIndex]
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved: StoredState = raw
          ? { ...DEFAULT_STATE, ...JSON.parse(raw) }
          : DEFAULT_STATE;

        const today = todayString();
        if (saved.lastResetDate !== today) {
          saved.usedSeconds = 0;
          saved.lastResetDate = today;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        }

        setIsOnboarded(saved.isOnboarded);
        setTimeLimitMinutesState(saved.timeLimitMinutes);
        setUsedSeconds(saved.usedSeconds);
        setLastResetDate(saved.lastResetDate);
        setQuizBankIndex(saved.quizBankIndex);
      } catch {
        // use defaults
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const timeLimitSeconds = timeLimitMinutes * 60;
  const remainingSeconds = Math.max(0, timeLimitSeconds - usedSeconds);
  const isBlocked = usedSeconds >= timeLimitSeconds;
  const progressPercent = Math.min(1, usedSeconds / timeLimitSeconds);

  const startSession = useCallback(() => {
    if (isSessionActive || isBlocked) return;
    sessionStartRef.current = Date.now();
    setIsSessionActive(true);
    intervalRef.current = setInterval(() => {
      setUsedSeconds((prev) => {
        const elapsed = sessionStartRef.current
          ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
          : 0;
        return prev + 1;
      });
    }, 1000);
  }, [isSessionActive, isBlocked]);

  const endSession = useCallback(async () => {
    if (!isSessionActive) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const elapsed = sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : 0;
    sessionStartRef.current = null;
    setIsSessionActive(false);
    setUsedSeconds((prev) => {
      const next = prev + elapsed;
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isOnboarded,
          timeLimitMinutes,
          usedSeconds: next,
          lastResetDate,
          quizBankIndex,
        } as StoredState)
      );
      return next;
    });
  }, [isSessionActive, isOnboarded, timeLimitMinutes, lastResetDate, quizBankIndex]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setTimeLimitMinutes = useCallback(
    async (minutes: number) => {
      setTimeLimitMinutesState(minutes);
      await saveState({ timeLimitMinutes: minutes });
    },
    [saveState]
  );

  const completeOnboarding = useCallback(
    async (minutes: number) => {
      setIsOnboarded(true);
      setTimeLimitMinutesState(minutes);
      const today = todayString();
      setLastResetDate(today);
      const state: StoredState = {
        isOnboarded: true,
        timeLimitMinutes: minutes,
        usedSeconds: 0,
        lastResetDate: today,
        quizBankIndex: 0,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    []
  );

  const advanceQuizBank = useCallback(async () => {
    const next = (quizBankIndex + 1) % 3;
    setQuizBankIndex(next);
    await saveState({ quizBankIndex: next });
  }, [quizBankIndex, saveState]);

  const resetAllData = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setIsOnboarded(false);
    setTimeLimitMinutesState(30);
    setUsedSeconds(0);
    setLastResetDate(todayString());
    setQuizBankIndex(0);
    setIsSessionActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return (
    <AppContext.Provider
      value={{
        isOnboarded,
        timeLimitMinutes,
        usedSeconds,
        isSessionActive,
        quizBankIndex,
        isBlocked,
        remainingSeconds,
        progressPercent,
        startSession,
        endSession,
        setTimeLimitMinutes,
        completeOnboarding,
        advanceQuizBank,
        resetAllData,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
