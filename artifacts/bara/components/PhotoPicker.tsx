import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface Props {
  photos: string[];
  onChange?: (photos: string[]) => void;
  maxPhotos?: number;
  editable?: boolean;
  label?: string;
}

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera Access Needed",
      "Bära needs camera access to document items for safety. Go to Settings › Bära › Camera to enable it."
    );
    return false;
  }
  return true;
}

async function requestLibraryPermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photo Library Access Needed",
      "Bära needs access to your photo library. Go to Settings › Bära › Photos to enable it."
    );
    return false;
  }
  return true;
}

export function PhotoPicker({ photos, onChange, maxPhotos = 3, editable = true, label }: Props) {
  const [picking, setPicking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState<string | null>(null);

  async function pickFromCamera() {
    setShowModal(false);
    const ok = await requestCameraPermission();
    if (!ok) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
        exif: false,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        onChange?.([...photos, base64]);
      }
    } catch {
      Alert.alert("Error", "Could not open camera.");
    } finally {
      setPicking(false);
    }
  }

  async function pickFromLibrary() {
    setShowModal(false);
    const ok = await requestLibraryPermission();
    if (!ok) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
        exif: false,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        onChange?.([...photos, base64]);
      }
    } catch {
      Alert.alert("Error", "Could not open photo library.");
    } finally {
      setPicking(false);
    }
  }

  function removePhoto(index: number) {
    onChange?.(photos.filter((_, i) => i !== index));
  }

  const canAddMore = editable && photos.length < maxPhotos;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((uri, i) => (
          <TouchableOpacity
            key={i}
            style={styles.thumb}
            onPress={() => setFullScreen(uri)}
            activeOpacity={0.9}
          >
            <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
            {editable && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
                <Feather name="x" size={10} color={Colors.text} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {canAddMore && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowModal(true)}
            disabled={picking}
            activeOpacity={0.8}
          >
            {picking ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <>
                <Feather name="camera" size={20} color={Colors.gold} />
                <Text style={styles.addBtnText}>
                  {photos.length === 0 ? "Add Photo" : "+"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {photos.length === 0 && !editable && (
          <Text style={styles.emptyText}>No photos</Text>
        )}
      </ScrollView>

      {editable && (
        <Text style={styles.hint}>
          {photos.length}/{maxPhotos} photo{maxPhotos !== 1 ? "s" : ""}
        </Text>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModal(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Photo</Text>
            <TouchableOpacity style={styles.modalOption} onPress={pickFromCamera} activeOpacity={0.8}>
              <View style={styles.modalOptionIcon}>
                <Feather name="camera" size={20} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.modalOptionTitle}>Take Photo</Text>
                <Text style={styles.modalOptionSubtext}>Use camera to capture</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.modalDivider} />
            <TouchableOpacity style={styles.modalOption} onPress={pickFromLibrary} activeOpacity={0.8}>
              <View style={styles.modalOptionIcon}>
                <Feather name="image" size={20} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.modalOptionSubtext}>Select an existing photo</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!fullScreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreen(null)}
      >
        <TouchableOpacity style={styles.fullScreenOverlay} onPress={() => setFullScreen(null)} activeOpacity={1}>
          {fullScreen && (
            <Image source={{ uri: fullScreen }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.fullScreenClose} onPress={() => setFullScreen(null)}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  row: { flexDirection: "row", gap: 10, paddingVertical: 4, alignItems: "center" },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbImage: { width: 80, height: 80 },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: `${Colors.gold}50`,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.gold}08`,
    gap: 4,
  },
  addBtnText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.gold,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    gap: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  modalOptionSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalDivider: { height: 1, backgroundColor: Colors.border },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "80%",
  },
  fullScreenClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
