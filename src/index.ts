import App from "./app";

const myApp = new App();

let isReady = false;

async function bootstrap() {
  if (!isReady) {
    try {
      await myApp.initialize(); // Konek DB v7
      isReady = true;
      console.log("-> [Vercel] Database Connected");
    } catch (error) {
      console.error("-> [Vercel] DB Connection Failed", error);
    }
  }
}

export default async (req: any, res: any) => {
  await bootstrap();

  return myApp.app(req, res);
};
