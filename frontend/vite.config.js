import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()],

  server: {
    host: true, // allows LAN access (phone)
    https: false, // enables HTTPS
    port: 5173,
  },
});
