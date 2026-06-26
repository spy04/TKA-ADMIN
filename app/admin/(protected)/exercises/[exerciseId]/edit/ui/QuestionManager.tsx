"use client";

import Image from "next/image";
import { FileUp, PlusSquare } from "lucide-react";
import {
  Fragment,
  useActionState,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { convertLatexToMarkup } from "mathlive/ssr";
import {
  createQuestionAction,
  importQuestionsAction,
  type ImportQuestionReview,
  type ImportQuestionReviewItem,
  type ImportQuestionFormState,
  type QuestionFormState,
} from "@/app/admin/actions";
import { MathEditorField } from "@/components/editor/math-editor";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type QuestionTypeValue = "single-choice" | "multiple-choice" | "essay" | "true-false";
type ReviewFilterValue = "all" | "valid" | "warning" | "error";
type OptionKey = "A" | "B" | "C" | "D" | "E";
type ReviewQuestion = ImportQuestionReviewItem["question"];

type QuestionManagerProps = {
  exerciseId: string;
  exerciseTitle: string;
};

type PreviewBlock =
  | { type: "paragraph"; text: string }
  | { type: "table"; rows: string[][] };

type ContentSegment =
  | { type: "text"; value: string }
  | { type: "image"; alt: string; src: string };

type QuestionFieldDefaults = {
  questionType?: QuestionTypeValue;
  orderNumber?: string;
  points?: string;
  prompt?: string;
  promptImages?: string;
  optionA?: string;
  optionAImages?: string;
  optionB?: string;
  optionBImages?: string;
  optionC?: string;
  optionCImages?: string;
  optionD?: string;
  optionDImages?: string;
  optionE?: string;
  optionEImages?: string;
  correctAnswer?: string;
  correctAnswers?: string;
  sampleAnswer?: string;
  sampleAnswerImages?: string;
  explanation?: string;
  explanationImages?: string;
};

const initialQuestionState: QuestionFormState = {};
const initialImportState: ImportQuestionFormState = {};
const optionKeys: OptionKey[] = ["A", "B", "C", "D", "E"];

function getImportReviewStorageKey(exerciseId: string) {
  return `question-import-review:${exerciseId}`;
}

function toReviewUiQuestionType(value: ReviewQuestion["questionType"]): QuestionTypeValue {
  if (value === "MULTIPLE_CHOICE") return "multiple-choice";
  if (value === "TRUE_FALSE") return "true-false";
  if (value === "ESSAY") return "essay";
  return "single-choice";
}

function isTrueFalseQuestionType(value: QuestionTypeValue) {
  return value === "true-false";
}

function getQuestionTypeLabel(value: QuestionTypeValue) {
  if (value === "multiple-choice") return "Multiple Choice";
  if (value === "essay") return "Essay";
  if (value === "true-false") return "True False";
  return "Single Choice";
}

function getChoiceFieldLabel(questionType: QuestionTypeValue, optionKey: OptionKey) {
  return isTrueFalseQuestionType(questionType) ? `Pernyataan ${optionKey}` : `Pilihan ${optionKey}`;
}

function getChoicePlaceholder(questionType: QuestionTypeValue, optionKey: OptionKey) {
  if (isTrueFalseQuestionType(questionType)) {
    return `Isi pernyataan ${optionKey}`;
  }

  return optionKey === "E" ? "Opsional, isi jika ada pilihan kelima" : `Pilihan ${optionKey}`;
}

function getStatusMeta(status: ImportQuestionReviewItem["status"]) {
  if (status === "error") {
    return { icon: "X", label: "Error" };
  }

  if (status === "warning") {
    return { icon: "!", label: "Warning" };
  }

  return { icon: "OK", label: "Valid" };
}

function getIssueSummary(item: ImportQuestionReviewItem) {
  if (item.errors.length > 0) {
    return item.errors[0];
  }

  if (item.warnings.length > 0) {
    return item.warnings[0];
  }

  return "Siap direview atau langsung dipakai.";
}

function countIssues(item: ImportQuestionReviewItem) {
  return item.errors.length + item.warnings.length;
}

function formatIssueCount(item: ImportQuestionReviewItem) {
  if (countIssues(item) === 0) {
    return "Tanpa issue";
  }

  if (item.errors.length > 0 && item.warnings.length > 0) {
    return `${item.errors.length} error, ${item.warnings.length} warning`;
  }

  if (item.errors.length > 0) {
    return `${item.errors.length} error`;
  }

  return `${item.warnings.length} warning`;
}

function parseAnswerKeys(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is OptionKey => optionKeys.includes(item as OptionKey));
}

