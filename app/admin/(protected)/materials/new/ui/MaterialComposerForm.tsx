"use client";

import { useActionState } from "react";
import { createMaterialAction, type MaterialFormState } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TopicOption = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
};

const initialState: MaterialFormState = {};

export function MaterialComposerForm({ topics }: { topics: TopicOption[] }) {
  const [state, formAction, isPending] = useActionState(createMaterialAction, initialState);

  return (
    <form className="topic-form" action={formAction}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      {topics.length === 0 ? (
        <Alert variant="destructive">Belum ada topic yang tersedia. Buat topic dulu sebelum menambah materi.</Alert>
      ) : null}

      <section className="form-section">
        <div className="form-grid">
          <label className="field field-span-2">
            <Label htmlFor="topicId">Pilih topic</Label>
            <select className="shad-select" id="topicId" name="topicId" defaultValue="">
              <option value="" disabled>
                Pilih topic tujuan
              </option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title} - {topic.category} - {topic.difficulty}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="materialTitle">Judul materi</Label>
            <Input id="materialTitle" name="materialTitle" type="text" placeholder="Contoh: Pengenalan Pecahan" />
          </label>

          <label className="field">
            <Label htmlFor="materialType">Tipe materi</Label>
            <select className="shad-select" id="materialType" name="materialType" defaultValue="video">
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="slide">Slide</option>
              <option value="dokumen">Dokumen</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="materialAccess">Status akses materi</Label>
            <select className="shad-select" id="materialAccess" name="materialAccess" defaultValue="preview">
              <option value="preview">Bisa dilihat dulu</option>
              <option value="enrolled">Khusus user enrolled</option>
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="materialDescription">Deskripsi materi</Label>
            <Textarea id="materialDescription" name="materialDescription" placeholder="Ringkasan isi materi." />
          </label>

          <label className="field">
            <Label htmlFor="materialFile">Upload file materi</Label>
            <Input id="materialFile" className="file:mr-3" name="materialFile" type="file" />
          </label>

          <label className="field">
            <Label htmlFor="materialCover">Thumbnail atau cover</Label>
            <Input id="materialCover" className="file:mr-3" name="materialCover" type="file" />
          </label>
        </div>
      </section>

      <div className="button-row">
        <Button type="submit" disabled={isPending || topics.length === 0}>
          {isPending ? "Menyimpan materi..." : "Simpan Materi"}
        </Button>
        <Button variant="secondary" type="reset" disabled={isPending}>
          Reset Form
        </Button>
      </div>
    </form>
  );
}
