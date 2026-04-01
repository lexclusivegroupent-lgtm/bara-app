import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/config";

export interface PlaceResult {
  address: string;
  lat?: number;
  lng?: number;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface Props {
  value: string;
  onSelect: (result: PlaceResult) => void;
  placeholder: string;
  token: string | null;
}

export function PlacesAutocomplete({ value, onSelect, placeholder, token }: Props) {
  const [inputText, setInputText] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync if parent clears value
  useEffect(() => {
    if (value === "" && inputText !== "") {
      setInputText("");
      setPredictions([]);
      setSelected(false);
    }
  }, [value]);

  const fetchPredictions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `${BASE_URL}/api/places/autocomplete?input=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortRef.current.signal,
        }
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setPredictions(data.predictions ?? []);
      setShowSuggestions(true);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setPredictions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  function handleChangeText(text: string) {
    setInputText(text);
    setSelected(false);
    onSelect({ address: text });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setPredictions([]);
      setShowSuggestions(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => fetchPredictions(text), 320);
  }

  async function handleSelectPrediction(prediction: Prediction) {
    setInputText(prediction.description);
    setPredictions([]);
    setShowSuggestions(false);
    setSelected(true);

    // Notify parent immediately with address text (coordinates come async)
    onSelect({ address: prediction.description });

    // Fetch coordinates in background
    try {
      const res = await fetch(
        `${BASE_URL}/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      onSelect({
        address: data.address ?? prediction.description,
        lat: data.lat ?? undefined,
        lng: data.lng ?? undefined,
      });
      setInputText(data.address ?? prediction.description);
    } catch {
      // Keep address text without coordinates — distance API still works
    }
  }

  function handleClear() {
    setInputText("");
    setPredictions([]);
    setShowSuggestions(false);
    setSelected(false);
    onSelect({ address: "" });
  }

  const hasSuggestions = showSuggestions && predictions.length > 0 && !selected;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputRow, hasSuggestions && styles.inputRowOpen]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          onFocus={() => {
            if (predictions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            // Delay so tap on suggestion registers first
            setTimeout(() => setShowSuggestions(false), 180);
          }}
        />
        <View style={styles.rightAdornment}>
          {loading && <ActivityIndicator size="small" color={Colors.gold} />}
          {!loading && inputText.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
          {!loading && inputText.length === 0 && (
            <Feather name="search" size={14} color={Colors.textMuted} />
          )}
        </View>
      </View>

      {hasSuggestions && (
        <View style={styles.dropdown}>
          {predictions.map((p, i) => (
            <TouchableOpacity
              key={p.placeId}
              style={[styles.suggestion, i < predictions.length - 1 && styles.suggestionBorder]}
              onPress={() => handleSelectPrediction(p)}
              activeOpacity={0.75}
            >
              <Feather name="map-pin" size={13} color={Colors.gold} style={styles.suggestionIcon} />
              <View style={styles.suggestionTexts}>
                <Text style={styles.suggestionMain} numberOfLines={1}>{p.mainText}</Text>
                {p.secondaryText ? (
                  <Text style={styles.suggestionSub} numberOfLines={1}>{p.secondaryText}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selected && (
        <View style={styles.confirmedBadge}>
          <Feather name="check-circle" size={12} color={Colors.success} />
          <Text style={styles.confirmedText}>Address confirmed</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputRowOpen: {
    // no change needed — dropdown is below
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    paddingRight: 4,
  },
  rightAdornment: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    backgroundColor: "#1C2D4A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    overflow: "hidden",
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  suggestionTexts: {
    flex: 1,
    gap: 2,
  },
  suggestionMain: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  suggestionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  confirmedText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
  },
});
