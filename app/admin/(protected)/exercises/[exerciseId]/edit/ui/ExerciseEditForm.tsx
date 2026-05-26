"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type ExerciseFormState, updateExerciseAction } from "@/app/admin/actions";
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

type ExerciseEditFormProps = {
  exercise: {
    id: string;
    title: string;
    status: "DRAFT" | "PUBLISHED";
    accessLevel: "PREVIEW" | "ENROLLED";
    adminNotes: string | null;
    topicId: string;
    materialId: string | null;
  };
  topics: TopicOption[];
};

const initialState: ExerciseFormState = {};

export function ExerciseEditForm({ exercise, topics }: ExerciseEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateExerciseAction, initialState);
  const relationMode = exercise.materialId ? "material" : "topic";

  return (
    <form className="topic-form" action={formAction}>
      <input type="hidden" name="exerciseId" value={exercise.id} />

      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <section className="form-section">
        <div className="form-grid">
          <label className="field field-span-2">
            <Label htmlFor="topicId">Pilih topic</Label>
            <select className="shad-select" id="topicId" name="topicId" defaultValue={exercise.topicId}>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <Label htmlFor="relationMode">Relasi latihan</Label>
            <select className="shad-select" id="relationMode" name="relationMode" defaultValue={relationMode}>
              <option value="topic">Langsung ke topic</option>
              <option value="material">Terhubung ke materi tertentu</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="materialId">Materi terkait</Label>
            <select className="shad-select" id="materialId" name="materialId" defaultValue={exercise.materialId ?? ""}>
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
            <Input id="exerciseTitle" name="exerciseTitle" type="text" defaultValue={exercise.title} />
          </label>

          <label className="field">
            <Label htmlFor="exerciseAccess">Akses latihan</Label>
            <select
              className="shad-select"
              id="exerciseAccess"
              name="exerciseAccess"
              defaultValue={exercise.accessLevel === "PREVIEW" ? "preview" : "enrolled"}
            >
              <option value="preview">Bisa dicoba user umum</option>
              <option value="enrolled">Khusus user enrolled</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="exerciseStatus">Status tayang</Label>
            <select
              className="shad-select"
              id="exerciseStatus"
              name="exerciseStatus"
              defaultValue={exercise.status === "PUBLISHED" ? "published" : "draft"}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="adminNotes">Catatan admin</Label>
            <Textarea id="adminNotes" name="adminNotes" defaultValue={exercise.adminNotes ?? ""} />
          </label>
        </div>
      </section>

      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan perubahan..." : "Simpan Perubahan Latihan"}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/content">Kembali ke Daftar</Link>
        </Button>
      </div>
    </form>
  );
}
