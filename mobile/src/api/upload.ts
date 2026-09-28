import { api } from "./client";

export type PickedImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

/** React Native's FormData accepts `{ uri, name, type }` file descriptors. */
export function appendImage(body: FormData, image: PickedImage) {
  const mime = image.mimeType ?? "image/jpeg";
  const ext = mime.split("/")[1] ?? "jpg";
  const file = {
    uri: image.uri,
    name: image.fileName ?? `image.${ext}`,
    type: mime,
  };
  body.append("image", file as unknown as Blob);
}

/** POST /api/uploads/image → public URL used for team/league logos. */
export async function uploadImage(image: PickedImage): Promise<string> {
  const body = new FormData();
  appendImage(body, image);
  const data = await api.post<{ url: string }>("/api/uploads/image", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}
