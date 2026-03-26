import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-surface text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-high">
            <span className="font-headline text-4xl font-bold text-on-surface-variant">404</span>
          </div>
          <CardTitle className="font-headline text-2xl font-bold">Page Not Found</CardTitle>
          <CardDescription className="text-on-surface-variant">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary-container px-4 py-2 font-bold text-white hover:bg-primary-container/90"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-outline-variant/40 bg-surface-high px-4 py-2 font-bold text-white hover:bg-surface-highest"
          >
            View Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
