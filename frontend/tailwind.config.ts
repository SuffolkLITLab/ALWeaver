import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f6f7fb',
        surface: '#ffffff',
        primary: '#2563eb',
        accent: '#0ea5e9',
        border: '#e2e8f0',
        muted: '#f1f5f9',
        'text-primary': '#1e293b',
        'text-muted': '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        card: '0 14px 40px -18px rgba(15, 23, 42, 0.45)',
        soft: '0 10px 22px -12px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
