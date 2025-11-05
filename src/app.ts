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

export default class App {
	private app: Application;

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
		// Define routes here
		apiRouter.use("/samples", sampleRoute.useRouter());
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
				return res.status(error.status || 500).send({
					status: error.status || 500,
					message: error.message || "Internal Server Error",
				});
			}
		);
	}

	start(): void {
		this.app.listen(PORT, () =>
			console.log(`-> [API] Local: http://localhost:${PORT}`)
		);
	}
}
