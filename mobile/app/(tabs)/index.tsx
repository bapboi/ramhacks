import 'react-native-reanimated';

import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { MotiPressable } from "moti/interactions";
import { useEffect, useState } from "react";
import { Text } from "react-native";

export default function Home() {
  const [status, setStatus] = useState("Checking AI service...");
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then(() => setStatus("AI Service Online"))
      .catch(() => setStatus("AI Service Offline (demo mode)"));
  }, []);

  return (
    <MotiView
      style={{
        flex: 1,
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 600 }}
    >
      {/* Title */}
      <Text style={{ fontSize: 32, fontWeight: "700", marginBottom: 8 }}>
        MediGem
      </Text>

      {/* Subtitle */}
      <Text style={{ fontSize: 16, color: "#64748B", marginBottom: 40 }}>
        AI-powered symptom analysis with Gemini
      </Text>

      {/* Button (animated) */}
      <MotiPressable
        onPress={() => router.push("/results")}
        animate={({ pressed }) => ({
          scale: pressed ? 0.96 : 1,
        })}
        style={{
          backgroundColor: "#2563EB",
          paddingVertical: 14,
          paddingHorizontal: 28,
          borderRadius: 14,
        }}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
          Check Symptoms
        </Text>
      </MotiPressable>

      {/* Status */}
      <Text style={{ marginTop: 40, fontSize: 12, color: "#94A3B8" }}>
        {status}
      </Text>
    </MotiView>
  );
}