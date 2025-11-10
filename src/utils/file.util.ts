import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import AppError from "../errors/app.error";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export const processImage = async (file: Express.Multer.File): Promise<string> => {
    const buffer = await sharp(file.buffer).resize(800 , 600).jpeg({quality: 80}).toBuffer();
    const fileName = `${Date.now()}-${file.originalname}`;
    const {data, error} = await supabase.storage.from("product-mages").upload( fileName, buffer, {
        contentType: file.mimetype,
    });
    if (error) {
        throw new AppError("Image upload failed", 500);
    }
    return supabase.storage.from("product-images").getPublicUrl(fileName).data.publicUrl
};