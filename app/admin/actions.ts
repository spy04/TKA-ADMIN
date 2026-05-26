"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { clearAdminSession, createAdminSessionValue, getAuthConfig, hasAuthConfig, isAdminAuthenticated, loginSchema } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { uploadToSupabaseStorage } from "@/lib/supabase-storage";

export type LoginFormState = {
  error?: string;
};

export type TopicFormState = {
  error?: string;
  success?: string;
};

export type MaterialFormState = {
  error?: string;
  success?: string;
};

export type ExerciseFormState = {
  error?: string;
  success?: string;
};

export type QuestionFormState = {
  error?: string;
  success?: string;
};

const defaultError = "Login gagal. Periksa username dan password lalu coba lagi.";

function slugifyTopicTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function toDatabaseErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "Tabel database belum dibuat. Jalankan migrasi Prisma dulu agar tabel topic, material, exercise, dan question tersedia.";
    }

    if (error.code === "P2002") {
      return "Data dengan nilai unik yang sama sudah ada. Coba ubah isinya lalu simpan ulang.";
    }
  }

  if (error instanceof Error) {
    return `${fallbackMessage} Detail: ${error.message}`;
  }

  return fallbackMessage;
}

async function ensureAuthenticatedState() {
  const isLoggedIn = await isAdminAuthenticated();

  if (!isLoggedIn) {
    return {
      error: "Sesi admin sudah berakhir. Silakan login ulang lalu lanjutkan perubahan.",
    };
  }

  return null;
}

async function ensureAuthenticatedRedirect() {
  const isLoggedIn = await isAdminAuthenticated();

  if (!isLoggedIn) {
    redirect("/admin/login");
  }
}

function getRequiredPrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      error: "DATABASE_URL belum aktif. Nyalakan koneksi MariaDB lokal dulu sebelum menyimpan data admin.",
    };
  }

  return { prisma };
}

function mapPreviewMode(value: string) {
  return value === "members-only" ? "ENROLLED" : "PREVIEW";
}

function mapMaterialType(value: string) {
  if (value === "pdf") return "PDF";
  if (value === "slide") return "SLIDE";
  if (value === "dokumen") return "DOCUMENT";
  return "VIDEO";
}

function mapAccessLevel(value: string) {
  return value === "preview" ? "PREVIEW" : "ENROLLED";
}

async function uploadMaterialAssets({
  topicId,
  materialFile,
  materialCover,
}: {
  topicId: string;
  materialFile: FormDataEntryValue | null;
  materialCover: FormDataEntryValue | null;
}) {
  const fileUpload =
    materialFile instanceof File && materialFile.size > 0
      ? await uploadToSupabaseStorage({
          file: materialFile,
          folder: `materials/${topicId}/files`,
        })
      : null;

  const coverUpload =
    materialCover instanceof File && materialCover.size > 0
      ? await uploadToSupabaseStorage({
          file: materialCover,
          folder: `materials/${topicId}/covers`,
        })
      : null;

  return {
    fileUpload,
    coverUpload,
  };
}

