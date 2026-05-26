import Link from "next/link";
import { getPrismaClient } from "@/lib/prisma";
import { MaterialComposerForm } from "./ui/MaterialComposerForm";

export default async function NewMaterialPage() {
  const prisma = getPrismaClient();
  const topics = prisma
    ? await prisma.topic.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, category: true, difficulty: true },
      })
    : [];

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Materi</span>
            <h1 className="page-title" style={{ fontSize: "2.2rem", marginBottom: 8 }}>
              Tambah materi
            </h1>
          </div>

          <div className="topbar-meta">
            <Link className="button-secondary" href="/admin/content">
              Kembali
            </Link>
          </div>
        </header>

        <article className="card panel single-panel">
          <MaterialComposerForm topics={topics} />
        </article>
      </div>
    </main>
  );
}
