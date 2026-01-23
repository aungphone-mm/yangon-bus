import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#405CAA',
        secondary: '#2C8A6C',
        accent: '#DF504E',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}
export default config
