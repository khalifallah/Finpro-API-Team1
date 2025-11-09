import { NextFunction } from "express";
import yup from "../../libs/yup";
import AppError from "../app.error";
import { Prisma } from "../../generated/prisma-client";

export const appErrorHandler = (error: Error | any, next: NextFunction) => {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		return next(new AppError(error.message, 400));
	}
	if (error instanceof yup.ValidationError) {
		const messages = error.errors.join(", ");
		return next(new AppError(messages, 400));
	}
	return next(error);
};
