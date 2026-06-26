"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { clearAdminSession, createAdminSessionValue, getAuthConfig, hasAuthConfig, isAdminAuthenticated, loginSchema } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { parseImportedQuestionsFile, type ImportedQuestionInput } from "@/lib/question-import";
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

export type ImportReviewStatus = "valid" | "warning" | "error";

export type ImportReviewQuestion = {
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";
  prompt: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  correctAnswer: "A" | "B" | "C" | "D" | "E" | null;
  correctAnswers: string | null;
  sampleAnswer: string | null;
  explanation: string | null;
  points: number;
};

export type ImportQuestionReviewItem = {
  id: string;
  orderNumber: number;
  status: ImportReviewStatus;
  warnings: string[];
  errors: string[];
  imageCount: number;
  promptPreview: string;
  question: ImportReviewQuestion;
  debug: {
    parserQuestion: ImportedQuestionInput;
    payloadInput: {
      questionType: string;
      prompt: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      optionE: string;
      correctAnswer: string;
      correctAnswers: string;
      sampleAnswer: string;
      explanation: string;
      points: string;
    };
    normalizedQuestion: ImportReviewQuestion | null;
  };
};

export type ImportQuestionReview = {
  total: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  items: ImportQuestionReviewItem[];
};

export type ImportQuestionFormState = {
  error?: string;
  success?: string;
  importedFileName?: string;
  importReview?: ImportQuestionReview;
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

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function normalizeVideoMaterialUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    const isYoutubeHost = hostname === "youtu.be" || hostname.endsWith("youtube.com");
    const isGoogleDriveHost = hostname === "drive.google.com" || hostname === "docs.google.com";

    if (!["http:", "https:"].includes(url.protocol) || (!isYoutubeHost && !isGoogleDriveHost)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function describeVideoMaterialSource(videoUrl: string) {
  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) {
      return "Link Video YouTube";
    }

    if (hostname === "drive.google.com" || hostname === "docs.google.com") {
      return "Link Video Google Drive";
    }
  } catch {
    return "Link Video";
  }

  return "Link Video";
}

function mapAccessLevel(value: string) {
  return value === "preview" ? "PREVIEW" : "ENROLLED";
}

function mapContentStatus(value: string) {
  return value === "published" ? "PUBLISHED" : "DRAFT";
}

function normalizeExerciseScope(value: string) {
  return value === "category" ? "CATEGORY" : "TOPIC";
}

function buildExerciseCategoryKey(category: string, difficulty: string) {
  return `${category}:::${difficulty}`;
}

function parseExerciseCategoryKey(value: string) {
  const [category = "", difficulty = ""] = value.split(":::");

  return {
    category: category.trim(),
    difficulty: difficulty.trim(),
  };
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
    isUploadedFile(materialFile)
      ? await uploadToSupabaseStorage({
          file: materialFile,
          folder: `materials/${topicId}/files`,
        })
      : null;

  const coverUpload =
    isUploadedFile(materialCover)
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
  const validAnswers = uniqueAnswers.filter((item) => ["A", "B", "C", "D", "E"].includes(item));

  return validAnswers;
}

function normalizeTrueFalseAnswerKeys(value: string) {
  return normalizeAnswerKeys(value).filter((item) => item !== "E");
}

const optionKeys = ["A", "B", "C", "D", "E"] as const;

type QuestionPayloadInput = {
  questionType: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: string;
  correctAnswers: string;
  sampleAnswer: string;
  explanation: string;
  points: string;
};

function mapQuestionTypeToReviewType(value: string): ImportReviewQuestion["questionType"] {
  const normalized = value.trim().toLowerCase();

  if (normalized === "multiple-choice" || normalized === "multiple_choice") {
    return "MULTIPLE_CHOICE";
  }

  if (normalized === "essay") {
    return "ESSAY";
  }

  if (normalized === "true-false" || normalized === "true_false") {
    return "TRUE_FALSE";
  }

  return "SINGLE_CHOICE";
}

function summarizePromptPreview(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function countMarkdownImages(value: string) {
  return (value.match(/!\[[^\]]*]\([^)]+\)/g) ?? []).length;
}

function countReviewQuestionImages(question: ImportReviewQuestion) {
  return [
    question.prompt,
    question.optionA,
    question.optionB,
    question.optionC,
    question.optionD,
    question.optionE,
    question.sampleAnswer,
    question.explanation,
  ].reduce((count, value) => count + countMarkdownImages(value ?? ""), 0);
}

function createReviewQuestionFromPayloadInput(payloadInput: QuestionPayloadInput): ImportReviewQuestion {
  return {
    questionType: mapQuestionTypeToReviewType(payloadInput.questionType),
    prompt: payloadInput.prompt,
    optionA: payloadInput.optionA || null,
    optionB: payloadInput.optionB || null,
    optionC: payloadInput.optionC || null,
    optionD: payloadInput.optionD || null,
    optionE: payloadInput.optionE || null,
    correctAnswer: (payloadInput.correctAnswer.trim().toUpperCase() as ImportReviewQuestion["correctAnswer"]) || null,
    correctAnswers: payloadInput.correctAnswers.trim().toUpperCase() || null,
    sampleAnswer: payloadInput.sampleAnswer || null,
    explanation: payloadInput.explanation || null,
    points: parseQuestionPoints(payloadInput.points.trim() || "10") ?? 10,
  };
}

