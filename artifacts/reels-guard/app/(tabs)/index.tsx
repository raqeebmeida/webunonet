import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} ساعة`;
    return `${h}س ${m}د`;
  }
  return `${minutes} دقيقة`;
}

const APPS = [
  { name: "TikTok", color: "#010101", emoji: "🎵" },
  { name: "Instagram", color: "#E1306C", emoji: "📷" },
  { name: "YouTube", color: "#FF0000", emoji: "▶️" },
  { name: "Facebook", color: "#1877F2", emoji: "📘" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    isLoading,
    isOnboarded,
    isBlocked,
    remainingSeconds,
    usedSeconds,
    timeLimitMinutes,
    progressPercent,
    isSessionActive,
    startSession,
    endSession,
  } = useApp();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading && !isOnboarded) {
      router.replace("/onboarding");
    }
  }, [isLoading, isOnboarded]);

  useEffect(() => {
    if (isBlocked && isSessionActive) {
      endSession();
    }
    if (isBlocked) {
      router.replace("/blocked");
    }
  }, [isBlocked]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  useEffect(() => {
    if (isSessionActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSessionActive]);

  const handleSessionToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSessionActive) {
      await endSession();
    } else {
      startSession();
    }
  };

  const handleSettings = async () => {
    await Haptics.selectionAsync();
    router.push("/settings");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>جاري التحميل...</Text>
      </View>
    );
  }

  const usedMinutes = Math.floor(usedSeconds / 60);
  const barColor =
    progressPercent < 0.5
      ? colors.success
      : progressPercent < 0.8
      ? colors.warning
      : colors.destructive;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.appName, { color: colors.primary }]}>ReelsGuard</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              مراقب وقت الريلز
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleSettings}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Main Timer Card */}
        <View style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
            الوقت المتبقي اليوم
          </Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text
              style={[
                styles.timerText,
                {
                  color: progressPercent > 0.8 ? colors.destructive : colors.foreground,
                },
              ]}
            >
              {formatTime(remainingSeconds)}
            </Text>
          </Animated.View>

          <Text style={[styles.limitLabel, { color: colors.mutedForeground }]}>
            من أصل {formatMinutes(timeLimitMinutes)}
          </Text>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: barColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          <Text style={[styles.usedLabel, { color: colors.mutedForeground }]}>
            استُخدم {formatMinutes(usedMinutes)} من {formatMinutes(timeLimitMinutes)}
          </Text>
        </View>

        {/* Session Button */}
        <TouchableOpacity
          style={[
            styles.sessionBtn,
            {
              backgroundColor: isSessionActive ? colors.destructive : colors.primary,
            },
          ]}
          onPress={handleSessionToggle}
          activeOpacity={0.8}
        >
          <Text style={styles.sessionBtnIcon}>{isSessionActive ? "⏹" : "▶"}</Text>
          <Text style={styles.sessionBtnText}>
            {isSessionActive ? "إيقاف جلسة الريلز" : "بدء جلسة الريلز"}
          </Text>
        </TouchableOpacity>

        {isSessionActive && (
          <View style={[styles.liveBadge, { backgroundColor: colors.destructive + "20" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.destructive }]} />
            <Text style={[styles.liveText, { color: colors.destructive }]}>جلسة نشطة الآن</Text>
          </View>
        )}

        {/* Apps Row */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          التطبيقات المراقبة
        </Text>
        <View style={styles.appsRow}>
          {APPS.map((app) => (
            <View key={app.name} style={[styles.appChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 22 }}>{app.emoji}</Text>
              <Text style={[styles.appChipName, { color: colors.mutedForeground }]}>{app.name}</Text>
            </View>
          ))}
        </View>

        {/* Guide */}
        <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.guideTitle, { color: colors.foreground }]}>كيف يعمل التطبيق</Text>
          <Text style={[styles.guideText, { color: colors.mutedForeground }]}>
            {"1. اضغط «بدء جلسة» عند فتح الريلز\n"}
            {"2. اضغط «إيقاف» عند الانتهاء\n"}
            {"3. عند انتهاء وقتك اليومي تُقفل الشاشة\n"}
            {"4. لتغيير الحد اليومي يلزمك اجتياز اختبار الـ 30 سؤال"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  appName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  timerCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 58,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
  },
  limitLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 20,
  },
  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  usedLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    borderRadius: 18,
    marginBottom: 14,
    gap: 10,
  },
  sessionBtnIcon: { fontSize: 18, color: "#fff" },
  sessionBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  appsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  appChip: {
    flex: 1,
    minWidth: "20%",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  appChipName: { fontSize: 10, fontFamily: "Inter_500Medium" },
  guideCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  guideTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  guideText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
