// Import the YAML directly as raw text. Vite's ?raw loader returns the file
// contents as a string at build time.
import SAMPLE_RAW from "./sampleInterview.yml?raw";

export const SAMPLE_INTERVIEW = SAMPLE_RAW;
