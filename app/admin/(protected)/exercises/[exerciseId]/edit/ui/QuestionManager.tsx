"use client";

import Image from "next/image";
import { Fragment, useActionState, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  bulkUpdateQuestionsAction,
  createQuestionAction,
  deleteQuestionAction,
  importQuestionsAction,
  type ImportQuestionFormState,
  type QuestionFormState,
} from "@/app/admin/actions";
import { MathEditorField } from "@/components/editor/math-editor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QuestionTypeValue = "single-choice" | "multiple-choice" | "essay";

type QuestionManagerProps = {
  exerciseId: string;
  exerciseTitle: string;
  questions: {
    id: string;
    questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "ESSAY";
    orderNumber: number;
    points: number;
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
  }[];
};

const initialState: QuestionFormState = {};
const initialImportState: ImportQuestionFormState = {};

function splitContentAndImages(value: string) {
  const imagePattern = /!\[[^\]]*]\(([^)]+)\)/g;
  const imageUrls = Array.from(value.matchAll(imagePattern)).map((match) => match[1].trim()).filter(Boolean);
  const text = value.replace(imagePattern, "").replace(/\n{3,}/g, "\n\n").trim();

  return {
    text,
    imageUrls,
  };
}

function toUiQuestionType(value: QuestionManagerProps["questions"][number]["questionType"]): QuestionTypeValue {
  if (value === "MULTIPLE_CHOICE") return "multiple-choice";
  if (value === "ESSAY") return "essay";
  return "single-choice";
}

type PreviewBlock =
  | { type: "paragraph"; text: string }
  | { type: "table"; rows: string[][] };

