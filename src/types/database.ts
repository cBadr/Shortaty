// Placeholder Database type — will be regenerated from Supabase CLI later:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// Using `any`-typed Json so that .insert()/.update()/.from() accept arbitrary tables
// without TypeScript narrowing them to `never`.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: { [table: string]: { Row: any; Insert: any; Update: any; Relationships: [] } };
    Views: { [view: string]: { Row: any } };
    Functions: { [fn: string]: { Args: any; Returns: any } };
    Enums: { [name: string]: string };
    CompositeTypes: Record<string, never>;
  };
}
