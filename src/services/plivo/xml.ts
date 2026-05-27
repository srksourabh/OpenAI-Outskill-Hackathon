export function buildPlivoStreamXml(input: { wsUrl: string; statusCallbackUrl: string; recordingCallbackUrl: string }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `<Record recordSession="true" fileFormat="mp3" callbackUrl="${escapeXml(input.recordingCallbackUrl)}" callbackMethod="POST" />`,
    `<Stream keepCallAlive="true" bidirectional="true" contentType="audio/x-mulaw;rate=8000" statusCallbackUrl="${escapeXml(input.statusCallbackUrl)}" statusCallbackMethod="POST">${escapeXml(input.wsUrl)}</Stream>`,
    "</Response>"
  ].join("");
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
