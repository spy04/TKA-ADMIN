"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExerciseDirectoryItem = {
  id: string;
  title: string;
  scope: "CATEGORY" | "TOPIC";
  status: "DRAFT" | "PUBLISHED";
  accessLevel: "PREVIEW" | "ENROLLED";
  questionCount: number | null;
  adminNotes: string | null;
  topic: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
  };
};

export function ExercisesDirectory({ exercises }: { exercises: ExerciseDirectoryItem[] }) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");

  const categoryOptions = useMemo(
    () => Array.from(new Set(exercises.map((exercise) => exercise.topic.category))).sort((a, b) => a.localeCompare(b)),
    [exercises],
  );

  const filteredExercises = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return exercises.filter((exercise) => {
      const matchesSearch =
        !normalizedSearch ||
        exercise.title.toLowerCase().includes(normalizedSearch) ||
        exercise.topic.title.toLowerCase().includes(normalizedSearch) ||
        (exercise.adminNotes ?? "").toLowerCase().includes(normalizedSearch);
      const matchesScope = scope === "all" || exercise.scope === scope;
      const matchesCategory = category === "all" || exercise.topic.category === category;
      const matchesDifficulty = difficulty === "all" || exercise.topic.difficulty === difficulty;
      const matchesStatus = status === "all" || exercise.status === status;

      return matchesSearch && matchesScope && matchesCategory && matchesDifficulty && matchesStatus;
    });
  }, [category, difficulty, exercises, scope, search, status]);

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground" />
            <div>
              <h2 className="font-semibold">Filter latihan</h2>
              <p className="text-sm text-muted-foreground">Cari latihan berdasarkan scope, kategori, level, dan status.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="exercise-search">Cari latihan</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="exercise-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Cari judul latihan atau topic"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua scope</SelectItem>
                  <SelectItem value="CATEGORY">Latihan kategori</SelectItem>
                  <SelectItem value="TOPIC">Latihan topic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua level</SelectItem>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="SMP">SMP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="border-border/70">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{exercise.title}</h3>
                    <Badge variant="outline">
                      {exercise.scope === "CATEGORY" ? "Latihan kategori" : "Latihan topic"}
                    </Badge>
                    <Badge variant="outline">{exercise.topic.category}</Badge>
                    <Badge variant="secondary">{exercise.topic.difficulty}</Badge>
                    <Badge
                      variant="outline"
                      className={exercise.status === "PUBLISHED" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}
                    >
                      {exercise.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exercise.questionCount ?? 0} soal / {exercise.accessLevel === "PREVIEW" ? "Preview" : "Enrolled"}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <ClipboardList size={18} />
                </div>
              </div>

              <p className="line-clamp-2 min-h-11 text-sm leading-6 text-muted-foreground">
                {exercise.scope === "CATEGORY"
                  ? `Paket kategori ${exercise.topic.category} - ${exercise.topic.difficulty}.`
                  : `Terkait topic ${exercise.topic.title}.`}
                {exercise.adminNotes?.trim() ? ` ${exercise.adminNotes}` : ""}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/admin/exercises/${exercise.id}/edit`}>Kelola Soal</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/admin/topics/${exercise.topic.id}`}>Lihat Topic</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Tidak ada latihan yang cocok dengan filter saat ini.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
