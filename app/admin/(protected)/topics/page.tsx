import Link from "next/link";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/prisma";
import { TopicsDirectory } from "./ui/TopicsDirectory";

export default async function TopicsPage() {
  const prisma = getPrismaClient();
  const topics = prisma
    ? await prisma.topic.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          status: true,
          previewMode: true,
          summary: true,
          _count: {
            select: {
              materials: true,
              exercises: {
                where: {
                  scope: "TOPIC",
                },
              },
            },
          },
        },
      })
    : [];

  return (
    <AdminPageShell>
      <AdminPageHeader
        kicker="Topic"
        title="Daftar topic"
        description="Kelola semua topic dari satu halaman. Filter berdasarkan kategori, level, dan status, lalu lanjutkan ke detail topic untuk menambah materi."
        actions={
          <>
            <Button asChild>
              <Link href="/admin/topics/new">Tambah Topic</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Dashboard</Link>
            </Button>
          </>
        }
      />

      <AdminPageSection
        title="Semua topic"
        description="Pilih topic untuk melihat detail, edit metadata, atau lanjut menambah materi."
      >
        <TopicsDirectory
          topics={topics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            category: topic.category,
            difficulty: topic.difficulty,
            status: topic.status,
            previewMode: topic.previewMode,
            summary: topic.summary,
            materialCount: topic._count.materials,
            exerciseCount: topic._count.exercises,
          }))}
        />
      </AdminPageSection>
    </AdminPageShell>
  );
}
