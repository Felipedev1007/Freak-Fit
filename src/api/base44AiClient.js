// @ts-nocheck
import { createClient } from '@base44/sdk';

const appId = import.meta.env.VITE_BASE44_APP_ID;
const appBaseUrl = import.meta.env.VITE_BASE44_APP_BASE_URL;
const functionsVersion = import.meta.env.VITE_BASE44_FUNCTIONS_VERSION;

export function hasBase44AiConfig() {
  return Boolean(appId);
}

const base44Ai = hasBase44AiConfig()
  ? createClient({
      appId,
      appBaseUrl,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
    })
  : null;

export async function invokeBase44LLM(params) {
  if (!base44Ai) {
    throw new Error('Base44 AI is not configured. Set VITE_BASE44_APP_ID.');
  }

  return base44Ai.integrations.Core.InvokeLLM(params);
}

export async function uploadBase44File(params) {
  if (!base44Ai) {
    throw new Error('Base44 AI is not configured. Set VITE_BASE44_APP_ID.');
  }

  return base44Ai.integrations.Core.UploadFile(params);
}
