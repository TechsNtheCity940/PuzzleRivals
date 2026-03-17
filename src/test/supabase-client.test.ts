import {
  buildSupabaseSchemaSetupMessage,
  isSupabaseSchemaSetupIssue,
  SupabaseSchemaSetupError,
  toSupabaseSchemaSetupError,
} from "@/lib/supabase-client";

describe("supabase schema setup helpers", () => {
  it("detects missing table schema-cache errors", () => {
    expect(
      isSupabaseSchemaSetupIssue({
        code: "PGRST205",
        message: "Could not find the table 'public.profiles' in the schema cache",
      }),
    ).toBe(true);
  });

  it("detects missing relation errors", () => {
    expect(
      isSupabaseSchemaSetupIssue({
        code: "42P01",
        message: 'relation "public.player_stats" does not exist',
      }),
    ).toBe(true);
  });

  it("wraps schema errors in a typed error", () => {
    const wrapped = toSupabaseSchemaSetupError(
      {
        code: "PGRST205",
        message: "Could not find the table 'public.profiles' in the schema cache",
      },
      "public.profiles",
    );

    expect(wrapped).toBeInstanceOf(SupabaseSchemaSetupError);
    expect(wrapped.message).toContain(buildSupabaseSchemaSetupMessage("public.profiles"));
  });
});
