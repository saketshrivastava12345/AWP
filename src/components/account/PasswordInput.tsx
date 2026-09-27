"use client";

import { useState, useSyncExternalStore, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/** False while server-rendering and before hydration; true once interactive. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * A password field with a show/hide toggle inside it. Without JavaScript it
 * is a plain password input: the toggle only appears once it can work.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const hydrated = useHydrated();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(hydrated && "pr-14", className)}
      />
      {hydrated ? (
        <IconButton
          size="sm"
          label={visible ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-ink-300 [&_svg]:size-[18px]"
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </IconButton>
      ) : null}
    </div>
  );
}
