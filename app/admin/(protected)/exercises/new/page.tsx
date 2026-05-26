import Link from "next/link";
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
          materials: {
            orderBy: { createdAt: "asc" },
            select: { id: true, title: true },
          },
        },
      })
    : [];

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Latihan</span>
            <h1 className="page-title" style={{ fontSize: "2.2rem", marginBottom: 8 }}>
              Tambah latihan
            </h1>
          </div>

          <div className="topbar-meta">
            <Link className="button-secondary" href="/admin/content">
              Kembali
            </Link>
          </div>
        </header>

        <article className="card panel single-panel">
          <ExerciseComposerForm topics={topics} />
        </article>
      </div>
    </main>
  );
}
