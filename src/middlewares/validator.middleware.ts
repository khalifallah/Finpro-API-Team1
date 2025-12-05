import { Request, Response, NextFunction } from "express";
import { AnySchema, ValidationError } from "yup";
import AppError from "../errors/app.error";

export const validateRequest = (schema: AnySchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`[VALIDATION] Validating ${req.method} ${req.originalUrl}`);
    console.log(`[VALIDATION] Request body:`, req.body);
    console.log(`[VALIDATION] Query params:`, req.query);

    try {
      // use synchronous validation so we can catch and format errors easily
      schema.validateSync(req.body, { abortEarly: false, stripUnknown: true });
    } catch (err) {
      if (err && err instanceof ValidationError) {
        const errorMessage: string = (err.errors || []).join(", ");
        console.log(`[VALIDATION ERROR] Schema:`, schema);
        console.log(`[VALIDATION ERROR] Details:`, err.errors);
        throw new AppError(errorMessage, 400);
      }
      // rethrow unexpected errors
      throw err;
    }

    console.log(`[VALIDATION] Validation passed`);
    next();
  };
};
