/** @type {import('tailwindcss').Config} */
/* Palette derived from Pirate Doc WordPress theme.json */
const blueScale = {
  50: '#f3f8fb',
  100: '#e4f1f6',
  200: '#c7e4ec',
  300: '#a0d4e0',
  400: '#74C9D7',
  500: '#4fb0c4',
  600: '#2F86A8',
  700: '#2E8E8F',
  800: '#226a7a',
  900: '#164E6B',
  950: '#0f3649',
};

const grayScale = {
  50: '#FBF8F1',
  100: '#F6F2E8',
  200: '#E8D9BC',
  300: '#d4c3a0',
  400: '#b7a57f',
  500: '#8f8164',
  600: '#6d6450',
  700: '#4f4a3f',
  800: '#223F5A',
  900: '#164E6B',
  950: '#0f3649',
};

const greenScale = {
  50: '#eef8f8',
  100: '#d7efef',
  200: '#b5e0e1',
  300: '#86cbcd',
  400: '#55b1b4',
  500: '#3a9a9c',
  600: '#2E8E8F',
  700: '#267275',
  800: '#215b5e',
  900: '#1e4b4e',
  950: '#0f3033',
};

const yellowScale = {
  50: '#fbf6e8',
  100: '#f5ebcc',
  200: '#ead79a',
  300: '#dec068',
  400: '#C9A24E',
  500: '#b58b3a',
  600: '#98702f',
  700: '#7a5729',
  800: '#664726',
  900: '#553b24',
  950: '#301f12',
};

const redScale = {
  50: '#f8ecec',
  100: '#efd6d6',
  200: '#dfadad',
  300: '#c97d7d',
  400: '#b05757',
  500: '#8F3C3C',
  600: '#7a3232',
  700: '#652b2b',
  800: '#542727',
  900: '#482424',
  950: '#270f0f',
};

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blue: blueScale,
        gray: grayScale,
        green: greenScale,
        yellow: yellowScale,
        red: redScale,
        indigo: blueScale,
        purple: blueScale,
        slate: grayScale,
        amber: yellowScale,
      },
    },
  },
  plugins: [],
};
