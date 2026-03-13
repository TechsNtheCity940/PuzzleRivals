import { supabase, supabaseConfigErrorMessage } from "@/lib/supabase-client";

export const SECURITY_QUESTION_OPTIONS = [
  "What city were you born in?",
  "What was the name of your first pet?",
  "What was your childhood nickname?",
  "What was your first school's name?",
  "What is your favorite teacher's last name?",
  "What street did you grow up on?",
] as const;

export interface SecurityQuestionPair {
  questionOne: string;
  answerOne: string;
  questionTwo: string;
  answerTwo: string;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigErrorMessage);
  }

  return supabase;
}

export async function saveSecurityQuestions(payload: SecurityQuestionPair) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("set-security-questions", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchSecurityQuestions(email: string) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("get-security-questions", {
    body: { email },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as { questionOne: string; questionTwo: string };
}

export async function resetPasswordWithSecurityQuestions(email: string, payload: Omit<SecurityQuestionPair, "questionOne" | "questionTwo"> & { newPassword: string }) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("reset-password-with-security-questions", {
    body: {
      email,
      answerOne: payload.answerOne,
      answerTwo: payload.answerTwo,
      newPassword: payload.newPassword,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
