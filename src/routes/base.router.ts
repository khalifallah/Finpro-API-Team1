import express, { Router } from "express";

export default class BaseRouter {
	protected router: Router;

	constructor() {
		this.router = express.Router();
		this.initializeRoutes();
	}

	protected initializeRoutes(): void {
		// Define your routes here
	}

	public useRouter(): Router {
		return this.router;
	}
}
