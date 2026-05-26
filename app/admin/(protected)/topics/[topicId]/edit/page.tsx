import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Topic</span>
            <h1 className="page-title" style={{ fontSize: "2.2rem", marginBottom: 8 }}>
              Edit topic
            </h1>
          </div>

          <div className="topbar-meta">
            <Link className="button-secondary" href="/admin/content">
              Kembali
            </Link>
          </div>
        </header>

        <article className="card panel single-panel">
          <TopicEditForm topic={topic} />
        </article>
      </div>
    </main>
  );
}
