const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_MATERIALS || "uploads";

function requireStorageEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Konfigurasi Supabase belum lengkap. Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.");
  }

  return {
    url: SUPABASE_URL.replace(/\/$/, ""),
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    bucket: SUPABASE_BUCKET,
  };
}

function sanitizeFileName(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : "";
  const baseName = parts.join(".") || "file";

  const safeBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return `${safeBaseName || "file"}${extension}`;
}

export async function uploadToSupabaseStorage({
  file,
  folder,
}: {
  file: File;
  folder: string;
}) {
  const config = requireStorageEnv();
  const fileName = sanitizeFileName(file.name);
  const objectPath = `${folder}/${Date.now()}-${fileName}`;

  const response = await fetch(
    `${config.url}/storage/v1/object/${config.bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: Buffer.from(await file.arrayBuffer()),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Upload ke bucket "${config.bucket}" gagal. Pastikan bucket ada dan key Supabase benar. Detail: ${errorText}`,
    );
  }

  const publicUrl = `${config.url}/storage/v1/object/public/${config.bucket}/${objectPath}`;

  return {
    path: objectPath,
    publicUrl,
    bucket: config.bucket,
  };
}
