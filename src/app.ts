import express, {
  Application,
  json,
  NextFunction,
  Request,
  Response,
  urlencoded,
} from "express";
import cors from "cors";
import { APP_NAME, PORT } from "./config/app.config";
import AppError from "./errors/app.error";
import sampleRoute from "./routes/sample.route";
import corsOptions from "./middlewares/express/cors";
import adminRoutes from "./routes/admin.route";
import productRoutes from "./routes/product.route";
import categoryRoutes from "./routes/category.route";
import StockRoutes from "./routes/stock.route";
import authRoutes from "./routes/auth.route";
import orderRoutes from "./routes/order.route";
import storeRoutes from "./routes/store.route";
import prisma from "./libs/prisma";

export default class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.config();
    this.router();
    this.errorHandlers();
  }

  private config(): void {
    this.app.use(json());
    this.app.use(urlencoded({ extended: true }));
    this.app.use(cors(corsOptions));
  }

  private router(): void {
    const apiRouter = express.Router();

    // Prefix all routes with /api
    this.app.use("/api", apiRouter);

    // Welcome route
    apiRouter.get("/", (_: Request, res: Response) =>
      res.send(`Welcome to the ${APP_NAME} API`)
    );

    //* Define routes here
    apiRouter.use("/samples", sampleRoute.useRouter());
    apiRouter.use("/admin", adminRoutes);
    apiRouter.use("/products", productRoutes);
    apiRouter.use("/categories", categoryRoutes);
    apiRouter.use("/auth", authRoutes);
    apiRouter.use("/orders", orderRoutes);
    apiRouter.use("/stocks", StockRoutes);
    apiRouter.use("/stores", storeRoutes);
  }

  private errorHandlers(): void {
    // * 404 Handler
    this.app.use((_: Request, res: Response) => {
      console.error("404 Not Found");
      return res.status(404).send({ message: "Not Found" });
    });

    // * Global Error Handler
    this.app.use(
      (error: AppError, _: Request, res: Response, __: NextFunction) => {
        console.table({
          errorStatus: error.status,
          errorMessage: error.message,
        });
        console.log(error);
        return res.status(error.status || 500).send({
          status: error.status || 500,
          message: error.message || "Internal Server Error",
        });
      }
    );
  }

  // Database connection test
  public async initialize(): Promise<{ success: boolean }> {
    try {
      console.log("Testing database connection...");

      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database connection successful");

      return { success: true };
    } catch (error) {
      console.error("Database connection failed:", error);
      console.log(`
DATABASE CONNECTION FAILED!

Please check:
1. Is PostgreSQL running?
2. Are your DATABASE_URL credentials correct in .env?
3. Does the database exist?
      `);
      throw error;
    }
  }

  start(): void {
    this.app.listen(PORT, () =>
      console.log(`-> [API] Local: http://localhost:${PORT}`)
    );
  }
}
