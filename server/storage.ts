// File storage helper - configure your own provider (S3, Cloudinary, local disk, etc.)
// This stub always throws; replace with your preferred storage backend.
export async function uploadFile(_buffer: Buffer, _filename: string): Promise<string> {
  throw new Error("Storage not configured. Implement uploadFile() in server/storage.ts");
}
