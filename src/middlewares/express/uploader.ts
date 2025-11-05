import { Request } from "express";
import multer from "multer";
import { join } from "path";

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error?: Error | null, acceptFile?: boolean) => void;

export const uploader = (filePrefix: string, folderName?: string) => {
	const defaultDir = join(__dirname, "../../public");

	const storage = multer.diskStorage({
		destination: (
			req: Request,
			file: Express.Multer.File,
			cb: DestinationCallback
		) => {
			const destination = folderName ? defaultDir + folderName : defaultDir;
			cb(null, destination);
		},
		filename: (
			req: Request,
			file: Express.Multer.File,
			cb: FilenameCallback
		) => {
			const originalNameParts = file.originalname.split(".");
			const fileExtension = originalNameParts.at(-1);
			const newFileName = `${filePrefix}-${Date.now()}.${fileExtension}`;
			cb(null, newFileName);
		},
	});

	const fileFilter = (
		req: Request,
		file: Express.Multer.File,
		cb: FileFilterCallback
	) => {
		if (!["image/png", "image/jpeg"].includes(file.mimetype)) {
			cb(new Error("Invalid file type"), false);
		} else {
			cb(null, true);
		}
	};

	const ONE_MB = 1 * 1024 * 1024;
	const limits = { fileSize: 1.5 * ONE_MB }; // 1.5MB

	return multer({ storage, fileFilter, limits });
};
