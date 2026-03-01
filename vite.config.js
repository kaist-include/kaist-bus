const buildDate = new Date().toISOString().slice(0, 10);

export default {
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate)
  },
  server: {
    host: true,
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        route: './route.html'
      }
    }
  }
}
