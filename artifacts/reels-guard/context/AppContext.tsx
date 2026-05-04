import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

const STORAGE_KEY = "reelsguard_state_v2";
const BACKGROUND_START_KEY = "reelsguard_bg_start";

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
  quizBankIndex: number;
  isBlocked: boolean;
  remainingSeconds: number;
  progressPercent: number;
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

  const usedSecondsRef = useRef(0);
  const timeLimitMinutesRef = useRef(30);
  const isOnboardedRef = useRef(false);
  const lastResetDateRef = useRef(todayString());
  const quizBankIndexRef = useRef(0);

  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTickingRef = useRef(false);

  useEffect(() => { usedSecondsRef.current = usedSeconds; }, [usedSeconds]);
  useEffect(() => { timeLimitMinutesRef.current = timeLimitMinutes; }, [timeLimitMinutes]);
  useEffect(() => { isOnboardedRef.current = isOnboarded; }, [isOnboarded]);
  useEffect(() => { lastResetDateRef.current = lastResetDate; }, [lastResetDate]);
  useEffect(() => { quizBankIndexRef.current = quizBankIndex; }, [quizBankIndex]);

  const persistState = useCallback(async (override?: Partial<StoredState>) => {
    const state: StoredState = {
      isOnboarded: isOnboardedRef.current,
      timeLimitMinutes: timeLimitMinutesRef.current,
      usedSeconds: usedSecondsRef.current,
      lastResetDate: lastResetDateRef.current,
      quizBankIndex: quizBankIndexRef.current,
      ...override,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  const beginTick = useCallback(() => {
    if (isTickingRef.current) return;
    isTickingRef.current = true;
    tickIntervalRef.current = setInterval(() => {
      setUsedSeconds((prev) => {
        const next = prev + 1;
        usedSecondsRef.current = next;
        return next;
      });
    }, 1000);
  }, []);

  const endTick = useCallback(async () => {
    if (!isTickingRef.current) return;
    isTickingRef.current = false;
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    await persistState();
    await AsyncStorage.removeItem(BACKGROUND_START_KEY);
  }, [persistState]);

  // App went to background → start counting automatically
  const handleGoBackground = useCallback(async () => {
    if (!isOnboardedRef.current) return;
    const isBlocked = usedSecondsRef.current >= timeLimitMinutesRef.current * 60;
    if (isBlocked) return;
    await AsyncStorage.setItem(BACKGROUND_START_KEY, String(Date.now()));
    beginTick();
  }, [beginTick]);

  // App came to foreground → stop counting automatically
  const handleComeForeground = useCallback(async () => {
    await endTick();
    // Recover missed seconds if the app was killed while in background
    try {
      const bgStartStr = await AsyncStorage.getItem(BACKGROUND_START_KEY);
      if (bgStartStr) {
        const elapsed = Math.floor((Date.now() - Number(bgStartStr)) / 1000);
        if (elapsed > 0) {
          setUsedSeconds((prev) => {
            const next = prev + elapsed;
            usedSecondsRef.current = next;
            return next;
          });
        }
        await AsyncStorage.removeItem(BACKGROUND_START_KEY);
        await persistState();
      }
    } catch {
      // ignore
    }
  }, [endTick, persistState]);

  // Initial load
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

        // Recover background time if app was killed while away
        const bgStartStr = await AsyncStorage.getItem(BACKGROUND_START_KEY);
        if (bgStartStr) {
          const elapsed = Math.floor((Date.now() - Number(bgStartStr)) / 1000);
          if (elapsed > 0) {
            saved.usedSeconds = Math.min(
              saved.usedSeconds + elapsed,
              saved.timeLimitMinutes * 60
            );
          }
          await AsyncStorage.removeItem(BACKGROUND_START_KEY);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        }

        setIsOnboarded(saved.isOnboarded);
        setTimeLimitMinutesState(saved.timeLimitMinutes);
        setUsedSeconds(saved.usedSeconds);
        setLastResetDate(saved.lastResetDate);
        setQuizBankIndex(saved.quizBankIndex);

        usedSecondsRef.current = saved.usedSeconds;
        timeLimitMinutesRef.current = saved.timeLimitMinutes;
        isOnboardedRef.current = saved.isOnboarded;
        lastResetDateRef.current = saved.lastResetDate;
        quizBankIndexRef.current = saved.quizBankIndex;
      } catch {
        // use defaults
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // AppState listener — fully automatic, no manual trigger needed
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        handleGoBackground();
      } else if (next === "active") {
        handleComeForeground();
      }
    });
    return () => {
      sub.remove();
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [handleGoBackground, handleComeForeground]);

  // Auto-persist every 15 seconds
  useEffect(() => {
    const t = setInterval(() => persistState(), 15000);
    return () => clearInterval(t);
  }, [persistState]);

  const timeLimitSeconds = timeLimitMinutes * 60;
  const remainingSeconds = Math.max(0, timeLimitSeconds - usedSeconds);
  const isBlocked = usedSeconds >= timeLimitSeconds;
  const progressPercent = Math.min(1, usedSeconds / timeLimitSeconds);

  const setTimeLimitMinutes = useCallback(async (minutes: number) => {
    setTimeLimitMinutesState(minutes);
    timeLimitMinutesRef.current = minutes;
    await persistState({ timeLimitMinutes: minutes });
  }, [persistState]);

  const completeOnboarding = useCallback(async (minutes: number) => {
    const today = todayString();
    const state: StoredState = {
      isOnboarded: true,
      timeLimitMinutes: minutes,
      usedSeconds: 0,
      lastResetDate: today,
      quizBankIndex: 0,
    };
    setIsOnboarded(true);
    setTimeLimitMinutesState(minutes);
    setUsedSeconds(0);
    setLastResetDate(today);
    setQuizBankIndex(0);
    isOnboardedRef.current = true;
    timeLimitMinutesRef.current = minutes;
    usedSecondsRef.current = 0;
    lastResetDateRef.current = today;
    quizBankIndexRef.current = 0;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  const advanceQuizBank = useCallback(async () => {
    const next = (quizBankIndexRef.current + 1) % 3;
    setQuizBankIndex(next);
    quizBankIndexRef.current = next;
    await persistState({ quizBankIndex: next });
  }, [persistState]);

  const resetAllData = useCallback(async () => {
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    isTickingRef.current = false;
    await AsyncStorage.multiRemove([STORAGE_KEY, BACKGROUND_START_KEY]);
    const today = todayString();
    setIsOnboarded(false);
    setTimeLimitMinutesState(30);
    setUsedSeconds(0);
    setLastResetDate(today);
    setQuizBankIndex(0);
    isOnboardedRef.current = false;
    timeLimitMinutesRef.current = 30;
    usedSecondsRef.current = 0;
    lastResetDateRef.current = today;
    quizBankIndexRef.current = 0;
  }, []);

  return (
    <AppContext.Provider
      value={{
        isOnboarded,
        timeLimitMinutes,
        usedSeconds,
        quizBankIndex,
        isBlocked,
        remainingSeconds,
        progressPercent,
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
