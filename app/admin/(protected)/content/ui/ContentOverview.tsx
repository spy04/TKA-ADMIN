"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, ClipboardList, FileText, Layers3 } from "lucide-react";
import {
  deleteExerciseAction,
  deleteMaterialAction,
  deleteTopicAction,
  updateExercisePublishStatusAction,
  updateMaterialPublishStatusAction,
  updateTopicPublishStatusAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type ExerciseRowItem = {
  id: string;
  title: string;
  questionCount: number | null;
  status: "DRAFT" | "PUBLISHED";
  accessLevel?: "PREVIEW" | "ENROLLED";
};

type TopicItem = {
  id: string;
  title: string;
  difficulty: string;
  status: "DRAFT" | "PUBLISHED";
  previewMode: "PREVIEW" | "ENROLLED";
  category: string;
  summary: string | null;
  materials: Array<{
    id: string;
    title: string;
    type: string;
    status: "DRAFT" | "PUBLISHED";
    accessLevel: "PREVIEW" | "ENROLLED";
  }>;
  exercises: Array<ExerciseRowItem>;
};

type CategoryExerciseItem = ExerciseRowItem & {
  topic: {
    category: string;
    difficulty: string;
  };
};

export function ContentOverview({
  topics,
  categoryExercises,
}: {
  topics: TopicItem[];
  categoryExercises: CategoryExerciseItem[];
}) {
  const [openTopicId, setOpenTopicId] = useState<string | null>(topics[0]?.id ?? null);
  const groupedCategoryExercises = useMemo(() => {
    const grouped = categoryExercises.reduce((map, exercise) => {
      const key = `${exercise.topic.category}:::${exercise.topic.difficulty}`;
      const existing = map.get(key);

      if (existing) {
        existing.exercises.push(exercise);
        return map;
      }

      map.set(key, {
        key,
        category: exercise.topic.category,
        difficulty: exercise.topic.difficulty,
        exercises: [exercise],
      });
      return map;
    }, new Map<string, { key: string; category: string; difficulty: string; exercises: CategoryExerciseItem[] }>());

    return Array.from(grouped.values()).sort(
      (left, right) => left.category.localeCompare(right.category) || left.difficulty.localeCompare(right.difficulty),
    );
  }, [categoryExercises]);

  function toggleTopic(topicId: string) {
    setOpenTopicId((current) => (current === topicId ? null : topicId));
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Layers3 size={18} className="text-muted-foreground" />
            <div>
              <h2 className="font-semibold">Latihan kategori</h2>
              <p className="text-sm text-muted-foreground">
                Paket latihan yang langsung mewakili kombinasi kategori dan jenjang seperti Math - SD.
              </p>
            </div>
          </div>

          {groupedCategoryExercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada latihan kategori yang dibuat.</p>
          ) : (
            <div className="space-y-4">
              {groupedCategoryExercises.map((group) => (
                <Card key={group.key} className="border-dashed">
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{group.category} - {group.difficulty}</h3>
                      <Badge variant="outline">{group.exercises.length} latihan</Badge>
                    </div>
                    <div className="space-y-3">
                      {group.exercises.map((exercise) => (
                        <ExerciseRow key={exercise.id} exercise={exercise} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {topics.map((topic) => {
          const isOpen = openTopicId === topic.id;

          return (
            <Card key={topic.id} className={cn("border-border/70 transition", isOpen && "border-primary/40")}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">{topic.title}</h2>
                      <Badge variant="secondary">{topic.difficulty}</Badge>
                      <Badge variant="outline">{topic.category}</Badge>
                      <StatusBadge status={topic.status} />
                      <Badge variant="outline">
                        {topic.previewMode === "PREVIEW" ? "Preview aktif" : "Enrolled only"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {topic.materials.length} materi / {topic.exercises.length} latihan topic
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleTopic(topic.id)}>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {isOpen ? "Sembunyikan detail" : "Lihat detail"}
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/admin/topics/${topic.id}/edit`}>Edit topic</Link>
                    </Button>
                    <form action={updateTopicPublishStatusAction}>
                      <input type="hidden" name="topicId" value={topic.id} />
                      <input type="hidden" name="intent" value={topic.status === "PUBLISHED" ? "unpublish" : "publish"} />
                      <Button size="sm" variant="secondary" type="submit">
                        {topic.status === "PUBLISHED" ? "Jadikan Draft" : "Publish"}
                      </Button>
                    </form>
                    <form action={deleteTopicAction}>
                      <input type="hidden" name="topicId" value={topic.id} />
                      <Button size="sm" variant="outline" type="submit">
                        Hapus
                      </Button>
                    </form>
                  </div>
                </div>

                {isOpen ? (
                  <div className="space-y-4">
                    {topic.summary ? (
                      <Card className="border-dashed">
                        <CardContent className="space-y-2 pt-6">
                          <h3 className="font-semibold">Deskripsi topic</h3>
                          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{topic.summary}</p>
                        </CardContent>
                      </Card>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Card className="border-dashed">
                        <CardContent className="space-y-4 pt-6">
                          <div className="flex items-center gap-2">
                            <ClipboardList size={18} className="text-muted-foreground" />
                            <h3 className="font-semibold">Latihan topic</h3>
                          </div>

                          {topic.exercises.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada latihan yang khusus untuk topic ini.</p>
                          ) : (
                            <div className="space-y-3">
                              {topic.exercises.map((exercise) => (
                                <ExerciseRow key={exercise.id} exercise={exercise} />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-dashed">
                        <CardContent className="space-y-4 pt-6">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-muted-foreground" />
                            <h3 className="font-semibold">Materi</h3>
                          </div>

                          {topic.materials.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada materi pada topic ini.</p>
                          ) : (
                            <div className="space-y-3">
                              {topic.materials.map((material) => (
                                <div
                                  key={material.id}
                                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium">{material.title}</p>
                                      <Badge variant="outline">{material.type}</Badge>
                                      <StatusBadge status={material.status} />
                                      <Badge variant="outline">
                                        {material.accessLevel === "PREVIEW" ? "Preview" : "Enrolled"}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Materi tidak lagi menjadi lokasi utama penyimpanan latihan.
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button asChild size="sm">
                                      <Link href={`/admin/materials/${material.id}/edit`}>Edit materi</Link>
                                    </Button>
                                    <form action={updateMaterialPublishStatusAction}>
                                      <input type="hidden" name="materialId" value={material.id} />
                                      <input type="hidden" name="intent" value={material.status === "PUBLISHED" ? "unpublish" : "publish"} />
                                      <Button size="sm" variant="secondary" type="submit">
                                        {material.status === "PUBLISHED" ? "Jadikan Draft" : "Publish"}
                                      </Button>
                                    </form>
                                    <form action={deleteMaterialAction}>
                                      <input type="hidden" name="materialId" value={material.id} />
                                      <Button size="sm" variant="outline" type="submit">
                                        Hapus
                                      </Button>
                                    </form>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ExerciseRow({ exercise }: { exercise: ExerciseRowItem }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <p className="font-medium">{exercise.title}</p>
        <p className="text-sm text-muted-foreground">
          {exercise.questionCount ?? 0} soal
          {exercise.accessLevel ? ` / ${exercise.accessLevel === "PREVIEW" ? "Preview" : "Enrolled"}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={exercise.status} />
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/exercises/${exercise.id}/edit`}>Kelola soal</Link>
        </Button>
        <form action={updateExercisePublishStatusAction}>
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <input type="hidden" name="intent" value={exercise.status === "PUBLISHED" ? "unpublish" : "publish"} />
          <Button size="sm" variant="secondary" type="submit">
            {exercise.status === "PUBLISHED" ? "Jadikan Draft" : "Publish"}
          </Button>
        </form>
        <form action={deleteExerciseAction}>
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <Button size="sm" variant="outline" type="submit">
            Hapus
          </Button>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  return (
    <Badge
      variant="outline"
      className={status === "PUBLISHED" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}
    >
      {status === "PUBLISHED" ? "Published" : "Draft"}
    </Badge>
  );
}
