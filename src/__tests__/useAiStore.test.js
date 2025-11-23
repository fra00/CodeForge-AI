import { describe, it, expect } from "vitest";
import {
  removePreJsonText,
  removePostJsonText,
  extractJsonFromMarkdown,
} from "../stores/useAIStore";
import { extractAndSanitizeJson } from "../utils/extractAndSanitizeJson";

describe("response elaboration", () => {
  describe("removePreJsonText", () => {
    it("clean text before markdown json", () => {
      expect(removePreJsonText("```json")).toBe("```json");
      expect(removePreJsonText("```json\n")).toBe("```json");
      expect(removePreJsonText("text before```json\n")).toBe("```json");
    });
  });
  describe("removePostJsonText", () => {
    it("clean text before markdown json", () => {
      expect(removePostJsonText("```json{}```")).toBe("```json{}```");
      expect(removePostJsonText("```json{}``` text after")).toBe(
        "```json{}```"
      );
      expect(removePostJsonText("```{}``` text after")).toBe(null);
    });
  });
  describe("extractJsonFromMarkdown", () => {
    it("clean text before markdown json", () => {
      //"text before```json\n{}``` text after"
      //"text before {} text after"
      //"text before ```{}``` text after"

      let stringJsonText = "```json{}```";
      let exp = null;
      exp = JSON.parse(extractJsonFromMarkdown(stringJsonText));
      expect(exp).toEqual({});

      stringJsonText = "text before```json\n{}``` text after";
      JSON.parse(extractJsonFromMarkdown(stringJsonText));
      expect(exp).toEqual({});

      stringJsonText = "text before {} text after";
      exp = JSON.parse(extractJsonFromMarkdown(stringJsonText));
      expect(exp).toEqual({});
    });
  });

  describe("extractAndSanitizeJson", () => {
    it("clean text before markdown json", () => {
      //"text before```json\n{}``` text after"
      //"text before {} text after"
      //"text before ```{}``` text after"

      let stringJsonClean = '{"action":"xxx","response":"```json{}```"}';
      let expectedJson = JSON.parse(stringJsonClean);

      let stringJsonText = "```json" + stringJsonClean + "```";
      let exp = null;
      exp = JSON.parse(extractAndSanitizeJson(stringJsonText));
      expect(exp).toEqual(expectedJson);

      stringJsonText = "text before```" + stringJsonClean + "``` text after";
      JSON.parse(extractAndSanitizeJson(stringJsonText));
      expect(exp).toEqual(expectedJson);

      stringJsonText = "text before " + stringJsonClean + " text after";
      exp = JSON.parse(extractAndSanitizeJson(stringJsonText));
      expect(exp).toEqual(expectedJson);
    });
  });
});
