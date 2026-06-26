"use client";

import Link from "next/link";
import { Globe2, LockKeyhole, PencilLine, Settings2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  type ExerciseFormState,
  updateExerciseAction,
  updateExercisePublishStatusAction,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type ExerciseEditFormProps = {
  exercise: {
    id: string;
    title: string;
    status: "DRAFT" | "PUBLISHED";
    accessLevel: "PREVIEW" | "ENROLLED";
    adminNotes: string | null;
    topicId: string;
    scope: "CATEGORY" | "TOPIC";
    topic: {
      title: string;
      category: string;
      difficulty: string;
    };
  };
  topics: TopicOption[];
};

const initialState: ExerciseFormState = {};

function buildCategoryKey(category: string, difficulty: string) {
  return `${category}:::${difficulty}`;
}

export function ExerciseEditForm({ exercise, topics }: ExerciseEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateExerciseAction, initialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [placementScope, setPlacementScope] = useState<"category" | "topic">(
    exercise.scope === "CATEGORY" ? "category" : "topic",
  );
  const isPublished = exercise.status === "PUBLISHED";
  const statusLabel = isPublished ? "Published" : "Draft";
  const accessLabel = exercise.accessLevel === "PREVIEW" ? "Preview" : "Enrolled";
  const relationLabel =
    exercise.scope === "CATEGORY"
      ? `Kategori ${exercise.topic.category} - ${exercise.topic.difficulty}`
      : `Topic ${exercise.topic.title}`;
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

  useEffect(() => {
    if (state.success) {
      setSettingsOpen(false);
    }
  }, [state.success]);

  return (
    <div className="space-y-4">
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{statusLabel}</Badge>
          <Badge variant="outline">{accessLabel}</Badge>
          <Badge variant="outline">{relationLabel}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Ubah pengaturan latihan"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={16} />
          </Button>

          <form action={updateExercisePublishStatusAction}>
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <input type="hidden" name="intent" value={isPublished ? "unpublish" : "publish"} />
            <input type="hidden" name="returnTo" value={`/admin/exercises/${exercise.id}/edit`} />
            <Button type="submit" size="sm">
              {isPublished ? <LockKeyhole size={16} /> : <Globe2 size={16} />}
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </form>

          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/exercises">Kembali</Link>
          </Button>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilLine size={18} />
              Ubah latihan
            </DialogTitle>
            <DialogDescription>Pilih penempatan latihan, judul, akses, dan catatan admin.</DialogDescription>
          </DialogHeader>

          <form action={formAction} className="max-h-[calc(100vh-10rem)] space-y-6 overflow-y-auto px-6 pb-6">
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <input type="hidden" name="exerciseStatus" value={isPublished ? "published" : "draft"} />

            <Card>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="placementScope">Penempatan latihan</Label>
                  <Select
                    name="placementScope"
                    defaultValue={placementScope}
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
                  <Select name="exerciseAccess" defaultValue={exercise.accessLevel === "PREVIEW" ? "preview" : "enrolled"}>
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
                    <Select
                      name="categoryKey"
                      defaultValue={buildCategoryKey(exercise.topic.category, exercise.topic.difficulty)}
                    >
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
                  </div>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="topicId">Topic tujuan</Label>
                    <Select name="topicId" defaultValue={exercise.topicId}>
                      <SelectTrigger id="topicId">
                        <SelectValue placeholder="Pilih topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.title} • {topic.category} - {topic.difficulty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <label className="space-y-2 md:col-span-2">
                  <Label htmlFor="exerciseTitle">Judul latihan soal</Label>
                  <Input id="exerciseTitle" name="exerciseTitle" type="text" defaultValue={exercise.title} />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <Label htmlFor="adminNotes">Catatan admin</Label>
                  <Textarea id="adminNotes" name="adminNotes" defaultValue={exercise.adminNotes ?? ""} />
                </label>
              </CardContent>
            </Card>

            <DialogFooter className="p-0">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSettingsOpen(false)}>
                Batal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
