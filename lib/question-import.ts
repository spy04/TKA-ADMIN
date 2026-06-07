import { load } from "cheerio";
import type { ChildNode, Element } from "domhandler";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { uploadToSupabaseStorage } from "@/lib/supabase-storage";

export type ImportedQuestionInput = {
  questionType: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  imageQuestion: string;
  imageOptionA: string;
  imageOptionB: string;
  imageOptionC: string;
  imageOptionD: string;
  imageOptionE: string;
  correctAnswer: string;
  correctAnswers: string;
  sampleAnswer: string;
  explanation: string;
  points: string;
};

type ParseImportResult =
  | {
      questions: ImportedQuestionInput[];
    }
  | {
      error: string;
    };

const spreadsheetFieldAliases: Record<keyof ImportedQuestionInput, string[]> = {
  questionType: ["type", "tipe", "questiontype", "jenissoal", "jenis"],
  prompt: ["prompt", "soal", "pertanyaan", "question"],
  optionA: ["optiona", "a", "pilihana", "opsia"],
  optionB: ["optionb", "b", "pilihanb", "opsib"],
  optionC: ["optionc", "c", "pilihanc", "opsic"],
  optionD: ["optiond", "d", "pilihand", "opsid"],
  optionE: ["optione", "e", "pilihane", "opsie"],
  imageQuestion: ["imagequestion", "gambarsoal", "imagesoal", "fotoquestion", "questionimage", "imagequestionurl"],
  imageOptionA: ["imageoptiona", "gambaropsia", "gambara", "imagea", "optionaimage", "imageoptionaurl"],
  imageOptionB: ["imageoptionb", "gambaropsib", "gambarb", "imageb", "optionbimage", "imageoptionburl"],
  imageOptionC: ["imageoptionc", "gambaropsic", "gambarc", "imagec", "optioncimage", "imageoptioncurl"],
  imageOptionD: ["imageoptiond", "gambaropsid", "gambard", "imaged", "optiondimage", "imageoptiondurl"],
  imageOptionE: ["imageoptione", "gambaropsie", "gambare", "imagee", "optioneimage", "imageoptioneurl"],
  correctAnswer: ["correctanswer", "kunci", "jawabanbenar", "answerkey", "correctansw", "correctanswerkey"],
  correctAnswers: ["correctanswers", "kuncijamak", "jawabanbenarjamak", "multipleanswers", "correctansws"],
  sampleAnswer: ["sampleanswer", "jawabancontoh", "contohjawaban", "essayanswer"],
  explanation: ["explanation", "pembahasan", "penjelasan"],
  points: ["points", "point", "poin", "skor", "nilai"],
};

const docxFieldAliases = new Map<string, keyof ImportedQuestionInput>([
  ["tipe", "questionType"],
  ["type", "questionType"],
  ["jenis", "questionType"],
  ["jenis soal", "questionType"],
  ["soal", "prompt"],
  ["pertanyaan", "prompt"],
  ["question", "prompt"],
  ["kunci", "correctAnswer"],
  ["jawaban benar", "correctAnswer"],
  ["jawaban contoh", "sampleAnswer"],
  ["contoh jawaban", "sampleAnswer"],
  ["pembahasan", "explanation"],
  ["penjelasan", "explanation"],
  ["poin", "points"],
  ["point", "points"],
  ["skor", "points"],
  ["nilai", "points"],
]);

const ignoredDocxLabels = new Set(["level", "tingkat"]);

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

function cleanValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function createEmptyQuestion(): ImportedQuestionInput {
  return {
    questionType: "single-choice",
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    imageQuestion: "",
    imageOptionA: "",
    imageOptionB: "",
    imageOptionC: "",
    imageOptionD: "",
    imageOptionE: "",
    correctAnswer: "",
    correctAnswers: "",
    sampleAnswer: "",
    explanation: "",
    points: "10",
  };
}

function normalizeQuestionType(value: string) {
  const normalized = value.toLowerCase().trim().replace(/[\s-]+/g, "_");

  if (["essay", "esai"].includes(normalized)) {
    return "essay";
  }

  if (["multiple_choice", "multiplechoice", "pilihan_jamak", "jamak", "multi"].includes(normalized)) {
    return "multiple-choice";
  }

  if (["true_false", "benar_salah", "boolean"].includes(normalized)) {
    return "single-choice";
  }

  return "single-choice";
}

async function uploadSpreadsheetImageBuffer({
  buffer,
  contentType,
  index,
}: {
  buffer: Buffer;
  contentType: string;
  index: number;
}) {
  const normalizedType = contentType.toLowerCase().trim();
  const normalizedExtension = normalizedType.replace(/^image\//, "").split(";")[0];
  const mimeTypeByExtension: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
  };
  const resolvedContentType =
    normalizedType.startsWith("image/")
      ? normalizedType
      : mimeTypeByExtension[normalizedExtension] || "image/png";
  const extension = resolvedContentType.split("/")[1]?.split(";")[0] || "png";
  const file = new File([buffer], `xlsx-image-${index + 1}.${extension}`, {
    type: resolvedContentType,
  });
  const uploaded = await uploadToSupabaseStorage({
    file,
    folder: "questions/imported-images",
  });

  return uploaded.publicUrl;
}

