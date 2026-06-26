import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminPageShellProps = {
  children: ReactNode;
  maxWidthClassName?: string;
};

type AdminPageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  kicker: string;
  title: string;
};

type AdminPageSectionProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
};

export function AdminPageShell({
  children,
  maxWidthClassName = "max-w-6xl",
}: AdminPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 ${maxWidthClassName}`}>
        {children}
      </div>
    </main>
  );
}

export function AdminPageHeader({
  actions,
  description,
  kicker,
  title,
}: AdminPageHeaderProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {kicker}
          </span>
          <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function AdminPageSection({
  children,
  className,
  description,
  title,
}: AdminPageSectionProps) {
  return (
    <Card className={className}>
      {title || description ? (
        <CardHeader className="space-y-1">
          {title ? <CardTitle className="text-lg">{title}</CardTitle> : null}
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={title || description ? "pt-0" : "pt-6"}>
        {children}
      </CardContent>
    </Card>
  );
}
