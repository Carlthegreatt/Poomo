"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "./actions";

export default function LoginFrom() {
  const [state, loginAction] = useActionState(login, undefined);
  return (
    <div>
      <div>
        <form action={loginAction}>
          <div>
            <input id="email" name="email" placeholder="email"></input>
          </div>
          <div>
            {state?.errors?.email && (
              <p className="text-red-100">{state.errors.email}</p>
            )}
          </div>
          <div>
            <input id="password" name="password" placeholder="password"></input>
          </div>
          <div>
            {state?.errors?.password && (
              <p className="text-red-100">{state.errors.password}</p>
            )}
          </div>
          <div>
            <SubmitBtn></SubmitBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} type="submit">
      login
    </button>
  );
}
