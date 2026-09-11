import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/our_share/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@phosphor-icons")) {
            return "icons";
          }

          if (id.includes("react")) {
            return "react";
          }

          if (id.includes("@firebase/auth") || id.includes("firebase/auth")) {
            return "firebase-auth";
          }

          if (
            id.includes("@firebase/firestore") ||
            id.includes("firebase/firestore")
          ) {
            return "firebase-firestore";
          }

          if (
            id.includes("@firebase/database") ||
            id.includes("firebase/database")
          ) {
            return "firebase-database";
          }

          if (id.includes("@firebase") || id.includes("firebase/")) {
            return "firebase-core";
          }

          return "vendor";
        },
      },
    },
  },
  plugins: [react()],
});
