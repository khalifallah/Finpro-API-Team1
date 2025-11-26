import App from "./app";

console.log("Starting server...");

const app = new App();

// Initialize and start server
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

export default app.app;
