import { NextFunction, Request, Response } from "express";
import prisma from "../libs/prisma";
import { appErrorHandler } from "../errors/handlers/app.error.handler";
import { verifyJWT } from "../libs/jwt";
import TUser from "../models/user.model";
import AppError from "../errors/app.error";

export const uniqueUserGuard = async (
	req: Request,
	_: Response,
	next: NextFunction
) => {
	try {
		const { email } = req.body;
		const user = await prisma.user.findUnique({
			where: {
				email,
			},
		});
		if (user) throw new AppError("User already exists", 400);
		next();
	} catch (error) {
		appErrorHandler(error, next);
	}
};

export const adminGuard = async (
	req: Request,
	_: Response,
	next: NextFunction
) => {
	try {
		if (!req.user) throw new AppError("User not authenticated", 401);
		if (req.user.role !== "ADMIN")
			throw new AppError("Access denied: Admins only", 403);
		next();
	} catch (error) {
		appErrorHandler(error, next);
	}
};

export const verifyToken = async (
	req: Request,
	_: Response,
	next: NextFunction
) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) throw new AppError("Authorization header missing", 401);
		const token = authHeader.split(" ")[1];
		if (!token) throw new AppError("Token missing", 401);
		const decoded = verifyJWT(token);
		if (!decoded) throw new AppError("Invalid token", 403);
		req.user = decoded as TUser;
		next();
	} catch (error) {
		appErrorHandler(error, next);
	}
};
