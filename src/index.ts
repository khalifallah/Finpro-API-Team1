// api/index.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { json, urlencoded } from "express";

import corsOptions from "./middlewares/express/cors";

import sampleRoute from "./routes/sample.route";
import adminRoutes from "./routes/admin.route";
import productRoutes from "./routes/product.route";
import categoryRoutes from "./routes/category.route";
import authRoutes from "./routes/auth.route";
import orderRoutes from "./routes/order.route";
import StockRoutes from "./routes/stock.route";
import discountRoutes from "./routes/discount.route";
import storeRoutes from "./routes/store.route";
import homepageRoutes from "./routes/homepage.route";
import cartRoute from "./routes/cart.route";
import reportRoutes from "./routes/report.route";

import prisma from "./libs/prisma";

/* ================== EXPRESS APP ================== */
const app = express();

/* ================== MIDDLEWARE ================== */
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cors(corsOptions));

/* ================== ROUTER ================== */
const apiRouter = express.Router();
app.use("/api", apiRouter);

apiRouter.get("/", (_: Request, res: Response) => {
  res.send("Welcome to the Beyond Market API");
});

apiRouter.use("/samples", sampleRoute.useRouter());
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/categories", categoryRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/stocks", StockRoutes);
apiRouter.use("/discounts", discountRoutes);
apiRouter.use("/stores", storeRoutes);
apiRouter.use("/homepage", homepageRoutes);
apiRouter.use("/cart", cartRoute);
apiRouter.use("/reports", reportRoutes);

/* ================== ERROR HANDLERS ================== */
app.use((_: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err: any, _: Request, res: Response, __: NextFunction) => {
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/* ================== DB INIT ================== */
let isReady = false;

async function bootstrap() {
  if (!isReady) {
    await prisma.$queryRaw`SELECT 1`;
    isReady = true;
    console.log("Database connected successfully");
  }
}

/* ================== START SERVER (for local development) ================== */
// Add this section for local development
if (require.main === module) {
  const PORT = process.env.PORT || 8000;

  bootstrap()
    .then(() => {
      app.listen(PORT, () => {
        console.log(` Server is running on http://localhost:${PORT}`);
        console.log(` API available at http://localhost:${PORT}/api`);
      });
    })
    .catch((error) => {
      console.error("Failed to connect to database:", error);
      process.exit(1);
    });
}

/* ==================VERCEL HANDLER ================== */
export default async function handler(req: any, res: any) {
  await bootstrap();
  return app(req, res);
}
