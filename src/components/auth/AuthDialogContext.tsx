import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import AuthDialog, { type AuthDialogMode } from "./AuthDialog";

interface AuthDialogContextValue {
  open: boolean;
  mode: AuthDialogMode;
  openSignIn: () => void;
  openSignUp: () => void;
  openForgotPassword: () => void;
  closeAuthDialog: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthDialogMode>("sign-in");

  const value = useMemo<AuthDialogContextValue>(
    () => ({
      open,
      mode,
      openSignIn: () => {
        setMode("sign-in");
        setOpen(true);
      },
      openSignUp: () => {
        setMode("sign-up");
        setOpen(true);
      },
      openForgotPassword: () => {
        setMode("forgot-password");
        setOpen(true);
      },
      closeAuthDialog: () => setOpen(false),
    }),
    [mode, open],
  );

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <AuthDialog open={open} mode={mode} onOpenChange={setOpen} onModeChange={setMode} />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error("useAuthDialog must be used within AuthDialogProvider.");
  }
  return context;
}
