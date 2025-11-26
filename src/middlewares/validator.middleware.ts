import { Request, Response, NextFunction } from "express";
import { AnySchema } from "yup";
import { appErrorHandler } from "../errors/handlers/app.error.handler";

export const validateRequest = (schema: AnySchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req.body, { abortEarly: false });
      next();
    } catch (error: any) {
      appErrorHandler(error, next);
    }
  };
};
