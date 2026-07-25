/** @type {import('tailwindcss').Config} */
const blueScale = {
  50: '#eff8fd',
  100: '#dff2fb',
  200: '#c1dff0',
  300: '#a7d4e8',
  400: '#88CCF1',
  500: '#6fb9d8',
  600: '#3587A4',
  700: '#2D848A',
  800: '#256a72',
  900: '#1c4f5c',
  950: '#123741',
};

const grayScale = {
  50: '#f7fbfd',
  100: '#eff7fa',
  200: '#dcebf1',
  300: '#c1dff0',
  400: '#9dc8d8',
  500: '#7cabbc',
  600: '#5c8a9a',
  700: '#456974',
  800: '#304a53',
  900: '#21343a',
  950: '#101b1f',
};

const greenScale = {
  50: '#eefaf9',
  100: '#d7f3f3',
  200: '#b7e9ea',
  300: '#8fdbdd',
  400: '#64cbcf',
  500: '#43b4bb',
  600: '#2D898B',
  700: '#2D848A',
  800: '#26686d',
  900: '#1f4d50',
  950: '#15363a',
};

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blue: blueScale,
        gray: grayScale,
        green: greenScale,
        indigo: blueScale,
        purple: blueScale,
      },
    },
  },
  plugins: [],
};
