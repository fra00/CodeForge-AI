export const normalizePath = (path) => {
  if (!path) return "";
  return path
    .replace(/^[./]+/, "")
    .replace(/\\/g, "/")
    .trim();
};

export const getValidMessages = (messages) => {
  return messages
    .filter((m) => m.role !== "system" && m.role !== "status")
    .filter((m) => m.content && m.content.toString().trim().length > 0);
};
