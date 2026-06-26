const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadQuestionImportModule() {
  const filePath = path.join(__dirname, "..", "lib", "question-import.ts");
  const source = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  });
  const module = { exports: {} };
  const sandbox = {
    Buffer,
    console,
    exports: module.exports,
    module,
    process,
    require: (specifier) => {
      if (specifier === "@/lib/supabase-storage") {
        return {
          uploadToSupabaseStorage: async () => ({
            publicUrl: "https://example.com/imported-image.png",
          }),
        };
      }

      return require(specifier);
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(transpiled.outputText, sandbox, { filename: filePath });

  return module.exports;
}

function loadAdminActionsModule() {
  const filePath = path.join(__dirname, "..", "app", "admin", "actions.ts");
  const source = `${fs.readFileSync(filePath, "utf8")}\nmodule.exports.__adminActionTestUtils = { buildQuestionPayloadFromInput };`;
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  });
  const module = { exports: {} };
  const sandbox = {
    Buffer,
    console,
    exports: module.exports,
    module,
    process,
    require: (specifier) => {
      if (specifier === "next/headers") {
        return { cookies: async () => ({ get: () => null, set() {}, delete() {} }) };
      }

      if (specifier === "next/cache") {
        return { revalidatePath() {} };
      }

      if (specifier === "next/navigation") {
        return { redirect() {} };
      }

      if (specifier === "@/generated/prisma/client") {
        return { Prisma: { PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {} } };
      }

      if (specifier === "@/lib/auth") {
        return {
          clearAdminSession() {},
          createAdminSessionValue() { return ""; },
          getAuthConfig() { return null; },
          hasAuthConfig() { return false; },
          isAdminAuthenticated: async () => true,
          loginSchema: { safeParse: () => ({ success: false }) },
        };
      }

      if (specifier === "@/lib/prisma") {
        return { getPrismaClient() { return {}; } };
      }

      if (specifier === "@/lib/question-import") {
        return { parseImportedQuestionsFile: async () => ({ questions: [] }) };
      }

      if (specifier === "@/lib/supabase-storage") {
        return { uploadToSupabaseStorage: async () => ({ publicUrl: "https://example.com/imported-image.png" }) };
      }

      return require(specifier);
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(transpiled.outputText, sandbox, { filename: filePath });

  return module.exports;
}

const { __questionImportTestUtils } = loadQuestionImportModule();
const { matchQuestionsByPrompt, mergeImportedQuestion, mergePromptPreservingImages, parseDocxQuestionBlock } =
  __questionImportTestUtils;
const { __adminActionTestUtils } = loadAdminActionsModule();
const { buildQuestionPayloadFromInput } = __adminActionTestUtils;

test("parseDocxQuestionBlock reads options from markdown table rows", () => {
  const question = parseDocxQuestionBlock([
    "1. Pilih jawaban yang benar.",
    "| A. 12 cm |",
    "| B. 16 cm |",
    "Jawaban: B",
  ].join("\n"));

  assert.equal(question.optionA, "12 cm");
  assert.equal(question.optionB, "16 cm");
  assert.equal(question.correctAnswer, "B");
  assert.equal(question.questionType, "single-choice");
});

test("parseDocxQuestionBlock reads true-false statements from markdown table", () => {
  const question = parseDocxQuestionBlock([
    "1. Perhatikan gambar!",
    "Berdasarkan informasi pada gambar, tentukan benar atau salah untuk setiap pernyataan berikut:",
    "| Pernyataan | Benar | Salah |",
    "| Nilai x = 97° | | |",
    "| Nilai y = 45° | | |",
    "| Nilai x-y = 42° | | |",
    "Jawaban: B,C",
    "Pembahasan: Oke bisa",
  ].join("\n"));

  assert.equal(question.questionType, "true-false");
  assert.equal(question.prompt, [
    "Perhatikan gambar!",
    "Berdasarkan informasi pada gambar, tentukan benar atau salah untuk setiap pernyataan berikut:",
  ].join("\n"));
  assert.equal(question.optionA, "Nilai x = 97°");
  assert.equal(question.optionB, "Nilai y = 45°");
  assert.equal(question.optionC, "Nilai x-y = 42°");
  assert.equal(question.optionD, "");
  assert.equal(question.correctAnswer, "");
  assert.equal(question.correctAnswers, "B,C");
});

test("parseDocxQuestionBlock keeps true-false table rows out of choice parsing", () => {
  const question = parseDocxQuestionBlock([
    "1. Tipe: true-false",
    "Soal: Tentukan benar atau salah.",
    "| Pernyataan | Benar | Salah |",
    "| A. Pernyataan A | | |",
    "| B. Pernyataan B | | |",
    "| C. Pernyataan C | | |",
    "Jawaban: B",
  ].join("\n"));

  assert.equal(question.questionType, "true-false");
  assert.equal(question.prompt, "Tentukan benar atau salah.");
  assert.equal(question.optionA, "Pernyataan A");
  assert.equal(question.optionB, "Pernyataan B");
  assert.equal(question.optionC, "Pernyataan C");
  assert.equal(question.correctAnswer, "");
  assert.equal(question.correctAnswers, "B");
});

test("parseDocxQuestionBlock uses the statement column for true-false tables with separate keys", () => {
  const question = parseDocxQuestionBlock([
    "1. Tipe: true-false",
    "Soal: Tentukan benar atau salah.",
    "| Kode | Pernyataan | Benar | Salah |",
    "| A | Pernyataan A | | |",
    "| B | Pernyataan B | | |",
    "| C | Pernyataan C | | |",
    "Jawaban: B",
  ].join("\n"));

  assert.equal(question.questionType, "true-false");
  assert.equal(question.optionA, "Pernyataan A");
  assert.equal(question.optionB, "Pernyataan B");
  assert.equal(question.optionC, "Pernyataan C");
  assert.equal(question.correctAnswers, "B");
});

test("matchQuestionsByPrompt pairs html and xml questions by prompt similarity", () => {
  const htmlQuestions = [
    {
      prompt: "Diketahui bilangan-bilangan berikut. Letak bilangan pada garis bilangan adalah...",
    },
    {
      prompt: "Luas daerah trapesium tersebut adalah ...",
    },
  ];
  const xmlQuestions = [
    {
      prompt: "Latihan TKA SMP/MTS Matematika",
    },
    {
      prompt: "Luas daerah trapesium tersebut adalah ...",
    },
    {
      prompt: "Diketahui bilangan-bilangan berikut. Letak bilangan pada garis bilangan adalah...",
    },
  ];

  const matches = matchQuestionsByPrompt(htmlQuestions, xmlQuestions);

  assert.equal(matches.get(0)?.xmlIndex, 2);
  assert.equal(matches.get(1)?.xmlIndex, 1);
  assert.ok((matches.get(0)?.similarity ?? 0) >= 0.8);
  assert.ok((matches.get(1)?.similarity ?? 0) >= 0.8);
});

test("mergeImportedQuestion preserves html prompt images when xml fallback replaces prompt text", () => {
  const primary = {
    questionType: "single-choice",
    prompt: [
      "Perhatikan gambar salah satu sisi dinding rumah berikut!",
      "![gambar](https://example.com/dinding.png)",
      "Ayah akan mengecat dinding tersebut.",
    ].join("\n"),
    optionA: "4 kemasan B dan 1 kemasan A",
    optionB: "3 kemasan B dan 2 kemasan A",
    optionC: "2 kemasan B dan 3 kemasan A",
    optionD: "1 kemasan B dan 4 kemasan A",
    optionE: "",
    imageQuestion: "",
    imageOptionA: "",
    imageOptionB: "",
    imageOptionC: "",
    imageOptionD: "",
    imageOptionE: "",
    correctAnswer: "B",
    correctAnswers: "",
    sampleAnswer: "",
    explanation: "",
    points: "10",
  };
  const fallback = {
    ...primary,
    prompt: [
      "Perhatikan gambar salah satu sisi dinding rumah berikut!",
      "Ayah akan mengecat dinding tersebut. Luas dinding adalah 10 m^{2}.",
    ].join("\n"),
  };

  const merged = mergeImportedQuestion(primary, fallback, {
    preferFallbackPromptAndOptions: true,
  });

  assert.match(merged.prompt, /^Perhatikan gambar salah satu sisi dinding rumah berikut!/);
  assert.match(merged.prompt, /!\[gambar]\(https:\/\/example\.com\/dinding\.png\)/);
  assert.match(merged.prompt, /Luas dinding adalah 10 m\^\{2}/);
  assert.equal((merged.prompt.match(/!\[[^\]]*]\([^)]+\)/g) ?? []).length, 1);
});

