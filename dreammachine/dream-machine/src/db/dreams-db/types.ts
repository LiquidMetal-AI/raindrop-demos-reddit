import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Dreams = {
    id: string;
    content: string;
    title: string | null;
    theme: string | null;
    timestamp: Generated<string>;
    analysis_results: string | null;
};
export type DB = {
    Dreams: Dreams;
};
