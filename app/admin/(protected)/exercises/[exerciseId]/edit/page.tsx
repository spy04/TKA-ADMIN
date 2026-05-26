import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { getPrismaClient } from "@/lib/prisma";
import { ExerciseEditForm } from "./ui/ExerciseEditForm";
import { QuestionManager } from "./ui/QuestionManager";

const statusCopy: Record<string, string> = {
  "question-deleted": "Soal berhasil dihapus.",
  "question-delete-failed": "Soal gagal dihapus.",
  "database-offline": "Database belum aktif.",
};

type ExerciseEditPageProps = {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExerciseEditPage({ params, searchParams }: ExerciseEditPageProps) {
  const { exerciseId } = await params;
  const resolvedSearchParams = await searchParams;
  const status = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;

  const prisma = getPrismaClient();

  if (!prisma) {
    notFound();
  }

  const [exercise, topics] = await Promise.all([
    prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        title: true,
        status: true,
        accessLevel: true,
        adminNotes: true,
        topicId: true,
        materialId: true,
        questionCount: true,
        questions: {
          orderBy: { orderNumber: "asc" },
          select: {
            id: true,
            questionType: true,
            orderNumber: true,
            prompt: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            correctAnswer: true,
            correctAnswers: true,
            sampleAnswer: true,
            explanation: true,
          },
        },
      },
    }),
    prisma.topic.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        materials: {
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true },
        },
      },
    }),
  ]);

  if (!exercise) {
    notFound();
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Latihan</span>
            <h1 className="page-title" style={{ fontSize: "2.2rem", marginBottom: 8 }}>
              {exercise.title}
            </h1>
            <p className="page-copy">{exercise.questionCount ?? 0} soal</p>
          </div>

          <div className="topbar-meta">
            <Link className="button-secondary" href="/admin/content">
              Kembali
            </Link>
          </div>
        </header>

        {status && statusCopy[status] ? <Alert variant="success">{statusCopy[status]}</Alert> : null}

        <article className="card panel single-panel">
          <ExerciseEditForm
            exercise={{
              id: exercise.id,
              title: exercise.title,
              status: exercise.status,
              accessLevel: exercise.accessLevel,
              adminNotes: exercise.adminNotes,
              topicId: exercise.topicId,
              materialId: exercise.materialId,
            }}
            topics={topics}
          />
        </article>

        <article className="card panel single-panel">
          <QuestionManager exerciseId={exercise.id} exerciseTitle={exercise.title} questions={exercise.questions} />
        </article>
      </div>
    </main>
  );
}
