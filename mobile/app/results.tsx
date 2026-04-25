import { MotiView } from "moti";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Results() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Text style={styles.header}>AI Analysis</Text>

      {/* Animated Cards */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 500 }}
      >
        {/* Card 1 */}
        <View style={styles.card}>
          <Text style={styles.title}>Detected Condition</Text>
          <Text style={styles.text}>Viral Infection (Common Cold)</Text>
        </View>

        {/* Card 2 */}
        <View style={styles.card}>
          <Text style={styles.title}>Confidence</Text>
          <Text style={styles.confidence}>84%</Text>
        </View>

        {/* Card 3 */}
        <View style={styles.card}>
          <Text style={styles.title}>Recommendations</Text>
          <Text style={styles.text}>
            • Rest and hydration{"\n"}
            • Monitor symptoms{"\n"}
            • Consult doctor if worsening
          </Text>
        </View>
      </MotiView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Gemini AI (Demo Mode)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0F172A",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  text: {
    marginTop: 6,
    color: "#475569",
  },
  confidence: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  footer: {
    marginTop: 10,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});