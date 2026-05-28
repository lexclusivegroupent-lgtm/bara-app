import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { CITY_COORDINATES, MAPBOX_TOKEN, geocodeAddress } from "@/constants/config";
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

function buildStaticMapUrl(center: Coords, markers: JobMarker[], token: string): string {
  // Mapbox Static Images API — pin-s-{icon}+{color}({lng},{lat})
  const overlays = markers
    .slice(0, 8)
    .map(m => `pin-s-package+C9A84C(${m.coords.longitude.toFixed(5)},${m.coords.latitude.toFixed(5)})`)
    .join(",");
  const path = overlays ? `${overlays}/` : "";
  return (
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/` +
    `${path}${center.longitude.toFixed(5)},${center.latitude.toFixed(5)},12,0/` +
    `800x440@2x?access_token=${token}`
  );
}

export function DriverMapView({ city, jobs }: Props) {
  const [jobMarkers, setJobMarkers] = useState<JobMarker[]>([]);
  const cityCoords = CITY_COORDINATES[city] || CITY_COORDINATES["Stockholm"];

  useEffect(() => { geocodeJobs(); }, [jobs]);

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

  if (!MAPBOX_TOKEN) {
    return (
      <View style={styles.placeholder}>
        <MaterialCommunityIcons name="map-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.cityText}>{city} — Live Map</Text>
        <Text style={styles.noteText}>Add EXPO_PUBLIC_MAPBOX_TOKEN to enable map</Text>
      </View>
    );
  }

  const mapUrl = buildStaticMapUrl(cityCoords, jobMarkers, MAPBOX_TOKEN);

  return (
    <View style={styles.container}>
      {React.createElement("img", {
        src: mapUrl,
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
        alt: `Map of ${city}`,
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
