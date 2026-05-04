import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          header: "#075E54",
          headerDark: "#054C44",
          accent: "#25D366",
          chatBg: "#ECE5DD",
          bubbleOut: "#DCF8C6",
          bubbleIn: "#FFFFFF",
          tick: "#34B7F1",
          textPrimary: "#111B21",
          textSecondary: "#667781",
        },
        acharya: {
          gold: "#C8965B",
          goldDark: "#A87741",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
      },
      backgroundImage: {
        "whatsapp-pattern":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath fill='%23dfd5c8' fill-opacity='0.35' d='M14 16c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm22 18c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm22-30c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM6 50c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm56 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
