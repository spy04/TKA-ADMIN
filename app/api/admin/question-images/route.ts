import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminAuthenticatedInRequest } from "@/lib/auth";
import { uploadToSupabaseStorage } from "@/lib/supabase-storage";

function sanitizeFolderSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  if (!isAdminAuthenticatedInRequest(cookieStore)) {
    return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const exerciseId = sanitizeFolderSegment(String(formData.get("exerciseId") ?? "manual"));
  const fieldName = sanitizeFolderSegment(String(formData.get("fieldName") ?? "question"));

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Pilih file gambar terlebih dahulu." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
  }

  try {
    const uploadResult = await uploadToSupabaseStorage({
      file,
      folder: `questions/${exerciseId}/${fieldName}`,
    });

    return NextResponse.json({
      url: uploadResult.publicUrl,
      path: uploadResult.path,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload gambar gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
