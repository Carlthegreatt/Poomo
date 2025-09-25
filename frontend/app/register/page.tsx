import RegisterForm from "./registerForm";

export default function Register() {
  return (
    <div className="min-h-[calc(100dvh-56px)] sm:min-h-[calc(100dvh-64px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <RegisterForm />
      </div>
    </div>
  );
}
