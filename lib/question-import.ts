import { load } from "cheerio";
import type { ChildNode, Element } from "domhandler";
import mammoth from "mammoth";
import { inflateRawSync } from "node:zlib";
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

function cleanValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeInlineSpacing(value: string) {
  return value.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function joinInlineParts(parts: string[]) {
  return parts
    .map((part) => normalizeInlineSpacing(part))
    .filter(Boolean)
    .reduce((combined, part) => {
      if (!combined) {
        return part;
      }

      if (/^[,.;:%!?)]/.test(part) || /[(\[]$/.test(combined)) {
        return `${combined}${part}`;
      }

      return `${combined} ${part}`;
    }, "");
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
  const choiceInstructionIndex = lines.findIndex((line) =>
    /(pilih lebih dari satu|pilih semua|pilih satu|pilih jawaban|manakah|tentukan benar atau salah)/i.test(line),
  );
  const hasPromptStatementsBeforeChoiceInstruction =
    choiceInstructionIndex > 0 &&
    lines
      .slice(0, choiceInstructionIndex)
      .some((line) => /^([ABCDE])(?:[\.\):\-]|\s)\s+.+$/i.test(line) || /^pilihan\s+([ABCDE])\s*:/i.test(line));
  let sawAnswerLabel = false;

  let currentField: keyof ImportedQuestionInput = "prompt";

  for (const [lineIndex, line] of lines.entries()) {
    const optionMatch = line.match(/^([ABCDE])(?:[\.\):\-]|\s)\s*(.*)$/i);

    if (optionMatch) {
      if (hasPromptStatementsBeforeChoiceInstruction && lineIndex < choiceInstructionIndex) {
        appendFieldValue(question, "prompt", line);
        currentField = "prompt";
        continue;
      }

      currentField = `option${optionMatch[1].toUpperCase()}` as keyof ImportedQuestionInput;
      appendFieldValue(question, currentField, optionMatch[2] ?? "");
      continue;
    }

    const labeledOptionMatch = line.match(/^pilihan\s+([ABCDE])\s*:\s*(.*)$/i);

    if (labeledOptionMatch) {
      if (hasPromptStatementsBeforeChoiceInstruction && lineIndex < choiceInstructionIndex) {
        appendFieldValue(question, "prompt", line);
        currentField = "prompt";
        continue;
      }

      currentField = `option${labeledOptionMatch[1].toUpperCase()}` as keyof ImportedQuestionInput;
      appendFieldValue(question, currentField, labeledOptionMatch[2] ?? "");
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
        sawAnswerLabel = true;
        const answerKeys = extractAnswerKeys(labeledValue);

        if (answerKeys.length > 1) {
          question.questionType = "multiple-choice";
          question.correctAnswers = answerKeys.join(",");
          currentField = "correctAnswers";
        } else if (answerKeys.length === 1) {
          question.questionType = "single-choice";
          question.correctAnswer = answerKeys[0];
          currentField = "correctAnswer";
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

  if (!sawAnswerLabel) {
    question.questionType = "essay";
    question.correctAnswer = "";
    question.correctAnswers = "";
  } else {
    question.questionType = question.correctAnswers ? "multiple-choice" : "single-choice";
  }

  question.questionType = normalizeQuestionType(question.questionType);
  question.correctAnswer = question.correctAnswer.toUpperCase();
  question.correctAnswers = question.correctAnswers.toUpperCase();

  if (question.questionType === "essay" && !question.sampleAnswer.trim() && question.explanation.trim()) {
    question.sampleAnswer = question.explanation.trim();
  }

  return question;
}

function countFilledOptions(question: ImportedQuestionInput) {
  return [question.optionA, question.optionB, question.optionC, question.optionD, question.optionE].filter((option) =>
    Boolean(option.trim()),
  ).length;
}

function hasChoiceAnswer(question: ImportedQuestionInput) {
  return Boolean(question.correctAnswer.trim() || question.correctAnswers.trim());
}

function hasMathMarkup(value: string) {
  return /\\(?:frac|sqrt|sum|int)|\^\{|_\{/.test(value);
}

function pickMathAwareText(primaryValue: string, fallbackValue: string) {
  if (hasMathMarkup(fallbackValue) && !hasMathMarkup(primaryValue)) {
    return fallbackValue;
  }

  return primaryValue || fallbackValue;
}

function mergeImportedQuestion(primary: ImportedQuestionInput, fallback: ImportedQuestionInput | undefined) {
  if (!fallback) {
    return primary;
  }

  const primaryOptionCount = countFilledOptions(primary);
  const fallbackOptionCount = countFilledOptions(fallback);
  const shouldUseFallbackText =
    (hasChoiceAnswer(primary) && primaryOptionCount < 2 && fallbackOptionCount >= 2) ||
    (!primary.prompt.trim() && fallback.prompt.trim());

  if (!shouldUseFallbackText) {
    return {
      ...primary,
      prompt: pickMathAwareText(primary.prompt, fallback.prompt),
      optionA: pickMathAwareText(primary.optionA, fallback.optionA),
      optionB: pickMathAwareText(primary.optionB, fallback.optionB),
      optionC: pickMathAwareText(primary.optionC, fallback.optionC),
      optionD: pickMathAwareText(primary.optionD, fallback.optionD),
      optionE: pickMathAwareText(primary.optionE, fallback.optionE),
      sampleAnswer: pickMathAwareText(primary.sampleAnswer, fallback.sampleAnswer),
      explanation: pickMathAwareText(primary.explanation, fallback.explanation),
    };
  }

  return {
    ...fallback,
    imageQuestion: primary.imageQuestion || fallback.imageQuestion,
    imageOptionA: primary.imageOptionA || fallback.imageOptionA,
    imageOptionB: primary.imageOptionB || fallback.imageOptionB,
    imageOptionC: primary.imageOptionC || fallback.imageOptionC,
    imageOptionD: primary.imageOptionD || fallback.imageOptionD,
    imageOptionE: primary.imageOptionE || fallback.imageOptionE,
  };
}

function extractZipEntry(buffer: Buffer, entryName: string) {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) !== 0x06054b50) {
      continue;
    }

    const centralDirectoryOffset = buffer.readUInt32LE(index + 16);
    const centralDirectorySize = buffer.readUInt32LE(index + 12);
    let cursor = centralDirectoryOffset;
    const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

    while (cursor < centralDirectoryEnd && buffer.readUInt32LE(cursor) === 0x02014b50) {
      const compressionMethod = buffer.readUInt16LE(cursor + 10);
      const compressedSize = buffer.readUInt32LE(cursor + 20);
      const fileNameLength = buffer.readUInt16LE(cursor + 28);
      const extraFieldLength = buffer.readUInt16LE(cursor + 30);
      const fileCommentLength = buffer.readUInt16LE(cursor + 32);
      const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
      const fileName = buffer.toString("utf8", cursor + 46, cursor + 46 + fileNameLength);

      if (fileName === entryName) {
        if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
          return null;
        }

        const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraFieldLength = buffer.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
        const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

        if (compressionMethod === 0) {
          return compressedData;
        }

        if (compressionMethod === 8) {
          return inflateRawSync(compressedData);
        }

        return null;
      }

      cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;
    }

    break;
  }

  return null;
}

function parseXmlQuestionBlocks(documentXml: string) {
  const $ = load(documentXml, { xmlMode: true });
  const body = $("w\\:body");
  const blocks: string[] = [];
  let currentLines: string[] = [];

  function getTagChildren(node: Element, tagName: string) {
    return (node.children ?? []).filter((child): child is Element => child.type === "tag" && child.tagName === tagName);
  }

  function getFirstTagChild(node: Element, tagName: string) {
    return getTagChildren(node, tagName)[0];
  }

  function extractMathChildText(node: Element, tagName: string) {
    const child = getFirstTagChild(node, tagName);
    return child ? extractXmlText(child) : "";
  }

  function wrapLatexGroup(value: string) {
    return `{${value.trim() || " "}}`;
  }

  function extractMathText(node: Element): string {
    switch (node.tagName) {
      case "m:f": {
        const numerator = extractMathChildText(node, "m:num");
        const denominator = extractMathChildText(node, "m:den");
        return `\\frac${wrapLatexGroup(numerator)}${wrapLatexGroup(denominator)}`;
      }
      case "m:sSup": {
        const base = extractMathChildText(node, "m:e");
        const superscript = extractMathChildText(node, "m:sup");
        return `${base}^{${superscript}}`;
      }
      case "m:sSub": {
        const base = extractMathChildText(node, "m:e");
        const subscript = extractMathChildText(node, "m:sub");
        return `${base}_{${subscript}}`;
      }
      case "m:sSubSup": {
        const base = extractMathChildText(node, "m:e");
        const subscript = extractMathChildText(node, "m:sub");
        const superscript = extractMathChildText(node, "m:sup");
        return `${base}_{${subscript}}^{${superscript}}`;
      }
      case "m:rad": {
        const degree = extractMathChildText(node, "m:deg");
        const radicand = extractMathChildText(node, "m:e");
        return degree ? `\\sqrt[${degree}]${wrapLatexGroup(radicand)}` : `\\sqrt${wrapLatexGroup(radicand)}`;
      }
      case "m:nary": {
        const symbol = extractMathChildText(node, "m:chr") || "";
        const base = symbol === "∑" ? "\\sum" : symbol === "∫" ? "\\int" : symbol;
        const subscript = extractMathChildText(node, "m:sub");
        const superscript = extractMathChildText(node, "m:sup");
        const expression = extractMathChildText(node, "m:e");
        return `${base}${subscript ? `_{${subscript}}` : ""}${superscript ? `^{${superscript}}` : ""}${expression}`;
      }
      case "m:d": {
        const expression = extractMathChildText(node, "m:e");
        return `(${expression})`;
      }
      default:
        return joinInlineParts((node.children ?? []).map((child) => extractXmlText(child)));
    }
  }

  function extractXmlText(node: ChildNode | Element): string {
    if (node.type === "text") {
      return cleanValue(node.data ?? "");
    }

    if (node.type !== "tag") {
      return "";
    }

    if (node.tagName === "w:t" || node.tagName === "m:t") {
      return cleanValue($(node).text());
    }

    if (node.tagName.startsWith("m:")) {
      return extractMathText(node);
    }

    if (node.tagName === "w:br") {
      return "\n";
    }

    const parts: string[] = [];

    for (const child of node.children ?? []) {
      const part = extractXmlText(child);
      if (part) {
        parts.push(part);
      }
    }

    return joinInlineParts(parts);
  }

  function extractXmlTable(node: Element) {
    const rowLines: string[] = [];

    $(node)
      .find("w\\:tr")
      .each((_, row) => {
        const cells = $(row)
          .find("> w\\:tc")
          .toArray()
          .map((cell) => normalizeInlineSpacing(extractXmlText(cell)))
          .filter(Boolean);

        if (cells.length > 0) {
          rowLines.push(`| ${cells.join(" | ")} |`);
        }
      });

    return rowLines;
  }

  function flushCurrentBlock() {
    if (currentLines.length === 0) {
      return;
    }

    blocks.push(currentLines.join("\n").trim());
    currentLines = [];
  }

  function blockExpectsOptionList(lines: string[]) {
    return lines.some((line) =>
      /(pilih lebih dari satu|pilih semua|pilih satu|pilih jawaban|manakah|tentukan benar atau salah)/i.test(line),
    );
  }

  function hasMetadataAhead(nodes: Element[], startIndex: number) {
    for (let index = startIndex + 1; index < nodes.length; index += 1) {
      const sibling = nodes[index];

      if ($(sibling).find("w\\:numPr").length > 0) {
        return false;
      }

      const text = extractXmlText(sibling);

      if (!text) {
        continue;
      }

      if (/^(jawaban|kunci|poin|point|skor|nilai|pembahasan|penjelasan|jawaban contoh|contoh jawaban)\s*:/i.test(text)) {
        return true;
      }
    }

    return false;
  }

  const bodyNodes = body
    .children()
    .toArray()
    .filter((node): node is Element => node.type === "tag" && (node.tagName === "w:p" || node.tagName === "w:tbl"));

  for (let index = 0; index < bodyNodes.length; index += 1) {
    const node = bodyNodes[index];

    if (node.tagName === "w:tbl") {
      currentLines.push(...extractXmlTable(node));
      continue;
    }

    const isListParagraph = $(node).find("w\\:numPr").length > 0;

    if (isListParagraph) {
      const listItems: string[] = [];
      let lookahead = index;

      while (lookahead < bodyNodes.length) {
        const sibling = bodyNodes[lookahead];

        if (sibling.tagName !== "w:p" || $(sibling).find("w\\:numPr").length === 0) {
          break;
        }

        const text = extractXmlText(sibling);
        if (text) {
          listItems.push(text);
        }

        lookahead += 1;
      }

      index = lookahead - 1;

      if (listItems.length === 0) {
        continue;
      }

      const currentBlockHasMetadata = currentLines.some((line) =>
        /^(jawaban|kunci|poin|point|skor|nilai|pembahasan|penjelasan|jawaban contoh|contoh jawaban)\s*:/i.test(line),
      );
      const currentBlockHasOptions = currentLines.some(
        (line) => /^([ABCDE])(?:[\.\):\-]|\s)/i.test(line) || /^pilihan\s+([ABCDE])\s*:/i.test(line),
      );
      const currentBlockExpectsOptionList = blockExpectsOptionList(currentLines);
      const metadataAhead = hasMetadataAhead(bodyNodes, index);
      const looksLikeCombinedQuestionAndOptions =
        listItems.length >= 3 &&
        listItems.length <= 6 &&
        metadataAhead &&
        (currentLines.length === 0 || currentBlockHasMetadata);

      if (looksLikeCombinedQuestionAndOptions) {
        if (currentLines.length > 0) {
          flushCurrentBlock();
        }

        currentLines.push(`1. ${listItems[0]}`);

        listItems.slice(1, 6).forEach((item, itemIndex) => {
          const optionLabel = String.fromCharCode(65 + itemIndex);
          currentLines.push(`${optionLabel}. ${item}`);
        });

        continue;
      }

      if (
        currentLines.length > 0 &&
        listItems.length >= 2 &&
        !currentBlockHasMetadata &&
        (!currentBlockHasOptions || currentBlockExpectsOptionList)
      ) {
        listItems.slice(0, 5).forEach((item, itemIndex) => {
          const optionLabel = String.fromCharCode(65 + itemIndex);
          currentLines.push(`${optionLabel}. ${item}`);
        });
        continue;
      }

      for (const item of listItems) {
        if (currentLines.length > 0) {
          flushCurrentBlock();
        }

        currentLines.push(`1. ${item}`);
      }

      continue;
    }

    const line = extractXmlText(node);

    if (!line) {
      continue;
    }

    currentLines.push(line);
  }

  flushCurrentBlock();

  return blocks.map(parseDocxQuestionBlock).filter((question) => question.prompt.trim());
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
  let hasStartedQuestion = false;

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

  async function extractNodeText(node: ChildNode | Element, imageCounter: { value: number }): Promise<string> {
    if (node.type === "text") {
      return cleanValue(node.data ?? "");
    }

    if (node.type !== "tag") {
      return "";
    }

    if (node.tagName === "img") {
      const src = node.attribs?.src;

      if (!src) {
        return "";
      }

      const imageUrl = src.startsWith("data:") ? await uploadEmbeddedImage(src, imageCounter.value++) : src;
      return `![gambar](${imageUrl})`;
    }

    if (node.tagName === "br") {
      return "\n";
    }

    if (node.tagName === "table") {
      const rowLines: string[] = [];

      for (const row of node.children.filter(
        (child): child is Element => child.type === "tag" && (child.tagName === "tr" || child.tagName === "tbody" || child.tagName === "thead"),
      )) {
        if (row.tagName === "tbody" || row.tagName === "thead") {
          for (const nestedRow of row.children.filter((child): child is Element => child.type === "tag" && child.tagName === "tr")) {
            const cellValues = await Promise.all(
              nestedRow.children
                .filter((child): child is Element => child.type === "tag" && (child.tagName === "td" || child.tagName === "th"))
                .map((cell) => extractNodeText(cell, imageCounter)),
            );
            const normalizedCells = cellValues.map((value) => normalizeInlineSpacing(value)).filter(Boolean);

            if (normalizedCells.length > 0) {
              rowLines.push(`| ${normalizedCells.join(" | ")} |`);
            }
          }
          continue;
        }

        const cellValues = await Promise.all(
          row.children
            .filter((child): child is Element => child.type === "tag" && (child.tagName === "td" || child.tagName === "th"))
            .map((cell) => extractNodeText(cell, imageCounter)),
        );
        const normalizedCells = cellValues.map((value) => normalizeInlineSpacing(value)).filter(Boolean);

        if (normalizedCells.length > 0) {
          rowLines.push(`| ${normalizedCells.join(" | ")} |`);
        }
      }

      return rowLines.join("\n");
    }

    const parts: string[] = [];

    for (const child of node.children ?? []) {
      const part = await extractNodeText(child, imageCounter);
      if (part) {
        parts.push(part);
      }
    }

    return normalizeInlineSpacing(parts.join(" "));
  }

  async function nodeToLine(node: Element, imageCounter: { value: number }) {
    return normalizeInlineSpacing(await extractNodeText(node, imageCounter));
  }

  async function extractListItems(node: Element, imageCounter: { value: number }) {
    const listItems = await Promise.all(
      node.children
        .filter((child): child is Element => child.type === "tag" && child.tagName === "li")
        .map((child) => extractNodeText(child, imageCounter)),
    );

    return listItems.map((item) => normalizeInlineSpacing(item)).filter(Boolean);
  }

  function blockExpectsOptionList(currentBlockLines: string[]) {
    return currentBlockLines.some((line) =>
      /(pilih lebih dari satu|pilih semua|pilih satu|pilih jawaban|manakah|tentukan benar atau salah)/i.test(line),
    );
  }

  function extractPlainText(node: ChildNode | Element): string {
    if (node.type === "text") {
      return cleanValue(node.data ?? "");
    }

    if (node.type !== "tag") {
      return "";
    }

    if (node.tagName === "br") {
      return "\n";
    }

    return normalizeInlineSpacing((node.children ?? []).map((child) => extractPlainText(child)).join(" "));
  }

  function hasQuestionMetadataAhead(nodes: Element[], startIndex: number) {
    for (let index = startIndex + 1; index < nodes.length; index += 1) {
      const sibling = nodes[index];

      if (sibling.tagName === "ol" || sibling.tagName === "ul") {
        return false;
      }

      const siblingText = extractPlainText(sibling);

      if (!siblingText) {
        continue;
      }

      if (/^(jawaban|kunci|poin|point|skor|nilai|pembahasan|penjelasan|jawaban contoh|contoh jawaban)\s*:/i.test(siblingText)) {
        return true;
      }
    }

    return false;
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

  const rootNodes = root.children().toArray().filter((node): node is Element => node.type === "tag");

  for (const [nodeIndex, node] of rootNodes.entries()) {
    if ((node.tagName === "ol" || node.tagName === "ul")) {
      const listItems = await extractListItems(node, imageCounter);

      if (listItems.length === 0) {
        flushCurrentBlock();
        continue;
      }

      const currentBlockHasMetadata = currentLines.some((line) =>
        /^(jawaban|kunci|poin|point|skor|nilai|pembahasan|penjelasan|jawaban contoh|contoh jawaban)\s*:/i.test(line),
      );
      const currentBlockHasOptions = currentLines.some(
        (line) => /^([ABCDE])(?:[\.\):\-]|\s)/i.test(line) || /^pilihan\s+([ABCDE])\s*:/i.test(line),
      );
      const currentBlockExpectsOptionList = blockExpectsOptionList(currentLines);
      const metadataAhead = hasQuestionMetadataAhead(rootNodes, nodeIndex);
      const looksLikeCombinedQuestionAndOptions =
        listItems.length >= 3 &&
        listItems.length <= 6 &&
        metadataAhead &&
        (currentLines.length === 0 || currentBlockHasMetadata);

      if (looksLikeCombinedQuestionAndOptions) {
        if (currentLines.length > 0) {
          flushCurrentBlock();
        }

        hasStartedQuestion = true;
        currentLines.push(`1. ${listItems[0]}`);

        listItems.slice(1, 6).forEach((item, index) => {
          const optionLabel = String.fromCharCode(65 + index);
          currentLines.push(`${optionLabel}. ${item}`);
        });

        continue;
      }

      if (
        currentLines.length > 0 &&
        listItems.length >= 2 &&
        !currentBlockHasMetadata &&
        (!currentBlockHasOptions || currentBlockExpectsOptionList)
      ) {
        listItems.slice(0, 5).forEach((item, index) => {
          const optionLabel = String.fromCharCode(65 + index);
          currentLines.push(`${optionLabel}. ${item}`);
        });
        continue;
      }

      for (const item of listItems) {
        if (currentLines.length > 0) {
          flushCurrentBlock();
        }

        hasStartedQuestion = true;
        currentLines.push(`1. ${item}`);
      }

      continue;
    }

    const line = await nodeToLine(node, imageCounter);

    if (!line) {
      continue;
    }

    if (!hasStartedQuestion) {
      if (looksLikeNewQuestionStart(line)) {
        hasStartedQuestion = true;
      } else {
        continue;
      }
    }

    if (looksLikeNewQuestionStart(line) && currentLines.length > 0) {
      flushCurrentBlock();
    }

    currentLines.push(line);
  }

  flushCurrentBlock();

  const htmlQuestions = blocks
    .map(parseDocxQuestionBlock)
    .filter((question) => question.prompt);

  const documentXmlBuffer = extractZipEntry(buffer, "word/document.xml");
  const xmlQuestions = documentXmlBuffer ? parseXmlQuestionBlocks(documentXmlBuffer.toString("utf8")) : [];
  const questions = htmlQuestions.map((question, index) => mergeImportedQuestion(question, xmlQuestions[index]));

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

  if (fileName.endsWith(".docx")) {
    return parseDocxQuestions(buffer);
  }

  return {
    error: "Format file belum didukung. Gunakan file .docx.",
  };
}
