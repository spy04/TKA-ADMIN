"use client";

import { useActionState } from "react";
import { createTopicDraftAction, type TopicFormState } from "@/app/admin/actions";
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

export function TopicComposerForm() {
  const [state, formAction, isPending] = useActionState(createTopicDraftAction, initialState);

  return (
    <form className="topic-form" action={formAction}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <section className="form-section">
        <div className="form-grid">
          <label className="field field-span-2">
            <Label htmlFor="topicTitle">Judul topic</Label>
            <Input id="topicTitle" name="topicTitle" type="text" placeholder="Contoh: Dasar Matematika SD Kelas 4" />
          </label>

          <label className="field">
            <Label htmlFor="category">Kategori</Label>
            <select className="shad-select" id="category" name="category" defaultValue="">
              <option value="" disabled>
                Pilih kategori
              </option>
              <option value="matematika">Matematika</option>
              <option value="bahasa-indonesia">Bahasa Indonesia</option>
              <option value="ipa">IPA</option>
              <option value="bahasa-inggris">Bahasa Inggris</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="difficulty">Level kesulitan</Label>
            <select className="shad-select" id="difficulty" name="difficulty" defaultValue="">
              <option value="" disabled>
                Pilih level
              </option>
              <option value="pemula">Pemula</option>
              <option value="menengah">Menengah</option>
              <option value="lanjutan">Lanjutan</option>
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="summary">Ringkasan topic</Label>
            <Textarea
              id="summary"
              name="summary"
              placeholder="Jelaskan tujuan belajar, cakupan topik, dan gambaran isi yang akan diterima user."
            />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="choice-grid">
          {visibilityOptions.map((option) => (
            <label key={option.value} className="choice-card">
              <input className="choice-input" type="radio" name="previewMode" value={option.value} defaultChecked={option.value === "preview-only"} />
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
          {isPending ? "Menyimpan topic..." : "Simpan Topic Dulu"}
        </Button>
        <Button variant="secondary" type="reset" disabled={isPending}>
          Reset Form
        </Button>
      </div>
    </form>
  );
}
