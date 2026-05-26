import Link from "next/link";
import {
  deleteExerciseAction,
  deleteMaterialAction,
  deleteTopicAction,
  updateExercisePublishStatusAction,
  updateMaterialPublishStatusAction,
  updateTopicPublishStatusAction,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/prisma";

const statusCopy: Record<string, string> = {
  "topic-deleted": "Topic berhasil dihapus.",
  "material-deleted": "Materi berhasil dihapus.",
  "exercise-deleted": "Latihan berhasil dihapus.",
  "topic-delete-failed": "Topic gagal dihapus.",
  "topic-published": "Topic berhasil dipublish ke aplikasi user.",
  "topic-unpublished": "Topic dikembalikan ke draft.",
  "topic-publish-failed": "Topic gagal dipublish.",
  "topic-unpublish-failed": "Topic gagal dikembalikan ke draft.",
  "material-published": "Materi berhasil dipublish ke aplikasi user.",
  "material-unpublished": "Materi dikembalikan ke draft.",
  "material-publish-failed": "Materi gagal dipublish.",
  "material-unpublish-failed": "Materi gagal dikembalikan ke draft.",
  "exercise-published": "Latihan berhasil dipublish ke aplikasi user.",
  "exercise-unpublished": "Latihan dikembalikan ke draft.",
  "exercise-publish-failed": "Latihan gagal dipublish.",
  "exercise-unpublish-failed": "Latihan gagal dikembalikan ke draft.",
  "material-delete-failed": "Materi gagal dihapus.",
  "exercise-delete-failed": "Latihan gagal dihapus.",
  "database-offline": "Database belum aktif.",
};

type ContentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminContentPage({ searchParams }: ContentPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;

  const prisma = getPrismaClient();
  const topics = prisma
    ? await prisma.topic.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          materials: {
            orderBy: { createdAt: "asc" },
            include: {
              exercises: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  title: true,
                  questionCount: true,
                  status: true,
                },
              },
            },
          },
          exercises: {
            orderBy: { createdAt: "asc" },
            where: { materialId: null },
            select: {
              id: true,
              title: true,
              questionCount: true,
              status: true,
              accessLevel: true,
            },
          },
        },
      })
    : [];

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <header className="card topbar">
          <div>
            <span className="section-kicker">Konten</span>
            <h1 className="page-title" style={{ fontSize: "2.2rem", marginBottom: 8 }}>
              Kelola data
            </h1>
            <p className="page-copy">Semua topic, materi, dan latihan.</p>
          </div>

          <div className="topbar-meta">
            <Button asChild>
              <Link href="/admin/topics/new">Topic</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/materials/new">Materi</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/exercises/new">Latihan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Dashboard</Link>
            </Button>
          </div>
        </header>

        {status && statusCopy[status] ? <Alert variant="success">{statusCopy[status]}</Alert> : null}

        {topics.length === 0 ? (
          <article className="card panel">
            <h2 style={{ margin: 0 }}>Belum ada data</h2>
          </article>
        ) : null}

        <section className="stack">
          {topics.map((topic) => {
            const totalExercises =
              topic.exercises.length + topic.materials.reduce((total, material) => total + material.exercises.length, 0);

            return (
              <article key={topic.id} className="card panel entity-card">
                <div className="entity-header">
                  <div className="entity-copy">
                    <div className="entity-title-row">
                      <h2 className="entity-title">{topic.title}</h2>
                      <Badge variant="secondary">{topic.difficulty}</Badge>
                      <Badge
                        variant="outline"
                        className={topic.status === "PUBLISHED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}
                      >
                        {topic.status === "PUBLISHED" ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="outline">
                        {topic.previewMode === "PREVIEW" ? "Preview aktif" : "Enrolled only"}
                      </Badge>
                    </div>
                    <p className="entity-meta">
                      {topic.category} / {topic.materials.length} materi / {totalExercises} latihan
                    </p>
                    {topic.summary ? <p className="page-copy">{topic.summary}</p> : null}
                  </div>

                  <div className="entity-actions">
                    <Button asChild size="sm">
                      <Link href={`/admin/topics/${topic.id}/edit`}>Edit</Link>
                    </Button>
                    <form action={updateTopicPublishStatusAction}>
                      <input type="hidden" name="topicId" value={topic.id} />
                      <input
                        type="hidden"
                        name="intent"
                        value={topic.status === "PUBLISHED" ? "unpublish" : "publish"}
                      />
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

                <div className="entity-columns">
                  <section className="entity-block">
                    <div className="entity-block-head">
                      <h3 className="entity-block-title">Latihan topic</h3>
                    </div>

                    {topic.exercises.length === 0 ? (
                      <p className="helper-text">Kosong</p>
                    ) : (
                      <div className="sub-list">
                        {topic.exercises.map((exercise) => (
                          <div key={exercise.id} className="sub-item">
                            <div>
                              <p className="sub-item-title">{exercise.title}</p>
                              <p className="sub-item-copy">
                                {exercise.questionCount ?? 0} soal / {exercise.accessLevel === "PREVIEW" ? "Preview" : "Enrolled"}
                              </p>
                            </div>
                            <div className="entity-actions">
                              <Badge
                                variant="outline"
                                className={exercise.status === "PUBLISHED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}
                              >
                                {exercise.status === "PUBLISHED" ? "Published" : "Draft"}
                              </Badge>
                              <Button asChild size="sm" variant="secondary">
                                <Link href={`/admin/exercises/${exercise.id}/edit`}>Soal</Link>
                              </Button>
                              <form action={updateExercisePublishStatusAction}>
                                <input type="hidden" name="exerciseId" value={exercise.id} />
                                <input
                                  type="hidden"
                                  name="intent"
                                  value={exercise.status === "PUBLISHED" ? "unpublish" : "publish"}
                                />
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
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="entity-block">
                    <div className="entity-block-head">
                      <h3 className="entity-block-title">Materi</h3>
                    </div>

                    {topic.materials.length === 0 ? (
                      <p className="helper-text">Kosong</p>
                    ) : (
                      <div className="sub-list">
                        {topic.materials.map((material) => (
                          <div key={material.id} className="sub-item sub-item-stack">
                            <div className="entity-header">
                              <div>
                                <p className="sub-item-title">{material.title}</p>
                                <p className="sub-item-copy">
                                  {material.type} / {material.accessLevel === "PREVIEW" ? "Preview" : "Enrolled"}
                                </p>
                              </div>
                              <div className="entity-actions">
                                <Badge
                                  variant="outline"
                                  className={material.status === "PUBLISHED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}
                                >
                                  {material.status === "PUBLISHED" ? "Published" : "Draft"}
                                </Badge>
                                <Button asChild size="sm">
                                  <Link href={`/admin/materials/${material.id}/edit`}>Edit</Link>
                                </Button>
                                <form action={updateMaterialPublishStatusAction}>
                                  <input type="hidden" name="materialId" value={material.id} />
                                  <input
                                    type="hidden"
                                    name="intent"
                                    value={material.status === "PUBLISHED" ? "unpublish" : "publish"}
                                  />
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

                            <div className="nested-surface">
                              <h4 className="entity-block-title">Latihan materi</h4>
                              {material.exercises.length === 0 ? (
                                <p className="helper-text">Kosong</p>
                              ) : (
                                <div className="sub-list">
                                  {material.exercises.map((exercise) => (
                                    <div key={exercise.id} className="sub-item">
                                      <div>
                                        <p className="sub-item-title">{exercise.title}</p>
                                        <p className="sub-item-copy">
                                          {exercise.questionCount ?? 0} soal / {exercise.status === "PUBLISHED" ? "Published" : "Draft"}
                                        </p>
                                      </div>
                                      <div className="entity-actions">
                                        <Badge
                                          variant="outline"
                                          className={exercise.status === "PUBLISHED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}
                                        >
                                          {exercise.status === "PUBLISHED" ? "Published" : "Draft"}
                                        </Badge>
                                        <Button asChild size="sm" variant="secondary">
                                          <Link href={`/admin/exercises/${exercise.id}/edit`}>Soal</Link>
                                        </Button>
                                        <form action={updateExercisePublishStatusAction}>
                                          <input type="hidden" name="exerciseId" value={exercise.id} />
                                          <input
                                            type="hidden"
                                            name="intent"
                                            value={exercise.status === "PUBLISHED" ? "unpublish" : "publish"}
                                          />
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
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
