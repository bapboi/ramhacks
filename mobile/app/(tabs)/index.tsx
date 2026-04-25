import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function Home() {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => {
        setStatus("Backend connected: " + JSON.stringify(data));
      })
      .catch((err) => {
        console.log(err);
        setStatus("Backend NOT reachable");
      });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 18 }}>{status}</Text>
    </View>
  );
}