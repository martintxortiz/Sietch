import { IconLogout } from "@tabler/icons-react";
import { redirect } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  const displayName = profile.display_name;
  const avatarUrl = profile.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex w-full items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardContent className="flex flex-col gap-4">
          <div className={"flex justify-between items-center"}>
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <Field className="gap-1">
                <FieldTitle>{displayName}</FieldTitle>
                <FieldDescription>{user.email}</FieldDescription>
              </Field>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="destructive" size="lg" className={"!px-4 cursor-pointer"}>
                <IconLogout data-icon="inline-start" />
                Sign out
              </Button>
            </form>
          </div>
          <Separator />
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldTitle>Display name</FieldTitle>
              <FieldDescription>{displayName}</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldTitle>Email</FieldTitle>
              <FieldDescription>{user.email}</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
