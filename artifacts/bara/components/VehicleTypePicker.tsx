import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export type VehicleType = "cargo_bike" | "car_trailer" | "pickup" | "small_van" | "large_van" | "truck";

export interface VehicleOption {
  key: VehicleType;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  labelEn: string;
  labelSv: string;
  descEn: string;
  descSv: string;
  capacity: string;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    key: "cargo_bike",
    icon: "bicycle-cargo",
    labelEn: "Cargo Bike",
    labelSv: "Lastcykel",
    descEn: "Small parcels, eco-friendly",
    descSv: "Små paket, miljövänlig",
    capacity: "< 50 kg",
  },
  {
    key: "car_trailer",
    icon: "car-estate",
    labelEn: "Car + Trailer",
    labelSv: "Bil med släp",
    descEn: "Furniture, medium loads",
    descSv: "Möbler, medelstora lass",
    capacity: "~500 kg",
  },
  {
    key: "pickup",
    icon: "truck-flatbed",
    labelEn: "Pickup Truck",
    labelSv: "Pickup",
    descEn: "Bulky items, outdoor gear",
    descSv: "Skrymmande gods, utrustning",
    capacity: "~800 kg",
  },
  {
    key: "small_van",
    icon: "van-utility",
    labelEn: "Small Van",
    labelSv: "Liten skåpbil",
    descEn: "Boxes, appliances, moves",
    descSv: "Lådor, vitvaror, flytt",
    capacity: "~1 000 kg",
  },
  {
    key: "large_van",
    icon: "truck",
    labelEn: "Large Van",
    labelSv: "Stor skåpbil",
    descEn: "Full room or apartment",
    descSv: "Helt rum eller lägenhet",
    capacity: "~1 500 kg",
  },
  {
    key: "truck",
    icon: "truck-cargo-container",
    labelEn: "Truck",
    labelSv: "Lastbil",
    descEn: "Heavy loads, full moves",
    descSv: "Tunga lass, stor flytt",
    capacity: "> 2 000 kg",
  },
];

export function getVehicleOption(key: VehicleType | null | undefined): VehicleOption | undefined {
  return VEHICLE_OPTIONS.find(v => v.key === key);
}

interface Props {
  value: VehicleType | null;
  onChange: (type: VehicleType) => void;
  lang?: "en" | "sv";
}

export function VehicleTypePicker({ value, onChange, lang = "sv" }: Props) {
  return (
    <View style={styles.grid}>
      {VEHICLE_OPTIONS.map(opt => {
        const selected = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, selected && styles.iconCircleSelected]}>
              <MaterialCommunityIcons
                name={opt.icon}
                size={28}
                color={selected ? Colors.navy : Colors.textMuted}
              />
            </View>
            <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]} numberOfLines={1}>
              {lang === "sv" ? opt.labelSv : opt.labelEn}
            </Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {lang === "sv" ? opt.descSv : opt.descEn}
            </Text>
            <View style={[styles.capacityBadge, selected && styles.capacityBadgeSelected]}>
              <Text style={[styles.capacityText, selected && styles.capacityTextSelected]}>
                {opt.capacity}
              </Text>
            </View>
            {selected && (
              <View style={styles.checkBadge}>
                <MaterialCommunityIcons name="check-circle" size={18} color={Colors.gold} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Compact inline badge to display a driver's vehicle type (for job-status, active-job etc.) */
export function VehicleBadge({ vehicleType, lang = "sv" }: { vehicleType: VehicleType | null | undefined; lang?: "en" | "sv" }) {
  const opt = getVehicleOption(vehicleType ?? undefined);
  if (!opt) return null;
  return (
    <View style={styles.badge}>
      <MaterialCommunityIcons name={opt.icon} size={14} color={Colors.gold} />
      <Text style={styles.badgeText}>{lang === "sv" ? opt.labelSv : opt.labelEn}</Text>
      <Text style={styles.badgeCapacity}>· {opt.capacity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  cardSelected: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}18`,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: `${Colors.border}80`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  iconCircleSelected: {
    backgroundColor: Colors.gold,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  cardLabelSelected: {
    color: Colors.gold,
  },
  cardDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 16,
  },
  capacityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 2,
  },
  capacityBadgeSelected: {
    borderColor: `${Colors.gold}60`,
  },
  capacityText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  capacityTextSelected: {
    color: Colors.gold,
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
  },

  // Badge (compact display)
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: `${Colors.gold}35`,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  badgeCapacity: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
