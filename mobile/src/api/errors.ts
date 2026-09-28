import axios from "axios";
import type { PlayoffTieGroup } from "../types/championship";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "server"
  | "cancelled"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  /** Untranslated backend message, for logs/diagnostics only. */
  readonly serverMessage: string | null;
  readonly code?: string;
  readonly ties?: PlayoffTieGroup[];

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    status?: number | null;
    serverMessage?: string | null;
    code?: string;
    ties?: PlayoffTieGroup[];
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.serverMessage = init.serverMessage ?? null;
    this.code = init.code;
    this.ties = init.ties;
  }
}

const GENERIC: Record<ApiErrorKind, string> = {
  network: "İnternet bağlantısı yoxdur və ya serverə qoşulmaq mümkün olmadı.",
  timeout: "Server gec cavab verir. Bir az sonra yenidən cəhd edin.",
  unauthorized: "Sessiyanın vaxtı bitib. Yenidən daxil olun.",
  forbidden: "Bu əməliyyat üçün icazəniz yoxdur.",
  not_found: "Məlumat tapılmadı.",
  conflict: "Bu əməliyyat artıq yerinə yetirilib və ya ziddiyyət var.",
  validation: "Daxil etdiyiniz məlumatları yoxlayın.",
  rate_limited: "Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd edin.",
  server: "Serverdə xəta baş verdi. Bir az sonra yenidən cəhd edin.",
  cancelled: "Sorğu ləğv edildi.",
  unknown: "Gözlənilməz xəta baş verdi.",
};

// Backend messages that are English. Azerbaijani backend messages are shown as-is.
const TRANSLATIONS: Record<string, string> = {
  "Invalid email or password": "Email və ya şifrə yanlışdır",
  "Email and password are required": "Email və şifrə mütləqdir",
  "All required fields must be provided": "Bütün vacib sahələri doldurun",
  "Username must be 3–30 characters: lowercase letters, numbers, dots and underscores only":
    "İstifadəçi adı 3–30 simvol olmalıdır: kiçik hərflər, rəqəmlər, nöqtə və alt xətt",
  "Password must be at least 6 characters": "Şifrə ən azı 6 simvol olmalıdır",
  "Invalid date of birth": "Doğum tarixi yanlışdır",
  "Date of birth cannot be in the future": "Doğum tarixi gələcəkdə ola bilməz",
  "User with this email already exists": "Bu email ilə istifadəçi artıq mövcuddur",
  "Username is already taken": "Bu istifadəçi adı artıq tutulub",
  "Required profile fields are missing": "Vacib profil sahələri boşdur",
  "Image file is required": "Şəkil seçin",
  "Only image files are allowed": "Yalnız şəkil faylı seçin",
  "Invalid or expired token": GENERIC.unauthorized,
  Unauthorized: GENERIC.unauthorized,
  "Only admin can perform this action": "Bu əməliyyatı yalnız admin edə bilər",
  "Team name already taken": "Bu komanda adı artıq tutulub",
  "Team name is required": "Komanda adı mütləqdir",
  "Team not found": "Komanda tapılmadı",
  "User not found": "İstifadəçi tapılmadı",
  "User is already on this team": "İstifadəçi artıq bu komandadadır",
  "A pending invitation already exists for this user": "Bu istifadəçiyə artıq dəvət göndərilib",
  "Only the team captain can invite players": "Oyunçunu yalnız komanda kapitanı dəvət edə bilər",
  "Only the team captain can remove players": "Oyunçunu yalnız komanda kapitanı silə bilər",
  "Cannot remove the team captain from the roster": "Kapitanı komandadan silmək olmaz",
  "Invitation has already been answered": "Dəvətə artıq cavab verilib",
  "Only the invited user can respond": "Yalnız dəvət olunan istifadəçi cavab verə bilər",
  "Open challenge not found": "Açıq oyun təklifi tapılmadı",
  "Cannot challenge your own team": "Öz komandanıza sorğu göndərə bilməzsiniz",
  "Challenge has expired": "Oyun təklifinin vaxtı bitib",
  "Your team already requested this challenge": "Komandanız artıq bu təklifə sorğu göndərib",
  "Only the challenge team captain can respond": "Yalnız təklif sahibi kapitan cavab verə bilər",
  "Request or challenge is no longer open": "Sorğu və ya oyun təklifi artıq aktiv deyil",
  "Only the creator can cancel": "Yalnız yaradan ləğv edə bilər",
  "Only open challenges can be cancelled": "Yalnız açıq təkliflər ləğv edilə bilər",
  "Only the team captain can create a player search": "Axtarışı yalnız komanda kapitanı yarada bilər",
  "playersNeeded must be between 1 and 20": "Oyunçu sayı 1–20 arası olmalıdır",
  "Open player search not found": "Açıq oyunçu axtarışı tapılmadı",
  "This listing has expired": "Axtarışın vaxtı bitib",
  "No spots left": "Boş yer qalmayıb",
  "You are already on the host team": "Siz artıq bu komandadasınız",
  "You already requested this listing": "Bu axtarışa artıq sorğu göndərmisiniz",
  "Only the host captain can respond": "Yalnız kapitan cavab verə bilər",
  "Request or listing is no longer open": "Sorğu və ya axtarış artıq aktiv deyil",
  "Request is no longer pending": "Sorğu artıq gözləmədə deyil",
  "Only the requester can cancel this request": "Sorğunu yalnız göndərən ləğv edə bilər",
  "venue is required": "Məkan mütləqdir",
  "Valid scheduledAt is required": "Tarix və vaxt seçin",
  "You do not have access to this league": "Bu özəl liqaya yalnız iştirakçılar baxa bilər",
  "You do not have access to this championship": "Bu özəl çempionata yalnız iştirakçılar baxa bilər",
  "You do not have access to this match": "Bu oyuna baxmaq üçün icazəniz yoxdur",
  "League not found": "Liqa tapılmadı",
  "Championship not found": "Çempionat tapılmadı",
  "Match not found": "Oyun tapılmadı",
  "Team is already in this league": "Komanda artıq bu liqadadır",
  "Team is already in this championship": "Komanda artıq bu çempionatdadır",
  "A pending invite already exists for this team": "Bu komandaya artıq dəvət göndərilib",
  "Only the team captain can request to join": "Qoşulma sorğusunu yalnız kapitan göndərə bilər",
  "Only the team captain can respond": "Yalnız komanda kapitanı cavab verə bilər",
  "Invite is no longer pending": "Dəvət artıq gözləmədə deyil",
  "You must be friends to perform this action": "Bu əməliyyat üçün dost olmalısınız",
  "You cannot send a friend request to yourself": "Özünüzə dostluq sorğusu göndərə bilməzsiniz",
  "You are already friends with this user": "Siz artıq dostsunuz",
  "A pending friend request already exists": "Dostluq sorğusu artıq göndərilib",
  "Friend request is no longer pending": "Dostluq sorğusu artıq aktiv deyil",
  "Message cannot be empty": "Mesaj boş ola bilməz",
  "You are not a participant in this conversation": "Bu söhbətin iştirakçısı deyilsiniz",
  "Too many requests. Please try again later.": GENERIC.rate_limited,
  "This match cannot be started again.": "Bu oyun yenidən başladıla bilməz",
  "Home and away teams must be different": "Komandalar fərqli olmalıdır",
  "Group is full": "Qrup doludur",
  "Team is already assigned to a group in this championship": "Komanda artıq qrupa təyin edilib",
  "Create groups before starting group stage": "Əvvəlcə qrupları yaradın",
  "Finish group stage before playoffs": "Əvvəlcə qrup mərhələsini bitirin",
  "Playoff requires at least 2 teams": "Pley-off üçün ən azı 2 komanda lazımdır",
  "Round-robin requires at least 2 teams": "Ən azı 2 komanda lazımdır",
  "Groups are locked after group stage starts": "Qrup mərhələsi başladıqdan sonra qruplar dəyişmir",
  "Cannot change group teams after group stage starts":
    "Qrup mərhələsi başladıqdan sonra komandalar dəyişmir",
  "Capacity cannot be less than assigned teams": "Tutum təyin edilmiş komandalardan az ola bilməz",
  "Playoff-only championships skip group stage — start playoff instead":
    "Yalnız pley-off formatında qrup mərhələsi yoxdur",
  "You can only manage your own league": "Yalnız öz liqanızı idarə edə bilərsiniz",
  "You can only manage your own championships": "Yalnız öz çempionatlarınızı idarə edə bilərsiniz",
  "Internal server error": GENERIC.server,
};

