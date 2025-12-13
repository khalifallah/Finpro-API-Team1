import multer from "multer";
import { Request, Response, NextFunction } from "express";
import path from "path";
import AppError from "../errors/app.error";

const storage = multer.memoryStorage();

// Enhanced file filter with better error messages
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
  ];
  const allowedExtensions = [".jpeg", ".jpg", ".png", ".gif"];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  const isValidExtension = allowedExtensions.includes(fileExtension);

  if (!isValidMimeType || !isValidExtension) {
    return cb(
      new AppError(
        `Invalid file type. Only ${allowedExtensions.join(
          ", "
        )} files are allowed.`,
        400
      )
    );
  }

  // Check file size (1MB limit)
  if (file.size > 1024 * 1024) {
    return cb(
      new AppError("File too large. Maximum size allowed is 1MB.", 400)
    );
  }

  cb(null, true);
};

export const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024, // 1MB
  },
}).single("photo");

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024, // 1MB per file
    files: 5, // Max 5 files
  },
}).array("images", 5);

export const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024, // 1MB sesuai brief
  },
}).single("file");
