function pad2(value) {
  return String(value).padStart(2, "0");
}

const now = new Date();
const buildDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

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