const AZ_CHARS = /[əıŞşÇçĞğÖöÜüƏİ]/;

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

/** Turns a raw backend message into something safe and readable for the user. */
export function friendlyMessage(kind: ApiErrorKind, serverMessage: string | null): string {
  if (kind === "server") return GENERIC.server;
  if (serverMessage) {
    const translated = TRANSLATIONS[serverMessage.trim()];
    if (translated) return translated;
    if (AZ_CHARS.test(serverMessage)) return serverMessage;
    if (serverMessage.startsWith("Missing permission")) return GENERIC.forbidden;
  }
  return GENERIC[kind];
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError({ kind: "cancelled", message: GENERIC.cancelled });
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError({ kind: "timeout", message: GENERIC.timeout });
    }
    if (!error.response) {
      return new ApiError({ kind: "network", message: GENERIC.network });
    }
    const status = error.response.status;
    const body = (error.response.data ?? {}) as {
      message?: string;
      code?: string;
      ties?: PlayoffTieGroup[];
    };
    const kind = kindFromStatus(status);
    const serverMessage = typeof body.message === "string" ? body.message : null;
    return new ApiError({
      kind,
      status,
      serverMessage,
      message: friendlyMessage(kind, serverMessage),
      code: body.code,
      ties: body.ties,
    });
  }

  return new ApiError({ kind: "unknown", message: GENERIC.unknown });
}

/** For UI catch blocks: always returns user-facing Azerbaijani text. */
export function errorMessage(error: unknown, fallback?: string): string {
  const apiError = toApiError(error);
  if (apiError.kind === "unknown" && fallback) return fallback;
  return apiError.message;
}

export function isCancelled(error: unknown): boolean {
  return error instanceof ApiError ? error.kind === "cancelled" : axios.isCancel(error);
}
