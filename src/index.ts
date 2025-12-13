import App from "./app";

const app = new App();

if (process.env.NODE_ENV !== "production") {
  app
    .initialize()
    .then(() => {
      console.log("Database connected, starting server...");
      app.start();
    })
    .catch((error) => {
      console.error("Failed to initialize app:", error.message);
      console.log("Starting server without database connection...");
      app.start(); // Start server anyway for testing
    });
}

const expressApp = app.app;

export default expressApp;
