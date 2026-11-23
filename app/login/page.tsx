import LoginForm from "./LoginForm";

const ERRORS: Record<string, string> = {
  "not-allowed": "That account isn't allowed to use this catalogue.",
  "link-failed": "That sign-in link has expired or was already used. Request a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="narrow">
      <h1>🐦 Bird Catalogue</h1>
      <LoginForm initialError={error ? ERRORS[error] : undefined} />
    </main>
  );
}
