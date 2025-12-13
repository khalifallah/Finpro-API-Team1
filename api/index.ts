// api/index.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { json, urlencoded } from "express";

import corsOptions from "../src/middlewares/express/cors";

import sampleRoute from "../src/routes/sample.route";
import adminRoutes from "../src/routes/admin.route";
import productRoutes from "../src/routes/product.route";
import categoryRoutes from "../src/routes/category.route";
import authRoutes from "../src/routes/auth.route";
import orderRoutes from "../src/routes/order.route";
import StockRoutes from "../src/routes/stock.route";
import discountRoutes from "../src/routes/discount.route";
import storeRoutes from "../src/routes/store.route";
import homepageRoutes from "../src/routes/homepage.route";
import cartRoute from "../src/routes/cart.route";
import reportRoutes from "../src/routes/report.route";

import prisma from "../src/libs/prisma";

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
  res.send("Welcome to the API");
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
    console.log("DB Connected");
  }
}

/* ================== ✅ VERCEL HANDLER ================== */
export default async function handler(req: any, res: any) {
  await bootstrap();
  return app(req, res);
}
