import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/prisma";
import { TopicEditForm } from "./ui/TopicEditForm";

type TopicEditPageProps = {
  params: Promise<{ topicId: string }>;
};

export default async function TopicEditPage({ params }: TopicEditPageProps) {
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
    },
  });

  if (!topic) {
    notFound();
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-4xl">
      <AdminPageHeader
        kicker="Topic"
        title="Edit topic"
        description="Perbarui nama, kategori, ringkasan, dan visibilitas topic dengan tampilan yang lebih ringkas."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/admin/topics/${topic.id}`}>Detail Topic</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/topics">Kembali</Link>
            </Button>
          </>
        }
      />

      <AdminPageSection>
        <TopicEditForm topic={topic} />
      </AdminPageSection>
    </AdminPageShell>
  );
}
