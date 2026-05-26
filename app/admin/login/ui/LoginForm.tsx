"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form className="login-form" action={formAction}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}

      <label className="field">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          name="username"
          autoComplete="username"
          placeholder="Masukkan username admin"
        />
      </label>

      <label className="field">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Masukkan password"
        />
      </label>

      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Memproses..." : "Masuk ke Admin"}
        </Button>
        <Button variant="secondary" type="reset" disabled={isPending}>
          Reset
        </Button>
      </div>
    </form>
  );
}
