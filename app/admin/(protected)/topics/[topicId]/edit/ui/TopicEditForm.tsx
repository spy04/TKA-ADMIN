"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type TopicFormState, updateTopicAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: TopicFormState = {};

const visibilityOptions = [
  {
    value: "preview-only",
    title: "Ada materi preview",
    copy: "User umum bisa membuka beberapa materi contoh sebelum enrolled.",
  },
  {
    value: "members-only",
    title: "Semua materi terkunci",
    copy: "Semua materi utama hanya bisa dibuka setelah user enrolled.",
  },
];

const publishOptions = [
  {
    value: "draft",
    title: "Simpan sebagai draft",
    copy: "Topik belum tampil di aplikasi user sampai admin publish.",
  },
  {
    value: "published",
    title: "Publish ke user",
    copy: "Topik langsung masuk ke katalog user dan bisa dibaca sesuai aksesnya.",
  },
];

type TopicEditFormProps = {
  topic: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    summary: string | null;
    status: "DRAFT" | "PUBLISHED";
    previewMode: "PREVIEW" | "ENROLLED";
  };
};

export function TopicEditForm({ topic }: TopicEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateTopicAction, initialState);

  return (
    <form className="topic-form" action={formAction}>
      <input type="hidden" name="topicId" value={topic.id} />

      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <section className="form-section">
        <div className="form-grid">
          <label className="field field-span-2">
            <Label htmlFor="topicTitle">Judul topic</Label>
            <Input id="topicTitle" name="topicTitle" type="text" defaultValue={topic.title} />
          </label>

          <label className="field">
            <Label htmlFor="category">Kategori</Label>
            <select className="shad-select" id="category" name="category" defaultValue={topic.category}>
              <option value="matematika">Matematika</option>
              <option value="bahasa-indonesia">Bahasa Indonesia</option>
              <option value="ipa">IPA</option>
              <option value="bahasa-inggris">Bahasa Inggris</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="difficulty">Level kesulitan</Label>
            <select className="shad-select" id="difficulty" name="difficulty" defaultValue={topic.difficulty}>
              <option value="pemula">Pemula</option>
              <option value="menengah">Menengah</option>
              <option value="lanjutan">Lanjutan</option>
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="summary">Ringkasan topic</Label>
            <Textarea id="summary" name="summary" defaultValue={topic.summary ?? ""} />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="choice-grid">
          {visibilityOptions.map((option) => (
            <label key={option.value} className="choice-card">
              <input
                className="choice-input"
                type="radio"
                name="previewMode"
                value={option.value}
                defaultChecked={
                  topic.previewMode === "PREVIEW" ? option.value === "preview-only" : option.value === "members-only"
                }
              />
              <div>
                <h4 className="choice-title">{option.title}</h4>
                <p className="choice-copy">{option.copy}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="form-section">
        <div className="choice-grid">
          {publishOptions.map((option) => (
            <label key={option.value} className="choice-card">
              <input
                className="choice-input"
                type="radio"
                name="topicStatus"
                value={option.value}
                defaultChecked={topic.status === "PUBLISHED" ? option.value === "published" : option.value === "draft"}
              />
              <div>
                <h4 className="choice-title">{option.title}</h4>
                <p className="choice-copy">{option.copy}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan perubahan..." : "Simpan Perubahan Topic"}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/content">Kembali ke Daftar</Link>
        </Button>
      </div>
    </form>
  );
}
