import RegisterForm from "./registerForm";

export default function Register() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-sm border-2 border-border bg-white rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0_black]">
        <RegisterForm />
      </div>
    </div>
  );
}
