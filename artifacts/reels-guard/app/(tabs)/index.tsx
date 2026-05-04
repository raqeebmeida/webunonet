import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
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
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  { name: "TikTok", emoji: "🎵" },
  { name: "Instagram", emoji: "📷" },
  { name: "YouTube", emoji: "▶️" },
  { name: "Facebook", emoji: "📘" },
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
  } = useApp();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading && !isOnboarded) router.replace("/onboarding");
  }, [isLoading, isOnboarded]);

  useEffect(() => {
    if (isBlocked) router.replace("/blocked");
  }, [isBlocked]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  // Pulse timer when close to limit
  useEffect(() => {
    if (progressPercent <= 0.8) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progressPercent > 0.8]);

  // Blinking green dot — always active
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.15, duration: 900, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          جاري التحميل...
        </Text>
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
              حارس وقت الريلز
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={async () => {
              await Haptics.selectionAsync();
              router.push("/settings");
            }}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Auto-tracking badge */}
        <View
          style={[
            styles.trackingBadge,
            { backgroundColor: colors.success + "15", borderColor: colors.success + "30" },
          ]}
        >
          <Animated.View
            style={[styles.trackingDot, { backgroundColor: colors.success, opacity: dotAnim }]}
          />
          <Text style={[styles.trackingText, { color: colors.success }]}>
            التتبع التلقائي نشط — يراقب وقت الريلز
          </Text>
        </View>

        {/* Main Timer Card */}
        <View
          style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
            الوقت المتبقي اليوم
          </Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text
              style={[
                styles.timerText,
                { color: progressPercent > 0.8 ? colors.destructive : colors.foreground },
              ]}
            >
              {formatTime(remainingSeconds)}
            </Text>
          </Animated.View>

          <Text style={[styles.limitLabel, { color: colors.mutedForeground }]}>
            من أصل {formatMinutes(timeLimitMinutes)}
          </Text>

          {/* Progress Bar */}
          <View style={[styles.progressBg, { backgroundColor: colors.secondary }]}>
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

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>{usedMinutes}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>دقيقة استُخدمت</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>{timeLimitMinutes}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الحد اليومي (د)</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNum,
                  { color: progressPercent > 0.8 ? colors.destructive : colors.foreground },
                ]}
              >
                {Math.round(progressPercent * 100)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>استُنفد</Text>
            </View>
          </View>
        </View>

        {/* Warning when close to limit */}
        {progressPercent >= 0.8 && progressPercent < 1 && (
          <View
            style={[
              styles.warnCard,
              { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" },
            ]}
          >
            <Text style={[styles.warnText, { color: colors.warning }]}>
              ⚠️ اقتربت من حدك اليومي! تبقى {formatTime(remainingSeconds)} فقط
            </Text>
          </View>
        )}

        {/* How it works */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          كيف يعمل التتبع
        </Text>

        <View
          style={[styles.howCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {[
            {
              icon: "🚪",
              title: "اخرج وافتح الريلز",
              desc: "بمجرد مغادرتك لـ ReelsGuard يبدأ العداد تلقائياً",
            },
            {
              icon: "↩️",
              title: "ارجع للتطبيق",
              desc: "العداد يتوقف فوراً عند عودتك هنا",
            },
            {
              icon: "🔒",
              title: "قفل تلقائي",
              desc: "عند انتهاء وقتك يُقفل التطبيق فوراً عند عودتك",
            },
            {
              icon: "🌙",
              title: "إعادة يومية",
              desc: "يُصفَّر العداد تلقائياً كل منتصف ليل",
            },
          ].map((item, i, arr) => (
            <View
              key={item.title}
              style={[
                styles.howRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                },
              ]}
            >
              <Text style={styles.howIcon}>{item.icon}</Text>
              <View style={styles.howTextWrap}>
                <Text style={[styles.howTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.howDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Apps row */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          التطبيقات المراقبة
        </Text>
        <View style={styles.appsRow}>
          {APPS.map((app) => (
            <View
              key={app.name}
              style={[
                styles.appChip,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ fontSize: 24 }}>{app.emoji}</Text>
              <Text style={[styles.appChipName, { color: colors.mutedForeground }]}>
                {app.name}
              </Text>
            </View>
          ))}
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
    marginBottom: 16,
  },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
    gap: 8,
  },
  trackingDot: { width: 8, height: 8, borderRadius: 4 },
  trackingText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },

  timerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  timerText: { fontSize: 60, fontFamily: "Inter_700Bold", letterSpacing: -2 },
  limitLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 18,
  },
  progressBg: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 18,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  statsRow: { flexDirection: "row", width: "100%", justifyContent: "space-around" },
  statItem: { alignItems: "center", flex: 1 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    textAlign: "center",
  },
  statDivider: { width: 1, marginVertical: 4 },

  warnCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  warnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 4,
  },

  howCard: { borderRadius: 20, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  howRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  howIcon: { fontSize: 22, width: 32, textAlign: "center" },
  howTextWrap: { flex: 1 },
  howTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  howDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  appsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  appChip: {
    flex: 1,
    minWidth: "20%",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  appChipName: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
