import "dotenv/config";

const APP_NAME = process.env.APP_NAME || "MyApp";
const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

if (!DATABASE_URL) {
  console.error(" DATABASE_URL is required in environment variables");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error(" AUTH_JWT_SECRET is required in environment variables");
  process.exit(1);
}

export { APP_NAME, PORT, DATABASE_URL, JWT_SECRET };

export const {
  SECRET_KEY,
  CLOUDINARY_NAME,
  CLOUDINARY_KEY,
  CLOUDINARY_SECRET,
  NODEMAILER_USER,
  NODEMAILER_PASS,
  FE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;