function isTableLine(line: string) {
  return /^\|.+\|$/.test(line.trim());
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parsePreviewBlocks(text: string): PreviewBlock[] {
  const lines = text.split("\n");
  const blocks: PreviewBlock[] = [];
  let paragraphLines: string[] = [];
  let tableRows: string[][] = [];

  const flushParagraph = () => {
    const paragraph = paragraphLines.join("\n").trim();

    if (paragraph) {
      blocks.push({ type: "paragraph", text: paragraph });
    }

    paragraphLines = [];
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      blocks.push({ type: "table", rows: tableRows });
    }

    tableRows = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (isTableLine(line)) {
      flushParagraph();
      tableRows.push(parseTableRow(line));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushTable();
      continue;
    }

    flushTable();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushTable();

  return blocks;
}

function renderPreviewBlocks(text: string): ReactNode {
  return parsePreviewBlocks(text).map((block, index) => {
    if (block.type === "table") {
      const [headRow, ...bodyRows] = block.rows;

      return (
        <div key={`table-${index}`} className="question-preview-table-wrap">
          <table className="question-preview-table">
            {headRow ? (
              <thead>
                <tr>
                  {headRow.map((cell, cellIndex) => (
                    <th key={`head-${cellIndex}`}>{cell}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <p key={`paragraph-${index}`} className="question-preview-text">
        {block.text}
      </p>
    );
  });
}

export function QuestionManager({ exerciseId, exerciseTitle, questions }: QuestionManagerProps) {
  const [createState, createFormAction, isCreatePending] = useActionState(createQuestionAction, initialState);
  const [bulkState, bulkFormAction, isBulkPending] = useActionState(bulkUpdateQuestionsAction, initialState);
  const [importState, importAction, isImportPending] = useActionState(importQuestionsAction, initialImportState);
  const [questionType, setQuestionType] = useState<QuestionTypeValue>("single-choice");

  return (
    <div className="question-manager">
      <section className="form-section">
        <div className="section-heading">
          <div>
            <h3 className="form-section-title">Import soal</h3>
            <p className="page-copy">Upload bank soal dari DOCX. Soal akan disimpan berurutan sesuai isi file.</p>
          </div>
        </div>

        <form className="topic-form" action={importAction}>
          <input type="hidden" name="exerciseId" value={exerciseId} />

          {importState.error ? <Alert variant="destructive">{importState.error}</Alert> : null}
          {importState.success ? <Alert variant="success">{importState.success}</Alert> : null}

          <div className="import-grid">
            <label className="field field-span-2">
              <Label htmlFor="import-file">File soal</Label>
              <Input id="import-file" name="importFile" type="file" accept=".docx" />
            </label>

            <label className="field">
              <Label htmlFor="import-mode">Mode import</Label>
              <select className="shad-select" id="import-mode" name="importMode" defaultValue="append">
                <option value="append">Tambahkan ke soal yang sudah ada</option>
                <option value="replace">Hapus soal lama lalu ganti dari file</option>
              </select>
            </label>
          </div>

          <div className="import-help">
            <div className="nested-surface">
              <p className="import-help-title">Format DOCX</p>
              <p className="page-copy">Satu soal per blok. Gunakan label seperti `Soal:`, `A:`, `B:`, `C:`, `D:`, `Kunci:`, `Tipe: essay`, dan `Pembahasan:`.</p>
              <p className="page-copy">Soal pilihan boleh punya 2 sampai 5 opsi. Untuk benar/salah cukup isi `A:` dan `B:` saja. Jika ada opsi kelima, pakai `E:`.</p>
              <p className="page-copy">Kalau ada nilai per soal, tambahkan `Poin: 15`. Label `Level:` akan diabaikan.</p>
              <p className="page-copy">Jika ada gambar di dokumen Word, gambar akan ikut diupload ke storage dan ditempel ke soal atau opsi yang posisinya berdekatan.</p>
              <p className="page-copy">Kalau di dalam soal ada tabel Word, isi tabel akan ikut dibaca sebagai bagian dari pertanyaan atau pembahasan.</p>
            </div>
          </div>

          <div className="button-row">
            <Button type="submit" disabled={isImportPending}>
              {isImportPending ? "Mengimpor soal..." : "Import Soal"}
            </Button>
            <Button type="reset" variant="secondary" disabled={isImportPending}>
              Reset Import
            </Button>
          </div>
        </form>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Tambah soal</h3>

        <form className="topic-form" action={createFormAction}>
          <input type="hidden" name="exerciseId" value={exerciseId} />

          {createState.error ? <Alert variant="destructive">{createState.error}</Alert> : null}
          {createState.success ? <Alert variant="success">{createState.success}</Alert> : null}

          <QuestionFields exerciseId={exerciseId} questionType={questionType} onQuestionTypeChange={setQuestionType} />

          <div className="button-row">
            <Button type="submit" disabled={isCreatePending}>
              {isCreatePending ? "Menyimpan soal..." : "Tambah Soal"}
            </Button>
            <Button type="reset" variant="secondary" disabled={isCreatePending}>
              Reset Form
            </Button>
          </div>
        </form>
      </section>

      <section className="stack">
        {questions.length === 0 ? (
          <article className="card panel">
            <p className="page-copy">Belum ada soal untuk {exerciseTitle}.</p>
          </article>
        ) : (
          <>
            <form className="stack" action={bulkFormAction}>
              <input type="hidden" name="exerciseId" value={exerciseId} />
              {bulkState.error ? <Alert variant="destructive">{bulkState.error}</Alert> : null}
              {bulkState.success ? <Alert variant="success">{bulkState.success}</Alert> : null}

              {questions.map((question) => (
                <QuestionEditor key={question.id} exerciseId={exerciseId} question={question} />
              ))}

              <div className="bulk-save-bar">
                <p className="page-copy">Perubahan semua soal di bawah ini akan disimpan sekaligus.</p>
                <Button type="submit" disabled={isBulkPending}>
                  {isBulkPending ? "Menyimpan semua soal..." : "Simpan Semua Soal"}
                </Button>
              </div>
            </form>

            {questions.map((question) => (
              <form key={`delete-${question.id}`} id={`delete-question-${question.id}`} action={deleteQuestionAction}>
                <input type="hidden" name="questionId" value={question.id} />
                <input type="hidden" name="exerciseId" value={exerciseId} />
              </form>
            ))}
          </>
        )}
      </section>
    </div>
  );
}

function QuestionEditor({
  exerciseId,
  question,
}: {
  exerciseId: string;
  question: QuestionManagerProps["questions"][number];
}) {
  const [questionType, setQuestionType] = useState<QuestionTypeValue>(toUiQuestionType(question.questionType));
  const promptParts = splitContentAndImages(question.prompt);
  const optionAParts = splitContentAndImages(question.optionA ?? "");
  const optionBParts = splitContentAndImages(question.optionB ?? "");
  const optionCParts = splitContentAndImages(question.optionC ?? "");
  const optionDParts = splitContentAndImages(question.optionD ?? "");
  const optionEParts = splitContentAndImages(question.optionE ?? "");
  const sampleAnswerParts = splitContentAndImages(question.sampleAnswer ?? "");
  const explanationParts = splitContentAndImages(question.explanation ?? "");

  return (
    <article className="card panel question-card">
      <div className="entity-header">
        <div>
          <span className="section-kicker">Soal {question.orderNumber}</span>
          <p className="page-copy" style={{ marginTop: 6 }}>{question.points} poin</p>
          <h3 className="entity-title" style={{ fontSize: "1.2rem", marginTop: 12 }}>
            Edit soal
          </h3>
        </div>
        <Button type="submit" form={`delete-question-${question.id}`} variant="outline" size="sm">
          Hapus Soal
        </Button>
      </div>

      <div className="topic-form">
        <input type="hidden" name="questionIds" value={question.id} />
        <QuestionFields
          questionType={questionType}
          onQuestionTypeChange={setQuestionType}
          exerciseId={exerciseId}
          namePrefix={`${question.id}__`}
          fieldIdPrefix={question.id}
          defaultValues={{
            questionType,
            prompt: promptParts.text,
            promptImages: promptParts.imageUrls.join(","),
            orderNumber: String(question.orderNumber),
            optionA: optionAParts.text,
            optionAImages: optionAParts.imageUrls.join(","),
            optionB: optionBParts.text,
            optionBImages: optionBParts.imageUrls.join(","),
            optionC: optionCParts.text,
            optionCImages: optionCParts.imageUrls.join(","),
            optionD: optionDParts.text,
            optionDImages: optionDParts.imageUrls.join(","),
            optionE: optionEParts.text,
            optionEImages: optionEParts.imageUrls.join(","),
            correctAnswer: question.correctAnswer ?? "A",
            correctAnswers: question.correctAnswers ?? "",
            sampleAnswer: sampleAnswerParts.text,
            sampleAnswerImages: sampleAnswerParts.imageUrls.join(","),
            explanation: explanationParts.text,
            explanationImages: explanationParts.imageUrls.join(","),
            points: String(question.points ?? 10),
          }}
        />
      </div>
    </article>
  );
}

function QuestionFields({
  exerciseId,
  namePrefix = "",
  questionType,
  onQuestionTypeChange,
  fieldIdPrefix = "new",
  defaultValues,
}: {
  exerciseId: string;
  namePrefix?: string;
  questionType: QuestionTypeValue;
  onQuestionTypeChange: (value: QuestionTypeValue) => void;
  fieldIdPrefix?: string;
  defaultValues?: {
    questionType: QuestionTypeValue;
    prompt: string;
    promptImages: string;
    orderNumber: string;
    optionA: string;
    optionAImages: string;
    optionB: string;
    optionBImages: string;
    optionC: string;
    optionCImages: string;
    optionD: string;
    optionDImages: string;
    optionE: string;
    optionEImages: string;
    correctAnswer: string;
    correctAnswers: string;
    sampleAnswer: string;
    sampleAnswerImages: string;
    explanation: string;
    explanationImages: string;
    points: string;
  };
}) {
  return (
    <div className="form-grid">
      <label className="field">
        <Label htmlFor={`type-${fieldIdPrefix}`}>Tipe soal</Label>
        <select
          className="shad-select"
          id={`type-${fieldIdPrefix}`}
          name={`${namePrefix}questionType`}
          value={questionType}
          onChange={(event) => onQuestionTypeChange(event.target.value as QuestionTypeValue)}
        >
          <option value="single-choice">Pilihan ganda</option>
          <option value="multiple-choice">Pilihan jamak</option>
          <option value="essay">Esai</option>
        </select>
      </label>

      <label className="field">
        <Label htmlFor={`order-${fieldIdPrefix}`}>Nomor urut</Label>
        <Input
          id={`order-${fieldIdPrefix}`}
          name={`${namePrefix}orderNumber`}
          type="number"
          min="1"
          defaultValue={defaultValues?.orderNumber}
          placeholder="Otomatis jika kosong"
        />
      </label>

      <label className="field">
        <Label htmlFor={`points-${fieldIdPrefix}`}>Poin</Label>
        <Input
          id={`points-${fieldIdPrefix}`}
          name={`${namePrefix}points`}
          type="number"
          min="0"
          defaultValue={defaultValues?.points ?? "10"}
          placeholder="10"
        />
      </label>

      <RichEditorField
        exerciseId={exerciseId}
        id={`prompt-${fieldIdPrefix}`}
        label="Pertanyaan"
        name={`${namePrefix}prompt`}
        imageName={`${namePrefix}promptImages`}
        uploadFieldName="prompt"
        defaultValue={defaultValues?.prompt}
        defaultImages={defaultValues?.promptImages}
        placeholder="Tulis pertanyaan atau tempel rumus."
      />

      {questionType === "essay" ? (
        <RichEditorField
          exerciseId={exerciseId}
          id={`sample-answer-${fieldIdPrefix}`}
          label="Jawaban contoh"
          name={`${namePrefix}sampleAnswer`}
          imageName={`${namePrefix}sampleAnswerImages`}
          uploadFieldName="sample-answer"
          defaultValue={defaultValues?.sampleAnswer}
          defaultImages={defaultValues?.sampleAnswerImages}
          placeholder="Isi acuan jawaban untuk koreksi esai."
        />
      ) : (
        <>
          <RichEditorField
            exerciseId={exerciseId}
            id={`optionA-${fieldIdPrefix}`}
            label="Pilihan A"
            name={`${namePrefix}optionA`}
            imageName={`${namePrefix}optionAImages`}
            uploadFieldName="option-a"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionA}
            defaultImages={defaultValues?.optionAImages}
            placeholder="Pilihan A"
          />

          <RichEditorField
            exerciseId={exerciseId}
            id={`optionB-${fieldIdPrefix}`}
            label="Pilihan B"
            name={`${namePrefix}optionB`}
            imageName={`${namePrefix}optionBImages`}
            uploadFieldName="option-b"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionB}
            defaultImages={defaultValues?.optionBImages}
            placeholder="Pilihan B"
          />

          <RichEditorField
            exerciseId={exerciseId}
            id={`optionC-${fieldIdPrefix}`}
            label="Pilihan C"
            name={`${namePrefix}optionC`}
            imageName={`${namePrefix}optionCImages`}
            uploadFieldName="option-c"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionC}
            defaultImages={defaultValues?.optionCImages}
            placeholder="Pilihan C"
          />

          <RichEditorField
            exerciseId={exerciseId}
            id={`optionD-${fieldIdPrefix}`}
            label="Pilihan D"
            name={`${namePrefix}optionD`}
            imageName={`${namePrefix}optionDImages`}
            uploadFieldName="option-d"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionD}
            defaultImages={defaultValues?.optionDImages}
            placeholder="Pilihan D"
          />

          <RichEditorField
            exerciseId={exerciseId}
            id={`optionE-${fieldIdPrefix}`}
            label="Pilihan E"
            name={`${namePrefix}optionE`}
            imageName={`${namePrefix}optionEImages`}
            uploadFieldName="option-e"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionE}
            defaultImages={defaultValues?.optionEImages}
            placeholder="Opsional, isi jika ada pilihan kelima"
          />

          {questionType === "multiple-choice" ? (
            <label className="field field-span-2">
              <Label htmlFor={`correct-answers-${fieldIdPrefix}`}>Jawaban benar</Label>
              <Input
                id={`correct-answers-${fieldIdPrefix}`}
                name={`${namePrefix}correctAnswers`}
                type="text"
                defaultValue={defaultValues?.correctAnswers}
                placeholder="Contoh: A,C"
              />
            </label>
          ) : (
            <label className="field">
              <Label htmlFor={`correct-answer-${fieldIdPrefix}`}>Kunci jawaban</Label>
              <select
                className="shad-select"
                id={`correct-answer-${fieldIdPrefix}`}
                name={`${namePrefix}correctAnswer`}
                defaultValue={defaultValues?.correctAnswer ?? "A"}
              >
                <option value="A">Pilihan A</option>
                <option value="B">Pilihan B</option>
                <option value="C">Pilihan C</option>
                <option value="D">Pilihan D</option>
                <option value="E">Pilihan E</option>
              </select>
            </label>
          )}
        </>
      )}

      <RichEditorField
        exerciseId={exerciseId}
        id={`explanation-${fieldIdPrefix}`}
        label="Pembahasan"
        name={`${namePrefix}explanation`}
        imageName={`${namePrefix}explanationImages`}
        uploadFieldName="explanation"
        defaultValue={defaultValues?.explanation}
        defaultImages={defaultValues?.explanationImages}
        placeholder="Opsional."
      />
    </div>
  );
}

function RichEditorField({
  defaultImages = "",
  defaultValue = "",
  exerciseId,
  id,
  imageName,
  label,
  multiline = true,
  name,
  placeholder,
  spanTwo = multiline,
  uploadFieldName,
}: {
  defaultImages?: string;
  defaultValue?: string;
  exerciseId?: string;
  id: string;
  imageName: string;
  label: string;
  multiline?: boolean;
  name: string;
  placeholder?: string;
  spanTwo?: boolean;
  uploadFieldName: string;
}) {
  const [textValue, setTextValue] = useState(defaultValue);
  const [imageUrls, setImageUrls] = useState(
    defaultImages
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const joinedImageUrls = useMemo(() => imageUrls.join(","), [imageUrls]);

  return (
    <div className={`rich-field-shell${spanTwo ? " field-span-2" : ""}`}>
      <MathEditorField
        id={id}
        label={label}
        name={name}
        multiline={multiline}
        spanTwo={false}
        defaultValue={defaultValue}
        onChange={setTextValue}
        placeholder={placeholder}
      />
      <QuestionImageUploadField
        exerciseId={exerciseId}
        fieldName={uploadFieldName}
        inputName={imageName}
        label={label}
        value={imageUrls}
        onChange={setImageUrls}
      />
      <QuestionContentPreview label={label} text={textValue} imageUrls={imageUrls} />
      <input type="hidden" name={imageName} value={joinedImageUrls} />
    </div>
  );
}

function QuestionImageUploadField({
  exerciseId,
  fieldName,
  inputName,
  label,
  onChange,
  value,
}: {
  exerciseId?: string;
  fieldName: string;
  inputName: string;
  label: string;
  onChange: (nextValue: string[]) => void;
  value: string[];
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("exerciseId", exerciseId ?? "manual-question");
      formData.append("fieldName", fieldName);

      const response = await fetch("/api/admin/question-images", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Upload gambar gagal.");
      }

      onChange([...value, payload.url]);
      event.target.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload gambar gagal.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="question-image-field">
      <div className="question-image-toolbar">
        <Label htmlFor={`${inputName}-upload`}>Gambar {label.toLowerCase()}</Label>
        <Input
          id={`${inputName}-upload`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>
      {isUploading ? <p className="upload-note">Mengupload gambar...</p> : null}
      {error ? <p className="upload-error">{error}</p> : null}
      {value.length > 0 ? (
        <div className="question-image-grid">
          {value.map((url, index) => (
            <div key={`${url}-${index}`} className="question-image-card">
              <Image
                src={url}
                alt={`${label} ${index + 1}`}
                width={480}
                height={320}
                unoptimized
                className="question-image-preview"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleRemove(index)}>
                Hapus gambar
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="upload-note">Belum ada gambar. Upload jika bagian ini membutuhkan ilustrasi.</p>
      )}
    </div>
  );
}

function QuestionContentPreview({
  imageUrls,
  label,
  text,
}: {
  imageUrls: string[];
  label: string;
  text: string;
}) {
  const hasContent = Boolean(text.trim()) || imageUrls.length > 0;

  return (
    <div className="question-preview-card">
      <p className="question-preview-title">Preview {label.toLowerCase()}</p>
      {hasContent ? (
        <div className="question-preview-body">
          {text.trim() ? renderPreviewBlocks(text) : null}
          {imageUrls.map((url, index) => (
            <Image
              key={`${url}-${index}`}
              src={url}
              alt={`${label} preview ${index + 1}`}
              width={1200}
              height={800}
              unoptimized
              className="question-preview-image"
            />
          ))}
        </div>
      ) : (
        <p className="upload-note">Preview akan tampil setelah teks atau gambar diisi.</p>
      )}
    </div>
  );
}
