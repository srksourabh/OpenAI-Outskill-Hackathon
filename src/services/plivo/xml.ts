export function buildPlivoStreamXml(input: { wsUrl: string; statusCallbackUrl: string }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `<Stream bidirectional="true" contentType="audio/x-mulaw;rate=8000" statusCallbackUrl="${escapeXml(input.statusCallbackUrl)}">${escapeXml(input.wsUrl)}</Stream>`,
    "</Response>"
  ].join("");
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
