import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Go home
        </Link>
      </div>
    </div>
  );
}
