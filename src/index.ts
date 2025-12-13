import App from "./app";
import { Request, Response } from "express";

const app = new App();

if (process.env.NODE_ENV !== "production") {
  app
    .initialize()
    .then(() => {
      console.log("DB Connected (Local)");
    })
    .catch(console.error);
}

if (process.env.NODE_ENV !== "production") {
  app.start();
}

const expressApp = app.app;

export default function handler(req: Request, res: Response) {
  return expressApp(req, res);
}
