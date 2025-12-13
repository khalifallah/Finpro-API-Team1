import App from "./app";

const mainApp = new App();

console.log("-> Initializing App for Vercel...");

if (process.env.NODE_ENV !== "production") {
  mainApp.initialize().then(() => {
    mainApp.start();
  });
} else {
  mainApp.initialize();
}

const app = mainApp.app;
export default app;
