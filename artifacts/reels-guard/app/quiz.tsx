import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { Question, getShuffledBank } from "@/constants/questions";
import { useColors } from "@/hooks/useColors";

const MAX_MISTAKES = 3;
const TOTAL_QUESTIONS = 30;

type QuizPhase = "quiz" | "success" | "failed";

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { quizBankIndex, advanceQuizBank, setTimeLimitMinutes, timeLimitMinutes } = useApp();

  const questions = useMemo(() => getShuffledBank(quizBankIndex), [quizBankIndex]);

  const [phase, setPhase] = useState<QuizPhase>("quiz");
  const [current, setCurrent] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [newLimit, setNewLimit] = useState(timeLimitMinutes);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const question: Question | undefined = questions[current];

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: current / TOTAL_QUESTIONS,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [current]);

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 9,
    }).start();
    return () => cardAnim.setValue(0);
  }, [current]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "quiz") {
        router.back();
        return true;
      }
      return true;
    });
    return () => backHandler.remove();
  }, [phase]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleAnswer = useCallback(
    async (option: string) => {
      if (isAnswered || !question) return;
      setSelectedOption(option);
      setIsAnswered(true);

      const correct = option === question.answer;

      if (correct) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shake();
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);

        if (newMistakes > MAX_MISTAKES) {
          setTimeout(() => {
            setPhase("failed");
          }, 900);
          return;
        }
      }

      setTimeout(() => {
        const nextIndex = current + 1;
        if (nextIndex >= TOTAL_QUESTIONS) {
          setPhase("success");
        } else {
          cardAnim.setValue(0);
          setCurrent(nextIndex);
          setSelectedOption(null);
          setIsAnswered(false);
        }
      }, 700);
    },
    [isAnswered, question, mistakes, current, shake]
  );

  const handleRestart = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrent(0);
    setMistakes(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setPhase("quiz");
    cardAnim.setValue(0);
    progressAnim.setValue(0);
  };

  const handleSuccess = async () => {
    await advanceQuizBank();
    await setTimeLimitMinutes(newLimit);
    router.replace("/");
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const TIME_OPTIONS = [15, 30, 45, 60, 90, 120];

  if (phase === "success") {
    return (
      <View
        style={[
          styles.resultContainer,
          { backgroundColor: colors.background, paddingTop: topPad + 20, paddingBottom: bottomPad + 20 },
        ]}
      >
        <Text style={styles.resultEmoji}>🎉</Text>
        <Text style={[styles.resultTitle, { color: colors.foreground }]}>أحسنت! اجتزت الاختبار</Text>
        <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
          حللت {TOTAL_QUESTIONS} سؤالاً بنجاح بأخطاء لا تتجاوز {MAX_MISTAKES}
        </Text>

        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.resultCardTitle, { color: colors.foreground }]}>
            اختر الحد اليومي الجديد
          </Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((m) => {
              const selected = newLimit === m;
              const label = m >= 60 ? `${m / 60}س` : `${m}د`;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.secondary,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewLimit(m)}
                >
                  <Text style={[styles.timeChipText, { color: selected ? "#fff" : colors.foreground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resultBtn, { backgroundColor: colors.primary }]}
          onPress={handleSuccess}
          activeOpacity={0.85}
        >
          <Text style={styles.resultBtnText}>حفظ وفتح التطبيق ✓</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === "failed") {
    return (
      <View
        style={[
          styles.resultContainer,
          { backgroundColor: colors.background, paddingTop: topPad + 20, paddingBottom: bottomPad + 20 },
        ]}
      >
        <Text style={styles.resultEmoji}>❌</Text>
        <Text style={[styles.resultTitle, { color: colors.foreground }]}>
          تجاوزت {MAX_MISTAKES} أخطاء
        </Text>
        <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
          لم تتجاوز الاختبار. يجب إعادة المحاولة من البداية وحل كل الـ {TOTAL_QUESTIONS} سؤال بأقل من {MAX_MISTAKES + 1} أخطاء.
        </Text>

        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.destructive }]}>{mistakes}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>أخطاء</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{current}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>سؤال أجبت</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{TOTAL_QUESTIONS - current}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>متبقٍ</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resultBtn, { backgroundColor: colors.primary }]}
          onPress={handleRestart}
          activeOpacity={0.85}
        >
          <Text style={styles.resultBtnText}>إعادة المحاولة من البداية</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resultBtnSecondary, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.resultBtnSecondaryText, { color: colors.mutedForeground }]}>
            العودة
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!question) return null;

  const difficultyColor =
    question.difficulty === "easy"
      ? colors.success
      : question.difficulty === "medium"
      ? colors.warning
      : colors.destructive;

  const difficultyLabel =
    question.difficulty === "easy" ? "سهل" : question.difficulty === "medium" ? "متوسط" : "صعب";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← رجوع</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.questionCount, { color: colors.foreground }]}>
            {current + 1}/{TOTAL_QUESTIONS}
          </Text>
        </View>
        <View style={styles.mistakesBadge}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.mistakeDot,
                { backgroundColor: i < mistakes ? colors.destructive : colors.secondary },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Progress */}
      <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Difficulty badge */}
        <View style={styles.badges}>
          <View style={[styles.diffBadge, { backgroundColor: difficultyColor + "20" }]}>
            <Text style={[styles.diffText, { color: difficultyColor }]}>{difficultyLabel}</Text>
          </View>
          <Text style={[styles.bankLabel, { color: colors.mutedForeground }]}>
            بنك الأسئلة {quizBankIndex + 1}
          </Text>
        </View>

        {/* Question card */}
        <Animated.View
          style={[
            styles.questionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [
                { translateX: shakeAnim },
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
                {
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
              opacity: cardAnim,
            },
          ]}
        >
          <Text style={[styles.questionText, { color: colors.foreground }]}>
            {question.question}
          </Text>
        </Animated.View>

        {/* Options */}
        <View style={styles.options}>
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === question.answer;
            let bg = colors.card;
            let border = colors.border;
            let textColor = colors.foreground;

            if (isAnswered) {
              if (isCorrect) {
                bg = colors.success + "20";
                border = colors.success;
                textColor = colors.success;
              } else if (isSelected && !isCorrect) {
                bg = colors.destructive + "20";
                border = colors.destructive;
                textColor = colors.destructive;
              }
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.option,
                  { backgroundColor: bg, borderColor: border },
                ]}
                onPress={() => handleAnswer(option)}
                disabled={isAnswered}
                activeOpacity={0.75}
              >
                <View style={[styles.optionLetter, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.optionLetterText, { color: colors.mutedForeground }]}>
                    {["أ", "ب", "ج", "د"][idx]}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                {isAnswered && isCorrect && (
                  <Text style={{ color: colors.success, fontSize: 18 }}>✓</Text>
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <Text style={{ color: colors.destructive, fontSize: 18 }}>✗</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Mistakes warning */}
        {mistakes > 0 && (
          <View
            style={[
              styles.mistakesWarn,
              { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" },
            ]}
          >
            <Text style={[styles.mistakesWarnText, { color: colors.destructive }]}>
              ⚠️ أخطاء: {mistakes} / {MAX_MISTAKES} — خطأ واحد أخر وتُعاد من البداية
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  headerCenter: { alignItems: "center" },
  questionCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  mistakesBadge: { flexDirection: "row", gap: 6 },
  mistakeDot: { width: 10, height: 10, borderRadius: 5 },
  progressTrack: { height: 4, width: "100%" },
  progressBar: { height: 4, borderRadius: 2 },
  scroll: { padding: 20, gap: 14 },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  diffBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  diffText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bankLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  questionCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: "center",
  },
  questionText: {
    fontSize: 19,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 30,
  },
  options: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  optionLetter: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  mistakesWarn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  mistakesWarnText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  // Result screens
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  resultEmoji: { fontSize: 72, marginBottom: 8 },
  resultTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  resultSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  resultCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginVertical: 8,
  },
  resultCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
    textAlign: "center",
  },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: "28%",
    alignItems: "center",
    flexGrow: 1,
  },
  timeChipText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statsRow: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: "100%",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center", flex: 1 },
  statNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  statDivider: { width: 1, marginVertical: 4 },
  resultBtn: {
    width: "100%",
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  resultBtnSecondary: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  resultBtnSecondaryText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
