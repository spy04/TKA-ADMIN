"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Filter, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TopicDirectoryItem = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  status: "DRAFT" | "PUBLISHED";
  previewMode: "PREVIEW" | "ENROLLED";
  summary: string | null;
  materialCount: number;
  exerciseCount: number;
};

export function TopicsDirectory({ topics }: { topics: TopicDirectoryItem[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");

  const categoryOptions = useMemo(
    () => Array.from(new Set(topics.map((topic) => topic.category))).sort((a, b) => a.localeCompare(b)),
    [topics],
  );

  const filteredTopics = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return topics.filter((topic) => {
      const matchesSearch =
        !normalizedSearch ||
        topic.title.toLowerCase().includes(normalizedSearch) ||
        (topic.summary ?? "").toLowerCase().includes(normalizedSearch);
      const matchesCategory = category === "all" || topic.category === category;
      const matchesDifficulty = difficulty === "all" || topic.difficulty === difficulty;
      const matchesStatus = status === "all" || topic.status === status;

      return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
    });
  }, [category, difficulty, search, status, topics]);

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground" />
            <div>
              <h2 className="font-semibold">Filter topic</h2>
              <p className="text-sm text-muted-foreground">Cari topic lebih cepat berdasarkan kategori, level, dan status.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="topic-search">Cari topic</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="topic-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Cari judul atau ringkasan topic"
                />
              </div>
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
        {filteredTopics.map((topic) => (
          <Card key={topic.id} className="border-border/70">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{topic.title}</h3>
                    <Badge variant="outline">{topic.category}</Badge>
                    <Badge variant="secondary">{topic.difficulty}</Badge>
                    <Badge
                      variant="outline"
                      className={topic.status === "PUBLISHED" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}
                    >
                      {topic.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {topic.materialCount} materi / {topic.exerciseCount} latihan topic /{" "}
                    {topic.previewMode === "PREVIEW" ? "Preview aktif" : "Enrolled only"}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <BookOpen size={18} />
                </div>
              </div>

              <p className="line-clamp-2 min-h-11 text-sm leading-6 text-muted-foreground">
                {topic.summary?.trim() || "Belum ada ringkasan topic."}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/admin/topics/${topic.id}`}>Lihat Detail</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/admin/topics/${topic.id}/edit`}>Edit Topic</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/admin/materials/new?topicId=${topic.id}`}>
                    <Plus size={16} />
                    Tambah Materi
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTopics.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Tidak ada topic yang cocok dengan filter saat ini.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
