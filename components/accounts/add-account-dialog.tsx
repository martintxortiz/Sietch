"use client"

import { IconEye, IconEyeOff, IconPlus } from "@tabler/icons-react"
import { type FormEvent, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function AddAccountDialog({
  onCreated,
}: {
  onCreated: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState(today)
  const [server, setServer] = useState("")
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function reset() {
    setStartDate(today())
    setServer("")
    setLogin("")
    setPassword("")
    setShowPassword(false)
    setError("")
    setSaving(false)
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSaving(true)

    const { error: createError } = await createClient().rpc(
      "create_broker_account",
      {
        p_investor_password: password,
        p_login: login.trim(),
        p_provider: "metatrader5",
        p_server: server.trim(),
        p_start_date: startDate,
      },
    )

    if (createError) {
      setError(
        createError.code === "23505"
          ? "This MetaTrader account is already connected."
          : createError.message,
      )
      setSaving(false)
      return
    }

    setOpen(false)
    reset()
    await onCreated()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen && !saving) reset()
      }}
    >
      <DialogTrigger render={<Button className="ml-auto h-10 !px-5" size="lg" />}>
        <IconPlus data-icon="inline-start" />
        Add Account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ADD ACCOUNT</DialogTitle>
          <DialogDescription className="sr-only">
            Connect a MetaTrader 5 account with an investor password.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={createAccount}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="account-start-date">Start date</FieldLabel>
              <Input
                className="h-10 px-3"
                id="account-start-date"
                max={today()}
                onChange={(event) => setStartDate(event.target.value)}
                required
                type="date"
                value={startDate}
              />
            </Field>
            <Field>
              <FieldLabel>Platform</FieldLabel>
              <Select
                items={[{ label: "MetaTrader 5", value: "metatrader5" }]}
                value="metatrader5"
              >
                <SelectTrigger className="h-10 w-full px-3" id="account-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="metatrader5">MetaTrader 5</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="account-server">Server</FieldLabel>
              <Input
                autoComplete="off"
                className="h-10 px-3"
                id="account-server"
                maxLength={120}
                onChange={(event) => setServer(event.target.value)}
                placeholder="Broker server"
                required
                value={server}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-login">Login</FieldLabel>
              <Input
                autoComplete="username"
                className="h-10 px-3"
                id="account-login"
                inputMode="numeric"
                maxLength={32}
                onChange={(event) => setLogin(event.target.value.replace(/\D/g, ""))}
                placeholder="MetaTrader login"
                required
                value={login}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-investor-password">
                Investor password
              </FieldLabel>
              <InputGroup className="h-10">
                <InputGroupInput
                  autoComplete="current-password"
                  id="account-investor-password"
                  maxLength={256}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Investor password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <InputGroupAddon className="pr-1 pl-0">
                  <Button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="size-8"
                    onClick={() => setShowPassword((visible) => !visible)}
                    size="icon-lg"
                    type="button"
                    variant="ghost"
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not add account</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              disabled={saving}
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={
                saving || !startDate || !server.trim() || !login || !password
              }
              type="submit"
            >
              {saving ? "Adding..." : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
