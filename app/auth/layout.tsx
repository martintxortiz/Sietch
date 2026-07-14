export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center p-4">
      {children}
    </main>
  );
}
