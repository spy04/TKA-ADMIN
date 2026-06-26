import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ClipboardList, FileText, PencilLine, Plus } from "lucide-react";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPrismaClient } from "@/lib/prisma";

type TopicDetailPageProps = {
  params: Promise<{ topicId: string }>;
};

export default async function TopicDetailPage({ params }: TopicDetailPageProps) {
  const { topicId } = await params;
  const prisma = getPrismaClient();

  if (!prisma) {
    notFound();
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      summary: true,
      status: true,
      previewMode: true,
      materials: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          accessLevel: true,
        },
      },
      exercises: {
        where: { scope: "TOPIC" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          questionCount: true,
          status: true,
          accessLevel: true,
        },
      },
    },
  });

  if (!topic) {
    notFound();
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        kicker="Topic Detail"
        title={topic.title}
        description="Halaman ini jadi pusat lanjut kerja untuk satu topic. Dari sini admin bisa tambah materi, lihat latihan topic, dan edit metadata."
        actions={
          <>
            <Button asChild>
              <Link href={`/admin/materials/new?topicId=${topic.id}`}>
                <Plus size={16} />
                Tambah Materi
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/admin/topics/${topic.id}/edit`}>
                <PencilLine size={16} />
                Edit Topic
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/topics">Kembali ke Topic</Link>
            </Button>
          </>
        }
      />

      <AdminPageSection title="Informasi topic" description="Ringkasan metadata utama untuk topic ini.">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{topic.category}</Badge>
                <Badge variant="secondary">{topic.difficulty}</Badge>
                <Badge
                  variant="outline"
                  className={topic.status === "PUBLISHED" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}
                >
                  {topic.status === "PUBLISHED" ? "Published" : "Draft"}
                </Badge>
                <Badge variant="outline">
                  {topic.previewMode === "PREVIEW" ? "Preview aktif" : "Enrolled only"}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {topic.summary?.trim() || "Belum ada ringkasan topic."}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="border-border/70">
              <CardContent className="space-y-1 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Materi</p>
                <p className="text-3xl font-semibold">{topic.materials.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="space-y-1 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Latihan topic</p>
                <p className="text-3xl font-semibold">{topic.exercises.length}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminPageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPageSection
          title="Materi"
          description="Tambahkan materi baru dari topic ini supaya penempatannya langsung benar."
        >
          <div className="space-y-3">
            {topic.materials.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Belum ada materi di topic ini.
                </CardContent>
              </Card>
            ) : (
              topic.materials.map((material) => (
                <Card key={material.id} className="border-border/70">
                  <CardContent className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{material.title}</p>
                        <Badge variant="outline">{material.type}</Badge>
                        <Badge
                          variant="outline"
                          className={material.status === "PUBLISHED" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}
                        >
                          {material.status === "PUBLISHED" ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {material.accessLevel === "PREVIEW" ? "Preview" : "Enrolled"}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/admin/materials/${material.id}/edit`}>
                        <FileText size={16} />
                        Edit Materi
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </AdminPageSection>

        <AdminPageSection
          title="Latihan topic"
          description="Latihan yang khusus menempel ke topic ini bisa dicek atau diedit dari sini."
        >
          <div className="space-y-3">
            {topic.exercises.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Belum ada latihan topic di topic ini.
                </CardContent>
              </Card>
            ) : (
              topic.exercises.map((exercise) => (
                <Card key={exercise.id} className="border-border/70">
                  <CardContent className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{exercise.title}</p>
                        <Badge
                          variant="outline"
                          className={exercise.status === "PUBLISHED" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}
                        >
                          {exercise.status === "PUBLISHED" ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {exercise.questionCount ?? 0} soal /{" "}
                        {exercise.accessLevel === "PREVIEW" ? "Preview" : "Enrolled"}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/admin/exercises/${exercise.id}/edit`}>
                        <ClipboardList size={16} />
                        Kelola Soal
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </AdminPageSection>
      </div>
    </AdminPageShell>
  );
}
