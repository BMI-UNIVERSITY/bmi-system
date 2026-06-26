// Minor words in Title Case
const MINOR_WORDS = new Set([
  "and", "or", "but", "a", "an", "the", "as", "at", "by", "for", "in", "of", "on", "per", "to", "with"
]);

// Particles in personal names
const NAME_PARTICLES = new Set([
  "van", "von", "der", "de", "la", "du", "da", "di", "del", "le"
]);

// Known acronyms that should remain uppercase (or special mixed case like MDiv)
const KNOWN_ACRONYMS = new Set([
  "ICT", "IT", "BMI", "MA", "BA", "PHD", "MDIV", "BSC", "MSC", "DCMT", "THS", "GPA", "ERP"
]);

/**
 * Normalizes any text field to high-quality Title Case with special rules.
 */
export function normalizeText(text: string | null | undefined, type: 'name' | 'title' = 'title'): string {
  if (!text) return "";
  
  // Clean up leading/trailing punctuation and extra whitespace
  let clean = text.trim().replace(/^[\s.,;:()'"-]+|[\s.,;:()'"-]+$/g, "");
  clean = clean.replace(/\s+/g, " ");

  if (!clean) return "";

  const parts = clean.split(" ");
  const formatted = parts.map((part, index) => {
    if (!part) return "";

    // Handle double-barrelled names or hyphenated titles (e.g. "Smith-Jones", "Non-Classical")
    if (part.includes("-")) {
      return part
        .split("-")
        .map((sub, subIdx) => formatSingleWord(sub, type, index === 0 && subIdx === 0))
        .join("-");
    }

    return formatSingleWord(part, type, index === 0);
  });

  return formatted.filter(Boolean).join(" ");
}

function formatSingleWord(word: string, type: 'name' | 'title', isFirstWord: boolean): string {
  if (!word) return "";
  const lower = word.toLowerCase();
  const upper = word.toUpperCase();

  // 1. Acronym check
  if (KNOWN_ACRONYMS.has(upper)) {
    if (upper === "MDIV") return "MDiv";
    return upper;
  }

  // 2. Personal name formatting (particles and prefixes)
  if (type === 'name') {
    // Irish/Scottish prefixes (Mc, Mac, O', d')
    if (lower.startsWith("mc") && word.length > 2) {
      return "Mc" + lower.charAt(2).toUpperCase() + lower.slice(3);
    }
    if (lower.startsWith("mac") && word.length > 3) {
      return "Mac" + lower.charAt(3).toUpperCase() + lower.slice(4);
    }
    if (lower.startsWith("o'") && word.length > 2) {
      return "O'" + lower.charAt(2).toUpperCase() + lower.slice(3);
    }
    if (lower.startsWith("d'") && word.length > 2) {
      return "d'" + lower.charAt(2).toUpperCase() + lower.slice(3);
    }

    // Name particles (de, la, van, der)
    if (NAME_PARTICLES.has(lower) && !isFirstWord) {
      return lower;
    }
  } else {
    // For general titles (courses, programs, campuses, departments, faculties)
    // Keep minor words lowercase unless it's the first word of the text
    if (MINOR_WORDS.has(lower) && !isFirstWord) {
      return lower;
    }
  }

  // Default to Standard Title Case (Capitalize first letter)
  return word.charAt(0).toUpperCase() + lower.slice(1);
}






