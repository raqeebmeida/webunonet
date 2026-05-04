import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

const TIME_OPTIONS = [
  { label: "١٥ دقيقة", minutes: 15 },
  { label: "٣٠ دقيقة", minutes: 30 },
  { label: "٤٥ دقيقة", minutes: 45 },
  { label: "ساعة", minutes: 60 },
  { label: "٩٠ دقيقة", minutes: 90 },
  { label: "ساعتين", minutes: 120 },
];

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} ساعة`;
    return `${h} ساعة و${m} دقيقة`;
  }
  return `${minutes} دقيقة`;
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}س ${m}د ${s}ث`;
  return `${m}د ${s}ث`;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    timeLimitMinutes,
    usedSeconds,
    isBlocked,
    progressPercent,
    quizBankIndex,
    setTimeLimitMinutes,
    resetAllData,
  } = useApp();

  const [selectedLimit, setSelectedLimit] = useState(timeLimitMinutes);
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const usedMinutes = Math.floor(usedSeconds / 60);
  const usedPercent = Math.round(progressPercent * 100);

  const handleSave = async () => {
    if (isBlocked) {
      Alert.alert(
        "مقيّد",
        "وقت الريلز انتهى. يجب اجتياز اختبار الـ 30 سؤال لتغيير الحد اليومي.",
        [
          { text: "إلغاء", style: "cancel" },
          { text: "بدء الاختبار", onPress: () => router.push("/quiz") },
        ]
      );
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    await setTimeLimitMinutes(selectedLimit);
    setSaving(false);
    Alert.alert("تم", `تم تغيير الحد اليومي إلى ${formatMinutes(selectedLimit)}`);
  };

  const handleReset = () => {
    Alert.alert(
      "إعادة ضبط كاملة",
      "سيتم حذف جميع البيانات والإعدادات والعودة إلى الإعداد الأولي. هل أنت متأكد؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إعادة الضبط",
          style: "destructive",
          onPress: async () => {
            await resetAllData();
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.primary }]}>← رجوع</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>الإعدادات</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>حالة اليوم</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusNum, { color: colors.foreground }]}>{usedMinutes}</Text>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>دقيقة استُخدمت</Text>
            </View>
            <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNum, { color: colors.foreground }]}>{timeLimitMinutes}</Text>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>الحد اليومي (د)</Text>
            </View>
            <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statusItem}>
              <Text
                style={[
                  styles.statusNum,
                  { color: isBlocked ? colors.destructive : colors.success },
                ]}
              >
                {usedPercent}%
              </Text>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>استُنفد</Text>
            </View>
          </View>

          {isBlocked && (
            <View style={[styles.blockedBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}>
              <Text style={[styles.blockedBannerText, { color: colors.destructive }]}>
                🔒  الريلز مقفل · يتطلب تغيير الحد اجتياز الاختبار
              </Text>
            </View>
          )}
        </View>

        {/* Time Limit */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          الحد اليومي للريلز
        </Text>
        {isBlocked && (
          <View style={[styles.lockNotice, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
            <Text style={[styles.lockNoticeText, { color: colors.warning }]}>
              ⚠️  لتغيير الحد الآن يجب أولاً اجتياز الاختبار
            </Text>
          </View>
        )}
        <View style={styles.timeGrid}>
          {TIME_OPTIONS.map((opt) => {
            const isSelected = selectedLimit === opt.minutes;
            return (
              <TouchableOpacity
                key={opt.minutes}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: isBlocked ? 0.5 : 1,
                  },
                ]}
                onPress={async () => {
                  await Haptics.selectionAsync();
                  setSelectedLimit(opt.minutes);
                }}
                disabled={isBlocked}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    { color: isSelected ? "#fff" : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: isBlocked ? colors.secondary : colors.primary,
              opacity: selectedLimit === timeLimitMinutes && !isBlocked ? 0.5 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { color: isBlocked ? colors.mutedForeground : "#fff" }]}>
            {isBlocked ? "🔒  يتطلب اجتياز الاختبار أولاً" : saving ? "جاري الحفظ..." : "حفظ الحد اليومي"}
          </Text>
        </TouchableOpacity>

        {isBlocked && (
          <TouchableOpacity
            style={[styles.quizBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/quiz")}
            activeOpacity={0.85}
          >
            <Text style={styles.quizBtnText}>🧠  بدء الاختبار لتغيير الإعداد</Text>
          </TouchableOpacity>
        )}

        {/* Quiz Info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>معلومات الاختبار</Text>
          <View style={styles.infoList}>
            {[
              { label: "عدد الأسئلة", value: "٣٠ سؤال" },
              { label: "أخطاء مسموحة", value: "٣ أخطاء فقط" },
              { label: "بنك الأسئلة الحالي", value: `البنك ${quizBankIndex + 1} من 3` },
              { label: "نوع الأسئلة", value: "رياضيات، معرفة، منطق" },
            ].map((item) => (
              <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Android Protection Info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>الحماية على أندرويد</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            لتفعيل الحجب التلقائي على تطبيقات الريلز، اذهب إلى:
            {"\n"}⚙️ الإعدادات ← الرفاهية الرقمية ← إضافة حد للتطبيق
            {"\n\n"}ثم حدد وقت استخدام لـ TikTok وInstagram وYouTube وFacebook ليتناسب مع حدك في هذا التطبيق.
          </Text>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.destructive + "30" }]}>
          <Text style={[styles.cardTitle, { color: colors.destructive }]}>منطقة الخطر</Text>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.destructive + "50" }]}
            onPress={handleReset}
          >
            <Text style={[styles.resetBtnText, { color: colors.destructive }]}>
              🗑  إعادة ضبط جميع البيانات
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusItem: { alignItems: "center", flex: 1 },
  statusNum: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
  statusDivider: { width: 1, marginVertical: 4 },
  blockedBanner: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  blockedBannerText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  lockNotice: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  lockNoticeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    minWidth: "30%",
    alignItems: "center",
    flexGrow: 1,
  },
  timeChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  quizBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  quizBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  infoList: { gap: 0 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 22 },
  resetBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
