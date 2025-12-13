import "dotenv/config";

const APP_NAME = process.env.APP_NAME || "MyApp";
const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

if (!DATABASE_URL) {
  console.error(" DATABASE_URL is required in environment variables");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error(" AUTH_JWT_SECRET is required in environment variables");
  process.exit(1);
}

export { APP_NAME, PORT, DATABASE_URL, JWT_SECRET, CLIENT_URL };

export const {
  SECRET_KEY,
  CLOUDINARY_NAME,
  CLOUDINARY_KEY,
  CLOUDINARY_SECRET,
  NODEMAILER_USER,
  NODEMAILER_PASS,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  RAJAONGKIR_API_KEY,
  RAJAONGKIR_BASE_URL,
  SHIPPING_BASE_COST,
  SHIPPING_COST_PER_KM,
  MAX_SHIPPING_DISTANCE_KM,
} = process.env;
