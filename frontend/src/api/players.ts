import { getToken } from "./auth";

export type PlayerProfile = {
  id: number;
  userId: number | null;
  username: string | null;
  firstName: string;
  lastName: string;
  image: string | null;
  position: string | null;
  shirtNumber: number | null;
  description: string | null;
  dateOfBirth: string | null;
  workplace: string | null;
  school: string | null;
  stats: {
    gamesPlayed: number;
    goals: number;
    assists: number;
  };
  teams: Array<{
    playerId: number;
    id: number;
    name: string;
    shortName: string | null;
    logo: string | null;
    city: string | null;
    position: string | null;
    shirtNumber: number | null;
  }>;
  leagues: Array<{
    id: number;
    name: string;
    logo: string | null;
    season: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    status: string;
  }>;
};

export async function fetchPlayerProfile(
  playerId: number,
): Promise<PlayerProfile> {
  const token = getToken();
  const res = await fetch(`/api/players/${playerId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await res.json()) as {
    data?: PlayerProfile;
    message?: string;
  };

  if (!res.ok || !body.data) {
    throw new Error(body.message || "Oyunçu profili yüklənmədi");
  }

  return body.data;
}
