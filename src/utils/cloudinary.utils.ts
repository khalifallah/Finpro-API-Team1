import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import * as streamifier from "streamifier";
import {
  CLOUDINARY_KEY,
  CLOUDINARY_NAME,
  CLOUDINARY_SECRET,
} from "../config/app.config";

// Configure Cloudinary with the credentials from environment variables
cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_KEY,
  api_secret: CLOUDINARY_SECRET,
});

// Function to upload a file to Cloudinary
export function cloudinaryUpload(
  file: Express.Multer.File
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "finpro_app", // You can customize the folder
      },
      (err: unknown, res: UploadApiResponse | undefined) => {
        if (err) return reject(err);
        if (!res) return reject(new Error("No response from Cloudinary"));
        resolve(res);
      }
    );

    // Using streamifier to create a readable stream from the file buffer
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
}

// Function to extract the public ID from the secure URL
export function extractPublicIdFromUrl(url: string): string {
  try {
    // Split the URL to get the public ID
    const urlParts = url.split("/");
    // Get the last part which contains the public ID and version
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    // Remove the file extension
    const publicId = publicIdWithExtension.split(".")[0];

    // Extract folder structure if present
    const folderParts = urlParts.slice(-2, -1);
    if (
      folderParts.length > 0 &&
      folderParts[0] !== "image" &&
      folderParts[0] !== "video"
    ) {
      return `${folderParts[0]}/${publicId}`;
    }

    return publicId;
  } catch (err) {
    console.error("Error extracting public ID from URL:", err);
    throw new Error("Invalid Cloudinary URL");
  }
}

// Function to remove a file from Cloudinary
export async function cloudinaryRemove(secure_url: string) {
  try {
    const publicId = extractPublicIdFromUrl(secure_url);
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Error removing file from Cloudinary:", err);
    throw err;
  }
}

// Function to upload multiple files to Cloudinary
export async function cloudinaryUploadMultiple(
  files: Express.Multer.File[]
): Promise<UploadApiResponse[]> {
  try {
    const uploadPromises = files.map((file) => cloudinaryUpload(file));
    return await Promise.all(uploadPromises);
  } catch (err) {
    console.error("Error uploading multiple files to Cloudinary:", err);
    throw err;
  }
}
