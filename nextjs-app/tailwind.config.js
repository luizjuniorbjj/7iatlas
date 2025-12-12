/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0a0a0f',
        'bg-card': 'rgba(18, 18, 26, 0.8)',
        'bg-card-solid': '#12121a',
        'gradient-start': '#2F00FF',
        'gradient-mid': '#8B00FF',
        'gradient-end': '#FF00FF',
        'pink-star': '#FF1493',
        'green-aurora': '#00FFA3',
        'green-dark': '#00cc7a',
        'gold': '#FFD700',
        'red': '#ff4757',
        'cyan': '#00d9ff',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2F00FF, #8B00FF, #FF00FF)',
        'gradient-green': 'linear-gradient(135deg, #00FFA3, #00cc7a)',
      },
    },
  },
  plugins: [],
}
