import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/prisma";
import { MaterialEditForm } from "./ui/MaterialEditForm";

type MaterialEditPageProps = {
  params: Promise<{ materialId: string }>;
};

export default async function MaterialEditPage({ params }: MaterialEditPageProps) {
  const { materialId } = await params;
  const prisma = getPrismaClient();

  if (!prisma) {
    notFound();
  }

  const [material, topics] = await Promise.all([
    prisma.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        topicId: true,
        title: true,
        type: true,
        status: true,
        accessLevel: true,
        description: true,
        fileName: true,
        coverName: true,
        fileUrl: true,
        coverUrl: true,
      },
    }),
    prisma.topic.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, category: true, difficulty: true },
    }),
  ]);

  if (!material) {
    notFound();
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-4xl">
      <AdminPageHeader
        kicker="Materi"
        title="Edit materi"
        description="Perbarui isi materi, file, cover, akses, dan status tayang dalam satu pola yang konsisten."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/admin/topics/${material.topicId}`}>Detail Topic</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/topics">Kembali</Link>
            </Button>
          </>
        }
      />

      <AdminPageSection>
        <MaterialEditForm material={material} topics={topics} />
      </AdminPageSection>
    </AdminPageShell>
  );
}
