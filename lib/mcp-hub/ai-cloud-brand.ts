export const NHUTBOT_MODEL_ID = "gemini-1.5-flash";
export const NHUTBOT_MODEL_NAME = "Nhutbot 1.0 Flash";

export function getAiCloudModelDisplayName(modelId: string, fallback: string) {
  return modelId === NHUTBOT_MODEL_ID ? NHUTBOT_MODEL_NAME : fallback;
}
