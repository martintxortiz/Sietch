import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { login, signup } from "./actions";

type AuthFormProps = {
  mode: "login" | "signup";
  error?: string;
  message?: string;
};

export function AuthForm({ mode, error, message }: AuthFormProps) {
  const isSignup = mode === "signup";

  return (
    <Card className="w-full max-w-sm rounded-3xl border border-border bg-background ring-0">
      <CardHeader className={"pt-1"}>
        <CardTitle className={"text-lg"}>{isSignup ? "Create an account" : "Welcome back"}</CardTitle>
        <CardAction>
          <Link
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href={isSignup ? "/auth/login" : "/auth/sign-up"}
          >
            {isSignup ? "Sign in" : "Sign up"}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form action={isSignup ? signup : login}>
          <FieldGroup>
            {isSignup && (
              <Field>
                <FieldLabel htmlFor="display_name" className={"opacity-50"}>Display name</FieldLabel>
                <Input
                  id="display_name"
                  maxLength={80}
                  name="display_name"
                  required
                  autoComplete="name"
                  className="h-10 rounded-full px-4"
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email" className={"opacity-50"}>Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-10 rounded-full px-4"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password" className={"opacity-50"}>Password</FieldLabel>
              <Input
                id="password"
                minLength={8}
                name="password"
                type="password"
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="h-10 rounded-full px-4"
              />
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Unable to continue</AlertTitle>
                <AlertDescription>
                  {error === "credentials"
                    ? "The email or password is incorrect."
                    : error === "signup"
                      ? "Check your details and try again."
                      : "Authentication could not be completed."}
                </AlertDescription>
              </Alert>
            )}
            {message === "check-email" && (
              <Alert>
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>
                  Confirm your email address to finish signing up.
                </AlertDescription>
              </Alert>
            )}
            <Field>
              <Button className="h-11 w-full" type="submit">
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </Field>
            <FieldSeparator className="text-[10px]">
              <span >or</span>
            </FieldSeparator>
            <Field orientation="horizontal" className="justify-center">
              <a
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-lg" }),
                  "mx-auto size-11 rounded-full bg-[#5865F2] text-white hover:bg-[#5865F2]/80 hover:text-white",
                )}
                href="/auth/discord"
                aria-label="Continue with Discord"
              >
                <svg
                  data-icon="inline-start"
                  width="64"
                  height="48"
                  viewBox="0 0 64 48"
                  fill="none"
                  aria-hidden="true"
                  className="size-auto h-4"
                >
                  <path
                    d="M40.575 0C39.9562 1.09866 39.4006 2.2352 38.8954 3.397C34.0967 2.67719 29.2096 2.67719 24.3982 3.397C23.9057 2.2352 23.3374 1.09866 22.7186 0C18.2104 0.770324 13.8157 2.12155 9.64839 4.02841C1.38951 16.2652 -0.845688 28.1863 0.265599 39.9432C5.10222 43.517 10.5197 46.2447 16.2909 47.9874C17.5916 46.2447 18.7407 44.3883 19.7257 42.4562C17.8568 41.7616 16.0509 40.8903 14.3208 39.88C14.7755 39.5517 15.2175 39.2107 15.6468 38.8824C25.7873 43.6559 37.5316 43.6559 47.6847 38.8824C48.1141 39.236 48.5561 39.577 49.0107 39.88C47.2806 40.9029 45.4748 41.7616 43.5931 42.4688C44.5781 44.4009 45.7273 46.2573 47.028 48C52.7991 46.2573 58.2167 43.5422 63.0533 39.9684C64.3666 26.3299 60.8055 14.5099 53.6452 4.04104C49.4905 2.13418 45.0959 0.782952 40.5876 0.0252565L40.575 0ZM21.1401 32.7072C18.0209 32.7072 15.4321 29.8785 15.4321 26.3804C15.4321 22.8824 17.9199 20.041 21.1275 20.041C24.3351 20.041 26.886 22.895 26.8354 26.3804C26.7849 29.8658 24.3224 32.7072 21.1401 32.7072ZM42.1788 32.7072C39.047 32.7072 36.4834 29.8785 36.4834 26.3804C36.4834 22.8824 38.9712 20.041 42.1788 20.041C45.3864 20.041 47.9246 22.895 47.8741 26.3804C47.8236 29.8658 45.3611 32.7072 42.1788 32.7072Z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
