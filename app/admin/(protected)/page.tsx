import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Dashboard Admin</span>
            <h1 className="page-title" style={{ fontSize: "2.4rem", marginBottom: 8 }}>
              Panel admin
            </h1>
            <p className="page-copy">Pilih aksi yang ingin dikerjakan.</p>
          </div>

          <div className="topbar-meta">
            <Badge>Auth aktif</Badge>
            <Button asChild variant="outline">
              <Link href="/admin/content">Kelola Konten</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/topics/new">Buat Topic</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/materials/new">Tambah Materi</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/exercises/new">Tambah Latihan</Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="secondary" type="submit">Logout</Button>
            </form>
          </div>
        </header>

        <section className="action-grid">
          <Link className="action-card" href="/admin/topics/new">
            <span className="action-label">Topic</span>
            <strong className="action-title">Buat topic</strong>
          </Link>
          <Link className="action-card" href="/admin/materials/new">
            <span className="action-label">Materi</span>
            <strong className="action-title">Tambah materi</strong>
          </Link>
          <Link className="action-card" href="/admin/exercises/new">
            <span className="action-label">Latihan</span>
            <strong className="action-title">Tambah latihan</strong>
          </Link>
          <Link className="action-card" href="/admin/content">
            <span className="action-label">Kelola</span>
            <strong className="action-title">Lihat semua data</strong>
          </Link>
        </section>
      </div>
    </main>
  );
}
