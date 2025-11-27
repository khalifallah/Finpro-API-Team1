import sharp from "sharp";
import AppError from "../errors/app.error";
import {
  cloudinaryUpload,
  cloudinaryRemove,
  extractPublicIdFromUrl,
} from "./cloudinary.utils";

export const processImage = async (
  file: Express.Multer.File,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    folder?: string;
  }
): Promise<string> => {
  try {
    const {
      width = 400,
      height = 400,
      quality = 80,
      folder = "profile_photos",
    } = options || {};

    // Validate file type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError("Invalid file type", 400);
    }

    // Process image - resize and optimize
    const buffer = await sharp(file.buffer)
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality })
      .toBuffer();

    // Create a new file object with processed buffer
    const processedFile: Express.Multer.File = {
      ...file,
      buffer: buffer,
      originalname: `profile-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}.jpg`,
      mimetype: "image/jpeg",
    };

    // Upload to Cloudinary
    const result = await cloudinaryUpload(processedFile);

    return result.secure_url;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Image processing error:", error);
    throw new AppError("Failed to process image", 500);
  }
};

export const processMultipleImages = async (
  files: Express.Multer.File[],
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    folder?: string;
  }
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) => processImage(file, options));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error("Multiple images processing error:", error);
    throw new AppError("Failed to process multiple images", 500);
  }
};

// Function to delete profile photo from Cloudinary
export const deleteProfilePhoto = async (photoUrl: string): Promise<void> => {
  try {
    if (!photoUrl) return;

    await cloudinaryRemove(photoUrl);
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    // Don't throw error as this is non-critical
  }
};

// Function to delete multiple images from Cloudinary
export const deleteMultipleImages = async (
  imageUrls: string[]
): Promise<void> => {
  try {
    if (!imageUrls || imageUrls.length === 0) return;

    const deletePromises = imageUrls.map((url) => cloudinaryRemove(url));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting multiple images:", error);
    // Don't throw error as this is non-critical
  }
};
