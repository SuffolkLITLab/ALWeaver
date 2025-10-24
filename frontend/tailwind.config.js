/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0f172a',
        surface: '#1e293b',
        panel: '#111827',
        accent: {
          DEFAULT: '#2563eb',
          foreground: '#f8fafc',
        },
        outline: '#334155',
        muted: '#cbd5f5',
      },
      boxShadow: {
        panel: '0 10px 30px -12px rgba(15, 23, 42, 0.45)',
      },
      borderRadius: {
        xl: '1.25rem',
      },
    },
  },
  plugins: [],
};
