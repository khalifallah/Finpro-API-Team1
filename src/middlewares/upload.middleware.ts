import multer from "multer";
import { Request, Response, NextFunction } from "express";
import path from "path";

const storage = multer.memoryStorage(); // Store files in memory for processing
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExt = /jpeg|jpg|png|gif/;  // Regex For Extensions
    const allowedMime = /image\/(jpeg|jpg|png|gif)/;  // Regex For Mimetype

    const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMime.test(file.mimetype);  
    if (mimetype && extname && file.size <= 1024 * 1024) { // 1MB limit
        cb(null, true);
    } else {
        cb(new Error("Invalid file: only .jpg, .jpeg, .png, .gif files allowed, max 1MB"));
    }
};
export const uploadImages = multer({storage, fileFilter}).array("images", 5); // Max 5 images