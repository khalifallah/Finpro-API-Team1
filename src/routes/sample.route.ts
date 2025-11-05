import BaseRouter from "./base.router";
import sampleController from "../controllers/sample.controller";

export default new (class SampleRoute extends BaseRouter {
	constructor() {
		super();
	}

	protected initializeRoutes(): void {
		this.router.get("/", sampleController.getSampleData);
		this.router.post("/", sampleController.createSampleData);
		this.router.put("/:id", sampleController.updateSampleData);
		this.router.delete("/:id", sampleController.deleteSampleData);
	}
})();