function getFilledQuestionOptions(question: ReviewQuestion) {
  return optionKeys
    .map((key) => {
      const value = question[`option${key}` as keyof ReviewQuestion];
      return {
        key,
        text: typeof value === "string" ? value : "",
      };
    })
    .filter((item) => item.text.trim().length > 0);
}

function formatCorrectAnswer(question: ReviewQuestion) {
  const questionType = toReviewUiQuestionType(question.questionType);

  if (questionType === "essay") {
    return question.sampleAnswer?.trim() ? "Jawaban contoh tersedia" : "Belum ada jawaban contoh";
  }

  if (questionType === "multiple-choice") {
    const answerKeys = parseAnswerKeys(question.correctAnswers);
    return answerKeys.length > 0 ? answerKeys.join(", ") : "Belum diisi";
  }

  if (questionType === "true-false") {
    const answerKeys = parseAnswerKeys(question.correctAnswers);
    return answerKeys.length > 0 ? `${answerKeys.join(", ")} = Benar` : "Semua Salah";
  }

  return question.correctAnswer ?? "Belum diisi";
}

function isInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button" ||
    target.isContentEditable ||
    Boolean(target.closest("[role='textbox'], math-field"))
  );
}

function looksLikeMathContent(text: string) {
  return /\\[a-zA-Z]+|[{}_^]|(?:\d+\s*\/\s*\d+)|\$\$?/.test(text);
}

function parseContentSegments(text: string): ContentSegment[] {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(imagePattern)) {
    const [rawValue, alt, src] = match;
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, startIndex),
      });
    }

    segments.push({
      type: "image",
      alt: alt || "Gambar soal",
      src,
    });

    lastIndex = startIndex + rawValue.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return segments.filter((segment) => (segment.type === "image" ? true : Boolean(segment.value.trim())));
}

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
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: PreviewBlock[] = [];
  let paragraphLines: string[] = [];
  let tableRows: string[][] = [];

  function flushParagraph() {
    const paragraph = paragraphLines.join("\n").trim();

    if (paragraph) {
      blocks.push({ type: "paragraph", text: paragraph });
    }

    paragraphLines = [];
  }

  function flushTable() {
    if (tableRows.length > 0) {
      blocks.push({ type: "table", rows: tableRows });
    }

    tableRows = [];
  }

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

function renderInlineRichText(text: string, key: string, inline: boolean) {
  if (!text.trim()) {
    return <Fragment key={key} />;
  }

  if (!looksLikeMathContent(text)) {
    return <Fragment key={key}>{text}</Fragment>;
  }

  const markup = convertLatexToMarkup(text, {
    defaultMode: inline ? "inline-math" : "math",
  });

  return <span key={key} dangerouslySetInnerHTML={{ __html: markup }} />;
}

