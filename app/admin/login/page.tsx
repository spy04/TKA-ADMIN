import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAuthConfig, isAdminAuthenticated } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./ui/LoginForm";

export default async function AdminLoginPage() {
  const isLoggedIn = await isAdminAuthenticated();

  if (isLoggedIn) {
    redirect("/admin");
  }

  const isConfigured = hasAuthConfig();

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <span className="auth-kicker">TKA Admin Internal</span>
        <h1 className="auth-title">Kelola materi dengan akses yang lebih aman dan tetap sederhana.</h1>
        <p className="auth-copy">
          Panel ini dibuat untuk kebutuhan internal: upload materi, cek status konten, dan menjaga alur admin tetap rapi.
          Password tunggal cukup untuk mulai, lalu nanti bisa kita upgrade kalau kebutuhan bertambah.
        </p>

        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-badge">1</div>
            <div>
              <h2 className="feature-title">Akses jelas dan terkontrol</h2>
              <p className="feature-copy">Semua halaman admin diarahkan ke login jika sesi belum aktif.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-badge">2</div>
            <div>
              <h2 className="feature-title">Siap untuk upload materi</h2>
              <p className="feature-copy">Dashboard awal sudah disiapkan agar nanti fitur upload dan manajemen konten mudah ditambah.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-badge">3</div>
            <div>
              <h2 className="feature-title">Cocok untuk deploy di Vercel</h2>
              <p className="feature-copy">Credential disimpan di environment variable, bukan ditaruh langsung di source code.</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="login-card">
        <CardContent className="pt-8">
        <Badge variant="secondary">Masuk Admin</Badge>
        <h2 className="page-title" style={{ fontSize: "2rem", marginTop: 16 }}>
          Login untuk lanjut ke panel admin
        </h2>
        <p className="page-copy">
          Gunakan akun admin internal. Jika nanti ingin, kita bisa ganti jadi multi-user atau login via email.
        </p>
        {!isConfigured ? (
          <Alert variant="destructive" className="mt-5">
            Konfigurasi belum lengkap. Isi dulu `ADMIN_USERNAME`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET` di file `.env.local`.
          </Alert>
        ) : null}
        <LoginForm />
        <p className="helper-text" style={{ marginTop: 18 }}>
          Setelah berhasil login, kamu akan diarahkan ke dashboard admin. Butuh kembali ke awal?{" "}
          <Link href="/admin/login">Reset form</Link>.
        </p>
        </CardContent>
      </Card>
    </main>
  );
}
