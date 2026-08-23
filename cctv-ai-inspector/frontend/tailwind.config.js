/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0A0D12',
        panel: '#12161D',
        'panel-raised': '#181D26',
        hairline: '#232933',
        ink: {
          primary: '#E4E7EC',
          muted: '#7C8695',
          faint: '#48505C',
        },
        signal: '#4DE8C0',
        alert: '#FF5D5D',
        amber: '#FFB020',
        audio: '#9D8CFF',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.4)',
      },
      keyframes: {
        blink: {
          '0%, 45%': { opacity: '1' },
          '50%, 95%': { opacity: '0.15' },
          '100%': { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        blink: 'blink 1.6s steps(1) infinite',
        scan: 'scan 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
