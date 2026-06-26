"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createMaterialAction, type MaterialFormState } from "@/app/admin/actions";
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

const initialState: MaterialFormState = {};

export function MaterialComposerForm({
  topics,
  defaultTopicId,
}: {
  topics: TopicOption[];
  defaultTopicId?: string;
}) {
  const [state, formAction, isPending] = useActionState(createMaterialAction, initialState);
  const [materialType, setMaterialType] = useState("video");
  const isVideoMaterial = materialType === "video";

  return (
    <form className="space-y-4" action={formAction}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      {topics.length === 0 ? (
        <Alert variant="destructive">Belum ada topic yang tersedia. Buat topic dulu sebelum menambah materi.</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi materi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="topicId">Pilih topic</Label>
            <Select name="topicId" defaultValue={defaultTopicId}>
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
            <Input id="materialTitle" name="materialTitle" type="text" placeholder="Contoh: Pengenalan Pecahan" />
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
            <Select name="materialAccess" defaultValue="preview">
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
            <Select name="materialStatus" defaultValue="draft">
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
            <Textarea id="materialDescription" name="materialDescription" placeholder="Ringkasan isi materi." />
          </label>

          {isVideoMaterial ? (
            <label className="space-y-2 md:col-span-2">
              <Label htmlFor="materialVideoUrl">Link video</Label>
              <Input
                id="materialVideoUrl"
                name="materialVideoUrl"
                type="url"
                placeholder="https://youtu.be/... atau https://drive.google.com/file/d/..."
              />
              <p className="text-sm text-muted-foreground">
                Untuk materi video, gunakan link YouTube atau Google Drive. Upload file video tidak diperlukan.
              </p>
            </label>
          ) : (
            <label className="space-y-2">
              <Label htmlFor="materialFile">Upload file materi</Label>
              <Input id="materialFile" className="file:mr-3" name="materialFile" type="file" />
            </label>
          )}

          <label className="space-y-2">
            <Label htmlFor="materialCover">Thumbnail atau cover</Label>
            <Input id="materialCover" className="file:mr-3" name="materialCover" type="file" />
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
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
