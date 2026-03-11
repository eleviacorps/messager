export function sanitizeMessage(input: string) {
  const trimmed = input.trim().slice(0, 2000);
  const withoutControl = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  return withoutControl;
}

export function safeText(input: string) {
  return sanitizeMessage(input);
}
