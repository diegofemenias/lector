const VOWELS = "aeiouáéíóúü";
const STRONG_VOWELS = "aeoáéó";
const WEAK_VOWELS = "iuíúü";

function isVowel(ch: string): boolean {
  return VOWELS.includes(ch);
}

function isStrong(ch: string): boolean {
  return STRONG_VOWELS.includes(ch);
}

function isWeak(ch: string): boolean {
  return WEAK_VOWELS.includes(ch);
}

function stripAccents(word: string): string {
  return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Cuenta sílabas en español (aprox. reglas escolares). */
export function countSpanishSyllables(raw: string): number {
  let word = raw.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
  if (!word) return 0;
  if (word.length <= 2) return 1;

  // Ajustes de grupos fijos
  word = word
    .replace(/ü/g, "u")
    .replace(/qu([ei])/g, "q$1")
    .replace(/gu([ei])/g, "g$1")
    .replace(/y$/g, "i");

  const chars = [...word];
  let count = 0;
  let i = 0;

  while (i < chars.length) {
    while (i < chars.length && !isVowel(chars[i])) i++;
    if (i >= chars.length) break;

    const start = i;
    let vowelGroup = chars[i];
    i++;

    while (i < chars.length && isVowel(chars[i])) {
      const prev = vowelGroup[vowelGroup.length - 1];
      const curr = chars[i];
      const prevStrong = isStrong(prev);
      const currStrong = isStrong(curr);
      const prevWeak = isWeak(prev);
      const currWeak = isWeak(curr);

      if ((prevStrong && currStrong) || (prevWeak && currWeak)) {
        break;
      }
      vowelGroup += curr;
      i++;
    }

    count++;

    // Consonante(s) entre vocales: la mayoría inicia nueva sílaba
    if (i < chars.length && !isVowel(chars[i])) {
      let consonants = "";
      while (i < chars.length && !isVowel(chars[i])) {
        consonants += chars[i];
        i++;
      }

      if (consonants && i < chars.length) {
        if (consonants.length === 1) {
          // consonante simple entre vocales → sig. sílaba empieza con ella
        } else if (consonants.length === 2) {
          const splitable = /^(br|bl|cr|cl|dr|fr|fl|gr|gl|pr|pl|tr|tl|ch|ll|rr)$/i;
          if (!splitable.test(consonants)) {
            i -= 1;
          }
        } else {
          i -= consonants.length - 1;
        }
      }
    }
  }

  // Casos especiales comunes
  const plain = stripAccents(word);
  if (["flor", "mar", "sol", "pan", "pez"].includes(plain)) return 1;

  return Math.max(1, count);
}

export function isComplexWord(word: string): boolean {
  return countSpanishSyllables(word) > 3;
}
