"use client";

import { useActionState, useMemo, useState } from "react";
import { createExerciseAction, type ExerciseFormState } from "@/app/admin/actions";
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

const initialState: ExerciseFormState = {};

function buildCategoryKey(category: string, difficulty: string) {
  return `${category}:::${difficulty}`;
}

export function ExerciseComposerForm({ topics }: { topics: TopicOption[] }) {
  const [state, formAction, isPending] = useActionState(createExerciseAction, initialState);
  const [placementScope, setPlacementScope] = useState<"category" | "topic">("category");
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Map(
          topics.map((topic) => [
            buildCategoryKey(topic.category, topic.difficulty),
            {
              key: buildCategoryKey(topic.category, topic.difficulty),
              label: `${topic.category} - ${topic.difficulty}`,
            },
          ]),
        ).values(),
      ),
    [topics],
  );

  return (
    <form className="space-y-4" action={formAction}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      {topics.length === 0 ? (
        <Alert variant="destructive">Belum ada topic. Buat topic dulu agar latihan bisa ditempatkan dengan rapi.</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi latihan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="placementScope">Penempatan latihan</Label>
            <Select
              name="placementScope"
              defaultValue="category"
              onValueChange={(value) => setPlacementScope(value === "topic" ? "topic" : "category")}
            >
              <SelectTrigger id="placementScope">
                <SelectValue placeholder="Pilih penempatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Latihan kategori</SelectItem>
                <SelectItem value="topic">Latihan topic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exerciseAccess">Akses latihan</Label>
            <Select name="exerciseAccess" defaultValue="enrolled">
              <SelectTrigger id="exerciseAccess">
                <SelectValue placeholder="Pilih akses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preview">Bisa dicoba user umum</SelectItem>
                <SelectItem value="enrolled">Khusus user enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {placementScope === "category" ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="categoryKey">Kategori dan jenjang</Label>
              <Select name="categoryKey">
                <SelectTrigger id="categoryKey">
                  <SelectValue placeholder="Pilih kategori latihan" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.key} value={category.key}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Contoh: Math - SD. Latihan ini akan muncul sebagai paket kategori, bukan menempel ke satu materi.
              </p>
            </div>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="topicId">Topic tujuan</Label>
              <Select name="topicId">
                <SelectTrigger id="topicId">
                  <SelectValue placeholder="Pilih topic tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.title} • {topic.category} - {topic.difficulty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Gunakan mode ini kalau latihan memang khusus untuk satu topic tertentu.
              </p>
            </div>
          )}

          <label className="space-y-2 md:col-span-2">
            <Label htmlFor="exerciseTitle">Judul latihan soal</Label>
            <Input id="exerciseTitle" name="exerciseTitle" type="text" placeholder="Contoh: Paket Math SD 01" />
          </label>

          <div className="space-y-2">
            <Label htmlFor="exerciseStatus">Status tayang</Label>
            <Select name="exerciseStatus" defaultValue="draft">
              <SelectTrigger id="exerciseStatus">
                <SelectValue placeholder="Pilih status tayang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="space-y-2 md:col-span-2">
            <Label htmlFor="adminNotes">Catatan admin</Label>
            <Textarea id="adminNotes" name="adminNotes" placeholder="Catatan singkat tentang paket latihan ini." />
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
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