function createImportReviewItem({
  errors,
  orderNumber,
  parserQuestion,
  payloadInput,
  payloadResult,
  warnings = [],
}: {
  errors?: string[];
  orderNumber: number;
  parserQuestion: ImportedQuestionInput;
  payloadInput: QuestionPayloadInput;
  payloadResult: ReturnType<typeof buildQuestionPayloadFromInput>;
  warnings?: string[];
}): ImportQuestionReviewItem {
  const normalizedQuestion =
    "data" in payloadResult && payloadResult.data
      ? {
          questionType: payloadResult.data.questionType,
          prompt: payloadResult.data.prompt,
          optionA: payloadResult.data.optionA,
          optionB: payloadResult.data.optionB,
          optionC: payloadResult.data.optionC,
          optionD: payloadResult.data.optionD,
          optionE: payloadResult.data.optionE,
          correctAnswer: payloadResult.data.correctAnswer,
          correctAnswers: payloadResult.data.correctAnswers,
          sampleAnswer: payloadResult.data.sampleAnswer,
          explanation: payloadResult.data.explanation,
          points: payloadResult.data.points,
        }
      : null;
  const questionForReview = normalizedQuestion ?? createReviewQuestionFromPayloadInput(payloadInput);
  const itemErrors = (errors ?? ("error" in payloadResult ? [payloadResult.error] : [])).filter(
    (value): value is string => Boolean(value),
  );
  const status: ImportReviewStatus = itemErrors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

  return {
    id: `import-review-${orderNumber}`,
    orderNumber,
    status,
    warnings,
    errors: itemErrors,
    imageCount: countReviewQuestionImages(questionForReview),
    promptPreview: summarizePromptPreview(questionForReview.prompt),
    question: questionForReview,
    debug: {
      parserQuestion,
      payloadInput,
      normalizedQuestion,
    },
  };
}

function createImportReview(items: ImportQuestionReviewItem[]): ImportQuestionReview {
  return {
    total: items.length,
    validCount: items.filter((item) => item.status === "valid").length,
    warningCount: items.filter((item) => item.status === "warning").length,
    errorCount: items.filter((item) => item.status === "error").length,
    items,
  };
}

function parseQuestionPoints(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 10;
  }

  const directParsed = Number(normalized);

  if (Number.isInteger(directParsed) && directParsed >= 0) {
    return directParsed;
  }

  const numericMatch = normalized.match(/-?\d+(?:[.,]\d+)?/);

  if (!numericMatch) {
    return null;
  }

  const parsed = Number(numericMatch[0].replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed);
}

function isRemoteImageUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

