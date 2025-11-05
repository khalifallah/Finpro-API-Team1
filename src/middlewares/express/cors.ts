import { CorsOptions } from "cors";

const corsOptions: CorsOptions = {
	origin: process.env.CLIENT_URL,
	credentials: true,
};

export default corsOptions;
