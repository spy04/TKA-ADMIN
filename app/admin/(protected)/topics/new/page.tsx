import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminPageSection, AdminPageShell } from "@/components/admin/admin-page-shell";
import { TopicComposerForm } from "./ui/TopicComposerForm";

export default function NewTopicPage() {
  return (
    <AdminPageShell maxWidthClassName="max-w-4xl">
      <AdminPageHeader
        kicker="Topic"
        title="Buat topic"
        description="Isi informasi inti topic dulu, lalu atur visibilitasnya untuk siswa."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/topics">Kembali</Link>
          </Button>
        }
      />

      <AdminPageSection>
        <TopicComposerForm />
      </AdminPageSection>
    </AdminPageShell>
  );
}
