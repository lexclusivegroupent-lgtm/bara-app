import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapboxGL from "@rnmapbox/maps";
import { Colors } from "@/constants/colors";
import { CITY_COORDINATES, MAPBOX_TOKEN, geocodeAddress } from "@/constants/config";
import { Job } from "@/components/JobCard";

MapboxGL.setAccessToken(MAPBOX_TOKEN);

interface Props {
  city: string;
  jobs: Job[];
  onAccept: (jobId: number) => void;
  accepting: number | null;
  isAvailable: boolean;
}

interface Coords { latitude: number; longitude: number; }
interface JobMarker { job: Job; coords: Coords; }

export function DriverMapView({ city, jobs, onAccept, accepting, isAvailable }: Props) {
  const [driverLocation, setDriverLocation] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [jobMarkers, setJobMarkers] = useState<JobMarker[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);

  const cityCoords = CITY_COORDINATES[city] || CITY_COORDINATES["Stockholm"];

  useEffect(() => { requestLocation(); }, []);
  useEffect(() => { geocodeJobs(); }, [jobs]);

  async function requestLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocationError("Location permission denied"); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDriverLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      setLocationError("Could not get location");
    }
  }

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

  const center = driverLocation || cityCoords;
  const selectedMarker = selectedJob ? jobMarkers.find(m => m.job.id === selectedJob) ?? null : null;

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        <MapboxGL.Camera
          zoomLevel={12}
          centerCoordinate={[center.longitude, center.latitude]}
          animationMode="none"
        />
        <MapboxGL.UserLocation visible={true} />
        {jobMarkers.map(({ job, coords }) => (
          <MapboxGL.PointAnnotation
            key={`job-${job.id}`}
            id={`job-${job.id}`}
            coordinate={[coords.longitude, coords.latitude]}
            onSelected={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
            onDeselected={() => setSelectedJob(null)}
          >
            <View style={[styles.jobMarker, selectedJob === job.id && styles.jobMarkerSelected]}>
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={16}
                color={selectedJob === job.id ? Colors.navy : Colors.gold}
              />
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {selectedMarker && (
        <View style={styles.calloutOverlay}>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>
              {selectedMarker.job.jobType?.replace(/_/g, " ") ?? "Small Item"}
            </Text>
            <Text style={styles.calloutAddress} numberOfLines={2}>
              {selectedMarker.job.pickupAddress || selectedMarker.job.homeAddress}
            </Text>
            <Text style={styles.calloutPrice}>{selectedMarker.job.driverPayout} kr earnings</Text>
            {isAvailable && (
              <TouchableOpacity
                style={[styles.acceptBtn, accepting === selectedMarker.job.id && styles.acceptBtnDisabled]}
                onPress={() => onAccept(selectedMarker.job.id)}
                disabled={!!accepting}
              >
                {accepting === selectedMarker.job.id
                  ? <ActivityIndicator size="small" color={Colors.navy} />
                  : <Text style={styles.acceptText}>Accept Job</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.overlayPills}>
        <View style={[styles.pill, { borderColor: driverLocation ? `${Colors.success}40` : Colors.border }]}>
          <Feather name="navigation" size={12} color={driverLocation ? Colors.success : Colors.textMuted} />
          <Text style={[styles.pillText, driverLocation && { color: Colors.success }]}>
            {driverLocation ? "GPS Active" : "Locating..."}
          </Text>
        </View>
        {jobMarkers.length > 0 && (
          <View style={styles.pill}>
            <MaterialCommunityIcons name="map-marker" size={13} color={Colors.gold} />
            <Text style={[styles.pillText, { color: Colors.gold }]}>{jobMarkers.length} nearby</Text>
          </View>
        )}
      </View>

      {locationError && (
        <View style={styles.errorPill}>
          <Feather name="alert-circle" size={11} color={Colors.textMuted} />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
  },
  map: { flex: 1 },
  jobMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  jobMarkerSelected: { backgroundColor: Colors.gold, transform: [{ scale: 1.2 }] },
  calloutOverlay: {
    position: "absolute",
    bottom: 60,
    left: 12,
    right: 12,
  },
  callout: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  calloutTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  calloutAddress: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 16 },
  calloutPrice: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.gold, marginTop: 2 },
  acceptBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 6,
  },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.navy },
  overlayPills: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.surfaceDark}ee`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  errorPill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.surfaceDark}ee`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorText: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
