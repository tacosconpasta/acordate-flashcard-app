export interface User {
  id: number;
  name: string;
  image: string | null;
}

export type NewUser = Omit<User, "id">;
