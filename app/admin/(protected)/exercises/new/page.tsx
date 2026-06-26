import Link from "next/link";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/prisma";
import { ExerciseComposerForm } from "./ui/ExerciseComposerForm";

export default async function NewExercisePage() {
  const prisma = getPrismaClient();
  const topics = prisma
    ? await prisma.topic.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
        },
      })
    : [];

  return (
    <AdminPageShell maxWidthClassName="max-w-4xl">
      <AdminPageHeader
        kicker="Latihan"
        title="Tambah latihan"
        description="Tempatkan latihan sebagai paket kategori atau latihan topic, lalu atur akses dan statusnya."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/exercises">Kembali</Link>
          </Button>
        }
      />

      <AdminPageSection>
        <ExerciseComposerForm topics={topics} />
      </AdminPageSection>
    </AdminPageShell>
  );
}
