import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

export type StoredFile = {
  url: string;
  name: string;
  size: number;
  mime: string;
};

export async function storeFile(file: File): Promise<StoredFile> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filename = `${Date.now()}-${safeName}`;
  const mime = file.type || "application/octet-stream";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType: mime
    });
    return { url: blob.url, name: file.name, size: file.size, mime };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return { url: `/uploads/${filename}`, name: file.name, size: file.size, mime };
}
