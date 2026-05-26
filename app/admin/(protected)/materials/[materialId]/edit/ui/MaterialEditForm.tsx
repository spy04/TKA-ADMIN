"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type MaterialFormState, updateMaterialAction } from "@/app/admin/actions";
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

type MaterialEditFormProps = {
  material: {
    id: string;
    topicId: string;
    title: string;
    type: "VIDEO" | "PDF" | "SLIDE" | "DOCUMENT";
    status: "DRAFT" | "PUBLISHED";
    accessLevel: "PREVIEW" | "ENROLLED";
    description: string | null;
    fileName: string | null;
    coverName: string | null;
    fileUrl: string | null;
    coverUrl: string | null;
  };
  topics: TopicOption[];
};

const initialState: MaterialFormState = {};

function toMaterialTypeValue(type: MaterialEditFormProps["material"]["type"]) {
  if (type === "PDF") return "pdf";
  if (type === "SLIDE") return "slide";
  if (type === "DOCUMENT") return "dokumen";
  return "video";
}

export function MaterialEditForm({ material, topics }: MaterialEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateMaterialAction, initialState);

  return (
    <form className="topic-form" action={formAction}>
      <input type="hidden" name="materialId" value={material.id} />

      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <section className="form-section">
        <div className="form-grid">
          <label className="field field-span-2">
            <Label htmlFor="topicId">Pilih topic</Label>
            <select className="shad-select" id="topicId" name="topicId" defaultValue={material.topicId}>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title} - {topic.category} - {topic.difficulty}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="materialTitle">Judul materi</Label>
            <Input id="materialTitle" name="materialTitle" type="text" defaultValue={material.title} />
          </label>

          <label className="field">
            <Label htmlFor="materialType">Tipe materi</Label>
            <select className="shad-select" id="materialType" name="materialType" defaultValue={toMaterialTypeValue(material.type)}>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="slide">Slide</option>
              <option value="dokumen">Dokumen</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="materialAccess">Status akses materi</Label>
            <select
              className="shad-select"
              id="materialAccess"
              name="materialAccess"
              defaultValue={material.accessLevel === "PREVIEW" ? "preview" : "enrolled"}
            >
              <option value="preview">Bisa dilihat dulu</option>
              <option value="enrolled">Khusus user enrolled</option>
            </select>
          </label>

          <label className="field">
            <Label htmlFor="materialStatus">Status tayang</Label>
            <select
              className="shad-select"
              id="materialStatus"
              name="materialStatus"
              defaultValue={material.status === "PUBLISHED" ? "published" : "draft"}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>

          <label className="field field-span-2">
            <Label htmlFor="materialDescription">Deskripsi materi</Label>
            <Textarea id="materialDescription" name="materialDescription" defaultValue={material.description ?? ""} />
          </label>

          <label className="field">
            <Label htmlFor="materialFile">Upload file materi baru</Label>
            <Input id="materialFile" className="file:mr-3" name="materialFile" type="file" />
            <span className="helper-text">File saat ini: {material.fileName ?? "Belum ada file tersimpan."}</span>
            {material.fileUrl ? (
              <a className="helper-text" href={material.fileUrl} target="_blank" rel="noreferrer">
                Buka file saat ini
              </a>
            ) : null}
          </label>

          <label className="field">
            <Label htmlFor="materialCover">Thumbnail atau cover baru</Label>
            <Input id="materialCover" className="file:mr-3" name="materialCover" type="file" />
            <span className="helper-text">Cover saat ini: {material.coverName ?? "Belum ada cover tersimpan."}</span>
            {material.coverUrl ? (
              <a className="helper-text" href={material.coverUrl} target="_blank" rel="noreferrer">
                Buka cover saat ini
              </a>
            ) : null}
          </label>
        </div>
      </section>

      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan perubahan..." : "Simpan Perubahan Materi"}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/content">Kembali ke Daftar</Link>
        </Button>
      </div>
    </form>
  );
}
