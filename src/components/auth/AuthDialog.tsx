import { useEffect, useState } from "react";
import { KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  fetchSecurityQuestions,
  resetPasswordWithSecurityQuestions,
  saveSecurityQuestions,
  SECURITY_QUESTION_OPTIONS,
} from "@/lib/auth-security";
import { isSupabaseConfigured, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import { useAuth } from "@/providers/AuthProvider";

export type AuthDialogMode = "sign-in" | "sign-up" | "forgot-password";

function emptyRecoveryState() {
  return { email: "", questionOne: "", questionTwo: "", answerOne: "", answerTwo: "", newPassword: "" };
}

interface AuthDialogProps {
  open: boolean;
  mode: AuthDialogMode;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: AuthDialogMode) => void;
}

export default function AuthDialog({ open, mode, onOpenChange, onModeChange }: AuthDialogProps) {
  const { signUpWithEmail, signInWithEmail, saveProfile, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [puzzleTag, setPuzzleTag] = useState("");
  const [questionOne, setQuestionOne] = useState(SECURITY_QUESTION_OPTIONS[0]);
  const [questionTwo, setQuestionTwo] = useState(SECURITY_QUESTION_OPTIONS[1]);
  const [answerOne, setAnswerOne] = useState("");
  const [answerTwo, setAnswerTwo] = useState("");
  const [recovery, setRecovery] = useState(emptyRecoveryState());
  const [status, setStatus] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirmPassword("");
      setAnswerOne("");
      setAnswerTwo("");
      setRecovery(emptyRecoveryState());
      setStatus(null);
    }
  }, [open]);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setStatus("Enter your email and password.");
      return;
    }

    setIsWorking(true);
    setStatus(null);
    try {
      const message = await signInWithEmail(email.trim(), password);
      setStatus(message);
      setPassword("");
      onOpenChange(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSignUp() {
    if (!email.trim()) {
      setStatus("Enter an email address.");
      return;
    }
    if (password.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Password confirmation does not match.");
      return;
    }
    if (!answerOne.trim() || !answerTwo.trim()) {
      setStatus("Set answers for both security questions.");
      return;
    }
    if (questionOne === questionTwo) {
      setStatus("Choose two different security questions.");
      return;
    }

    setIsWorking(true);
    setStatus(null);
    try {
      const signup = await signUpWithEmail(email.trim(), password);
      if (signup.signedIn) {
        if (puzzleTag.trim()) {
          await saveProfile({ username: puzzleTag.trim() });
        }
        await saveSecurityQuestions({
          questionOne,
          answerOne,
          questionTwo,
          answerTwo,
        });
        await refreshUser();
        setStatus("Account created and recovery questions saved.");
        onOpenChange(false);
      } else {
        setStatus(`${signup.message} Sign in once your account is confirmed, then link providers and update security questions from your profile.`);
        onModeChange("sign-in");
      }
      setPassword("");
      setConfirmPassword("");
      setAnswerOne("");
      setAnswerTwo("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create your account.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleLoadRecoveryQuestions() {
    if (!recovery.email.trim()) {
      setStatus("Enter the email tied to your account.");
      return;
    }

    setIsWorking(true);
    setStatus(null);
    try {
      const questions = await fetchSecurityQuestions(recovery.email.trim());
      setRecovery((current) => ({
        ...current,
        questionOne: questions.questionOne,
        questionTwo: questions.questionTwo,
      }));
      setStatus("Security questions loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load security questions.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleResetPassword() {
    if (!recovery.email.trim() || !recovery.answerOne.trim() || !recovery.answerTwo.trim() || recovery.newPassword.length < 8) {
      setStatus("Enter your email, both answers, and a new password with at least 8 characters.");
      return;
    }

    setIsWorking(true);
    setStatus(null);
    try {
      await resetPasswordWithSecurityQuestions(recovery.email.trim(), {
        answerOne: recovery.answerOne,
        answerTwo: recovery.answerTwo,
        newPassword: recovery.newPassword,
      });
      setStatus("Password reset. Sign in with your new password.");
      setPassword("");
      setRecovery(emptyRecoveryState());
      onModeChange("sign-in");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg rounded-[32px] border border-white/10 bg-slate-950/95 p-0 text-foreground shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(191,255,0,0.14),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_40%)]" />
        <div className="relative z-10 space-y-6 p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-hud text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {mode === "sign-in" ? "Sign In" : mode === "sign-up" ? "Create Account" : "Password Recovery"}
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {mode === "sign-in"
                ? "Return to the arena"
                : mode === "sign-up"
                  ? "Create your Puzzle Rivals account"
                  : "Reset your password"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {mode === "sign-in"
                ? "Use your email and password to continue. Linked Facebook and TikTok options live on your profile after sign-in."
                : mode === "sign-up"
                  ? "Set your email, password, PuzzleTag, and recovery questions so your account is ready from day one."
                  : "Answer your recovery questions and choose a fresh password."}
            </DialogDescription>
          </DialogHeader>

          {!isSupabaseConfigured && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {supabaseConfigErrorMessage}
            </div>
          )}

          {mode === "sign-in" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl border-border bg-background/35"
                  placeholder="Email address"
                  type="email"
                />
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-2xl border-border bg-background/35"
                  placeholder="Password"
                  type="password"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onModeChange("forgot-password")}
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange("sign-up")}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Need an account?
                </button>
              </div>
              <Button
                onClick={() => void handleSignIn()}
                variant="play"
                size="xl"
                className="w-full"
                disabled={isWorking || !isSupabaseConfigured}
              >
                <Mail size={16} />
                Sign In
              </Button>
            </div>
          )}

          {mode === "sign-up" && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <Input
                  value={puzzleTag}
                  onChange={(event) => setPuzzleTag(event.target.value.slice(0, 24))}
                  className="h-12 rounded-2xl border-border bg-background/35"
                  placeholder="PuzzleTag"
                />
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl border-border bg-background/35"
                  placeholder="Email address"
                  type="email"
                />
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-2xl border-border bg-background/35"
                  placeholder="Password"
                  type="password"
                />
                <Input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-12 rounded-2xl border-border bg-background/35"
                  placeholder="Confirm password"
                  type="password"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Security question 1</p>
                  <select
                    value={questionOne}
                    onChange={(event) => setQuestionOne(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {SECURITY_QUESTION_OPTIONS.map((question) => (
                      <option key={question} value={question}>
                        {question}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={answerOne}
                    onChange={(event) => setAnswerOne(event.target.value)}
                    className="h-12 rounded-2xl border-border bg-background/35"
                    placeholder="Answer"
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Security question 2</p>
                  <select
                    value={questionTwo}
                    onChange={(event) => setQuestionTwo(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {SECURITY_QUESTION_OPTIONS.map((question) => (
                      <option key={question} value={question}>
                        {question}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={answerTwo}
                    onChange={(event) => setAnswerTwo(event.target.value)}
                    className="h-12 rounded-2xl border-border bg-background/35"
                    placeholder="Answer"
                    type="password"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onModeChange("sign-in")}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Already have an account?
                </button>
              </div>
              <Button
                onClick={() => void handleSignUp()}
                variant="play"
                size="xl"
                className="w-full"
                disabled={isWorking || !isSupabaseConfigured}
              >
                <Lock size={16} />
                Sign Up
              </Button>
            </div>
          )}

          {mode === "forgot-password" && (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <Input
                  value={recovery.email}
                  onChange={(event) => setRecovery((current) => ({ ...current, email: event.target.value }))}
                  className="h-12 rounded-2xl border-border bg-background/35"
                  placeholder="Account email"
                  type="email"
                />
                <Button
                  onClick={() => void handleLoadRecoveryQuestions()}
                  variant="outline"
                  size="lg"
                  disabled={isWorking || !isSupabaseConfigured}
                >
                  Load Questions
                </Button>
              </div>
              {recovery.questionOne && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-background/30 p-4">
                    <p className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {recovery.questionOne}
                    </p>
                    <Input
                      value={recovery.answerOne}
                      onChange={(event) => setRecovery((current) => ({ ...current, answerOne: event.target.value }))}
                      className="mt-3 h-12 rounded-2xl border-border bg-background/35"
                      placeholder="Answer"
                      type="password"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-background/30 p-4">
                    <p className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {recovery.questionTwo}
                    </p>
                    <Input
                      value={recovery.answerTwo}
                      onChange={(event) => setRecovery((current) => ({ ...current, answerTwo: event.target.value }))}
                      className="mt-3 h-12 rounded-2xl border-border bg-background/35"
                      placeholder="Answer"
                      type="password"
                    />
                  </div>
                </div>
              )}
              <Input
                value={recovery.newPassword}
                onChange={(event) => setRecovery((current) => ({ ...current, newPassword: event.target.value }))}
                className="h-12 rounded-2xl border-border bg-background/35"
                placeholder="New password"
                type="password"
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onModeChange("sign-in")}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back to sign in
                </button>
              </div>
              <Button
                onClick={() => void handleResetPassword()}
                variant="play"
                size="xl"
                className="w-full"
                disabled={isWorking || !isSupabaseConfigured}
              >
                <KeyRound size={16} />
                Reset Password
              </Button>
            </div>
          )}

          {status && (
            <div className="rounded-2xl border border-white/5 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
              {status}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
