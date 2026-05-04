import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TIME_OPTIONS = [
  { label: "١٥ دقيقة", minutes: 15, desc: "مقيّد جداً" },
  { label: "٣٠ دقيقة", minutes: 30, desc: "موصى به" },
  { label: "٤٥ دقيقة", minutes: 45, desc: "معتدل" },
  { label: "ساعة", minutes: 60, desc: "مرن" },
  { label: "٩٠ دقيقة", minutes: 90, desc: "متساهل" },
  { label: "ساعتين", minutes: 120, desc: "حر" },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [selected, setSelected] = useState<number>(30);
  const [step, setStep] = useState<0 | 1>(0);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const handleSelect = async (minutes: number) => {
    await Haptics.selectionAsync();
    setSelected(minutes);
  };

  const handleContinue = async () => {
    if (step === 0) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(1);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await completeOnboarding(selected);
      router.replace("/");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad + 24,
          paddingBottom: bottomPad + 24,
        },
      ]}
    >
      {step === 0 ? (
        <View style={styles.inner}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Text style={styles.iconEmoji}>🛡️</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            مرحباً في ReelsGuard
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            تطبيق يساعدك على التحكم في وقت مشاهدة الريلز يومياً على تيك توك وإنستغرام ويوتيوب وفيسبوك.
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: "⏱", text: "تتبع وقت الريلز يومياً" },
              { icon: "🔒", text: "قفل تلقائي عند انتهاء الوقت" },
              { icon: "🧠", text: "اختبار 30 سؤال لتغيير الإعداد" },
              { icon: "🔄", text: "إعادة ضبط تلقائي كل منتصف ليل" },
            ].map((f) => (
              <View key={f.text} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 22 }}>{f.icon}</Text>
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>ابدأ الإعداد ←</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inner}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            حدد وقتك اليومي
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            كم دقيقة يومياً تريد قضاءها في مشاهدة الريلز؟
          </Text>

          <View style={styles.optionsGrid}>
            {TIME_OPTIONS.map((opt) => {
              const isSelected = selected === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(opt.minutes)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: isSelected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDesc,
                      { color: isSelected ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
                    ]}
                  >
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.warnCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
            <Text style={[styles.warnText, { color: colors.warning }]}>
              ⚠️  بعد انتهاء الوقت، تغيير الحد يتطلب حل 30 سؤالاً بنجاح.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>تأكيد وبدء الحماية ✓</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    alignSelf: "center",
  },
  iconEmoji: { fontSize: 48 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  featureList: { gap: 10, marginBottom: 32 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  featureText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
  },
  optionLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  optionDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  warnCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  warnText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
  btn: {
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
});
