import Link from "next/link";
import { TopicComposerForm } from "./ui/TopicComposerForm";

export default function NewTopicPage() {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Topic</span>
            <h1 className="page-title" style={{ fontSize: "2.2rem", marginBottom: 8 }}>
              Buat topic
            </h1>
          </div>

          <div className="topbar-meta">
            <Link className="button-secondary" href="/admin/content">
              Kembali
            </Link>
          </div>
        </header>

        <article className="card panel single-panel">
          <TopicComposerForm />
        </article>
      </div>
    </main>
  );
}