function parseQuestionOrder(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function normalizeAnswerKeys(value: string) {
  const answers = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const uniqueAnswers = Array.from(new Set(answers));
  const validAnswers = uniqueAnswers.filter((item) => ["A", "B", "C", "D"].includes(item));

  return validAnswers;
}

function buildQuestionPayload(formData: FormData) {
  const questionType = String(formData.get("questionType") ?? "single-choice").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const optionA = String(formData.get("optionA") ?? "").trim();
  const optionB = String(formData.get("optionB") ?? "").trim();
  const optionC = String(formData.get("optionC") ?? "").trim();
  const optionD = String(formData.get("optionD") ?? "").trim();
  const correctAnswer = String(formData.get("correctAnswer") ?? "").trim().toUpperCase();
  const correctAnswersInput = String(formData.get("correctAnswers") ?? "").trim().toUpperCase();
  const sampleAnswer = String(formData.get("sampleAnswer") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();

  if (!prompt) {
    return { error: "Pertanyaan wajib diisi." } as const;
  }

  if (questionType === "essay") {
    if (!sampleAnswer) {
      return { error: "Jawaban contoh untuk soal esai wajib diisi." } as const;
    }

    return {
      data: {
        questionType: "ESSAY" as const,
        prompt,
        optionA: null,
        optionB: null,
        optionC: null,
        optionD: null,
        correctAnswer: null,
        correctAnswers: null,
        sampleAnswer,
        explanation: explanation || null,
      },
    } as const;
  }

  if (!optionA || !optionB || !optionC || !optionD) {
    return { error: "Untuk soal pilihan, isi semua opsi A sampai D." } as const;
  }

  if (questionType === "multiple-choice") {
    const answers = normalizeAnswerKeys(correctAnswersInput);

    if (answers.length < 2) {
      return { error: "Untuk pilihan jamak, isi minimal dua jawaban benar. Contoh: A,C" } as const;
    }

    return {
      data: {
        questionType: "MULTIPLE_CHOICE" as const,
        prompt,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer: null,
        correctAnswers: answers.join(","),
        sampleAnswer: null,
        explanation: explanation || null,
      },
    } as const;
  }

  if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    return { error: "Pilih satu kunci jawaban untuk soal pilihan ganda." } as const;
  }

  return {
    data: {
      questionType: "SINGLE_CHOICE" as const,
      prompt,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer: correctAnswer as "A" | "B" | "C" | "D",
      correctAnswers: null,
      sampleAnswer: null,
      explanation: explanation || null,
    },
  } as const;
}

async function syncExerciseQuestionCount(prisma: NonNullable<ReturnType<typeof getPrismaClient>>, exerciseId: string) {
  const count = await prisma.question.count({
    where: { exerciseId },
  });

  await prisma.exercise.update({
    where: { id: exerciseId },
    data: { questionCount: count },
  });
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  if (!hasAuthConfig()) {
    return {
      error: "Konfigurasi admin belum lengkap. Isi ADMIN_USERNAME, ADMIN_PASSWORD, dan ADMIN_SESSION_SECRET terlebih dahulu.",
    };
  }

  const parsed = loginSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: "Username dan password wajib diisi." };
  }

  const auth = getAuthConfig();
  const usernameMatches = parsed.data.username === auth.username;
  const passwordMatches = parsed.data.password === auth.password;

  if (!usernameMatches || !passwordMatches) {
    return { error: defaultError };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: auth.cookieName,
    value: createAdminSessionValue(parsed.data.username, auth.secret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/admin");
}

export async function logoutAction() {
  if (!hasAuthConfig()) {
    redirect("/admin/login");
  }

  const auth = getAuthConfig();
  const cookieStore = await cookies();
  clearAdminSession(cookieStore, auth.cookieName);
  redirect("/admin/login");
}

export async function createTopicDraftAction(
  _prevState: TopicFormState,
  formData: FormData,
): Promise<TopicFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const topicTitle = String(formData.get("topicTitle") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "").trim();
  const previewMode = String(formData.get("previewMode") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();

  if (!topicTitle || !category || !difficulty) {
    return {
      error: "Lengkapi dulu data utama topic sebelum menyimpan.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  const slugBase = slugifyTopicTitle(topicTitle) || "topic-baru";
  const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

  try {
    await prismaResult.prisma.topic.create({
      data: {
        title: topicTitle,
        slug,
        category,
        difficulty,
        summary: summary || null,
        previewMode: mapPreviewMode(previewMode),
      },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal menyimpan topic ke database."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");

  return {
    success: `Topic "${topicTitle}" berhasil disimpan. Sekarang admin bisa lanjut tambah materi, latihan, atau isi soal dari latihan terkait.`,
  };
}

export async function updateTopicAction(
  _prevState: TopicFormState,
  formData: FormData,
): Promise<TopicFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const topicId = String(formData.get("topicId") ?? "").trim();
  const topicTitle = String(formData.get("topicTitle") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "").trim();
  const previewMode = String(formData.get("previewMode") ?? "").trim();
  const topicStatus = String(formData.get("topicStatus") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();

  if (!topicId || !topicTitle || !category || !difficulty) {
    return {
      error: "Data topic belum lengkap. Periksa judul, kategori, dan level kesulitan.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  try {
    await prismaResult.prisma.topic.update({
      where: { id: topicId },
      data: {
        title: topicTitle,
        category,
        difficulty,
        summary: summary || null,
        status: topicStatus === "published" ? "PUBLISHED" : "DRAFT",
        previewMode: mapPreviewMode(previewMode),
      },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal memperbarui topic."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/topics/${topicId}/edit`);

  return {
    success: `Perubahan topic "${topicTitle}" berhasil disimpan.`,
  };
}

export async function updateTopicPublishStatusAction(formData: FormData) {
  await ensureAuthenticatedRedirect();

  const topicId = String(formData.get("topicId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "").trim();

  if (!topicId) {
    redirect("/admin/content?status=topic-missing");
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    redirect("/admin/content?status=database-offline");
  }

  try {
    await prismaResult.prisma.topic.update({
      where: { id: topicId },
      data: {
        status: intent === "publish" ? "PUBLISHED" : "DRAFT",
      },
    });
  } catch {
    redirect(`/admin/content?status=${intent === "publish" ? "topic-publish-failed" : "topic-unpublish-failed"}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/topics/${topicId}/edit`);
  redirect(`/admin/content?status=${intent === "publish" ? "topic-published" : "topic-unpublished"}`);
}

export async function deleteTopicAction(formData: FormData) {
  await ensureAuthenticatedRedirect();

  const topicId = String(formData.get("topicId") ?? "").trim();

  if (!topicId) {
    redirect("/admin/content?status=topic-missing");
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    redirect("/admin/content?status=database-offline");
  }

  try {
    await prismaResult.prisma.topic.delete({
      where: { id: topicId },
    });
  } catch {
    redirect("/admin/content?status=topic-delete-failed");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  redirect("/admin/content?status=topic-deleted");
}

export async function createMaterialAction(
  _prevState: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const topicId = String(formData.get("topicId") ?? "").trim();
  const materialTitle = String(formData.get("materialTitle") ?? "").trim();
  const materialType = String(formData.get("materialType") ?? "").trim();
  const materialAccess = String(formData.get("materialAccess") ?? "").trim();
  const materialDescription = String(formData.get("materialDescription") ?? "").trim();
  const materialFile = formData.get("materialFile");
  const materialCover = formData.get("materialCover");

  if (!topicId || !materialTitle || !materialType) {
    return {
      error: "Pilih topic lalu lengkapi data materi sebelum menyimpan.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  let topic;

  try {
    topic = await prismaResult.prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, title: true },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal membaca data topic dari database."),
    };
  }

  if (!topic) {
    return {
      error: "Topic yang dipilih tidak ditemukan. Buat topic dulu sebelum menambah materi.",
    };
  }

  try {
    const { fileUpload, coverUpload } = await uploadMaterialAssets({
      topicId,
      materialFile,
      materialCover,
    });

    await prismaResult.prisma.material.create({
      data: {
        topicId,
        title: materialTitle,
        description: materialDescription || null,
        type: mapMaterialType(materialType),
        accessLevel: mapAccessLevel(materialAccess),
        fileName: materialFile instanceof File && materialFile.size > 0 ? materialFile.name : null,
        coverName: materialCover instanceof File && materialCover.size > 0 ? materialCover.name : null,
        filePath: fileUpload?.path ?? null,
        coverPath: coverUpload?.path ?? null,
        fileUrl: fileUpload?.publicUrl ?? null,
        coverUrl: coverUpload?.publicUrl ?? null,
      },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal menyimpan materi ke database."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");

  return {
    success: `Materi "${materialTitle}" berhasil ditambahkan ke topic "${topic.title}".`,
  };
}

export async function updateMaterialAction(
  _prevState: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const materialId = String(formData.get("materialId") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim();
  const materialTitle = String(formData.get("materialTitle") ?? "").trim();
  const materialType = String(formData.get("materialType") ?? "").trim();
  const materialAccess = String(formData.get("materialAccess") ?? "").trim();
  const materialDescription = String(formData.get("materialDescription") ?? "").trim();
  const materialFile = formData.get("materialFile");
  const materialCover = formData.get("materialCover");

  if (!materialId || !topicId || !materialTitle || !materialType) {
    return {
      error: "Data materi belum lengkap. Pilih topic dan lengkapi informasi utamanya.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  try {
    const { fileUpload, coverUpload } = await uploadMaterialAssets({
      topicId,
      materialFile,
      materialCover,
    });

    await prismaResult.prisma.material.update({
      where: { id: materialId },
      data: {
        topicId,
        title: materialTitle,
        description: materialDescription || null,
        type: mapMaterialType(materialType),
        accessLevel: mapAccessLevel(materialAccess),
        fileName: materialFile instanceof File && materialFile.size > 0 ? materialFile.name : undefined,
        coverName: materialCover instanceof File && materialCover.size > 0 ? materialCover.name : undefined,
        filePath: fileUpload?.path,
        coverPath: coverUpload?.path,
        fileUrl: fileUpload?.publicUrl,
        coverUrl: coverUpload?.publicUrl,
      },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal memperbarui materi."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/materials/${materialId}/edit`);

  return {
    success: `Perubahan materi "${materialTitle}" berhasil disimpan.`,
  };
}

export async function deleteMaterialAction(formData: FormData) {
  await ensureAuthenticatedRedirect();

  const materialId = String(formData.get("materialId") ?? "").trim();

  if (!materialId) {
    redirect("/admin/content?status=material-missing");
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    redirect("/admin/content?status=database-offline");
  }

  try {
    await prismaResult.prisma.material.delete({
      where: { id: materialId },
    });
  } catch {
    redirect("/admin/content?status=material-delete-failed");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  redirect("/admin/content?status=material-deleted");
}

export async function createExerciseAction(
  _prevState: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const topicId = String(formData.get("topicId") ?? "").trim();
  const relationMode = String(formData.get("relationMode") ?? "").trim();
  const materialId = String(formData.get("materialId") ?? "").trim();
  const exerciseTitle = String(formData.get("exerciseTitle") ?? "").trim();
  const exerciseAccess = String(formData.get("exerciseAccess") ?? "").trim();
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();

  if (!topicId || !exerciseTitle) {
    return {
      error: "Pilih topic dan isi judul latihan sebelum menyimpan.",
    };
  }

  if (relationMode === "material" && !materialId) {
    return {
      error: "Kalau latihan ingin terhubung ke materi, pilih materinya juga.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  let topic;

  try {
    topic = await prismaResult.prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, title: true },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal membaca topic dari database."),
    };
  }

  if (!topic) {
    return {
      error: "Topic yang dipilih tidak ditemukan.",
    };
  }

  if (relationMode === "material" && materialId) {
    let material;

    try {
      material = await prismaResult.prisma.material.findFirst({
        where: {
          id: materialId,
          topicId,
        },
        select: { id: true, title: true },
      });
    } catch (error) {
      return {
        error: toDatabaseErrorMessage(error, "Gagal membaca materi dari database."),
      };
    }

    if (!material) {
      return {
        error: "Materi yang dipilih tidak cocok dengan topic ini.",
      };
    }
  }

  try {
    await prismaResult.prisma.exercise.create({
      data: {
        topicId,
        materialId: relationMode === "material" ? materialId : null,
        title: exerciseTitle,
        questionCount: 0,
        accessLevel: mapAccessLevel(exerciseAccess),
        adminNotes: adminNotes || null,
      },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal menyimpan latihan ke database."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");

  return {
    success:
      relationMode === "material"
        ? `Latihan "${exerciseTitle}" berhasil ditambahkan dan siap diisi soal.` 
        : `Latihan "${exerciseTitle}" berhasil ditambahkan ke topic "${topic.title}" dan siap diisi soal.`,
  };
}

export async function updateExerciseAction(
  _prevState: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim();
  const relationMode = String(formData.get("relationMode") ?? "").trim();
  const materialId = String(formData.get("materialId") ?? "").trim();
  const exerciseTitle = String(formData.get("exerciseTitle") ?? "").trim();
  const exerciseAccess = String(formData.get("exerciseAccess") ?? "").trim();
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();

  if (!exerciseId || !topicId || !exerciseTitle) {
    return {
      error: "Data latihan belum lengkap. Pilih topic dan isi judul latihan.",
    };
  }

  if (relationMode === "material" && !materialId) {
    return {
      error: "Kalau latihan ingin terhubung ke materi, pilih materinya juga.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  if (relationMode === "material" && materialId) {
    const material = await prismaResult.prisma.material.findFirst({
      where: {
        id: materialId,
        topicId,
      },
      select: { id: true },
    });

    if (!material) {
      return {
        error: "Materi yang dipilih tidak cocok dengan topic latihan ini.",
      };
    }
  }

  try {
    await prismaResult.prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        topicId,
        materialId: relationMode === "material" ? materialId : null,
        title: exerciseTitle,
        accessLevel: mapAccessLevel(exerciseAccess),
        adminNotes: adminNotes || null,
      },
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal memperbarui latihan."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/exercises/${exerciseId}/edit`);

  return {
    success: `Perubahan latihan "${exerciseTitle}" berhasil disimpan.`,
  };
}

export async function deleteExerciseAction(formData: FormData) {
  await ensureAuthenticatedRedirect();

  const exerciseId = String(formData.get("exerciseId") ?? "").trim();

  if (!exerciseId) {
    redirect("/admin/content?status=exercise-missing");
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    redirect("/admin/content?status=database-offline");
  }

  try {
    await prismaResult.prisma.exercise.delete({
      where: { id: exerciseId },
    });
  } catch {
    redirect("/admin/content?status=exercise-delete-failed");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  redirect("/admin/content?status=exercise-deleted");
}

export async function createQuestionAction(
  _prevState: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const orderValue = String(formData.get("orderNumber") ?? "").trim();

  if (!exerciseId) {
    return {
      error: "Latihan tujuan tidak ditemukan.",
    };
  }

  const payloadResult = buildQuestionPayload(formData);

  if ("error" in payloadResult) {
    return payloadResult;
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  const exercise = await prismaResult.prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, title: true },
  });

  if (!exercise) {
    return {
      error: "Latihan tujuan tidak ditemukan. Simpan ulang latihan atau buka dari daftar admin.",
    };
  }

  let orderNumber = parseQuestionOrder(orderValue);

  if (!orderNumber) {
    const lastQuestion = await prismaResult.prisma.question.findFirst({
      where: { exerciseId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    orderNumber = (lastQuestion?.orderNumber ?? 0) + 1;
  }

  try {
    await prismaResult.prisma.question.create({
      data: {
        exerciseId,
        orderNumber,
        ...payloadResult.data,
      },
    });

    await syncExerciseQuestionCount(prismaResult.prisma, exerciseId);
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal menambahkan soal ke latihan."),
    };
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/exercises/${exerciseId}/edit`);

  return {
    success: `Soal baru berhasil ditambahkan ke latihan "${exercise.title}".`,
  };
}

export async function updateQuestionAction(
  _prevState: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const questionId = String(formData.get("questionId") ?? "").trim();
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const orderValue = String(formData.get("orderNumber") ?? "").trim();
  const orderNumber = parseQuestionOrder(orderValue);

  if (!questionId || !exerciseId || !orderNumber) {
    return {
      error: "Lengkapi semua data soal termasuk nomor urut yang valid.",
    };
  }

  const payloadResult = buildQuestionPayload(formData);

  if ("error" in payloadResult) {
    return payloadResult;
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  try {
    await prismaResult.prisma.question.update({
      where: { id: questionId },
      data: {
        orderNumber,
        ...payloadResult.data,
      },
    });

    await syncExerciseQuestionCount(prismaResult.prisma, exerciseId);
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal memperbarui soal."),
    };
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/exercises/${exerciseId}/edit`);

  return {
    success: "Perubahan soal berhasil disimpan.",
  };
}

export async function deleteQuestionAction(formData: FormData) {
  await ensureAuthenticatedRedirect();

  const questionId = String(formData.get("questionId") ?? "").trim();
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();

  if (!questionId || !exerciseId) {
    redirect("/admin/content?status=question-missing");
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    redirect(`/admin/exercises/${exerciseId}/edit?status=database-offline`);
  }

  try {
    await prismaResult.prisma.question.delete({
      where: { id: questionId },
    });

    await syncExerciseQuestionCount(prismaResult.prisma, exerciseId);
  } catch {
    redirect(`/admin/exercises/${exerciseId}/edit?status=question-delete-failed`);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/exercises/${exerciseId}/edit`);
  redirect(`/admin/exercises/${exerciseId}/edit?status=question-deleted`);
}
