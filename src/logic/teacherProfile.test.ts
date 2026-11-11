import { describe, expect, it } from "vitest";
import { portfolioLimits, validatePortfolioFiles, validateTeacherProfile } from "./teacherProfile";

describe("teacher application boundaries", () => {
  it("accepts the existing API field boundaries", () => {
    expect(validateTeacherProfile("A".repeat(50), "B".repeat(10), 1)).toBeNull();
    expect(validateTeacherProfile("A".repeat(1000), "B".repeat(2000), 5)).toBeNull();
  });
  it("rejects trimmed short fields, oversized fields and missing images", () => {
    expect(validateTeacherProfile(" ".repeat(50), "B".repeat(10), 1)).not.toBeNull();
    expect(validateTeacherProfile("A".repeat(1001), "B".repeat(10), 1)).not.toBeNull();
    expect(validateTeacherProfile("A".repeat(50), "B".repeat(9), 1)).not.toBeNull();
    expect(validateTeacherProfile("A".repeat(50), "B".repeat(2001), 1)).not.toBeNull();
    expect(validateTeacherProfile("A".repeat(50), "B".repeat(10), 0)).not.toBeNull();
  });
  it("counts retained images when resubmitting", () => {
    expect(validatePortfolioFiles([{ type: "image/png", size: 100 }], 5)).not.toBeNull();
    expect(validatePortfolioFiles([{ type: "image/webp", size: 100 }], 4)).toBeNull();
  });
  it("rejects file spoof hints, empty files and size excess before upload", () => {
    expect(validatePortfolioFiles([{ type: "application/pdf", size: 100 }])).not.toBeNull();
    expect(validatePortfolioFiles([{ type: "image/png", size: 0 }])).not.toBeNull();
    expect(validatePortfolioFiles([{ type: "image/png", size: portfolioLimits.fileBytes + 1 }])).not.toBeNull();
    expect(validatePortfolioFiles(Array.from({ length: 4 }, () => ({ type: "image/png", size: portfolioLimits.fileBytes })))).not.toBeNull();
  });
});
