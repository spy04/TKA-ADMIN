import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, FileText, LayoutDashboard, Rocket, UploadCloud } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const workflowSteps = [
  {
    label: "Langkah 1",
    title: "Kelola topic",
    copy: "Masuk ke daftar topic untuk filter, tambah topic baru, lalu buka detail topic saat ingin lanjut menambah materi.",
    href: "/admin/topics",
    action: "Buka topic",
    icon: BookOpen,
  },
  {
    label: "Langkah 2",
    title: "Detail topic",
    copy: "Di dalam detail topic, admin bisa lanjut tambah materi tanpa kehilangan konteks topic yang sedang dikerjakan.",
    href: "/admin/topics",
    action: "Lihat detail",
    icon: FileText,
  },
  {
    label: "Langkah 3",
    title: "Kelola latihan",
    copy: "Buka daftar latihan untuk filter paket kategori atau latihan topic, lalu tambah latihan baru dari halaman yang sama.",
    href: "/admin/exercises",
    action: "Buka latihan",
    icon: ClipboardList,
  },
  {
    label: "Langkah 4",
    title: "Isi soal",
    copy: "Masuk ke halaman detail latihan saat ingin import DOCX, edit soal, upload gambar, dan cek preview.",
    href: "/admin/exercises",
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
    <AdminPageShell>
      <AdminPageHeader
        kicker="Dashboard Admin"
        title="Alur kelola konten TKA Mudah"
        description="Ikuti urutan kerja dari membuat topic sampai publish supaya konten lebih rapi, konsisten, dan tidak ada langkah yang terlewat."
        actions={
          <>
            <Badge>Auth aktif</Badge>
            <Button asChild>
              <Link href="/admin/topics">
                <BookOpen size={18} />
                Buka Topic
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/exercises">
                <LayoutDashboard size={18} />
                Buka Latihan
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="outline" type="submit">Logout</Button>
            </form>
          </>
        }
      />

      <AdminPageSection
        title="Workflow"
        description="Admin cukup mengikuti step ini dari kiri ke kanan. Setiap step punya aksi utama yang jelas."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Card key={step.title} className="border-border/70">
                <CardContent className="flex h-full flex-col gap-4 pt-6">
                  <div className="flex items-center justify-between text-primary">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <Icon size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step.label}</p>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                  </div>
                  <p className="flex-1 text-sm leading-6 text-muted-foreground">{step.copy}</p>
                  <Button asChild variant={index === 0 ? "default" : "outline"}>
                    <Link href={step.href}>
                      {step.action}
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </AdminPageSection>

      <AdminPageSection
        title="Shortcut"
        description="Masuk langsung ke pusat kerja utama sesuai kebutuhan admin hari ini."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Topic untuk struktur belajar, latihan untuk pengelolaan soal.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/topics">
                Kelola topic
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/exercises">
                Kelola latihan
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/content">
                Konten gabungan
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </AdminPageSection>
    </AdminPageShell>
  );
}
