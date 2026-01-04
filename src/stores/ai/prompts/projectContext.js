/**
 * Generates formatted project structure string
 * @param {object} fileStore - useFileStore instance
 * @returns {string} Project structure string
 */
export const getProjectStructurePrompt = (fileStore) => {
  const filePathsWithTags = Object.values(fileStore.files)
    .filter((node) => node.id !== fileStore.rootId && !node.isFolder)
    .map((node) => {
      let fileInfo = node.path;
      if (node.tags && Object.keys(node.tags).length > 0) {
        const allTags = [...new Set(Object.values(node.tags).flat())];
        if (allTags.length > 0) {
          fileInfo += ` # tags: [${allTags.join(", ")}]`;
        }
      }
      return fileInfo;
    })
    .sort();

  return `\n# 📁 PROJECT STRUCTURE\n${filePathsWithTags.join("\n")}\n`;
};