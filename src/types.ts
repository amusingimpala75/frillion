/** Fields consumed from Krillion's friends endpoint. */
export interface Answer {
  prompt: string;
  answer: string | null;
  score: number;
}

export interface Friend {
  username: string;
  self?: boolean;
  answers: Answer[] | null;
}

export interface FriendsResponse {
  leaderboard: Friend[];
  date?: string;
  unlocked?: boolean;
}

export interface Player {
  id: number;
  name: string;
  self: boolean;
  included: boolean;
  contribution: number;
}

export interface Winner {
  id: number;
  name: string;
  answer: string | null;
}

export interface Question {
  prompt: string;
  score: number;
  winners: Winner[];
}

export interface Team {
  total: number;
  date?: string;
  questions: Question[];
  players: Player[];
}

export type FriendsResult = { data: FriendsResponse } | { error: string };

export interface FirebaseAuthRecord {
  fbase_key?: string;
  value?: { stsTokenManager?: { accessToken?: string } };
}