test("mergePromptPreservingImages does not duplicate images when merged prompt already has one", () => {
  const merged = mergePromptPreservingImages(
    [
      "Perhatikan gambar berikut!",
      "![gambar](https://example.com/html.png)",
      "Tentukan hasilnya.",
    ].join("\n"),
    [
      "Perhatikan gambar berikut!",
      "![gambar](https://example.com/xml.png)",
      "Tentukan hasilnya dengan rumus x^{2}.",
    ].join("\n"),
  );

  assert.equal(
    merged,
    [
      "Perhatikan gambar berikut!",
      "![gambar](https://example.com/xml.png)",
      "Tentukan hasilnya dengan rumus x^{2}.",
    ].join("\n"),
  );
  assert.equal((merged.match(/!\[[^\]]*]\([^)]+\)/g) ?? []).length, 1);
});

test("buildQuestionPayloadFromInput accepts true-false questions without choice option validation", () => {
  const result = buildQuestionPayloadFromInput({
    questionType: "true-false",
    prompt: "Tentukan benar atau salah untuk setiap pernyataan berikut.",
    optionA: "2 + 2 = 4",
    optionB: "3 + 3 = 5",
    optionC: "",
    optionD: "",
    optionE: "",
    correctAnswer: "",
    correctAnswers: "A",
    sampleAnswer: "",
    explanation: "Pernyataan A benar, B salah.",
    points: "10",
  });

  assert.ok("data" in result);
  assert.equal(result.data.questionType, "TRUE_FALSE");
  assert.equal(result.data.correctAnswers, "A");
  assert.equal(result.data.optionA, "2 + 2 = 4");
  assert.equal(result.data.optionB, "3 + 3 = 5");
});

test("buildQuestionPayloadFromInput accepts true-false answers keyed by statement identifier", () => {
  const result = buildQuestionPayloadFromInput({
    questionType: "true-false",
    prompt: "Tentukan benar atau salah.",
    optionA: "Pernyataan A",
    optionB: "Pernyataan B",
    optionC: "Pernyataan C",
    optionD: "",
    optionE: "",
    correctAnswer: "",
    correctAnswers: "B",
    sampleAnswer: "",
    explanation: "",
    points: "10",
  });

  assert.ok("data" in result);
  assert.equal(result.data.questionType, "TRUE_FALSE");
  assert.equal(result.data.correctAnswers, "B");
  assert.equal(result.data.optionB, "Pernyataan B");
});
