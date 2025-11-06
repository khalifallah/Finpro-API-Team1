import { NextFunction, Request, Response } from "express";
import { responseBuilder } from "../utils/response.builder";

export default new (class SampleController {
  getSampleData(req: Request, res: Response, next: NextFunction): void {
    res
      .status(200)
      .send(responseBuilder(200, "Samples fetched successfully! Wow 100!", []));
  }

  createSampleData(req: Request, res: Response, next: NextFunction): void {
    // Logic to create sample data
    res
      .status(201)
      .send(responseBuilder(201, "Sample created successfully", req.body));
  }

  updateSampleData(req: Request, res: Response, next: NextFunction): void {
    // Logic to update sample data
    res
      .status(200)
      .send(responseBuilder(200, "Sample updated successfully", req.body));
  }

  deleteSampleData(req: Request, res: Response, next: NextFunction): void {
    // Logic to delete sample data
    res
      .status(200)
      .send(responseBuilder(200, "Sample deleted successfully", null));
  }
})();
