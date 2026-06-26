import Link from "next/link";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ContentOverview } from "./ui/ContentOverview";
import { getPrismaClient } from "@/lib/prisma";

const statusCopy: Record<string, string> = {
  "topic-deleted": "Topic berhasil dihapus.",
  "material-deleted": "Materi berhasil dihapus.",
  "exercise-deleted": "Latihan berhasil dihapus.",
  "topic-delete-failed": "Topic gagal dihapus.",
  "topic-published": "Topic berhasil dipublish ke aplikasi user.",
  "topic-unpublished": "Topic dikembalikan ke draft.",
  "topic-publish-failed": "Topic gagal dipublish.",
  "topic-unpublish-failed": "Topic gagal dikembalikan ke draft.",
  "material-published": "Materi berhasil dipublish ke aplikasi user.",
  "material-unpublished": "Materi dikembalikan ke draft.",
  "material-publish-failed": "Materi gagal dipublish.",
  "material-unpublish-failed": "Materi gagal dikembalikan ke draft.",
  "exercise-published": "Latihan berhasil dipublish ke aplikasi user.",
  "exercise-unpublished": "Latihan dikembalikan ke draft.",
  "exercise-publish-failed": "Latihan gagal dipublish.",
  "exercise-unpublish-failed": "Latihan gagal dikembalikan ke draft.",
  "material-delete-failed": "Materi gagal dihapus.",
  "exercise-delete-failed": "Latihan gagal dihapus.",
  "database-offline": "Database belum aktif.",
};

type ContentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminContentPage({ searchParams }: ContentPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;

  const prisma = getPrismaClient();
  const [topics, categoryExercises] = prisma
    ? await Promise.all([
        prisma.topic.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            materials: {
              orderBy: { createdAt: "asc" },
            },
            exercises: {
              orderBy: { createdAt: "asc" },
              where: { scope: "TOPIC" },
              select: {
                id: true,
                title: true,
                questionCount: true,
                status: true,
                accessLevel: true,
                scope: true,
              },
            },
          },
        }),
        prisma.exercise.findMany({
          where: { scope: "CATEGORY" },
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            questionCount: true,
            status: true,
            accessLevel: true,
            topic: {
              select: {
                category: true,
                difficulty: true,
              },
            },
          },
        }),
      ])
    : [[], []];

  return (
    <AdminPageShell>
      <AdminPageHeader
        kicker="Konten"
        title="Kelola data"
        description="Semua topic, materi, dan latihan dalam tampilan yang lebih ringkas. Buka detail hanya saat diperlukan."
        actions={
          <>
            <Button asChild>
              <Link href="/admin/topics/new">Topic</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/materials/new">Materi</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/exercises/new">Latihan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Dashboard</Link>
            </Button>
          </>
        }
      />

      {status && statusCopy[status] ? <Alert variant="success">{statusCopy[status]}</Alert> : null}

      <AdminPageSection
        title={topics.length === 0 ? "Belum ada data" : "Daftar konten"}
        description={
          topics.length === 0
            ? "Mulai dari membuat topic, lalu lanjutkan ke materi dan latihan."
            : "Setiap topic ditampilkan ringkas dulu. Gunakan tombol detail untuk membuka isi di dalamnya."
        }
      >
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada topic, materi, atau latihan yang tersimpan.</p>
        ) : (
          <ContentOverview topics={topics} categoryExercises={categoryExercises} />
        )}
      </AdminPageSection>
    </AdminPageShell>
  );
}
