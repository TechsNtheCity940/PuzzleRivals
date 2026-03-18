export interface StructuredModelClient {
  mode: "stub" | "deterministic" | "live";
  completeJson<T>(params: {
    fallback: T;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<T>;
}

export function createModelClient(stubMode: boolean): StructuredModelClient {
  return {
    mode: stubMode ? "stub" : "deterministic",
    async completeJson<T>({ fallback }: { fallback: T; systemPrompt: string; userPrompt: string }) {
      return fallback;
    },
  };
}
