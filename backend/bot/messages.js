export const SYSTEM_PROMPT = [
  "You are a helpful assistant chatting on Telegram.",
  "Reply in the same language as the user's latest message.",
  "If the user writes in Azerbaijani, reply in Azerbaijani.",
  "If the user writes in English, reply in English.",
  "Keep replies concise and useful.",
].join(" ");

export const BOT_MESSAGES = {
  start: [
    "Salam! Mən AI köməkçiyəm. Azərbaycan və ya ingilis dilində yaza bilərsiniz.",
    "Hi! I am an AI assistant. You can write in Azerbaijani or English.",
    "",
    "/reset — söhbəti sıfırlayır / clears this chat",
  ].join("\n"),
  codeStart: [
    "Kodu dəyişmək üçün nəyi dəyişəcəyini yaz.",
    "Məsələn: landing page-də başlığı dəyiş.",
    "Kompüterin bağlı ola bilər. İş buludda gedəcək, sonra GitHub-da merge olunacaq.",
    "",
    "/id — sənin Telegram user id-in",
  ].join("\n"),
  notAllowed: "Bu əmri yalnız botun sahibi verə bilər.",
  taskStarted: "İş başladı. Dəyişiklik buludda ediləcək, bitəndə nəticəni yazacağam.",
  taskBusy: "Artıq bir dəyişiklik gedir. Bitməsini gözlə.",
  reset: [
    "Söhbət tarixçəsi silindi. Yeni sual yaza bilərsiniz.",
    "Chat history cleared. You can start a new conversation.",
  ].join("\n"),
  empty: [
    "Boş mesaj göndərdiniz. Zəhmət olmasa mətn yazın.",
    "That message was empty. Please send some text.",
  ].join("\n"),
  unsupported: [
    "Bu mesaj növünü oxuya bilmirəm. Zəhmət olmasa mətn göndərin.",
    "I can only read text messages. Please send text.",
  ].join("\n"),
  tooLong: [
    "Mesaj çox uzundur. Zəhmət olmasa daha qısa yazın.",
    "That message is too long. Please send a shorter one.",
  ].join("\n"),
  unknownCommand: [
    "Bu əmri tanımıram. Mətn yaza və ya /reset istifadə edə bilərsiniz.",
    "I do not recognize that command. Send a message, or use /reset.",
  ].join("\n"),
  rateLimit: [
    "Hazırda çox sayda sorğu var. Bir az sonra yenidən cəhd edin.",
    "The AI service is busy right now. Please try again shortly.",
  ].join("\n"),
  timeout: [
    "Cavab çox uzun çəkdi. Zəhmət olmasa yenidən cəhd edin.",
    "The reply took too long. Please try again.",
  ].join("\n"),
  unavailable: [
    "AI xidməti müvəqqəti əlçatan deyil. Bir az sonra yenidən cəhd edin.",
    "The AI service is temporarily unavailable. Please try again shortly.",
  ].join("\n"),
};

export function parseCommand(text) {
  const match = /^\/([a-z0-9_]+)(?:@[\w_]+)?(?:\s|$)/i.exec(text);
  return match ? match[1].toLowerCase() : null;
}
