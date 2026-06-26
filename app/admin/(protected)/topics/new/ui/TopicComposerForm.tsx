"use client";

import { useActionState } from "react";
import { createTopicDraftAction, type TopicFormState } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: TopicFormState = {};

const visibilityOptions = [
  {
    value: "preview-only",
    title: "Ada materi preview",
    copy: "User umum bisa membuka beberapa materi contoh sebelum enrolled.",
  },
  {
    value: "members-only",
    title: "Semua materi terkunci",
    copy: "Semua materi utama hanya bisa dibuka setelah user enrolled.",
  },
];

export function TopicComposerForm() {
  const [state, formAction, isPending] = useActionState(createTopicDraftAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi topic</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <Label htmlFor="topicTitle">Judul topic</Label>
            <Input id="topicTitle" name="topicTitle" type="text" placeholder="Contoh: Aljabar" />
          </label>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select name="category">
              <SelectTrigger id="category">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matematika">Matematika</SelectItem>
                <SelectItem value="bahasa-indonesia">Bahasa Indonesia</SelectItem>
                <SelectItem value="ipa">IPA</SelectItem>
                <SelectItem value="bahasa-inggris">Bahasa Inggris</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Level kesulitan</Label>
            <Select name="difficulty">
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Pilih level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SD">SD</SelectItem>
                <SelectItem value="SMP">SMP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="space-y-2 md:col-span-2">
            <Label htmlFor="summary">Ringkasan topic</Label>
            <Textarea
              id="summary"
              name="summary"
              placeholder="Jelaskan tujuan belajar, cakupan topik, dan gambaran isi yang akan diterima user."
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibilitas awal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          {visibilityOptions.map((option) => (
            <label key={option.value} className="flex gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <input type="radio" name="previewMode" value={option.value} defaultChecked={option.value === "preview-only"} />
              <div>
                <h4 className="font-semibold">{option.title}</h4>
                <p className="text-sm leading-6 text-muted-foreground">{option.copy}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan topic..." : "Simpan Topic Dulu"}
        </Button>
        <Button variant="secondary" type="reset" disabled={isPending}>
          Reset Form
        </Button>
      </div>
    </form>
  );
}
