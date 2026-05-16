import type { Config } from "tailwindcss";

/*
 * Tailwind v4 reads design tokens from the `@theme` block in `src/app/globals.css`.
 * This config exists for content-scanning + dark-mode strategy only.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
