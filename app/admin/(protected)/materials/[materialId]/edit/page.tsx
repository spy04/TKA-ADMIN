import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Materi</span>
            <h1 className="page-title" style={{ fontSize: "2.2rem", marginBottom: 8 }}>
              Edit materi
            </h1>
          </div>

          <div className="topbar-meta">
            <Link className="button-secondary" href="/admin/content">
              Kembali
            </Link>
          </div>
        </header>

        <article className="card panel single-panel">
          <MaterialEditForm material={material} topics={topics} />
        </article>
      </div>
    </main>
  );
}