async function parseSpreadsheetQuestions(buffer: Buffer): Promise<ParseImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return { error: "File XLSX belum memiliki sheet yang bisa dibaca." };
  }

  const headerRow = worksheet.getRow(1);
  const headersByColumn = new Map<number, string>();
  const fieldByColumn = new Map<number, keyof ImportedQuestionInput>();

  headerRow.eachCell((cell, columnNumber) => {
    const header = cleanValue(cell.text);
    const normalizedHeader = normalizeHeader(header);

    if (!normalizedHeader) {
      return;
    }

    headersByColumn.set(columnNumber, header);

    for (const [field, aliases] of Object.entries(spreadsheetFieldAliases) as [keyof ImportedQuestionInput, string[]][]) {
      if (aliases.includes(normalizedHeader)) {
        fieldByColumn.set(columnNumber, field);
        break;
      }
    }
  });

  const embeddedImagesByRow = new Map<number, Partial<Record<keyof ImportedQuestionInput, string>>>();
  const workbookMedia = ((workbook as unknown as { model?: { media?: Array<{ index: number; buffer?: Buffer; extension?: string; type?: string }> } }).model?.media ?? []);

  for (const [imageIndex, image] of worksheet.getImages().entries()) {
    const rowNumber = image.range.tl.nativeRow + 1;
    const columnNumber = image.range.tl.nativeCol + 1;
    const targetField = fieldByColumn.get(columnNumber);

    if (!targetField) {
      continue;
    }

    const media = workbookMedia.find((item) => item.index === image.imageId);

    if (!media?.buffer) {
      continue;
    }

    const imageUrl = await uploadSpreadsheetImageBuffer({
      buffer: media.buffer,
      contentType: media.extension || media.type || "png",
      index: imageIndex,
    });
    const existing = embeddedImagesByRow.get(rowNumber) ?? {};
    const previousValue = existing[targetField];
    existing[targetField] = previousValue ? `${previousValue},${imageUrl}` : imageUrl;
    embeddedImagesByRow.set(rowNumber, existing);
  }

  const questions: ImportedQuestionInput[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const question = createEmptyQuestion();
    let hasVisibleContent = false;

    for (const [columnNumber, field] of fieldByColumn.entries()) {
      const cell = row.getCell(columnNumber);
      const value = cleanValue(cell.text || cell.value);

      if (value) {
        question[field] = value;
        hasVisibleContent = true;
      }
    }

    const rowEmbeddedImages = embeddedImagesByRow.get(rowNumber);

    if (rowEmbeddedImages) {
      for (const [field, value] of Object.entries(rowEmbeddedImages) as [keyof ImportedQuestionInput, string][]) {
        if (value) {
          question[field] = value;
          hasVisibleContent = true;
        }
      }
    }

    if (!hasVisibleContent) {
      continue;
    }

    question.questionType = normalizeQuestionType(question.questionType);
    question.correctAnswer = question.correctAnswer.toUpperCase();
    question.correctAnswers = question.correctAnswers.toUpperCase();

    if (!question.prompt) {
      const sourceHeader = headersByColumn.get(1) || "question";
      return {
        error: `Baris ${rowNumber} di file XLSX belum punya kolom ${sourceHeader} yang terisi.`,
      };
    }

    questions.push(question);
  }

  if (questions.length === 0) {
    return { error: "File XLSX belum berisi baris soal yang valid." };
  }

  return { questions };
}

function appendFieldValue(question: ImportedQuestionInput, field: keyof ImportedQuestionInput, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return;
  }

  question[field] = question[field] ? `${question[field]}\n${trimmed}` : trimmed;
}

function stripPromptNumbering(value: string) {
  return value.replace(/^\d+[\).\-\s]+/, "").trim();
}

function extractAnswerKeys(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/\bDAN\b/g, ",")
    .replace(/[;&/|]+/g, ",");
  const matches = normalized.match(/\b[A-E]\b/g) ?? [];

  return Array.from(new Set(matches));
}

