"use client";

import { createElement, useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type TextareaHTMLAttributes } from "react";
import type { MathfieldElement } from "mathlive";
import { Label } from "@/components/ui/label";

type MathEditorProps = {
  autoFocus?: boolean;
  defaultValue?: string;
  id?: string;
  label: string;
  multiline?: boolean;
  name: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  spanTwo?: boolean;
};

function toPlaceholderLatex(text: string) {
  const cleanText = text.replace(/[{}\\]/g, "").trim();
  return `\\text{${cleanText || "Tulis soal matematika..."}}`;
}

function createHiddenFieldProps(name: string, defaultValue: string) {
  return {
    "aria-hidden": true,
    className: "hidden-field",
    defaultValue,
    name,
    readOnly: true,
    tabIndex: -1,
  } satisfies TextareaHTMLAttributes<HTMLTextAreaElement>;
}

export function MathEditor({
  autoFocus = false,
  defaultValue = "",
  id,
  label,
  multiline = true,
  name,
  onChange,
  placeholder = "Tulis soal matematika...",
  spanTwo = multiline,
}: MathEditorProps) {
  const autoId = useId();
  const fieldId = id ?? `${name}-${autoId}`;
  const hiddenFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const configuredEditorRef = useRef<MathfieldElement | null>(null);
  const lastDefaultValueRef = useRef(defaultValue);
  const onChangeRef = useRef(onChange);
  const [isReady, setIsReady] = useState(false);
  const placeholderLatex = useMemo(() => toPlaceholderLatex(placeholder), [placeholder]);

  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;

    async function prepareMathLive() {
      await import("mathlive");

      if (active) {
        setIsReady(true);
      }
    }

    void prepareMathLive();

    return () => {
      active = false;
    };
  }, []);

  const commitValue = useCallback((nextValue: string) => {
    if (hiddenFieldRef.current) {
      hiddenFieldRef.current.value = nextValue;
    }

    onChangeRef.current?.(nextValue);
  }, []);

  const handleBeforeInput = useCallback((event: Event) => {
    const mathfield = mathfieldRef.current;

    if (!mathfield || !(event instanceof InputEvent)) {
      return;
    }

    const inputType = event.inputType || event.data;

    if (inputType !== "insertLineBreak") {
      return;
    }

    event.preventDefault();

    if (!multiline) {
      return;
    }

    mathfield.insert("\\\\", {
      format: "latex",
      insertionMode: "replaceSelection",
      selectionMode: "after",
    });

    commitValue(mathfield.value);
  }, [commitValue, multiline]);

  const handleEditorRef = useCallback((element: MathfieldElement | null) => {
    if (!element) {
      if (configuredEditorRef.current) {
        configuredEditorRef.current.removeEventListener("beforeinput", handleBeforeInput);
        configuredEditorRef.current = null;
      }

      mathfieldRef.current = null;
      return;
    }

    mathfieldRef.current = element;

    if (configuredEditorRef.current === element) {
      return;
    }

    configuredEditorRef.current = element;
    element.defaultMode = "text";
    element.mathVirtualKeyboardPolicy = "auto";
    element.placeholder = placeholderLatex;
    element.readOnly = false;
    element.smartFence = true;
    element.smartMode = true;
    element.setValue(lastDefaultValueRef.current, { silenceNotifications: true });
    element.addEventListener("beforeinput", handleBeforeInput);

    if (autoFocus) {
      requestAnimationFrame(() => {
        element.focus();
      });
    }
  }, [autoFocus, handleBeforeInput, placeholderLatex]);

  function handleInput(event: FormEvent<HTMLElement>) {
    const target = event.currentTarget;

    if (!("value" in target)) {
      return;
    }

    const nextValue = String(target.value);
    commitValue(nextValue);
  }

  useEffect(() => {
    lastDefaultValueRef.current = defaultValue;
    commitValue(defaultValue);

    const mathfield = mathfieldRef.current;

    if (mathfield && mathfield.value !== defaultValue) {
      mathfield.setValue(defaultValue, { silenceNotifications: true });
    }
  }, [commitValue, defaultValue]);

  useEffect(() => {
    const mathfield = mathfieldRef.current;

    if (!mathfield) {
      return;
    }

    mathfield.placeholder = placeholderLatex;
  }, [placeholderLatex]);

  useEffect(() => {
    const mathfield = mathfieldRef.current;

    if (!mathfield) {
      return;
    }

    const handleReset = () => {
      queueMicrotask(() => {
        const resetValue = lastDefaultValueRef.current;
        mathfield.setValue(resetValue, { silenceNotifications: true });
        commitValue(resetValue);
      });
    };

    const form = mathfield.closest("form");
    form?.addEventListener("reset", handleReset);

    return () => {
      form?.removeEventListener("reset", handleReset);
    };
  }, [commitValue, isReady]);

  return (
    <div className={`field${spanTwo ? " field-span-2" : ""}`}>
      <Label htmlFor={fieldId}>{label}</Label>

      <div className="math-editor-shell">
        {isReady
          ? createElement("math-field", {
              ref: handleEditorRef,
              id: fieldId,
              "aria-label": label,
              className: `math-field-control${multiline ? " math-field-multiline" : " math-field-singleline"}`,
              onInput: handleInput,
            })
          : <div className={`math-editor-loading${multiline ? " math-editor-loading-multiline" : ""}`}>Memuat editor rumus...</div>}
      </div>

      <textarea ref={hiddenFieldRef} {...createHiddenFieldProps(name, defaultValue)} />
    </div>
  );
}

export { MathEditor as MathEditorField };
