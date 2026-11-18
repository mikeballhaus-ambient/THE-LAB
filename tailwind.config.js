module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "!./src/scripts/**",
    "./src/assets/styles/**/*.css"
  ],
  safelist: [
    { pattern: /!?(p|px|py|pt|pr|pb|pl)-\d+/ },
    { pattern: /!?(m|mx|my|mt|mr|mb|ml)-\d+/ },
    { pattern: /!?(text|font|leading|tracking)-.*/ },
    { pattern: /!?(bg|from|via|to)-.*/ },
    { pattern: /!?(border|rounded)-.*/ },
    { pattern: /!?(shadow)-.*/ },
    { pattern: /.+!/ }, // any important class
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          // The background: A deep, muted slate instead of black
          // Reduces "haloing" for users with astigmatism
          DEFAULT: '#1e293b',
          low: '#334155',    // For cards/sidebars
        },
        content: {
          // Off-white text: Much less "stinging" than pure #FFFFFF
          primary: '#e2e8f0',
          secondary: '#94a3b8',
        }
      },
      fontSize: {
        'xxs': '0.625rem', // 10px
      }
    }
  },
  plugins: [],
};