
import { BLOOM_TAXONOMY_LEVELS_ES } from '../constants';
import type { AnalisisBloom } from '../types';

// Simulates the distribution of questions across Bloom's Taxonomy levels.
// Returns an object where keys are Bloom levels and values are the number of questions.
// For this simulation, it ensures the total number of "questions" (points) sums to a somewhat consistent total (e.g. 50).
export const simulateBloomAnalysis = (): AnalisisBloom => {
  const analysis: AnalisisBloom = {};
  const numLevels = BLOOM_TAXONOMY_LEVELS_ES.length;
  
  // Simulate a total number of questions, e.g., between 20 and 60
  const totalQuestions = Math.floor(Math.random() * 41) + 20; 
  let points = Array(numLevels).fill(0);
  let remainingQuestions = totalQuestions;

  // Distribute points with some weighting to make it look a bit more realistic
  // (e.g. more questions in comprehension/application than creation)
  const weights = [0.15, 0.25, 0.25, 0.15, 0.1, 0.1]; // Approximate distribution

  for (let i = 0; i < numLevels - 1; i++) {
    const questionsForLevel = Math.round(weights[i] * totalQuestions + (Math.random() * 4 - 2)); // Add some noise
    points[i] = Math.max(0, Math.min(questionsForLevel, remainingQuestions));
    remainingQuestions -= points[i];
  }
  points[numLevels - 1] = Math.max(0, remainingQuestions); // Assign rest to the last level

  // Ensure sum matches totalQuestions due to rounding or adjustments
  let currentSum = points.reduce((sum, p) => sum + p, 0);
  if (currentSum !== totalQuestions && numLevels > 0) {
    points[0] += (totalQuestions - currentSum); // Adjust the first level
    if (points[0] < 0) { // if it made it negative, redistribute
        remainingQuestions = totalQuestions - points.slice(1).reduce((s,p)=>s+p,0);
        points[0] = Math.max(0, remainingQuestions);
    }
  }
  
  BLOOM_TAXONOMY_LEVELS_ES.forEach((level, index) => {
    analysis[level] = points[index];
  });

  return analysis;
};
