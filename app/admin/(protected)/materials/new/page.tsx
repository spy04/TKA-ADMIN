import Link from "next/link";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/prisma";
import { MaterialComposerForm } from "./ui/MaterialComposerForm";

type NewMaterialPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewMaterialPage({ searchParams }: NewMaterialPageProps) {
  const resolvedSearchParams = await searchParams;
  const defaultTopicId = Array.isArray(resolvedSearchParams.topicId)
    ? resolvedSearchParams.topicId[0]
    : resolvedSearchParams.topicId;
  const prisma = getPrismaClient();
  const topics = prisma
    ? await prisma.topic.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, category: true, difficulty: true },
      })
    : [];

  return (
    <AdminPageShell maxWidthClassName="max-w-4xl">
      <AdminPageHeader
        kicker="Materi"
        title="Tambah materi"
        description="Pilih topic tujuan, lalu lengkapi file, akses, dan status tayang materi. Jika datang dari detail topic, pilihan topic sudah langsung terisi."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/topics">Kembali</Link>
          </Button>
        }
      />

      <AdminPageSection>
        <MaterialComposerForm topics={topics} defaultTopicId={defaultTopicId} />
      </AdminPageSection>
    </AdminPageShell>
  );
}
