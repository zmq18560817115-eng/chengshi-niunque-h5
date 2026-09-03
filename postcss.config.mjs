const config = {
  plugins: {
    tailwindcss: {},
    "postcss-px-to-viewport-8-plugin": {
      unitToConvert: "px",
      viewportWidth: (file) => (/\.vw(?:\.module)?\.css$/i.test(file) ? 750 : undefined),
      unitPrecision: 6,
      propList: ["*"],
      viewportUnit: "vw",
      fontViewportUnit: "vw",
      minPixelValue: 1,
      mediaQuery: false,
      replace: true,
      exclude: [/node_modules/],
    },
    autoprefixer: {},
  },
};
export default config;
