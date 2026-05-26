"use client";

import { useActionState } from "react";
import { createExerciseAction, type ExerciseFormState } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TopicOption = {
  id: string;
  title: string;
  materials: {
    id: string;
    title: string;
  }[];
};

const initialState: ExerciseFormState = {};

export function ExerciseComposerForm({ topics }: { topics: TopicOption[] }) {
  const [state, formAction, isPending] = useActionState(createExerciseAction, initialState);

  return (
    <form className="topic-form" action={formAction}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      {topics.length === 0 ? (
        <Alert variant="destructive">Belum ada topic. Buat topic dulu agar latihan bisa disimpan dengan rapi.</Alert>
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
                  {topic.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <Label htmlFor="relationMode">Relasi latihan</Label>
            <select className="shad-select" id="relationMode" name="relationMode" defaultValue="topic">
              <option value="topic">Langsung ke topic</option>
              <option value="material">Terhubung ke materi tertentu</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="materialId">Materi terkait</Label>
            <select className="shad-select" id="materialId" name="materialId" defaultValue="">
              <option value="">Tidak dipilih</option>
              {topics.flatMap((topic) =>
                topic.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {topic.title} - {material.title}
                  </option>
                )),
              )}
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="exerciseTitle">Judul latihan soal</Label>
            <Input id="exerciseTitle" name="exerciseTitle" type="text" placeholder="Contoh: Kuis Pecahan Dasar" />
          </label>

          <label className="field">
            <Label htmlFor="questionCount">Jumlah soal</Label>
            <Input id="questionCount" name="questionCount" type="number" min="1" placeholder="10" />
          </label>

          <label className="field">
            <Label htmlFor="exerciseAccess">Akses latihan</Label>
            <select className="shad-select" id="exerciseAccess" name="exerciseAccess" defaultValue="enrolled">
              <option value="preview">Bisa dicoba user umum</option>
              <option value="enrolled">Khusus user enrolled</option>
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="adminNotes">Catatan admin</Label>
            <Textarea id="adminNotes" name="adminNotes" placeholder="Catatan penempatan latihan." />
          </label>
        </div>
      </section>

      <div className="button-row">
        <Button type="submit" disabled={isPending || topics.length === 0}>
          {isPending ? "Menyimpan latihan..." : "Simpan Latihan"}
        </Button>
        <Button variant="secondary" type="reset" disabled={isPending}>
          Reset Form
        </Button>
      </div>
    </form>
  );
}