async function uploadRemoteImageToStorage(imageUrl: string, folder: string, fallbackName: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Gagal mengambil gambar dari ${imageUrl}.`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const extension = contentType.split("/")[1]?.split(";")[0] || "jpg";
  const file = new File([Buffer.from(await response.arrayBuffer())], `${fallbackName}.${extension}`, {
    type: contentType,
  });

  const uploaded = await uploadToSupabaseStorage({
    file,
    folder,
  });

  return uploaded.publicUrl;
}

async function uploadImportedQuestionImages(question: ImportedQuestionInput, exerciseId: string, questionIndex: number) {
  const folder = `questions/${exerciseId}`;
  const imageEntries: Array<keyof Pick<
    ImportedQuestionInput,
    "imageQuestion" | "imageOptionA" | "imageOptionB" | "imageOptionC" | "imageOptionD" | "imageOptionE"
  >> = ["imageQuestion", "imageOptionA", "imageOptionB", "imageOptionC", "imageOptionD", "imageOptionE"];

  const nextQuestion = { ...question };

  for (const field of imageEntries) {
    const rawValue = nextQuestion[field];
    const items = rawValue
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length === 0) {
      continue;
    }

    const uploadedItems: string[] = [];

    for (const [imageIndex, item] of items.entries()) {
      if (!isRemoteImageUrl(item)) {
        uploadedItems.push(item);
        continue;
      }

      uploadedItems.push(
        await uploadRemoteImageToStorage(
          item,
          folder,
          `import-${questionIndex + 1}-${field.toLowerCase()}-${imageIndex + 1}`,
        ),
      );
    }

    nextQuestion[field] = uploadedItems.join(",");
  }

  return nextQuestion;
}

function appendImageMarkdown(text: string, imageValue: string, altText: string) {
  const imageEntries = imageValue
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (imageEntries.length === 0) {
    return text.trim();
  }

  const imageTokens = imageEntries.map((url) => `![${altText}](${url})`).join("\n");
  return [text.trim(), imageTokens].filter(Boolean).join("\n\n").trim();
}

function mapImportedQuestionToPayloadInput(question: ImportedQuestionInput): QuestionPayloadInput {
  return {
    questionType: question.questionType,
    prompt: appendImageMarkdown(question.prompt, question.imageQuestion, "Gambar soal"),
    optionA: appendImageMarkdown(question.optionA, question.imageOptionA, "Gambar opsi A"),
    optionB: appendImageMarkdown(question.optionB, question.imageOptionB, "Gambar opsi B"),
    optionC: appendImageMarkdown(question.optionC, question.imageOptionC, "Gambar opsi C"),
    optionD: appendImageMarkdown(question.optionD, question.imageOptionD, "Gambar opsi D"),
    optionE: appendImageMarkdown(question.optionE, question.imageOptionE, "Gambar opsi E"),
    correctAnswer: question.correctAnswer,
    correctAnswers: question.correctAnswers,
    sampleAnswer: question.sampleAnswer,
    explanation: question.explanation,
    points: question.points,
  };
}

function buildQuestionPayloadFromInput({
  questionType,
  prompt,
  optionA,
  optionB,
  optionC,
  optionD,
  optionE,
  correctAnswer,
  correctAnswers,
  sampleAnswer,
  explanation,
  points,
}: QuestionPayloadInput) {
  const normalizedQuestionType = questionType.trim();
  const normalizedPrompt = prompt.trim();
  const normalizedOptionA = optionA.trim();
  const normalizedOptionB = optionB.trim();
  const normalizedOptionC = optionC.trim();
  const normalizedOptionD = optionD.trim();
  const normalizedOptionE = optionE.trim();
  const normalizedCorrectAnswer = correctAnswer.trim().toUpperCase();
  const normalizedCorrectAnswers = correctAnswers.trim().toUpperCase();
  const normalizedSampleAnswer = sampleAnswer.trim();
  const normalizedExplanation = explanation.trim();
  const normalizedPoints = parseQuestionPoints(points.trim() || "10");

  if (normalizedPoints === null) {
    return { error: "Poin soal wajib berupa angka 0 atau lebih." } as const;
  }

  if (!normalizedPrompt) {
    return { error: "Pertanyaan wajib diisi." } as const;
  }

  const options = {
    A: normalizedOptionA,
    B: normalizedOptionB,
    C: normalizedOptionC,
    D: normalizedOptionD,
    E: normalizedOptionE,
  } satisfies Record<(typeof optionKeys)[number], string>;
  const filledOptionKeys = optionKeys.filter((key) => Boolean(options[key]));
  const hasChoiceAnswers = Boolean(normalizedCorrectAnswer || normalizedCorrectAnswers);
  const isTrueFalseQuestion = normalizedQuestionType === "true-false";
  const shouldTreatAsEssay =
    normalizedQuestionType === "essay" ||
    (!isTrueFalseQuestion && !hasChoiceAnswers && Boolean(normalizedSampleAnswer || normalizedExplanation));

  if (shouldTreatAsEssay) {
    if (!normalizedSampleAnswer && !normalizedExplanation) {
      return { error: "Untuk soal esai, isi jawaban contoh atau pembahasan." } as const;
    }

    return {
      data: {
        questionType: "ESSAY" as const,
        prompt: normalizedPrompt,
        optionA: null,
        optionB: null,
        optionC: null,
        optionD: null,
        optionE: null,
        correctAnswer: null,
        correctAnswers: null,
        sampleAnswer: normalizedSampleAnswer || normalizedExplanation,
        explanation: normalizedExplanation || null,
        points: normalizedPoints,
      },
    } as const;
  }

  if (isTrueFalseQuestion) {
    const answerSource = normalizedCorrectAnswers || normalizedCorrectAnswer;
    const normalizedSourceAnswers = normalizeAnswerKeys(answerSource);
    const answers = normalizeTrueFalseAnswerKeys(answerSource);

    if (!filledOptionKeys.length) {
      return { error: "Untuk soal benar/salah, isi minimal satu pernyataan." } as const;
    }

    if (normalizedOptionE) {
      return { error: "Soal benar/salah saat ini maksimal 4 pernyataan." } as const;
    }

    const highestFilledIndex = Math.max(...filledOptionKeys.map((key) => optionKeys.indexOf(key)));
    const missingBeforeHighest = optionKeys
      .slice(0, highestFilledIndex)
      .filter((key) => !options[key]);

    if (missingBeforeHighest.length > 0) {
      return {
        error: `Pernyataan ${missingBeforeHighest.join(", ")} masih kosong. Isi pernyataan secara berurutan tanpa melompati huruf.`,
      } as const;
    }

    if (normalizedSourceAnswers.includes("E")) {
      return { error: "Soal benar/salah hanya mendukung pernyataan A sampai D." } as const;
    }

    const invalidAnswers = answers.filter((answer) => !filledOptionKeys.includes(answer as (typeof optionKeys)[number]));

    if (invalidAnswers.length > 0) {
      return {
        error: `Pernyataan benar ${invalidAnswers.join(", ")} belum punya isi.`,
      } as const;
    }

    return {
      data: {
        questionType: "TRUE_FALSE" as const,
        prompt: normalizedPrompt,
        optionA: normalizedOptionA,
        optionB: normalizedOptionB,
        optionC: normalizedOptionC || null,
        optionD: normalizedOptionD || null,
        optionE: null,
        correctAnswer: null,
        correctAnswers: answers.length > 0 ? answers.join(",") : null,
        sampleAnswer: null,
        explanation: normalizedExplanation || null,
        points: normalizedPoints,
      },
    } as const;
  }

  if (filledOptionKeys.length < 2) {
    return { error: "Untuk soal pilihan, isi minimal dua opsi jawaban." } as const;
  }

  const highestFilledIndex = Math.max(...filledOptionKeys.map((key) => optionKeys.indexOf(key)));
  const missingBeforeHighest = optionKeys
    .slice(0, highestFilledIndex)
    .filter((key) => !options[key]);

  if (missingBeforeHighest.length > 0) {
    return {
      error: `Opsi ${missingBeforeHighest.join(", ")} masih kosong. Isi opsi secara berurutan tanpa melompati huruf.`,
    } as const;
  }

  if (normalizedQuestionType === "multiple-choice") {
    const answerSource = normalizedCorrectAnswers || normalizedCorrectAnswer;
    const answers = normalizeAnswerKeys(answerSource);

    if (answers.length < 2) {
      return { error: "Untuk pilihan jamak, isi minimal dua jawaban benar. Contoh: A,C" } as const;
    }

    const invalidAnswers = answers.filter((answer) => !filledOptionKeys.includes(answer as (typeof optionKeys)[number]));

    if (invalidAnswers.length > 0) {
      return { error: `Jawaban benar ${invalidAnswers.join(", ")} belum punya opsi yang terisi.` } as const;
    }

    return {
      data: {
        questionType: "MULTIPLE_CHOICE" as const,
        prompt: normalizedPrompt,
        optionA: normalizedOptionA,
        optionB: normalizedOptionB,
        optionC: normalizedOptionC,
        optionD: normalizedOptionD,
        optionE: normalizedOptionE || null,
        correctAnswer: null,
        correctAnswers: answers.join(","),
        sampleAnswer: null,
        explanation: normalizedExplanation || null,
        points: normalizedPoints,
      },
    } as const;
  }

  if (!optionKeys.includes(normalizedCorrectAnswer as (typeof optionKeys)[number])) {
    return { error: "Pilih satu kunci jawaban untuk soal pilihan ganda." } as const;
  }

  if (!filledOptionKeys.includes(normalizedCorrectAnswer as (typeof optionKeys)[number])) {
    return { error: `Kunci jawaban ${normalizedCorrectAnswer} belum punya opsi yang terisi.` } as const;
  }

  return {
    data: {
      questionType: "SINGLE_CHOICE" as const,
      prompt: normalizedPrompt,
      optionA: normalizedOptionA,
      optionB: normalizedOptionB,
      optionC: normalizedOptionC,
      optionD: normalizedOptionD,
      optionE: normalizedOptionE || null,
      correctAnswer: normalizedCorrectAnswer as "A" | "B" | "C" | "D" | "E",
      correctAnswers: null,
      sampleAnswer: null,
      explanation: normalizedExplanation || null,
      points: normalizedPoints,
    },
  } as const;
}

function buildQuestionPayload(formData: FormData) {
  const prompt = appendImageMarkdown(
    String(formData.get("prompt") ?? ""),
    String(formData.get("promptImages") ?? ""),
    "Gambar soal",
  );
  const optionA = appendImageMarkdown(
    String(formData.get("optionA") ?? ""),
    String(formData.get("optionAImages") ?? ""),
    "Gambar opsi A",
  );
  const optionB = appendImageMarkdown(
    String(formData.get("optionB") ?? ""),
    String(formData.get("optionBImages") ?? ""),
    "Gambar opsi B",
  );
  const optionC = appendImageMarkdown(
    String(formData.get("optionC") ?? ""),
    String(formData.get("optionCImages") ?? ""),
    "Gambar opsi C",
  );
  const optionD = appendImageMarkdown(
    String(formData.get("optionD") ?? ""),
    String(formData.get("optionDImages") ?? ""),
    "Gambar opsi D",
  );
  const optionE = appendImageMarkdown(
    String(formData.get("optionE") ?? ""),
    String(formData.get("optionEImages") ?? ""),
    "Gambar opsi E",
  );
  const sampleAnswer = appendImageMarkdown(
    String(formData.get("sampleAnswer") ?? ""),
    String(formData.get("sampleAnswerImages") ?? ""),
    "Gambar jawaban contoh",
  );
  const explanation = appendImageMarkdown(
    String(formData.get("explanation") ?? ""),
    String(formData.get("explanationImages") ?? ""),
    "Gambar pembahasan",
  );

  return buildQuestionPayloadFromInput({
    questionType: String(formData.get("questionType") ?? "single-choice"),
    prompt,
    optionA,
    optionB,
    optionC,
    optionD,
    optionE,
    correctAnswer: String(formData.get("correctAnswer") ?? ""),
    correctAnswers: String(formData.get("correctAnswers") ?? ""),
    sampleAnswer,
    explanation,
    points: String(formData.get("points") ?? "10"),
  });
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
  const materialStatus = String(formData.get("materialStatus") ?? "").trim();
  const materialAccess = String(formData.get("materialAccess") ?? "").trim();
  const materialDescription = String(formData.get("materialDescription") ?? "").trim();
  const materialVideoUrl = String(formData.get("materialVideoUrl") ?? "").trim();
  const materialFile = formData.get("materialFile");
  const materialCover = formData.get("materialCover");
  const nextMaterialType = mapMaterialType(materialType);
  const isVideoMaterial = nextMaterialType === "VIDEO";
  const normalizedVideoUrl = isVideoMaterial ? normalizeVideoMaterialUrl(materialVideoUrl) : null;
  const uploadedMaterialFile = isUploadedFile(materialFile) ? materialFile : null;
  const uploadedMaterialCover = isUploadedFile(materialCover) ? materialCover : null;

  if (!topicId || !materialTitle || !materialType) {
    return {
      error: "Pilih topic lalu lengkapi data materi sebelum menyimpan.",
    };
  }

  if (isVideoMaterial && !normalizedVideoUrl) {
    return {
      error: "Untuk materi video, masukkan link YouTube atau Google Drive yang valid.",
    };
  }

  if (!isVideoMaterial && !uploadedMaterialFile) {
    return {
      error: "Untuk materi selain video, upload file materinya terlebih dahulu.",
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
      materialFile: isVideoMaterial ? null : materialFile,
      materialCover,
    });

    await prismaResult.prisma.material.create({
      data: {
        topicId,
        title: materialTitle,
        description: materialDescription || null,
        type: nextMaterialType,
        status: mapContentStatus(materialStatus),
        accessLevel: mapAccessLevel(materialAccess),
        fileName: isVideoMaterial ? describeVideoMaterialSource(normalizedVideoUrl!) : uploadedMaterialFile!.name,
        coverName: uploadedMaterialCover?.name ?? null,
        filePath: isVideoMaterial ? null : (fileUpload?.path ?? null),
        coverPath: coverUpload?.path ?? null,
        fileUrl: isVideoMaterial ? normalizedVideoUrl : (fileUpload?.publicUrl ?? null),
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
  const materialStatus = String(formData.get("materialStatus") ?? "").trim();
  const materialAccess = String(formData.get("materialAccess") ?? "").trim();
  const materialDescription = String(formData.get("materialDescription") ?? "").trim();
  const materialVideoUrl = String(formData.get("materialVideoUrl") ?? "").trim();
  const materialFile = formData.get("materialFile");
  const materialCover = formData.get("materialCover");
  const nextMaterialType = mapMaterialType(materialType);
  const isVideoMaterial = nextMaterialType === "VIDEO";
  const normalizedVideoUrl = isVideoMaterial ? normalizeVideoMaterialUrl(materialVideoUrl) : null;
  const uploadedMaterialFile = isUploadedFile(materialFile) ? materialFile : null;
  const uploadedMaterialCover = isUploadedFile(materialCover) ? materialCover : null;

  if (!materialId || !topicId || !materialTitle || !materialType) {
    return {
      error: "Data materi belum lengkap. Pilih topic dan lengkapi informasi utamanya.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  const existingMaterial = await prismaResult.prisma.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      type: true,
      fileName: true,
      filePath: true,
      fileUrl: true,
    },
  });

  if (!existingMaterial) {
    return {
      error: "Materi yang ingin diubah tidak ditemukan. Buka ulang dari daftar materi lalu coba lagi.",
    };
  }

  if (isVideoMaterial && !normalizedVideoUrl) {
    return {
      error: "Untuk materi video, masukkan link YouTube atau Google Drive yang valid.",
    };
  }

  if (!isVideoMaterial && !uploadedMaterialFile && existingMaterial.type === "VIDEO") {
    return {
      error: "Karena tipe materi diubah dari video, upload file baru untuk materi ini.",
    };
  }

  try {
    const { fileUpload, coverUpload } = await uploadMaterialAssets({
      topicId,
      materialFile: isVideoMaterial ? null : materialFile,
      materialCover,
    });

    await prismaResult.prisma.material.update({
      where: { id: materialId },
      data: {
        topicId,
        title: materialTitle,
        description: materialDescription || null,
        type: nextMaterialType,
        status: mapContentStatus(materialStatus),
        accessLevel: mapAccessLevel(materialAccess),
        fileName: isVideoMaterial
          ? describeVideoMaterialSource(normalizedVideoUrl!)
          : uploadedMaterialFile
            ? uploadedMaterialFile.name
            : undefined,
        coverName: uploadedMaterialCover ? uploadedMaterialCover.name : undefined,
        filePath: isVideoMaterial ? null : fileUpload?.path,
        coverPath: coverUpload?.path,
        fileUrl: isVideoMaterial ? normalizedVideoUrl : fileUpload?.publicUrl,
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

export async function updateMaterialPublishStatusAction(formData: FormData) {
  await ensureAuthenticatedRedirect();

  const materialId = String(formData.get("materialId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "").trim();

  if (!materialId) {
    redirect("/admin/content?status=material-missing");
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    redirect("/admin/content?status=database-offline");
  }

  try {
    await prismaResult.prisma.material.update({
      where: { id: materialId },
      data: {
        status: intent === "publish" ? "PUBLISHED" : "DRAFT",
      },
    });
  } catch {
    redirect(`/admin/content?status=${intent === "publish" ? "material-publish-failed" : "material-unpublish-failed"}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  redirect(`/admin/content?status=${intent === "publish" ? "material-published" : "material-unpublished"}`);
}