function parseDocxQuestionBlock(block: string): ImportedQuestionInput {
  const question = createEmptyQuestion();
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let currentField: keyof ImportedQuestionInput = "prompt";

  for (const line of lines) {
    const optionMatch = line.match(/^([ABCDE])(?:[\.\):\-]|\s)\s*(.+)$/i);

    if (optionMatch) {
      currentField = `option${optionMatch[1].toUpperCase()}` as keyof ImportedQuestionInput;
      appendFieldValue(question, currentField, optionMatch[2]);
      continue;
    }

    const labeledMatch = line.match(/^([^:]+):\s*(.*)$/);

    if (labeledMatch) {
      const rawLabel = labeledMatch[1].trim().toLowerCase();
      const normalizedLabel = rawLabel.replace(/\s+/g, " ");
      const labeledValue = labeledMatch[2].trim();

      if (ignoredDocxLabels.has(normalizedLabel)) {
        continue;
      }

      if (normalizedLabel === "jawaban") {
        const answerKeys = extractAnswerKeys(labeledValue);
        const allAnswerKeysValid = answerKeys.length > 0;

        if (allAnswerKeysValid) {
          if (answerKeys.length > 1) {
            question.questionType = "multiple-choice";
            question.correctAnswers = answerKeys.join(",");
            currentField = "correctAnswers";
          } else {
            question.correctAnswer = answerKeys[0];
            currentField = "correctAnswer";
          }
        } else {
          currentField = "sampleAnswer";
          appendFieldValue(question, currentField, labeledValue);
        }

        continue;
      }

      const mappedField = docxFieldAliases.get(normalizedLabel);

      if (mappedField) {
        currentField = mappedField;
        appendFieldValue(question, currentField, labeledValue);
        continue;
      }
    }

    appendFieldValue(question, currentField, line);
  }

  question.prompt = stripPromptNumbering(question.prompt);

  const hasChoiceOptions = [question.optionA, question.optionB, question.optionC, question.optionD, question.optionE]
    .some((option) => Boolean(option.trim()));
  const hasEssayContent = Boolean(question.sampleAnswer.trim() || question.explanation.trim());

  if (!hasChoiceOptions && hasEssayContent && question.questionType === "single-choice") {
    question.questionType = "essay";
  }

  question.questionType = normalizeQuestionType(question.questionType);
  question.correctAnswer = question.correctAnswer.toUpperCase();
  question.correctAnswers = question.correctAnswers.toUpperCase();

  return question;
}

async function parseDocxQuestions(buffer: Buffer): Promise<ParseImportResult> {
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.read("base64").then((base64) => ({
          src: `data:${image.contentType};base64,${base64}`,
        })),
      ),
    },
  );

  const $ = load(`<div id="docx-root">${html}</div>`);
  const root = $("#docx-root");

  if (root.children().length === 0) {
    return { error: "File DOCX kosong atau belum punya teks soal yang bisa dibaca." };
  }

  const blocks: string[] = [];
  let currentLines: string[] = [];

  async function uploadEmbeddedImage(dataUri: string, index: number) {
    const match = dataUri.match(/^data:(.+?);base64,(.+)$/);

    if (!match) {
      throw new Error("Format gambar DOCX tidak dikenali.");
    }

    const mimeType = match[1];
    const extension = mimeType.split("/")[1] || "png";
    const file = new File([Buffer.from(match[2], "base64")], `docx-image-${index + 1}.${extension}`, {
      type: mimeType,
    });
    const uploaded = await uploadToSupabaseStorage({
      file,
      folder: "questions/imported-images",
    });

    return uploaded.publicUrl;
  }

  async function nodeToLine(node: Element, imageCounter: { value: number }) {
    const pieces: string[] = [];

    async function walk(child: ChildNode | Element) {
      if (child.type === "text") {
        const text = cleanValue(child.data ?? "");
        if (text) {
          pieces.push(text);
        }
        return;
      }

      if (child.type !== "tag") {
        return;
      }

      if (child.tagName === "img") {
        const src = child.attribs?.src;
        if (src) {
          const imageUrl = src.startsWith("data:") ? await uploadEmbeddedImage(src, imageCounter.value++) : src;
          pieces.push(`![gambar](${imageUrl})`);
        }
        return;
      }

      if (child.tagName === "br") {
        pieces.push("\n");
        return;
      }

      for (const nestedChild of child.children ?? []) {
        await walk(nestedChild);
      }
    }

    await walk(node);

    return pieces
      .join(" ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function flushCurrentBlock() {
    if (currentLines.length === 0) {
      return;
    }

    blocks.push(currentLines.join("\n").trim());
    currentLines = [];
  }

  function looksLikeNewQuestionStart(line: string) {
    return /^soal\s*:|^\d+[\).\-\s]+/i.test(line);
  }

  const imageCounter = { value: 0 };

  for (const node of root.children().toArray()) {
    const line = await nodeToLine(node, imageCounter);

    if (!line) {
      flushCurrentBlock();
      continue;
    }

    if (looksLikeNewQuestionStart(line) && currentLines.length > 0) {
      flushCurrentBlock();
    }

    currentLines.push(line);
  }

  flushCurrentBlock();

  const questions = blocks
    .map(parseDocxQuestionBlock)
    .filter((question) => question.prompt);

  if (questions.length === 0) {
    return {
      error:
        'Format DOCX belum terbaca sebagai soal. Gunakan blok per soal, lalu beri label seperti "Soal:", "A:", "B:", "C:", "D:", "Kunci:", atau "Tipe: essay".',
    };
  }

  return { questions };
}

export async function parseImportedQuestionsFile(file: File): Promise<ParseImportResult> {
  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileName.endsWith(".xlsx")) {
    return parseSpreadsheetQuestions(buffer);
  }

  if (fileName.endsWith(".docx")) {
    return parseDocxQuestions(buffer);
  }

  return {
    error: "Format file belum didukung. Gunakan file .docx atau .xlsx.",
  };
}
