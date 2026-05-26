"use client";

import { useActionState, useState } from "react";
import { createQuestionAction, deleteQuestionAction, type QuestionFormState, updateQuestionAction } from "@/app/admin/actions";
import { MathEditorField } from "@/components/admin/MathEditorField";
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
    prompt: string;
    optionA: string | null;
    optionB: string | null;
    optionC: string | null;
    optionD: string | null;
    correctAnswer: "A" | "B" | "C" | "D" | null;
    correctAnswers: string | null;
    sampleAnswer: string | null;
    explanation: string | null;
  }[];
};

const initialState: QuestionFormState = {};

function toUiQuestionType(value: QuestionManagerProps["questions"][number]["questionType"]): QuestionTypeValue {
  if (value === "MULTIPLE_CHOICE") return "multiple-choice";
  if (value === "ESSAY") return "essay";
  return "single-choice";
}

export function QuestionManager({ exerciseId, exerciseTitle, questions }: QuestionManagerProps) {
  const [state, formAction, isPending] = useActionState(createQuestionAction, initialState);
  const [questionType, setQuestionType] = useState<QuestionTypeValue>("single-choice");

  return (
    <div className="question-manager">
      <section className="form-section">
        <h3 className="form-section-title">Tambah soal</h3>

        <form className="topic-form" action={formAction}>
          <input type="hidden" name="exerciseId" value={exerciseId} />

          {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
          {state.success ? <Alert variant="success">{state.success}</Alert> : null}

          <QuestionFields questionType={questionType} onQuestionTypeChange={setQuestionType} />

          <div className="button-row">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan soal..." : "Tambah Soal"}
            </Button>
            <Button type="reset" variant="secondary" disabled={isPending}>
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
          questions.map((question) => (
            <QuestionEditor key={question.id} exerciseId={exerciseId} question={question} />
          ))
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
  const [state, formAction, isPending] = useActionState(updateQuestionAction, initialState);
  const [questionType, setQuestionType] = useState<QuestionTypeValue>(toUiQuestionType(question.questionType));

  return (
    <article className="card panel question-card">
      <div className="entity-header">
        <div>
          <span className="section-kicker">Soal {question.orderNumber}</span>
          <h3 className="entity-title" style={{ fontSize: "1.2rem", marginTop: 12 }}>
            Edit soal
          </h3>
        </div>
        <form action={deleteQuestionAction}>
          <input type="hidden" name="questionId" value={question.id} />
          <input type="hidden" name="exerciseId" value={exerciseId} />
          <Button type="submit" variant="outline" size="sm">
            Hapus Soal
          </Button>
        </form>
      </div>

      <form className="topic-form" action={formAction}>
        <input type="hidden" name="questionId" value={question.id} />
        <input type="hidden" name="exerciseId" value={exerciseId} />

        {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
        {state.success ? <Alert variant="success">{state.success}</Alert> : null}

        <QuestionFields
          questionType={questionType}
          onQuestionTypeChange={setQuestionType}
          fieldIdPrefix={question.id}
          defaultValues={{
            questionType,
            prompt: question.prompt,
            orderNumber: String(question.orderNumber),
            optionA: question.optionA ?? "",
            optionB: question.optionB ?? "",
            optionC: question.optionC ?? "",
            optionD: question.optionD ?? "",
            correctAnswer: question.correctAnswer ?? "A",
            correctAnswers: question.correctAnswers ?? "",
            sampleAnswer: question.sampleAnswer ?? "",
            explanation: question.explanation ?? "",
          }}
        />

        <div className="button-row">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan Soal"}
          </Button>
        </div>
      </form>
    </article>
  );
}

function QuestionFields({
  questionType,
  onQuestionTypeChange,
  fieldIdPrefix = "new",
  defaultValues,
}: {
  questionType: QuestionTypeValue;
  onQuestionTypeChange: (value: QuestionTypeValue) => void;
  fieldIdPrefix?: string;
  defaultValues?: {
    questionType: QuestionTypeValue;
    prompt: string;
    orderNumber: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    correctAnswers: string;
    sampleAnswer: string;
    explanation: string;
  };
}) {
  return (
    <div className="form-grid">
      <label className="field">
        <Label htmlFor={`type-${fieldIdPrefix}`}>Tipe soal</Label>
        <select
          className="shad-select"
          id={`type-${fieldIdPrefix}`}
          name="questionType"
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
          name="orderNumber"
          type="number"
          min="1"
          defaultValue={defaultValues?.orderNumber}
          placeholder="Otomatis jika kosong"
        />
      </label>

      <MathEditorField
        id={`prompt-${fieldIdPrefix}`}
        label="Pertanyaan"
        name="prompt"
        defaultValue={defaultValues?.prompt}
        placeholder="Tulis pertanyaan atau tempel rumus."
      />

      {questionType === "essay" ? (
        <MathEditorField
          id={`sample-answer-${fieldIdPrefix}`}
          label="Jawaban contoh"
          name="sampleAnswer"
          defaultValue={defaultValues?.sampleAnswer}
          placeholder="Isi acuan jawaban untuk koreksi esai."
        />
      ) : (
        <>
          <MathEditorField
            id={`optionA-${fieldIdPrefix}`}
            label="Pilihan A"
            name="optionA"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionA}
            placeholder="Pilihan A"
          />

          <MathEditorField
            id={`optionB-${fieldIdPrefix}`}
            label="Pilihan B"
            name="optionB"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionB}
            placeholder="Pilihan B"
          />

          <MathEditorField
            id={`optionC-${fieldIdPrefix}`}
            label="Pilihan C"
            name="optionC"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionC}
            placeholder="Pilihan C"
          />

          <MathEditorField
            id={`optionD-${fieldIdPrefix}`}
            label="Pilihan D"
            name="optionD"
            multiline={false}
            spanTwo={false}
            defaultValue={defaultValues?.optionD}
            placeholder="Pilihan D"
          />

          {questionType === "multiple-choice" ? (
            <label className="field field-span-2">
              <Label htmlFor={`correct-answers-${fieldIdPrefix}`}>Jawaban benar</Label>
              <Input
                id={`correct-answers-${fieldIdPrefix}`}
                name="correctAnswers"
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
                name="correctAnswer"
                defaultValue={defaultValues?.correctAnswer ?? "A"}
              >
                <option value="A">Pilihan A</option>
                <option value="B">Pilihan B</option>
                <option value="C">Pilihan C</option>
                <option value="D">Pilihan D</option>
              </select>
            </label>
          )}
        </>
      )}

      <MathEditorField
        id={`explanation-${fieldIdPrefix}`}
        label="Pembahasan"
        name="explanation"
        defaultValue={defaultValues?.explanation}
        placeholder="Opsional."
      />
    </div>
  );
}
