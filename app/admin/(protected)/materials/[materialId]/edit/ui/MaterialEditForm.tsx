"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { type MaterialFormState, updateMaterialAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [materialType, setMaterialType] = useState(toMaterialTypeValue(material.type));
  const isVideoMaterial = materialType === "video";

  return (
    <form className="space-y-4" action={formAction}>
      <input type="hidden" name="materialId" value={material.id} />

      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi materi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="topicId">Pilih topic</Label>
            <Select name="topicId" defaultValue={material.topicId}>
              <SelectTrigger id="topicId">
                <SelectValue placeholder="Pilih topic tujuan" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.title} - {topic.category} - {topic.difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="space-y-2 md:col-span-2">
            <Label htmlFor="materialTitle">Judul materi</Label>
            <Input id="materialTitle" name="materialTitle" type="text" defaultValue={material.title} />
          </label>

          <div className="space-y-2">
            <Label htmlFor="materialType">Tipe materi</Label>
            <Select name="materialType" value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger id="materialType">
                <SelectValue placeholder="Pilih tipe materi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="dokumen">Dokumen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="materialAccess">Status akses materi</Label>
            <Select name="materialAccess" defaultValue={material.accessLevel === "PREVIEW" ? "preview" : "enrolled"}>
              <SelectTrigger id="materialAccess">
                <SelectValue placeholder="Pilih akses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preview">Bisa dilihat dulu</SelectItem>
                <SelectItem value="enrolled">Khusus user enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="materialStatus">Status tayang</Label>
            <Select name="materialStatus" defaultValue={material.status === "PUBLISHED" ? "published" : "draft"}>
              <SelectTrigger id="materialStatus">
                <SelectValue placeholder="Pilih status tayang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="space-y-2 md:col-span-2">
            <Label htmlFor="materialDescription">Deskripsi materi</Label>
            <Textarea id="materialDescription" name="materialDescription" defaultValue={material.description ?? ""} />
          </label>

          {isVideoMaterial ? (
            <label className="space-y-2 md:col-span-2">
              <Label htmlFor="materialVideoUrl">Link video</Label>
              <Input
                id="materialVideoUrl"
                name="materialVideoUrl"
                type="url"
                defaultValue={material.type === "VIDEO" ? (material.fileUrl ?? "") : ""}
                placeholder="https://youtu.be/... atau https://drive.google.com/file/d/..."
              />
              <p className="text-sm text-muted-foreground">
                Materi video menggunakan link YouTube atau Google Drive. Kalau tipe diubah ke video, isi link ini sebelum menyimpan.
              </p>
              {material.type === "VIDEO" && material.fileUrl ? (
                <a
                  className="text-sm text-primary underline-offset-4 hover:underline"
                  href={material.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka link video saat ini
                </a>
              ) : null}
            </label>
          ) : (
            <label className="space-y-2">
              <Label htmlFor="materialFile">Upload file materi baru</Label>
              <Input id="materialFile" className="file:mr-3" name="materialFile" type="file" />
              <span className="text-sm text-muted-foreground">
                File saat ini: {material.fileName ?? "Belum ada file tersimpan."}
              </span>
              {material.fileUrl ? (
                <a
                  className="text-sm text-primary underline-offset-4 hover:underline"
                  href={material.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka file saat ini
                </a>
              ) : null}
            </label>
          )}

          <label className="space-y-2">
            <Label htmlFor="materialCover">Thumbnail atau cover baru</Label>
            <Input id="materialCover" className="file:mr-3" name="materialCover" type="file" />
            <span className="text-sm text-muted-foreground">Cover saat ini: {material.coverName ?? "Belum ada cover tersimpan."}</span>
            {material.coverUrl ? (
              <a className="text-sm text-primary underline-offset-4 hover:underline" href={material.coverUrl} target="_blank" rel="noreferrer">
                Buka cover saat ini
              </a>
            ) : null}
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan perubahan..." : "Simpan Perubahan Materi"}
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/admin/topics/${material.topicId}`}>Kembali ke Detail Topic</Link>
        </Button>
      </div>
    </form>
  );
}
