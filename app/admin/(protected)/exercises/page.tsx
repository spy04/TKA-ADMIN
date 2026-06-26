import Link from "next/link";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/prisma";
import { ExercisesDirectory } from "./ui/ExercisesDirectory";

export default async function ExercisesPage() {
  const prisma = getPrismaClient();
  const exercises = prisma
    ? await prisma.exercise.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          scope: true,
          status: true,
          accessLevel: true,
          questionCount: true,
          adminNotes: true,
          topic: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
            },
          },
        },
      })
    : [];

  return (
    <AdminPageShell>
      <AdminPageHeader
        kicker="Latihan"
        title="Daftar latihan"
        description="Lihat semua latihan kategori dan latihan topic dari satu tempat, lalu masuk ke halaman soal saat perlu mengedit."
        actions={
          <>
            <Button asChild>
              <Link href="/admin/exercises/new">Tambah Latihan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Dashboard</Link>
            </Button>
          </>
        }
      />

      <AdminPageSection
        title="Semua latihan"
        description="Filter latihan berdasarkan scope, kategori, level, dan status."
      >
        <ExercisesDirectory exercises={exercises} />
      </AdminPageSection>
    </AdminPageShell>
  );
}
