import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  placeholder?: string;
}

function roundUpToSlot(date: Date): Date {
  const d = new Date(date);
  const mins = d.getMinutes();
  const remainder = mins % 15;
  if (remainder !== 0) {
    d.setMinutes(mins + (15 - remainder), 0, 0);
  } else {
    d.setSeconds(0, 0);
  }
  if (d.getHours() < 7) {
    d.setHours(7, 0, 0, 0);
  } else if (d.getHours() >= 22) {
    d.setDate(d.getDate() + 1);
    d.setHours(7, 0, 0, 0);
  }
  return d;
}

function buildCalendarRows(year: number, month: number): number[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDay + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: number[] = Array(startOffset).fill(0);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(0);
  // Chunk into rows of 7
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function formatDisplay(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${days[d.getDay()]} ${d.getDate()} ${mths[d.getMonth()]} · ${hh}:${mm}`;
}

export function BaraDateTimePicker({ value, onChange, minimumDate, placeholder }: Props) {
  const minDate = useMemo(() => minimumDate ?? new Date(), [minimumDate]);

  const initialDraft = useMemo(() => {
    if (value) return value;
    return roundUpToSlot(minDate);
  }, [value, minDate]);

  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(initialDraft);
  const [viewYear, setViewYear] = useState(initialDraft.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDraft.getMonth());

  useEffect(() => {
    setViewYear(draftDate.getFullYear());
    setViewMonth(draftDate.getMonth());
  }, []);

  function openPicker() {
    const base = value ?? roundUpToSlot(minDate);
    setDraftDate(base);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  }

  function confirm() {
    onChange(draftDate);
    setOpen(false);
  }

  function prevMonth() {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11; }
      return m - 1;
    });
  }
  function nextMonth() {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0; }
      return m + 1;
    });
  }

  const calendarRows = useMemo(() => buildCalendarRows(viewYear, viewMonth), [viewYear, viewMonth]);

  function selectDay(day: number) {
    const d = new Date(draftDate);
    d.setFullYear(viewYear);
    d.setMonth(viewMonth);
    d.setDate(day);
    if (d < minDate) {
      const nudged = roundUpToSlot(minDate);
      d.setHours(nudged.getHours(), nudged.getMinutes(), 0, 0);
    }
    setDraftDate(d);
  }

  function adjustHour(delta: number) {
    const d = new Date(draftDate);
    let h = d.getHours() + delta;
    if (h < 6) h = 22;
    if (h > 22) h = 6;
    d.setHours(h, d.getMinutes(), 0, 0);
    setDraftDate(d);
  }

  function adjustMinute(delta: number) {
    const d = new Date(draftDate);
    let m = d.getMinutes() + delta;
    if (m < 0) { adjustHour(-1); return; }
    if (m >= 60) { adjustHour(1); return; }
    d.setMinutes(m, 0, 0);
    setDraftDate(d);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDayDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d < today;
  };

  const isSelected = (day: number) =>
    draftDate.getFullYear() === viewYear &&
    draftDate.getMonth() === viewMonth &&
    draftDate.getDate() === day;

  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === viewYear &&
      t.getMonth() === viewMonth &&
      t.getDate() === day;
  };

  const displayText = value ? formatDisplay(value) : (placeholder ?? "Select date & time");
  const hours = String(draftDate.getHours()).padStart(2, "0");
  const mins = String(Math.floor(draftDate.getMinutes() / 15) * 15).padStart(2, "0");

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker} activeOpacity={0.8}>
        <Feather name="calendar" size={16} color={value ? Colors.gold : Colors.textMuted} />
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {displayText}
        </Text>
        <Feather name="chevron-down" size={14} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} onPress={() => setOpen(false)} activeOpacity={1}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>

            <View style={styles.handle} />

            {/* Month navigation */}
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="chevron-left" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="chevron-right" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.calRow}>
              {DAY_LABELS.map((d, i) => (
                <View key={i} style={styles.calCell}>
                  <Text style={styles.dayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar rows — one View per week, cells flex equally */}
            {calendarRows.map((week, ri) => (
              <View key={ri} style={styles.calRow}>
                {week.map((day, ci) => {
                  if (day === 0) {
                    return <View key={ci} style={styles.calCell} />;
                  }
                  const disabled = isDayDisabled(day);
                  const selected = isSelected(day);
                  const todayDay = isToday(day);
                  return (
                    <TouchableOpacity
                      key={ci}
                      style={styles.calCell}
                      onPress={() => !disabled && selectDay(day)}
                      disabled={disabled}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.dayCellInner,
                        todayDay && !selected && styles.todayInner,
                        selected && styles.selectedInner,
                      ]}>
                        <Text style={[
                          styles.dayNum,
                          disabled && styles.dayNumDisabled,
                          todayDay && !selected && styles.dayNumToday,
                          selected && styles.dayNumSelected,
                        ]}>
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={styles.divider} />

            {/* Time picker */}
            <View style={styles.timeSection}>
              <View style={styles.timeLabelRow}>
                <Feather name="clock" size={14} color={Colors.gold} />
                <Text style={styles.timeLabelText}>Time</Text>
              </View>
              <View style={styles.timeControls}>
                <View style={styles.spinnerCol}>
                  <TouchableOpacity onPress={() => adjustHour(1)} style={styles.spinBtn}>
                    <Feather name="chevron-up" size={18} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.spinValue}>{hours}</Text>
                  <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.spinBtn}>
                    <Feather name="chevron-down" size={18} color={Colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.colon}>:</Text>
                <View style={styles.spinnerCol}>
                  <TouchableOpacity onPress={() => adjustMinute(15)} style={styles.spinBtn}>
                    <Feather name="chevron-up" size={18} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.spinValue}>{mins}</Text>
                  <TouchableOpacity onPress={() => adjustMinute(-15)} style={styles.spinBtn}>
                    <Feather name="chevron-down" size={18} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.preview}>{formatDisplay(draftDate)}</Text>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirm} activeOpacity={0.85}>
              <Feather name="check" size={16} color={Colors.navy} />
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  placeholder: { color: Colors.textMuted },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1E2E4F",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },

  // Month nav
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthLabel: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },

  // Calendar rows — each row is a horizontal View, cells flex equally
  calRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  dayHeaderText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayCellInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  todayInner: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  selectedInner: {
    backgroundColor: Colors.gold,
  },
  dayNum: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  dayNumDisabled: {
    opacity: 0.25,
  },
  dayNumToday: {
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
  },
  dayNumSelected: {
    color: Colors.navy,
    fontFamily: "Inter_700Bold",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },

  // Time section
  timeSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  timeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeLabelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  timeControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  spinnerCol: {
    alignItems: "center",
    gap: 6,
  },
  spinBtn: {
    width: 36,
    height: 32,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  spinValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    minWidth: 46,
    textAlign: "center",
  },
  colon: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.border,
    marginTop: -8,
  },

  preview: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 16,
  },

  confirmBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.navy,
  },
});
