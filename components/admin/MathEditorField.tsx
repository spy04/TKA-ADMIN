"use client";

import { useId, useMemo, useState } from "react";
import katex from "katex";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MathEditorFieldProps = {
  defaultValue?: string;
  id?: string;
  label: string;
  multiline?: boolean;
  name: string;
  placeholder?: string;
  spanTwo?: boolean;
};

const formulaTemplates = [
  { label: "Pecahan", value: "\\frac{a}{b}" },
  { label: "Akar", value: "\\sqrt{x}" },
  { label: "Pangkat", value: "x^{2}" },
  { label: "Subskrip", value: "x_{1}" },
  { label: "Sigma", value: "\\sum_{i=1}^{n}" },
  { label: "Integral", value: "\\int_a^b" },
];

function renderMathText(input: string) {
  const parts = input.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g).filter(Boolean);

  return parts.map((part, index) => {
    const isBlock = part.startsWith("$$") && part.endsWith("$$");
    const isInline = !isBlock && part.startsWith("$") && part.endsWith("$");

    if (!isBlock && !isInline) {
      return (
        <span key={`${part}-${index}`} className="math-preview-text">
          {part}
        </span>
      );
    }

    const expression = isBlock ? part.slice(2, -2) : part.slice(1, -1);

    try {
      const html = katex.renderToString(expression, {
        displayMode: isBlock,
        throwOnError: false,
      });

      return (
        <span
          key={`${expression}-${index}`}
          className={isBlock ? "math-preview-block" : "math-preview-inline"}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return (
        <span key={`${expression}-${index}`} className="math-preview-error">
          {part}
        </span>
      );
    }
  });
}

export function MathEditorField({
  defaultValue = "",
  id,
  label,
  multiline = true,
  name,
  placeholder,
  spanTwo = multiline,
}: MathEditorFieldProps) {
  const autoId = useId();
  const fieldId = id ?? `${name}-${autoId}`;
  const [value, setValue] = useState(defaultValue);
  const preview = useMemo(() => renderMathText(value), [value]);

  function insertTemplate(template: string) {
    setValue((current) => `${current}${current ? " " : ""}$${template}$`);
  }

  return (
    <label className={`field${spanTwo ? " field-span-2" : ""}`}>
      <Label htmlFor={fieldId}>{label}</Label>

      <div className="math-toolbar">
        {formulaTemplates.map((template) => (
          <button
            key={template.label}
            className="math-chip"
            onClick={(event) => {
              event.preventDefault();
              insertTemplate(template.value);
            }}
            type="button"
          >
            {template.label}
          </button>
        ))}
      </div>

      <p className="helper-text">Tempel teks biasa. Untuk rumus, cukup paste LaTeX atau klik template di atas.</p>

      {multiline ? (
        <Textarea
          id={fieldId}
          name={name}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <Input
          id={fieldId}
          name={name}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
      )}

      <div className="math-preview">
        <span className="math-preview-label">Preview</span>
        <div className="math-preview-surface">{value ? preview : <span className="helper-text">Belum ada isi.</span>}</div>
      </div>
    </label>
  );
}
