import { describe, it, expect } from "vitest";
import { computeConfidence, extractKeyTerms, computeCoverage } from "./confidence";

describe("extractKeyTerms", () => {
  it("returns meaningful terms from a question", () => {
    const terms = extractKeyTerms("What is the deployment process?");
    expect(terms).toContain("deployment");
    expect(terms).toContain("process");
    expect(terms).not.toContain("what");
    expect(terms).not.toContain("the");
  });

  it("returns empty array for empty input", () => {
    expect(extractKeyTerms("")).toEqual([]);
  });
});

describe("computeCoverage", () => {
  it("all terms are covered", () => {
    expect(computeCoverage("deployment process", ["deployment is", "the process"])).toBe(1);
  });

  it("no terms covered", () => {
    expect(computeCoverage("deployment process", ["onboarding steps"])).toBe(0);
  });

  it("partial coverage", () => {
    expect(computeCoverage("deployment process steps", ["deployment guide", "unrelated"])).toBe(
      1 / 3,
    );
  });
});

describe("computeConfidence", () => {
  it("returns 0 for all zeros", () => {
    expect(computeConfidence({ maxSimilarity: 0, similarityGap: 0, coverageScore: 0 })).toBe(0);
  });

  it("returns correct value for perfect inputs", () => {
    const score = computeConfidence({ maxSimilarity: 1, similarityGap: 0.5, coverageScore: 1 });
    expect(score).toBeCloseTo(0.85);
  });

  it("clamps values above 1", () => {
    const score = computeConfidence({ maxSimilarity: 2, similarityGap: 2, coverageScore: 2 });
    expect(score).toBe(1);
  });

  it("responds to weight changes", () => {
    const highSimilarity = computeConfidence({
      maxSimilarity: 1,
      similarityGap: 0,
      coverageScore: 0,
    });
    const highCoverage = computeConfidence({
      maxSimilarity: 0,
      similarityGap: 0,
      coverageScore: 1,
    });
    expect(highSimilarity).toBeGreaterThan(highCoverage);
  });
});
