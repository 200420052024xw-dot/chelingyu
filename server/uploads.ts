import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fail } from "./state";

export const uploadDirectory = path.resolve(process.env.ADMIN_UPLOAD_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "uploads"));

export async function saveImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) fail(400, "INVALID_IMAGE", "图片大小须在 5MB 以内");
  const extension = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
    : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "jpg"
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : "";
  if (!extension) fail(400, "INVALID_IMAGE", "仅支持 PNG、JPEG 或 WebP 图片");
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDirectory, filename), bytes, { flag: "wx" });
  return `/uploads/${filename}`;
}
