/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      "flex-center": {
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
      },
    }
  },
  plugins: [],
  daisyui: {
    themes: ["light", "dark"],
  }
};