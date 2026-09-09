/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Display bercirikan (heading, angka besar) vs body yang netral.
        display: ['Bricolage Grotesque', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        /* --------------------------------------------------------------
         *  WARM EDITORIAL — espresso, kertas krem, aksen saffron.
         *  Netral sengaja bernuansa hangat (undertone cokelat) agar tidak
         *  terlihat seperti dashboard abu-abu kebiruan pada umumnya.
         * ------------------------------------------------------------- */
        ink: {
          50: '#F8F5F0', 100: '#F0EBE3', 150: '#E9E3D9', 200: '#DED7CC',
          300: '#C0B7AA', 400: '#9C9184', 500: '#7A6E62', 600: '#5C5147',
          700: '#453C33', 800: '#2E2721', 900: '#1F1A15', 950: '#14100C',
        },
        /** Aksen utama: saffron. Dipakai untuk sorotan, bukan untuk semua tombol. */
        brand: {
          50: '#FEF7EA', 100: '#FCEBC8', 200: '#F8D68E', 300: '#F3BE55',
          400: '#ECA82E', 500: '#E0921A', 600: '#C4770F', 700: '#9C5B0E',
          800: '#7A4712', 900: '#613A13', 950: '#3D2409',
        },
        success: { 50: '#EEF5EF', 100: '#D7E8DB', 200: '#B4D5BC', 500: '#4A9366', 600: '#3B7A53', 700: '#2F6242' },
        warning: { 50: '#FBF1EA', 100: '#F5DEC9', 200: '#EBC29C', 500: '#C2703A', 600: '#A55A2B', 700: '#85471F' },
        danger:  { 50: '#FCF0EE', 100: '#F7DAD4', 200: '#EFB4A8', 500: '#C0402B', 600: '#A63423', 700: '#86291B' },
        info:    { 50: '#EEF1F8', 100: '#D8DFF1', 200: '#B4C1E3', 500: '#4A5FA5', 600: '#3B4D8A', 700: '#2F3D6E' },
        plum:    { 50: '#F5EFF5', 100: '#E7D9E8', 200: '#D2B9D3', 500: '#7C4D77', 600: '#663D62', 700: '#52314F' },
      },
      boxShadow: {
        // Bayangan bernuansa hangat, bukan abu-abu netral.
        card: '0 1px 2px 0 rgb(31 26 21 / 0.04), 0 1px 3px 0 rgb(31 26 21 / 0.05)',
        elev: '0 4px 14px -3px rgb(31 26 21 / 0.10), 0 2px 6px -2px rgb(31 26 21 / 0.06)',
        pop: '0 18px 42px -12px rgb(20 16 12 / 0.24), 0 6px 16px -6px rgb(20 16 12 / 0.12)',
        tile: '0 1px 0 0 rgb(255 255 255 / 0.6) inset, 0 1px 2px 0 rgb(31 26 21 / 0.06)',
        glow: '0 0 0 1px rgb(224 146 26 / 0.35), 0 6px 20px -6px rgb(224 146 26 / 0.45)',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      letterSpacing: { tightest: '-0.045em' },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
        'sheen': {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(220%) skewX(-18deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        sheen: 'sheen 1.1s ease-out',
      },
    },
  },
  plugins: [],
}
