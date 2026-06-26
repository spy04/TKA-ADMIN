import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrismaClient } from "@/lib/prisma";
import { ExerciseEditForm } from "./ui/ExerciseEditForm";
import { QuestionManager } from "./ui/QuestionManager";

const statusCopy: Record<string, string> = {
  "question-deleted": "Soal berhasil dihapus.",
  "question-delete-failed": "Soal gagal dihapus.",
  "database-offline": "Database belum aktif.",
  "exercise-published": "Latihan berhasil dipublish.",
  "exercise-unpublished": "Latihan dikembalikan ke draft.",
  "exercise-publish-failed": "Status publish latihan gagal diubah.",
  "exercise-unpublish-failed": "Status draft latihan gagal diubah.",
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
        scope: true,
        topicId: true,
        questionCount: true,
        topic: {
          select: {
            title: true,
            category: true,
            difficulty: true,
          },
        },
      },
    }),
    prisma.topic.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
      },
    }),
  ]);

  if (!exercise) {
    notFound();
  }

  return (
    <main className="dashboard-shell">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Latihan</span>
              <CardTitle className="text-3xl sm:text-4xl">
                {exercise.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{exercise.questionCount ?? 0} soal</p>
            </div>

            <Button asChild variant="outline">
              <Link href="/admin/exercises">Kembali</Link>
            </Button>
          </CardHeader>
        </Card>

        {status && statusCopy[status] ? <Alert variant="success">{statusCopy[status]}</Alert> : null}

        <Card>
          <CardContent className="pt-6">
          <ExerciseEditForm
            exercise={{
              id: exercise.id,
              title: exercise.title,
              status: exercise.status,
              accessLevel: exercise.accessLevel,
              adminNotes: exercise.adminNotes,
              scope: exercise.scope,
              topicId: exercise.topicId,
              topic: exercise.topic,
            }}
            topics={topics}
          />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
          <QuestionManager exerciseId={exercise.id} exerciseTitle={exercise.title} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