export async function createExerciseAction(
  _prevState: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const placementScope = String(formData.get("placementScope") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim();
  const categoryKey = String(formData.get("categoryKey") ?? "").trim();
  const exerciseTitle = String(formData.get("exerciseTitle") ?? "").trim();
  const exerciseStatus = String(formData.get("exerciseStatus") ?? "").trim();
  const exerciseAccess = String(formData.get("exerciseAccess") ?? "").trim();
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();
  const normalizedScope = normalizeExerciseScope(placementScope);

  if (!exerciseTitle) {
    return {
      error: "Isi judul latihan terlebih dahulu sebelum menyimpan.",
    };
  }

  if (normalizedScope === "TOPIC" && !topicId) {
    return {
      error: "Pilih topic tujuan untuk latihan ini.",
    };
  }

  if (normalizedScope === "CATEGORY" && !categoryKey) {
    return {
      error: "Pilih kategori dan jenjang tujuan untuk latihan ini.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  let topic:
    | {
        id: string;
        title: string;
        category: string;
        difficulty: string;
      }
    | null = null;

  try {
    if (normalizedScope === "CATEGORY") {
      const { category, difficulty } = parseExerciseCategoryKey(categoryKey);

      topic = await prismaResult.prisma.topic.findFirst({
        where: {
          category,
          difficulty,
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, category: true, difficulty: true },
      });
    } else {
      topic = await prismaResult.prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true, title: true, category: true, difficulty: true },
      });
    }
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal membaca penempatan latihan dari database."),
    };
  }

  if (!topic) {
    return {
      error:
        normalizedScope === "CATEGORY"
          ? "Belum ada topic pada kategori dan jenjang yang dipilih."
          : "Topic yang dipilih tidak ditemukan.",
    }
  }

  try {
    await prismaResult.prisma.exercise.create({
      data: {
        topicId: topic.id,
        materialId: null,
        scope: normalizedScope,
        title: exerciseTitle,
        questionCount: 0,
        status: mapContentStatus(exerciseStatus),
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
      normalizedScope === "CATEGORY"
        ? `Latihan "${exerciseTitle}" berhasil ditambahkan ke kategori ${topic.category} - ${topic.difficulty}.`
        : `Latihan "${exerciseTitle}" berhasil ditambahkan ke topic "${topic.title}".`,
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
  const placementScope = String(formData.get("placementScope") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim();
  const categoryKey = String(formData.get("categoryKey") ?? "").trim();
  const exerciseTitle = String(formData.get("exerciseTitle") ?? "").trim();
  const exerciseStatus = String(formData.get("exerciseStatus") ?? "").trim();
  const exerciseAccess = String(formData.get("exerciseAccess") ?? "").trim();
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();
  const normalizedScope = normalizeExerciseScope(placementScope);

  if (!exerciseId || !exerciseTitle) {
    return {
      error: "Data latihan belum lengkap. Isi judul dan penempatannya.",
    };
  }

  if (normalizedScope === "TOPIC" && !topicId) {
    return {
      error: "Pilih topic tujuan untuk latihan ini.",
    };
  }

  if (normalizedScope === "CATEGORY" && !categoryKey) {
    return {
      error: "Pilih kategori dan jenjang tujuan untuk latihan ini.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  let nextTopic:
    | {
        id: string;
        title: string;
        category: string;
        difficulty: string;
      }
    | null = null;

  try {
    if (normalizedScope === "CATEGORY") {
      const { category, difficulty } = parseExerciseCategoryKey(categoryKey);

      nextTopic = await prismaResult.prisma.topic.findFirst({
        where: {
          category,
          difficulty,
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, category: true, difficulty: true },
      });
    } else {
      nextTopic = await prismaResult.prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true, title: true, category: true, difficulty: true },
      });
    }
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal membaca penempatan latihan."),
    };
  }

  if (!nextTopic) {
    return {
      error:
        normalizedScope === "CATEGORY"
          ? "Belum ada topic pada kategori dan jenjang yang dipilih."
          : "Topic yang dipilih tidak ditemukan.",
    };
  }

  try {
    await prismaResult.prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        topicId: nextTopic.id,
        materialId: null,
        scope: normalizedScope,
        title: exerciseTitle,
        status: mapContentStatus(exerciseStatus),
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
    success:
      normalizedScope === "CATEGORY"
        ? `Perubahan latihan "${exerciseTitle}" berhasil disimpan untuk kategori ${nextTopic.category} - ${nextTopic.difficulty}.`
        : `Perubahan latihan "${exerciseTitle}" berhasil disimpan.`,
  };
}

export async function updateExercisePublishStatusAction(formData: FormData) {
  await ensureAuthenticatedRedirect();

  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const redirectBase =
    returnTo && returnTo.startsWith("/admin/exercises/") && returnTo.endsWith("/edit")
      ? returnTo
      : "/admin/content";

  if (!exerciseId) {
    redirect("/admin/content?status=exercise-missing");
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    redirect("/admin/content?status=database-offline");
  }

  try {
    await prismaResult.prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        status: intent === "publish" ? "PUBLISHED" : "DRAFT",
      },
    });
  } catch {
    redirect(`${redirectBase}?status=${intent === "publish" ? "exercise-publish-failed" : "exercise-unpublish-failed"}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/exercises/${exerciseId}/edit`);
  redirect(`${redirectBase}?status=${intent === "publish" ? "exercise-published" : "exercise-unpublished"}`);
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

export async function importQuestionsAction(
  _prevState: ImportQuestionFormState,
  formData: FormData,
): Promise<ImportQuestionFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const importMode = String(formData.get("importMode") ?? "append").trim();
  const importFile = formData.get("importFile");

  if (!exerciseId) {
    return {
      error: "Latihan tujuan tidak ditemukan.",
    };
  }

  if (!(importFile instanceof File) || importFile.size === 0) {
    return {
      error: "Pilih file .docx terlebih dahulu sebelum import.",
    };
  }

  const importedFileName = importFile.name.trim() || "file tanpa nama";

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
      error: "Latihan tujuan tidak ditemukan. Buka ulang halaman latihan lalu coba lagi.",
    };
  }

  let parsedResult;

  try {
    parsedResult = await parseImportedQuestionsFile(importFile);
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "File import gagal diproses."),
    };
  }

  if ("error" in parsedResult) {
    return parsedResult;
  }

  const normalizedQuestions: Array<
    NonNullable<ReturnType<typeof buildQuestionPayloadFromInput>["data"]>
  > = [];
  const importReviewItems: ImportQuestionReviewItem[] = [];

  for (const [index, importedQuestion] of parsedResult.questions.entries()) {
    const payloadInput = mapImportedQuestionToPayloadInput(importedQuestion);
    const payloadResult = buildQuestionPayloadFromInput(payloadInput);

    importReviewItems.push(
      createImportReviewItem({
        orderNumber: index + 1,
        parserQuestion: importedQuestion,
        payloadInput,
        payloadResult,
      }),
    );
  }

  const importReview = createImportReview(importReviewItems);

  if (importReview.errorCount > 0) {
    return {
      error:
        importReview.errorCount === 1
          ? "Ada 1 soal yang belum valid. Periksa detail soal yang berstatus error sebelum import dilanjutkan."
          : `Ada ${importReview.errorCount} soal yang belum valid. Periksa detail soal yang berstatus error sebelum import dilanjutkan.`,
      importedFileName,
      importReview,
    };
  }

  for (const [index, importedQuestion] of parsedResult.questions.entries()) {
    const uploadedQuestion = await uploadImportedQuestionImages(importedQuestion, exerciseId, index);
    const payloadResult = buildQuestionPayloadFromInput(mapImportedQuestionToPayloadInput(uploadedQuestion));

    if ("error" in payloadResult) {
      const failedReview = createImportReview(
        importReviewItems.map((item) =>
          item.orderNumber === index + 1
            ? {
                ...item,
                status: "error",
                errors: payloadResult.error ? [payloadResult.error] : item.errors,
              }
            : item,
        ),
      );

      return {
        error: `Soal ke-${index + 1} pada file import belum valid. ${payloadResult.error}`,
        importedFileName,
        importReview: failedReview,
      };
    }

    normalizedQuestions.push(payloadResult.data);
  }

  try {
    await prismaResult.prisma.$transaction(async (tx) => {
      if (importMode === "replace") {
        await tx.question.deleteMany({
          where: { exerciseId },
        });
      }

      const lastQuestion = await tx.question.findFirst({
        where: { exerciseId },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });

      const startOrderNumber = (lastQuestion?.orderNumber ?? 0) + 1;

      await tx.question.createMany({
        data: normalizedQuestions.map((question, index) => ({
          exerciseId,
          orderNumber: startOrderNumber + index,
          ...question,
        })),
      });

      const nextCount = await tx.question.count({
        where: { exerciseId },
      });

      await tx.exercise.update({
        where: { id: exerciseId },
        data: { questionCount: nextCount },
      });
    });
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Import soal gagal disimpan ke database."),
    };
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/exercises/${exerciseId}/edit`);

  return {
    importedFileName,
    importReview,
    success: `${normalizedQuestions.length} soal dari file "${importedFileName}" berhasil diimport ke latihan "${exercise.title}" dengan mode ${importMode === "replace" ? '"ganti soal lama"' : '"tambahkan ke soal yang sudah ada"'}.`,
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

export async function bulkUpdateQuestionsAction(
  _prevState: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const authError = await ensureAuthenticatedState();

  if (authError) {
    return authError;
  }

  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const questionIds = formData
    .getAll("questionIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!exerciseId || questionIds.length === 0) {
    return {
      error: "Tidak ada soal yang dipilih untuk disimpan.",
    };
  }

  const prismaResult = getRequiredPrisma();

  if ("error" in prismaResult) {
    return prismaResult;
  }

  const parsedQuestions = [];
  const usedOrderNumbers = new Set<number>();

  for (const [index, questionId] of questionIds.entries()) {
    const prefix = `${questionId}__`;
    const orderValue = String(formData.get(`${prefix}orderNumber`) ?? "").trim();
    const orderNumber = parseQuestionOrder(orderValue);

    if (!orderNumber) {
      return {
        error: `Nomor urut soal ke-${index + 1} belum valid.`,
      };
    }

    if (usedOrderNumbers.has(orderNumber)) {
      return {
        error: `Nomor urut ${orderNumber} dipakai lebih dari satu soal. Gunakan nomor unik untuk setiap soal.`,
      };
    }

    usedOrderNumbers.add(orderNumber);

    const payloadResult = buildQuestionPayloadFromInput({
      questionType: String(formData.get(`${prefix}questionType`) ?? "single-choice"),
      prompt: appendImageMarkdown(
        String(formData.get(`${prefix}prompt`) ?? ""),
        String(formData.get(`${prefix}promptImages`) ?? ""),
        "Gambar soal",
      ),
      optionA: appendImageMarkdown(
        String(formData.get(`${prefix}optionA`) ?? ""),
        String(formData.get(`${prefix}optionAImages`) ?? ""),
        "Gambar opsi A",
      ),
      optionB: appendImageMarkdown(
        String(formData.get(`${prefix}optionB`) ?? ""),
        String(formData.get(`${prefix}optionBImages`) ?? ""),
        "Gambar opsi B",
      ),
      optionC: appendImageMarkdown(
        String(formData.get(`${prefix}optionC`) ?? ""),
        String(formData.get(`${prefix}optionCImages`) ?? ""),
        "Gambar opsi C",
      ),
      optionD: appendImageMarkdown(
        String(formData.get(`${prefix}optionD`) ?? ""),
        String(formData.get(`${prefix}optionDImages`) ?? ""),
        "Gambar opsi D",
      ),
      optionE: appendImageMarkdown(
        String(formData.get(`${prefix}optionE`) ?? ""),
        String(formData.get(`${prefix}optionEImages`) ?? ""),
        "Gambar opsi E",
      ),
      correctAnswer: String(formData.get(`${prefix}correctAnswer`) ?? ""),
      correctAnswers: String(formData.get(`${prefix}correctAnswers`) ?? ""),
      sampleAnswer: appendImageMarkdown(
        String(formData.get(`${prefix}sampleAnswer`) ?? ""),
        String(formData.get(`${prefix}sampleAnswerImages`) ?? ""),
        "Gambar jawaban contoh",
      ),
      explanation: appendImageMarkdown(
        String(formData.get(`${prefix}explanation`) ?? ""),
        String(formData.get(`${prefix}explanationImages`) ?? ""),
        "Gambar pembahasan",
      ),
      points: String(formData.get(`${prefix}points`) ?? "10"),
    });

    if ("error" in payloadResult) {
      return {
        error: `Soal ke-${index + 1} belum valid. ${payloadResult.error}`,
      };
    }

    parsedQuestions.push({
      questionId,
      orderNumber,
      data: payloadResult.data,
    });
  }

  try {
    await prismaResult.prisma.$transaction(
      parsedQuestions.map((question) =>
        prismaResult.prisma.question.update({
          where: { id: question.questionId },
          data: {
            orderNumber: question.orderNumber,
            ...question.data,
          },
        }),
      ),
    );

    await syncExerciseQuestionCount(prismaResult.prisma, exerciseId);
  } catch (error) {
    return {
      error: toDatabaseErrorMessage(error, "Gagal menyimpan perubahan semua soal."),
    };
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/exercises/${exerciseId}/edit`);

  return {
    success: `${parsedQuestions.length} soal berhasil diperbarui sekaligus.`,
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
