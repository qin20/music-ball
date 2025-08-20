import { useStore } from "./useStore";
import { CameraMode, CameraModes } from '@/lib/rhythmBall/Camera';

export function useNotes() {
  return useStore<SerializedNote[]>('notes', []);
}

export function useCameraMode() {
  return useStore<CameraMode>('cameraMode', CameraModes.ALL);
}

export function useAspectRatio() {
  return useStore<[number, number]>('aspectRatio', [3, 4]);
}