function renderPreviewBlocks(text: string): ReactNode {
  const segments = parseContentSegments(text);

  if (segments.length === 0) {
    return null;
  }

  return segments.map((segment, segmentIndex) => {
    if (segment.type === "image") {
      return (
        <Image
          key={`${segment.src}-${segmentIndex}`}
          src={segment.src}
          alt={segment.alt}
          width={1200}
          height={900}
          unoptimized
          className="question-preview-image"
        />
      );
    }

    const blocks = parsePreviewBlocks(segment.value);

    return (
      <Fragment key={`segment-${segmentIndex}`}>
        {blocks.map((block, blockIndex) => {
          if (block.type === "table") {
            const [headRow, ...bodyRows] = block.rows;

            return (
              <div key={`table-${segmentIndex}-${blockIndex}`} className="question-preview-table-wrap">
                <table className="question-preview-table">
                  {headRow ? (
                    <thead>
                      <tr>
                        {headRow.map((cell, cellIndex) => (
                          <th key={`head-${segmentIndex}-${blockIndex}-${cellIndex}`}>
                            {renderInlineRichText(cell, `head-${segmentIndex}-${blockIndex}-${cellIndex}`, true)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {bodyRows.map((row, rowIndex) => (
                      <tr key={`row-${segmentIndex}-${blockIndex}-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`cell-${segmentIndex}-${blockIndex}-${rowIndex}-${cellIndex}`}>
                            {renderInlineRichText(
                              cell,
                              `cell-${segmentIndex}-${blockIndex}-${rowIndex}-${cellIndex}`,
                              true,
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return (
            <p key={`paragraph-${segmentIndex}-${blockIndex}`} className="question-preview-text">
              {block.text.split("\n").map((line, lineIndex, allLines) => (
                <Fragment key={`line-${segmentIndex}-${blockIndex}-${lineIndex}`}>
                  {renderInlineRichText(line, `line-${segmentIndex}-${blockIndex}-${lineIndex}`, true)}
                  {lineIndex < allLines.length - 1 ? <br /> : null}
                </Fragment>
              ))}
            </p>
          );
        })}
      </Fragment>
    );
  });
}

export function QuestionManager({ exerciseId, exerciseTitle }: QuestionManagerProps) {
  const [createState, createFormAction, isCreatePending] = useActionState(createQuestionAction, initialQuestionState);
  const [importState, importAction, isImportPending] = useActionState(importQuestionsAction, initialImportState);
  const [questionType, setQuestionType] = useState<QuestionTypeValue>("single-choice");
  const [importOpen, setImportOpen] = useState(false);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [persistedImportReview, setPersistedImportReview] = useState<ImportQuestionReview | null>(null);
  const [persistedImportedFileName, setPersistedImportedFileName] = useState("");

  const activeImportReview = importState.importReview ?? persistedImportReview;
  const activeImportedFileName = importState.importedFileName ?? persistedImportedFileName;

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedImportFileName(event.target.files?.[0]?.name ?? "");
  }

  useEffect(() => {
    try {
      const rawValue = window.sessionStorage.getItem(getImportReviewStorageKey(exerciseId));

      if (!rawValue) {
        return;
      }

      const parsedValue = JSON.parse(rawValue) as {
        importReview?: ImportQuestionReview;
        importedFileName?: string;
      };

      if (parsedValue.importReview) {
        setPersistedImportReview(parsedValue.importReview);
        setPersistedImportedFileName(parsedValue.importedFileName ?? "");
      }
    } catch {
      window.sessionStorage.removeItem(getImportReviewStorageKey(exerciseId));
    }
  }, [exerciseId]);

  useEffect(() => {
    if (!importState.importReview) {
      return;
    }

    const nextPayload = {
      importReview: importState.importReview,
      importedFileName: importState.importedFileName ?? "",
    };

    setPersistedImportReview(importState.importReview);
    setPersistedImportedFileName(importState.importedFileName ?? "");
    window.sessionStorage.setItem(getImportReviewStorageKey(exerciseId), JSON.stringify(nextPayload));
  }, [exerciseId, importState.importReview, importState.importedFileName]);

  useEffect(() => {
    if (importState.error || importState.success) {
      setImportOpen(false);
    }
  }, [importState.error, importState.success]);

  useEffect(() => {
    if (createState.success) {
      setManualFormOpen(false);
    }
  }, [createState.success]);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Kelola soal untuk {exerciseTitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setManualFormOpen(true)}>
              <PlusSquare size={16} />
              Tambah soal manual
            </Button>
            <Button type="button" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp size={16} />
              Import
            </Button>
          </div>
        </div>

        {importState.error ? <Alert variant="destructive">{importState.error}</Alert> : null}
        {importState.success ? <Alert variant="success">{importState.success}</Alert> : null}

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-xl p-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileUp size={18} />
                Import soal
              </DialogTitle>
              <DialogDescription>Pilih file DOCX dan mode import.</DialogDescription>
            </DialogHeader>

            <form className="max-h-[calc(100vh-10rem)] space-y-6 overflow-y-auto px-6 pb-6" action={importAction}>
              <input type="hidden" name="exerciseId" value={exerciseId} />

              <Card>
                <CardContent className="grid gap-4 pt-6">
                  <label className="space-y-2">
                    <Label htmlFor="import-file">File soal</Label>
                    <Input id="import-file" name="importFile" type="file" accept=".docx" onChange={handleImportFileChange} />
                    {selectedImportFileName ? <p className="text-xs text-muted-foreground">{selectedImportFileName}</p> : null}
                  </label>

                  <div className="space-y-2">
                    <Label htmlFor="import-mode">Mode import</Label>
                    <Select name="importMode" defaultValue="append">
                      <SelectTrigger id="import-mode">
                        <SelectValue placeholder="Pilih mode import" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="append">Tambahkan ke soal yang sudah ada</SelectItem>
                        <SelectItem value="replace">Hapus soal lama lalu ganti dari file</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="p-0">
                <Button type="submit" disabled={isImportPending}>
                  {isImportPending ? "Mengimpor..." : "Import"}
                </Button>
                <Button type="button" variant="secondary" disabled={isImportPending} onClick={() => setImportOpen(false)}>
                  Batal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={manualFormOpen} onOpenChange={setManualFormOpen}>
          <DialogContent className="max-w-5xl p-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusSquare size={18} />
                Tambah soal manual
              </DialogTitle>
              <DialogDescription>Isi soal secara manual tanpa meninggalkan halaman review.</DialogDescription>
            </DialogHeader>

            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 pb-6">
              <QuestionCreateForm
                createState={createState}
                createFormAction={createFormAction}
                exerciseId={exerciseId}
                isCreatePending={isCreatePending}
                questionType={questionType}
                onQuestionTypeChange={setQuestionType}
              />
            </div>
          </DialogContent>
        </Dialog>
      </section>

      {activeImportReview ? (
        <ImportReviewPanel review={activeImportReview} importedFileName={activeImportedFileName} />
      ) : null}
    </div>
  );
}

function QuestionCreateForm({
  createState,
  createFormAction,
  exerciseId,
  isCreatePending,
  onQuestionTypeChange,
  questionType,
}: {
  createState: QuestionFormState;
  createFormAction: (payload: FormData) => void;
  exerciseId: string;
  isCreatePending: boolean;
  onQuestionTypeChange: (value: QuestionTypeValue) => void;
  questionType: QuestionTypeValue;
}) {
  return (
    <form className="space-y-4" action={createFormAction}>
      <input type="hidden" name="exerciseId" value={exerciseId} />

      {createState.error ? <Alert variant="destructive">{createState.error}</Alert> : null}
      {createState.success ? <Alert variant="success">{createState.success}</Alert> : null}

      <QuestionFields exerciseId={exerciseId} questionType={questionType} onQuestionTypeChange={onQuestionTypeChange} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isCreatePending}>
          {isCreatePending ? "Menyimpan soal..." : "Tambah Soal"}
        </Button>
        <Button type="reset" variant="secondary" disabled={isCreatePending}>
          Reset Form
        </Button>
      </div>
    </form>
  );
}

function ImportReviewPanel({
  importedFileName,
  review,
}: {
  importedFileName?: string;
  review: NonNullable<ImportQuestionFormState["importReview"]>;
}) {
  const [filter, setFilter] = useState<ReviewFilterValue>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return review.items;
    }

    return review.items.filter((item) => item.status === filter);
  }, [filter, review.items]);

  const selectedIndex = useMemo(
    () => filteredItems.findIndex((item) => item.id === selectedItemId),
    [filteredItems, selectedItemId],
  );
  const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null;

  useEffect(() => {
    setFilter("all");
    setSelectedItemId(null);
  }, [review]);

  useEffect(() => {
    if (selectedItemId && !filteredItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(null);
    }
  }, [filteredItems, selectedItemId]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isInteractiveElement(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedItemId(null);
        return;
      }

      if (event.key === "ArrowLeft" && selectedIndex > 0) {
        event.preventDefault();
        setSelectedItemId(filteredItems[selectedIndex - 1]?.id ?? null);
        return;
      }

      if (event.key === "ArrowRight" && selectedIndex < filteredItems.length - 1) {
        event.preventDefault();
        setSelectedItemId(filteredItems[selectedIndex + 1]?.id ?? null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedIndex, selectedItem]);

  const filters: Array<{ key: ReviewFilterValue; label: string; count: number }> = [
    { key: "all", label: "Semua", count: review.total },
    { key: "valid", label: "Valid", count: review.validCount },
    { key: "warning", label: "Warning", count: review.warningCount },
    { key: "error", label: "Error", count: review.errorCount },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Hasil import</h3>
        <p className="text-sm text-muted-foreground">
          {importedFileName ? `File: ${importedFileName}. ` : ""}
          Klik soal untuk melihat preview lengkap.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">{review.total} soal berhasil diparse</CardTitle>
            <CardDescription>Fokuskan review pada soal yang berstatus warning atau error.</CardDescription>
          </CardHeader>
        </Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <ReviewStatCard label="Valid" tone="valid" value={review.validCount} />
          <ReviewStatCard label="Warning" tone="warning" value={review.warningCount} />
          <ReviewStatCard label="Error" tone="error" value={review.errorCount} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter hasil import">
        {filters.map((item) => (
          <Button
            key={item.key}
            type="button"
            variant={filter === item.key ? "default" : "outline"}
            onClick={() => setFilter(item.key)}
          >
            {item.label} ({item.count})
          </Button>
        ))}
      </div>

      <div className="grid gap-3" role="list" aria-label="Daftar soal hasil import">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <ImportReviewListItem
              key={item.id}
              active={item.id === selectedItemId}
              item={item}
              onOpen={() => setSelectedItemId(item.id)}
            />
          ))
        ) : (
          <Card>
            <CardContent className="space-y-1 pt-6">
              <p className="font-medium">Tidak ada soal pada filter ini.</p>
              <p className="text-sm text-muted-foreground">Pilih filter lain untuk melihat semua hasil import.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedItem ? (
        <ImportReviewDetail
          item={selectedItem}
          currentIndex={selectedIndex}
          filteredTotal={filteredItems.length}
          totalQuestions={review.total}
          onClose={() => setSelectedItemId(null)}
          onNext={() => setSelectedItemId(filteredItems[selectedIndex + 1]?.id ?? null)}
          onPrevious={() => setSelectedItemId(filteredItems[selectedIndex - 1]?.id ?? null)}
        />
      ) : null}
    </section>
  );
}

function ReviewStatCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "valid" | "warning" | "error";
  value: number;
}) {
  return (
    <Card
      className={cn(
        "border-border/70",
        tone === "valid" && "bg-emerald-50/70 dark:bg-emerald-950/20",
        tone === "warning" && "bg-amber-50/70 dark:bg-amber-950/20",
        tone === "error" && "bg-rose-50/70 dark:bg-rose-950/20",
      )}
    >
      <CardContent className="flex items-center justify-between gap-3 pt-6">
        <span className="text-sm text-muted-foreground">{label}</span>
        <strong className="text-2xl">{value}</strong>
      </CardContent>
    </Card>
  );
}

function ImportReviewListItem({
  active,
  item,
  onOpen,
}: {
  active: boolean;
  item: ImportQuestionReviewItem;
  onOpen: () => void;
}) {
  const status = getStatusMeta(item.status);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active && "border-primary bg-primary/5",
      )}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      role="listitem"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Soal {item.orderNumber}</span>
            <Badge variant="secondary">
              {getQuestionTypeLabel(toReviewUiQuestionType(item.question.questionType))}
            </Badge>
          </div>
          <Badge variant="outline" className={cn(item.status === "error" && "border-rose-300 text-rose-700", item.status === "warning" && "border-amber-300 text-amber-700", item.status === "valid" && "border-emerald-300 text-emerald-700")}>
            {status.icon} {status.label}
          </Badge>
        </div>

        <p className="line-clamp-2 text-sm leading-6 text-foreground/90">{item.promptPreview || "Prompt belum terbaca."}</p>
        <p className={cn("text-sm", item.status === "valid" ? "text-muted-foreground" : "text-foreground")}>{getIssueSummary(item)}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{item.imageCount > 0 ? `${item.imageCount} gambar` : "Tanpa gambar"}</span>
          <span>{formatIssueCount(item)}</span>
        </div>
      </div>
    </button>
  );
}

function ImportReviewDetail({
  currentIndex,
  filteredTotal,
  item,
  onClose,
  onNext,
  onPrevious,
  totalQuestions,
}: {
  currentIndex: number;
  filteredTotal: number;
  item: ImportQuestionReviewItem;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  totalQuestions: number;
}) {
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < filteredTotal - 1;
  const status = getStatusMeta(item.status);

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="h-[92vh] max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-border/70">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">Soal {item.orderNumber}</span>
                  <Badge variant="outline" className={cn(item.status === "error" && "border-rose-300 text-rose-700", item.status === "warning" && "border-amber-300 text-amber-700", item.status === "valid" && "border-emerald-300 text-emerald-700")}>
                    {status.icon} {status.label}
                  </Badge>
                </div>
                <DialogTitle>Soal {item.orderNumber} / {totalQuestions}</DialogTitle>
                <DialogDescription>
                  {filteredTotal > 1
                    ? `Navigasi ${currentIndex + 1} dari ${filteredTotal} soal pada filter aktif.`
                    : "Gunakan tombol atau keyboard untuk berpindah soal."}
                </DialogDescription>
              </div>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={onPrevious} disabled={!hasPrevious}>
                {"<- Soal Sebelumnya"}
              </Button>
              <span className="text-sm text-muted-foreground">Gunakan keyboard kiri, kanan, atau Esc</span>
              <Button type="button" variant="outline" onClick={onNext} disabled={!hasNext}>
                {"Soal Berikutnya ->"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Tipe soal" value={getQuestionTypeLabel(toReviewUiQuestionType(item.question.questionType))} />
              <InfoCard label="Poin" value={String(item.question.points)} />
              <InfoCard label="Jawaban benar" value={formatCorrectAnswer(item.question)} />
              <InfoCard label="Gambar" value={String(item.imageCount)} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview soal</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ImportQuestionPreview question={item.question} />
              </CardContent>
            </Card>

            {item.question.sampleAnswer?.trim() || item.question.explanation?.trim() ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detail tambahan</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
                  {item.question.sampleAnswer?.trim() ? (
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <h6 className="text-sm font-semibold">Jawaban contoh</h6>
                      <div className="question-preview-body">{renderPreviewBlocks(item.question.sampleAnswer)}</div>
                    </div>
                  ) : null}
                  {item.question.explanation?.trim() ? (
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <h6 className="text-sm font-semibold">Pembahasan</h6>
                      <div className="question-preview-body">{renderPreviewBlocks(item.question.explanation)}</div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {item.errors.length > 0 || item.warnings.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Warning / Error</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {item.errors.map((message, index) => (
                    <div key={`error-${index}`} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-100">
                      <strong>Error</strong>
                      <p>{message}</p>
                    </div>
                  ))}
                  {item.warnings.map((message, index) => (
                    <div key={`warning-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
                      <strong>Warning</strong>
                      <p>{message}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <span className="text-sm text-muted-foreground">{label}</span>
        <strong className="block text-base">{value}</strong>
      </CardContent>
    </Card>
  );
}

function ImportQuestionPreview({ question }: { question: ReviewQuestion }) {
  const questionType = toReviewUiQuestionType(question.questionType);
  const choices = getFilledQuestionOptions(question);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prompt</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="question-preview-body">{renderPreviewBlocks(question.prompt)}</div>
        </CardContent>
      </Card>

      {questionType === "essay" ? (
        <Card>
          <CardContent className="space-y-1 pt-6">
            <strong>Jawaban esai</strong>
            <p className="text-sm text-muted-foreground">Siswa akan mengisi jawaban bebas pada kolom esai.</p>
          </CardContent>
        </Card>
      ) : null}

      {questionType === "true-false" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pernyataan</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="question-preview-table-wrap">
              <table className="question-preview-table">
                <thead>
                  <tr>
                    <th>Pernyataan</th>
                    <th>Benar</th>
                    <th>Salah</th>
                  </tr>
                </thead>
                <tbody>
                  {choices.map((choice) => (
                    <tr key={`true-false-${choice.key}`}>
                      <td>
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-sm font-semibold">
                            {choice.key}
                          </span>
                          <div>{renderPreviewBlocks(choice.text)}</div>
                        </div>
                      </td>
                      <td>
                        <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">
                          o
                        </span>
                      </td>
                      <td>
                        <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">
                          o
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {questionType !== "essay" && questionType !== "true-false" ? (
        <div className="grid gap-3">
          {choices.map((choice) => (
            <Card key={`choice-${choice.key}`}>
              <CardContent className="space-y-3 pt-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-sm font-semibold">
                  {choice.key}
                </span>
                <div className="question-preview-body">{renderPreviewBlocks(choice.text)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuestionFields({
  exerciseId,
  questionType,
  onQuestionTypeChange,
  namePrefix = "",
  fieldIdPrefix = "new",
  defaultValues,
}: {
  exerciseId: string;
  questionType: QuestionTypeValue;
  onQuestionTypeChange: (value: QuestionTypeValue) => void;
  namePrefix?: string;
  fieldIdPrefix?: string;
  defaultValues?: QuestionFieldDefaults;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`type-${fieldIdPrefix}`}>Tipe soal</Label>
        <Select name={`${namePrefix}questionType`} value={questionType} onValueChange={(value) => onQuestionTypeChange(value as QuestionTypeValue)}>
          <SelectTrigger id={`type-${fieldIdPrefix}`}>
            <SelectValue placeholder="Pilih tipe soal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single-choice">Pilihan ganda</SelectItem>
            <SelectItem value="multiple-choice">Pilihan jamak</SelectItem>
            <SelectItem value="true-false">Benar / Salah</SelectItem>
            <SelectItem value="essay">Esai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <label className="space-y-2">
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

      <label className="space-y-2">
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
        defaultValue={defaultValues?.prompt ?? ""}
        defaultImages={defaultValues?.promptImages ?? ""}
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
          defaultValue={defaultValues?.sampleAnswer ?? ""}
          defaultImages={defaultValues?.sampleAnswerImages ?? ""}
          placeholder="Isi acuan jawaban untuk koreksi esai."
        />
      ) : (
        <>
          <RichEditorField
            exerciseId={exerciseId}
            id={`optionA-${fieldIdPrefix}`}
            label={getChoiceFieldLabel(questionType, "A")}
            name={`${namePrefix}optionA`}
            imageName={`${namePrefix}optionAImages`}
            uploadFieldName="option-a"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionA ?? ""}
            defaultImages={defaultValues?.optionAImages ?? ""}
            placeholder={getChoicePlaceholder(questionType, "A")}
          />

          <RichEditorField
            exerciseId={exerciseId}
            id={`optionB-${fieldIdPrefix}`}
            label={getChoiceFieldLabel(questionType, "B")}
            name={`${namePrefix}optionB`}
            imageName={`${namePrefix}optionBImages`}
            uploadFieldName="option-b"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionB ?? ""}
            defaultImages={defaultValues?.optionBImages ?? ""}
            placeholder={getChoicePlaceholder(questionType, "B")}
          />

          <RichEditorField
            exerciseId={exerciseId}
            id={`optionC-${fieldIdPrefix}`}
            label={getChoiceFieldLabel(questionType, "C")}
            name={`${namePrefix}optionC`}
            imageName={`${namePrefix}optionCImages`}
            uploadFieldName="option-c"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionC ?? ""}
            defaultImages={defaultValues?.optionCImages ?? ""}
            placeholder={getChoicePlaceholder(questionType, "C")}
          />

          <RichEditorField
            exerciseId={exerciseId}
            id={`optionD-${fieldIdPrefix}`}
            label={getChoiceFieldLabel(questionType, "D")}
            name={`${namePrefix}optionD`}
            imageName={`${namePrefix}optionDImages`}
            uploadFieldName="option-d"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionD ?? ""}
            defaultImages={defaultValues?.optionDImages ?? ""}
            placeholder={getChoicePlaceholder(questionType, "D")}
          />

          {isTrueFalseQuestionType(questionType) ? null : (
            <RichEditorField
              exerciseId={exerciseId}
              id={`optionE-${fieldIdPrefix}`}
              label={getChoiceFieldLabel(questionType, "E")}
              name={`${namePrefix}optionE`}
              imageName={`${namePrefix}optionEImages`}
              uploadFieldName="option-e"
              multiline={false}
              spanTwo={false}
              defaultValue={defaultValues?.optionE ?? ""}
              defaultImages={defaultValues?.optionEImages ?? ""}
              placeholder={getChoicePlaceholder(questionType, "E")}
            />
          )}

          {questionType === "multiple-choice" ? (
            <label className="space-y-2 md:col-span-2">
              <Label htmlFor={`correct-answers-${fieldIdPrefix}`}>Jawaban benar</Label>
              <Input
                id={`correct-answers-${fieldIdPrefix}`}
                name={`${namePrefix}correctAnswers`}
                type="text"
                defaultValue={defaultValues?.correctAnswers ?? ""}
                placeholder="Contoh: A,C"
              />
            </label>
          ) : isTrueFalseQuestionType(questionType) ? (
            <label className="space-y-2 md:col-span-2">
              <Label htmlFor={`correct-answers-${fieldIdPrefix}`}>Pernyataan yang benar</Label>
              <Input
                id={`correct-answers-${fieldIdPrefix}`}
                name={`${namePrefix}correctAnswers`}
                type="text"
                defaultValue={defaultValues?.correctAnswers ?? ""}
                placeholder="Contoh: B,C. Kosongkan jika semua salah."
              />
              <p className="text-xs text-muted-foreground">Huruf yang diisi dianggap benar. Pernyataan lain otomatis dianggap salah.</p>
            </label>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`correct-answer-${fieldIdPrefix}`}>Kunci jawaban</Label>
              <Select name={`${namePrefix}correctAnswer`} defaultValue={defaultValues?.correctAnswer ?? "A"}>
                <SelectTrigger id={`correct-answer-${fieldIdPrefix}`}>
                  <SelectValue placeholder="Pilih jawaban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Pilihan A</SelectItem>
                  <SelectItem value="B">Pilihan B</SelectItem>
                  <SelectItem value="C">Pilihan C</SelectItem>
                  <SelectItem value="D">Pilihan D</SelectItem>
                  <SelectItem value="E">Pilihan E</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
        defaultValue={defaultValues?.explanation ?? ""}
        defaultImages={defaultValues?.explanationImages ?? ""}
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

  return (
    <div className={cn("space-y-3", spanTwo && "md:col-span-2")}>
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
      <input type="hidden" name={imageName} value={imageUrls.join(",")} />
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
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor={`${inputName}-upload`}>Gambar {label.toLowerCase()}</Label>
          <Input
            id={`${inputName}-upload`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
        {isUploading ? <p className="text-sm text-muted-foreground">Mengupload gambar...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {value.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {value.map((url, index) => (
              <div key={`${url}-${index}`} className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
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
          <p className="text-sm text-muted-foreground">Belum ada gambar. Upload jika bagian ini membutuhkan ilustrasi.</p>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Preview {label.toLowerCase()}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
          <p className="text-sm text-muted-foreground">Preview akan tampil setelah teks atau gambar diisi.</p>
        )}
      </CardContent>
    </Card>
  );
}
