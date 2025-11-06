import "dotenv/config";

const APP_NAME = process.env.APP_NAME || "MyApp";
const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export { APP_NAME, PORT, DATABASE_URL, JWT_SECRET };
