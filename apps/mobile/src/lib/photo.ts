import * as ImagePicker from "expo-image-picker";
import { api } from "./api";

export interface PickedPhoto {
  uri: string;
  mimeType: string;
  fileName: string;
}

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.6, // Meal photos are a diary, not a portfolio — keep uploads small.
  allowsEditing: true,
  aspect: [4, 3],
};

function toPicked(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  const mimeType = asset.mimeType ?? "image/jpeg";
  return {
    uri: asset.uri,
    mimeType,
    fileName: asset.fileName ?? `meal.${mimeType.split("/")[1] ?? "jpg"}`,
  };
}

/** Opens the camera. Returns null if permission is refused or the user backs out. */
export async function takePhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync(OPTIONS);
  return result.canceled ? null : toPicked(result.assets[0]);
}

/** Opens the photo library. Returns null if the user backs out. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync(OPTIONS);
  return result.canceled ? null : toPicked(result.assets[0]);
}

/**
 * Uploads a picked photo and returns its id.
 *
 * React Native's FormData takes `{ uri, name, type }` rather than a Blob —
 * the native layer reads the file off disk. TypeScript's DOM lib has no
 * signature for that, hence the cast.
 */
export async function uploadPhoto(photo: PickedPhoto): Promise<string> {
  const form = new FormData();
  form.append("photo", {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);

  const { photoId } = await api.uploadPhoto(form);
  return photoId;
}
