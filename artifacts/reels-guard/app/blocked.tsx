import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function getSecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function BlockedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilMidnight());

  const shieldScale = useRef(new Animated.Value(0.8)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(shieldScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(shieldOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    );
    glow.start();

    const timer = setInterval(() => {
      setSecondsLeft(getSecondsUntilMidnight());
    }, 1000);

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);

    return () => {
      clearInterval(timer);
      glow.stop();
      backHandler.remove();
    };
  }, []);

  const handleQuiz = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/quiz");
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(124, 58, 237, 0.15)", "rgba(124, 58, 237, 0.45)"],
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: "#050508",
          paddingTop: topPad,
          paddingBottom: bottomPad + 20,
        },
      ]}
    >
      {/* Background glow */}
      <Animated.View
        style={[styles.bgGlow, { backgroundColor: glowColor }]}
        pointerEvents="none"
      />

      {/* Shield / Logo */}
      <Animated.View
        style={[
          styles.shieldWrap,
          { transform: [{ scale: shieldScale }], opacity: shieldOpacity },
        ]}
      >
        <View style={styles.shieldOuter}>
          <Animated.View
            style={[
              styles.shieldGlow,
              { shadowColor: "#7C3AED", shadowOpacity: glowAnim },
            ]}
          />
          <Text style={styles.shieldEmoji}>🛡️</Text>
        </View>

        <Text style={styles.appBrand}>ReelsGuard</Text>
      </Animated.View>

      {/* Message */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.blockedTitle}>انتهى وقت الريلز اليوم</Text>
        <Text style={styles.blockedSubtitle}>
          لقد استنفدت حصتك اليومية من مشاهدة الريلز
        </Text>

        {/* Countdown */}
        <View style={[styles.countdownCard, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }]}>
          <Text style={styles.countdownLabel}>يُفتح مجدداً بعد</Text>
          <Text style={styles.countdownTimer}>{formatCountdown(secondsLeft)}</Text>
          <Text style={styles.countdownSub}>في منتصف الليل</Text>
        </View>

        {/* Apps reminder */}
        <View style={styles.appsReminder}>
          {["🎵", "📷", "▶️", "📘"].map((emoji, i) => (
            <View
              key={i}
              style={[styles.appIcon, { backgroundColor: "rgba(255,255,255,0.07)" }]}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.appsLabel}>الريلز محجوب على هذه التطبيقات</Text>
      </Animated.View>

      {/* Quiz Button */}
      <Animated.View style={[styles.bottomArea, { opacity: textOpacity }]}>
        <TouchableOpacity
          style={styles.quizBtn}
          onPress={handleQuiz}
          activeOpacity={0.85}
        >
          <Text style={styles.quizBtnText}>🧠  تغيير الحد اليومي</Text>
          <Text style={styles.quizBtnSub}>يتطلب اجتياز 30 سؤالاً</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          الحماية نشطة · لا يمكن تغيير الوقت الآن إلا بالاختبار
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  bgGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shieldWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    maxHeight: "40%",
    marginTop: 20,
  },
  shieldOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  shieldGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  shieldEmoji: { fontSize: 72 },
  appBrand: {
    color: "#7C3AED",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
    flex: 1,
    justifyContent: "center",
  },
  blockedTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  blockedSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  countdownCard: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 28,
    width: "100%",
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  countdownTimer: {
    color: "#FFFFFF",
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  countdownSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  appsReminder: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  appsLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottomArea: {
    width: "100%",
    paddingHorizontal: 24,
    gap: 12,
  },
  quizBtn: {
    backgroundColor: "rgba(124, 58, 237, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.5)",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  quizBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  quizBtnSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  disclaimer: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
