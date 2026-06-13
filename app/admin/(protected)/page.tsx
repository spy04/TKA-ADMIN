import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, FileText, LayoutDashboard, Rocket, UploadCloud } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const workflowSteps = [
  {
    label: "Langkah 1",
    title: "Buat topic",
    copy: "Tentukan kategori, level, ringkasan, dan akses awal sebelum konten lain dibuat.",
    href: "/admin/topics/new",
    action: "Mulai dari topic",
    icon: BookOpen,
  },
  {
    label: "Langkah 2",
    title: "Tambah materi",
    copy: "Upload file, cover, dan deskripsi materi yang akan dipelajari siswa.",
    href: "/admin/materials/new",
    action: "Tambah materi",
    icon: FileText,
  },
  {
    label: "Langkah 3",
    title: "Buat latihan",
    copy: "Hubungkan latihan ke topic atau materi tertentu agar alur belajar lebih jelas.",
    href: "/admin/exercises/new",
    action: "Buat latihan",
    icon: ClipboardList,
  },
  {
    label: "Langkah 4",
    title: "Isi soal",
    copy: "Masuk ke daftar konten untuk import DOCX, edit soal, upload gambar, dan cek preview.",
    href: "/admin/content",
    action: "Kelola soal",
    icon: UploadCloud,
  },
  {
    label: "Langkah 5",
    title: "Publish",
    copy: "Review semua item di daftar konten, lalu publish topic, materi, dan latihan saat siap.",
    href: "/admin/content",
    action: "Review publish",
    icon: Rocket,
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="admin-hero">
          <div>
            <span className="section-kicker">Dashboard Admin</span>
            <h1 className="page-title admin-hero-title">
              Alur kelola konten TKA Mudah
            </h1>
            <p className="admin-hero-copy">
              Ikuti urutan kerja dari membuat topic sampai publish supaya konten lebih rapi dan tidak ada langkah yang terlewat.
            </p>
          </div>

          <div className="admin-hero-actions">
            <Badge>Auth aktif</Badge>
            <Button asChild size="lg">
              <Link href="/admin/topics/new">
                <BookOpen size={18} />
                Mulai Buat Topic
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/admin/content">
                <LayoutDashboard size={18} />
                Lihat Konten
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="secondary" type="submit">Logout</Button>
            </form>
          </div>
        </header>

        <section className="workflow-panel">
          <div className="workflow-heading">
            <div>
              <span className="section-kicker section-kicker-soft">Workflow</span>
              <h2>Kerjakan berurutan</h2>
            </div>
            <p>Admin cukup mengikuti step ini dari kiri ke kanan. Setiap step punya aksi utama yang jelas.</p>
          </div>

          <div className="workflow-steps">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article key={step.title} className="workflow-step">
                  <div className="workflow-step-top">
                    <span className="workflow-number">{index + 1}</span>
                    <Icon size={22} />
                  </div>
                  <span className="action-label">{step.label}</span>
                  <h3 className="workflow-title">{step.title}</h3>
                  <p className="workflow-copy">{step.copy}</p>
                  <Button asChild variant={index === 0 ? "default" : "secondary"}>
                    <Link href={step.href}>
                      {step.action}
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="quick-panel">
          <div>
            <span className="section-kicker section-kicker-soft">Shortcut</span>
            <h2>Butuh edit cepat?</h2>
            <p className="page-copy">Kalau kontennya sudah ada, langsung masuk ke daftar konten untuk publish, edit, atau hapus data.</p>
          </div>
          <Button asChild>
            <Link href="/admin/content">
              Kelola semua konten
              <ArrowRight size={16} />
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
