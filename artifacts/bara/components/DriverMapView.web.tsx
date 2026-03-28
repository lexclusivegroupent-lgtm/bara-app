import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { CITY_COORDINATES, GOOGLE_MAPS_KEY, geocodeAddress } from "@/constants/config";
import { Job } from "@/components/JobCard";

interface Props {
  city: string;
  jobs: Job[];
  onAccept: (jobId: number) => void;
  accepting: number | null;
  isAvailable: boolean;
}

interface Coords { latitude: number; longitude: number; }
interface JobMarker { job: Job; coords: Coords; }

export function DriverMapView({ city, jobs }: Props) {
  const [jobMarkers, setJobMarkers] = useState<JobMarker[]>([]);
  const cityCoords = CITY_COORDINATES[city] || CITY_COORDINATES["Stockholm"];
  const hasKey = !!GOOGLE_MAPS_KEY && GOOGLE_MAPS_KEY !== "YOUR_GOOGLE_MAPS_API_KEY_HERE";

  useEffect(() => {
    geocodeJobs();
  }, [jobs]);

  async function geocodeJobs() {
    const markers: JobMarker[] = [];
    for (const job of jobs) {
      const address = job.pickupAddress || job.homeAddress;
      if (!address) continue;
      const coords = await geocodeAddress(`${address}, ${job.city}, Sweden`);
      if (coords) markers.push({ job, coords });
    }
    setJobMarkers(markers);
  }

  if (!hasKey) {
    return (
      <View style={styles.placeholder}>
        <MaterialCommunityIcons name="map-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.cityText}>{city} — Live Map</Text>
        <Text style={styles.noteText}>Add EXPO_PUBLIC_GOOGLE_MAPS_KEY to enable interactive map</Text>
      </View>
    );
  }

  const center = `${cityCoords.latitude},${cityCoords.longitude}`;
  const markerParams = jobMarkers
    .map(m => `&markers=color:gold%7C${m.coords.latitude},${m.coords.longitude}`)
    .join("");
  const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_KEY}&center=${center}&zoom=13&maptype=roadmap${markerParams}`;

  return (
    <View style={styles.container}>
      {React.createElement("iframe", {
        src: embedUrl,
        style: { width: "100%", height: "100%", border: "none" },
        loading: "lazy",
      })}
      {jobMarkers.length > 0 && (
        <View style={styles.badge}>
          <MaterialCommunityIcons name="map-marker" size={13} color={Colors.gold} />
          <Text style={styles.badgeText}>{jobMarkers.length} job{jobMarkers.length !== 1 ? "s" : ""} on map</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 200,
    backgroundColor: Colors.surfaceDark,
    margin: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    paddingHorizontal: 24,
  },
  cityText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  noteText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  container: {
    height: 220,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
  },
  badge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.surfaceDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.gold },
});
