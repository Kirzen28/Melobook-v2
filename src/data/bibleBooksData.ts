export interface BibleBookInfo {
  id: number;
  name: string;
  testament: 'OT' | 'NT';
  category: 'Pentateuque' | 'Historique' | 'Poétique' | 'Prophètes' | 'Évangiles' | 'Actes' | 'Épîtres' | 'Apocalypse';
  chapters: number;
  aliases: string[];
}

export const BIBLE_BOOKS: BibleBookInfo[] = [
  // Ancien Testament (39 livres)
  { id: 1, name: 'Genèse', testament: 'OT', category: 'Pentateuque', chapters: 50, aliases: ['gn', 'gen', 'genese', 'genesis', 'ge', 'génesis'] },
  { id: 2, name: 'Exode', testament: 'OT', category: 'Pentateuque', chapters: 40, aliases: ['ex', 'exo', 'exode', 'exodus', 'éxodo', 'exodo'] },
  { id: 3, name: 'Lévitique', testament: 'OT', category: 'Pentateuque', chapters: 27, aliases: ['lv', 'lev', 'levitique', 'leviticus', 'levitico', 'lévitico'] },
  { id: 4, name: 'Nombres', testament: 'OT', category: 'Pentateuque', chapters: 36, aliases: ['nb', 'nom', 'nomb', 'nombres', 'numbers', 'números', 'numeros'] },
  { id: 5, name: 'Deutéronome', testament: 'OT', category: 'Pentateuque', chapters: 34, aliases: ['dt', 'deut', 'deuteronome', 'deuteronomy', 'deuteronomio'] },
  { id: 6, name: 'Josué', testament: 'OT', category: 'Historique', chapters: 24, aliases: ['jos', 'josue', 'joshua', 'josué'] },
  { id: 7, name: 'Juges', testament: 'OT', category: 'Historique', chapters: 21, aliases: ['jg', 'jug', 'juges', 'judges', 'jueces'] },
  { id: 8, name: 'Ruth', testament: 'OT', category: 'Historique', chapters: 4, aliases: ['rt', 'rut', 'ruth'] },
  { id: 9, name: '1 Samuel', testament: 'OT', category: 'Historique', chapters: 31, aliases: ['1s', '1sam', '1 samuel', '1samuel'] },
  { id: 10, name: '2 Samuel', testament: 'OT', category: 'Historique', chapters: 24, aliases: ['2s', '2sam', '2 samuel', '2samuel'] },
  { id: 11, name: '1 Rois', testament: 'OT', category: 'Historique', chapters: 22, aliases: ['1r', '1rois', '1 rois', '1kings', '1 reyes', '1reyes'] },
  { id: 12, name: '2 Rois', testament: 'OT', category: 'Historique', chapters: 25, aliases: ['2r', '2rois', '2 rois', '2kings', '2 reyes', '2reyes'] },
  { id: 13, name: '1 Chroniques', testament: 'OT', category: 'Historique', chapters: 29, aliases: ['1ch', '1chr', '1 chroniques', '1chroniques', '1 cronicas', '1cronicas'] },
  { id: 14, name: '2 Chroniques', testament: 'OT', category: 'Historique', chapters: 36, aliases: ['2ch', '2chr', '2 chroniques', '2chroniques', '2 cronicas', '2cronicas'] },
  { id: 15, name: 'Esdras', testament: 'OT', category: 'Historique', chapters: 10, aliases: ['esd', 'esdras', 'ezra'] },
  { id: 16, name: 'Néhémie', testament: 'OT', category: 'Historique', chapters: 13, aliases: ['ne', 'neh', 'nehemie', 'nehemiah', 'nehemias'] },
  { id: 17, name: 'Esther', testament: 'OT', category: 'Historique', chapters: 10, aliases: ['est', 'esth', 'esther', 'ester'] },
  { id: 18, name: 'Job', testament: 'OT', category: 'Poétique', chapters: 42, aliases: ['jb', 'job'] },
  { id: 19, name: 'Psaumes', testament: 'OT', category: 'Poétique', chapters: 150, aliases: ['ps', 'psa', 'psaume', 'psaumes', 'psalm', 'psalms', 'salmo', 'salmos', 'sal'] },
  { id: 20, name: 'Proverbes', testament: 'OT', category: 'Poétique', chapters: 31, aliases: ['pr', 'prv', 'prov', 'proverbes', 'proverbs', 'proverbios'] },
  { id: 21, name: 'Ecclésiaste', testament: 'OT', category: 'Poétique', chapters: 12, aliases: ['ec', 'ecc', 'eccl', 'ecclesiaste', 'ecclesiastes', 'eclesiastes', 'qoh'] },
  { id: 22, name: 'Cantique des Cantiques', testament: 'OT', category: 'Poétique', chapters: 8, aliases: ['ct', 'cant', 'cantique', 'cantiques', 'song', 'cantares'] },
  { id: 23, name: 'Ésaïe', testament: 'OT', category: 'Prophètes', chapters: 66, aliases: ['es', 'esa', 'esaie', 'isa', 'isaie', 'isaiah', 'isaias'] },
  { id: 24, name: 'Jérémie', testament: 'OT', category: 'Prophètes', chapters: 52, aliases: ['jr', 'jer', 'jeremie', 'jeremiah', 'jeremias'] },
  { id: 25, name: 'Lamentations', testament: 'OT', category: 'Prophètes', chapters: 5, aliases: ['lm', 'lam', 'lamentations', 'lamentaciones'] },
  { id: 26, name: 'Ézékiel', testament: 'OT', category: 'Prophètes', chapters: 48, aliases: ['ez', 'ezk', 'ezekiel', 'ezéchiel', 'ezechiel', 'ezequiel'] },
  { id: 27, name: 'Daniel', testament: 'OT', category: 'Prophètes', chapters: 12, aliases: ['da', 'dan', 'daniel'] },
  { id: 28, name: 'Osée', testament: 'OT', category: 'Prophètes', chapters: 14, aliases: ['os', 'osee', 'hosea', 'oseas'] },
  { id: 29, name: 'Joël', testament: 'OT', category: 'Prophètes', chapters: 3, aliases: ['jl', 'joe', 'joel'] },
  { id: 30, name: 'Amos', testament: 'OT', category: 'Prophètes', chapters: 9, aliases: ['am', 'amos'] },
  { id: 31, name: 'Abdias', testament: 'OT', category: 'Prophètes', chapters: 1, aliases: ['ab', 'abd', 'abdias', 'obadiah'] },
  { id: 32, name: 'Jonas', testament: 'OT', category: 'Prophètes', chapters: 4, aliases: ['jon', 'jonas', 'jonah'] },
  { id: 33, name: 'Michée', testament: 'OT', category: 'Prophètes', chapters: 7, aliases: ['mi', 'mic', 'michee', 'micah', 'miqueas'] },
  { id: 34, name: 'Nahum', testament: 'OT', category: 'Prophètes', chapters: 3, aliases: ['na', 'nah', 'nahum'] },
  { id: 35, name: 'Habacuc', testament: 'OT', category: 'Prophètes', chapters: 3, aliases: ['ha', 'hab', 'habacuc', 'habakkuk'] },
  { id: 36, name: 'Sophonie', testament: 'OT', category: 'Prophètes', chapters: 3, aliases: ['so', 'sop', 'sophonie', 'zephaniah', 'sofonias'] },
  { id: 37, name: 'Aggée', testament: 'OT', category: 'Prophètes', chapters: 2, aliases: ['ag', 'agg', 'aggee', 'haggai', 'hageo'] },
  { id: 38, name: 'Zacharie', testament: 'OT', category: 'Prophètes', chapters: 14, aliases: ['za', 'zac', 'zacharie', 'zechariah', 'zacarias'] },
  { id: 39, name: 'Malachie', testament: 'OT', category: 'Prophètes', chapters: 4, aliases: ['ml', 'mal', 'malachie', 'malachi', 'malaquias'] },

  // Nouveau Testament (27 livres)
  { id: 40, name: 'Matthieu', testament: 'NT', category: 'Évangiles', chapters: 28, aliases: ['mt', 'mat', 'matt', 'matthieu', 'matthew', 'mateo'] },
  { id: 41, name: 'Marc', testament: 'NT', category: 'Évangiles', chapters: 16, aliases: ['mc', 'mar', 'marc', 'mark', 'marcos'] },
  { id: 42, name: 'Luc', testament: 'NT', category: 'Évangiles', chapters: 24, aliases: ['lc', 'luc', 'luke', 'lucas'] },
  { id: 43, name: 'Jean', testament: 'NT', category: 'Évangiles', chapters: 21, aliases: ['jn', 'jean', 'john', 'je', 'juan'] },
  { id: 44, name: 'Actes', testament: 'NT', category: 'Actes', chapters: 28, aliases: ['ac', 'act', 'actes', 'acts', 'hechos', 'hch'] },
  { id: 45, name: 'Romains', testament: 'NT', category: 'Épîtres', chapters: 16, aliases: ['rm', 'rom', 'romains', 'romans', 'ro', 'romanos'] },
  { id: 46, name: '1 Corinthiens', testament: 'NT', category: 'Épîtres', chapters: 16, aliases: ['1co', '1cor', '1 cor', '1 corinthiens', '1corinthians', '1 corintios', '1corintios'] },
  { id: 47, name: '2 Corinthiens', testament: 'NT', category: 'Épîtres', chapters: 13, aliases: ['2co', '2cor', '2 cor', '2 corinthiens', '2corinthians', '2 corintios', '2corintios'] },
  { id: 48, name: 'Galates', testament: 'NT', category: 'Épîtres', chapters: 6, aliases: ['ga', 'gal', 'galates', 'galatians', 'galatas'] },
  { id: 49, name: 'Éphésiens', testament: 'NT', category: 'Épîtres', chapters: 6, aliases: ['ep', 'eph', 'ephesiens', 'ephesians', 'efesios'] },
  { id: 50, name: 'Philippiens', testament: 'NT', category: 'Épîtres', chapters: 4, aliases: ['ph', 'phil', 'phlp', 'philippiens', 'philippians', 'filipenses'] },
  { id: 51, name: 'Colossiens', testament: 'NT', category: 'Épîtres', chapters: 4, aliases: ['col', 'colossiens', 'colossians', 'colosenses'] },
  { id: 52, name: '1 Thessaloniciens', testament: 'NT', category: 'Épîtres', chapters: 5, aliases: ['1th', '1thess', '1 thess', '1 thessaloniciens', '1thessalonians', '1 tesalonicenses'] },
  { id: 53, name: '2 Thessaloniciens', testament: 'NT', category: 'Épîtres', chapters: 3, aliases: ['2th', '2thess', '2 thess', '2 thessaloniciens', '2thessalonians', '2 tesalonicenses'] },
  { id: 54, name: '1 Timothée', testament: 'NT', category: 'Épîtres', chapters: 6, aliases: ['1tm', '1tim', '1 tim', '1 timothee', '1timothy', '1 timoteo'] },
  { id: 55, name: '2 Timothée', testament: 'NT', category: 'Épîtres', chapters: 4, aliases: ['2tm', '2tim', '2 tim', '2 timothee', '2timothy', '2 timoteo'] },
  { id: 56, name: 'Tite', testament: 'NT', category: 'Épîtres', chapters: 3, aliases: ['tt', 'tit', 'tite', 'titus', 'tito'] },
  { id: 57, name: 'Philémon', testament: 'NT', category: 'Épîtres', chapters: 1, aliases: ['phm', 'phlm', 'philemon', 'filemon'] },
  { id: 58, name: 'Hébreux', testament: 'NT', category: 'Épîtres', chapters: 13, aliases: ['he', 'heb', 'hebreux', 'hebrews', 'hebreos'] },
  { id: 59, name: 'Jacques', testament: 'NT', category: 'Épîtres', chapters: 5, aliases: ['jc', 'jac', 'jacq', 'jacques', 'james', 'santiago'] },
  { id: 60, name: '1 Pierre', testament: 'NT', category: 'Épîtres', chapters: 5, aliases: ['1p', '1pi', '1pierre', '1 pierre', '1peter', '1 pedro', '1pedro'] },
  { id: 61, name: '2 Pierre', testament: 'NT', category: 'Épîtres', chapters: 3, aliases: ['2p', '2pi', '2pierre', '2 pierre', '2peter', '2 pedro', '2pedro'] },
  { id: 62, name: '1 Jean', testament: 'NT', category: 'Épîtres', chapters: 5, aliases: ['1j', '1jn', '1jean', '1 jean', '1john', '1 juan', '1juan'] },
  { id: 63, name: '2 Jean', testament: 'NT', category: 'Épîtres', chapters: 1, aliases: ['2j', '2jn', '2jean', '2 jean', '2john', '2 juan', '2juan'] },
  { id: 64, name: '3 Jean', testament: 'NT', category: 'Épîtres', chapters: 1, aliases: ['3j', '3jn', '3jean', '3 jean', '3john', '3 juan', '3juan'] },
  { id: 65, name: 'Jude', testament: 'NT', category: 'Épîtres', chapters: 1, aliases: ['jd', 'jud', 'jude', 'judas'] },
  { id: 66, name: 'Apocalypse', testament: 'NT', category: 'Apocalypse', chapters: 22, aliases: ['ap', 'apoc', 'apocalypse', 'rev', 'revelation', 'apocalipsis'] }
];

export interface ParsedScriptureRef {
  book: BibleBookInfo;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  rawInput: string;
}

export function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function findBookByAliasOrName(query: string): BibleBookInfo | null {
  const norm = normalizeSearchString(query).replace(/\s+/g, '');
  if (!norm) return null;

  for (const book of BIBLE_BOOKS) {
    const bookNorm = normalizeSearchString(book.name).replace(/\s+/g, '');
    if (bookNorm === norm) return book;
    for (const al of book.aliases) {
      const alNorm = normalizeSearchString(al).replace(/\s+/g, '');
      if (alNorm === norm) return book;
    }
  }

  // Prefix matching
  for (const book of BIBLE_BOOKS) {
    const bookNorm = normalizeSearchString(book.name).replace(/\s+/g, '');
    if (bookNorm.startsWith(norm)) return book;
  }

  return null;
}

/**
 * Analyse une requête textuelle ultra-rapide comme:
 * "Jean 3:16", "jn 3 16", "romains 8 28-30", "1 cor 13:4-8", "ps 23", "es 40 31"
 */
export function parseScriptureReference(input: string): ParsedScriptureRef | null {
  if (!input || !input.trim()) return null;
  const raw = input.trim();

  // Remplacer séparateurs courants par des espaces pour homogénéiser
  const cleaned = raw
    .replace(/[:\.\,]/g, ' ')
    .replace(/[-–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern 1 : Avec numéro de livre (ex: "1 Jean 4 8", "1 cor 13 4-8", "2 tim 1 7")
  const numberedPattern = /^([1-3]\s*[a-zA-Zà-ÿÀ-Ÿ]+)\s+(\d+)(?:\s+(\d+)(?:-(\d+))?)?$/i;
  let match = cleaned.match(numberedPattern);

  if (!match) {
    // Pattern 2 : Livre standard (ex: "Jean 3 16", "jn 3 16-18", "rom 8 28")
    const standardPattern = /^([a-zA-Zà-ÿÀ-Ÿ]+)\s+(\d+)(?:\s+(\d+)(?:-(\d+))?)?$/i;
    match = cleaned.match(standardPattern);
  }

  if (match) {
    const bookNameCandidate = match[1].trim();
    const chapterNum = parseInt(match[2], 10);
    const verseStart = match[3] ? parseInt(match[3], 10) : undefined;
    const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;

    const book = findBookByAliasOrName(bookNameCandidate);
    if (book && chapterNum >= 1 && chapterNum <= book.chapters) {
      return {
        book,
        chapter: chapterNum,
        verseStart,
        verseEnd: verseEnd && verseStart ? Math.max(verseStart, verseEnd) : verseStart,
        rawInput: raw
      };
    }
  }

  // Pattern 3 : Seulement le livre et le chapitre (ex: "Psaume 23", "Jean 3")
  const bookAndChapter = /^([1-3]?\s*[a-zA-Zà-ÿÀ-Ÿ]+)\s+(\d+)$/i;
  const mChap = cleaned.match(bookAndChapter);
  if (mChap) {
    const book = findBookByAliasOrName(mChap[1].trim());
    const chapterNum = parseInt(mChap[2], 10);
    if (book && chapterNum >= 1 && chapterNum <= book.chapters) {
      return {
        book,
        chapter: chapterNum,
        rawInput: raw
      };
    }
  }

  return null;
}

/**
 * Collection embarquée de sécurité (hors ligne) des passages les plus cités en prédication
 * Garantit une projection 100% fiable même sans aucune connexion internet
 */
export interface OfflineVerseRecord {
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export const OFFLINE_KEY_VERSES: OfflineVerseRecord[] = [
  {
    bookId: 43,
    bookName: 'Jean',
    chapter: 3,
    verse: 16,
    text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle."
  },
  {
    bookId: 43,
    bookName: 'Jean',
    chapter: 3,
    verse: 17,
    text: "Dieu, en effet, n'a pas envoyé son Fils dans le monde pour qu'il juge le monde, mais pour que le monde soit sauvé par lui."
  },
  {
    bookId: 43,
    bookName: 'Jean',
    chapter: 14,
    verse: 6,
    text: "Jésus lui dit : Je suis le chemin, la vérité, et la vie. Nul ne vient au Père que par moi."
  },
  {
    bookId: 43,
    bookName: 'Jean',
    chapter: 1,
    verse: 1,
    text: "Au commencement était la Parole, et la Parole était avec Dieu, et la Parole était Dieu."
  },
  {
    bookId: 43,
    bookName: 'Jean',
    chapter: 10,
    verse: 10,
    text: "Le voleur ne vient que pour dérober, égorger et détruire ; moi, je suis venu afin que les brebis aient la vie, et qu'elles soient dans l'abondance."
  },
  {
    bookId: 45,
    bookName: 'Romains',
    chapter: 8,
    verse: 28,
    text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein."
  },
  {
    bookId: 45,
    bookName: 'Romains',
    chapter: 8,
    verse: 31,
    text: "Que dirons-nous donc à l'égard de ces choses ? Si Dieu est pour nous, qui sera contre nous ?"
  },
  {
    bookId: 45,
    bookName: 'Romains',
    chapter: 8,
    verse: 38,
    text: "Car j'ai l'assurance que ni la mort ni la vie, ni les anges ni les dominations, ni les choses présentes ni les choses à venir,"
  },
  {
    bookId: 45,
    bookName: 'Romains',
    chapter: 8,
    verse: 39,
    text: "ni la puissance, ni la hauteur, ni la profondeur, ni aucune autre créature ne pourra nous séparer de l'amour de Dieu manifesté en Jésus-Christ notre Seigneur."
  },
  {
    bookId: 45,
    bookName: 'Romains',
    chapter: 12,
    verse: 1,
    text: "Je vous exhorte donc, frères, par les compassions de Dieu, à offrir vos corps comme un sacrifice vivant, saint, agréable à Dieu, ce qui sera de votre part un culte raisonnable."
  },
  {
    bookId: 45,
    bookName: 'Romains',
    chapter: 12,
    verse: 2,
    text: "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l'intelligence, afin que vous discerniez quelle est la volonté de Dieu, ce qui est bon, agréable et parfait."
  },
  {
    bookId: 45,
    bookName: 'Romains',
    chapter: 10,
    verse: 9,
    text: "Si tu confesses de ta bouche le Seigneur Jésus, et si tu crois dans ton cœur que Dieu l'a ressuscité des morts, tu seras sauvé."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 23,
    verse: 1,
    text: "L'Éternel est mon berger : je ne manquerai de rien."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 23,
    verse: 2,
    text: "Il me fait reposer dans de verts pâturages, Il me dirige près des eaux paisibles."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 23,
    verse: 3,
    text: "Il restaure mon âme, Il me conduit dans les sentiers de la justice, À cause de son nom."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 23,
    verse: 4,
    text: "Quand je marche dans la vallée de l'ombre de la mort, Je ne crains aucun mal, car tu es avec moi : Ta houlette et ton bâton me rassurent."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 23,
    verse: 5,
    text: "Tu dresses devant moi une table, En face de mes adversaires ; Tu oins d'huile ma tête, Et ma coupe déborde."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 23,
    verse: 6,
    text: "Oui, le bonheur et la grâce m'accompagneront Tous les jours de ma vie, Et j'habiterai dans la maison de l'Éternel Jusqu'à la fin de mes jours."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 91,
    verse: 1,
    text: "Celui qui demeure sous l'abri du Très-Haut Repose à l'ombre du Tout Puissant."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 91,
    verse: 2,
    text: "Je dis à l'Éternel : Mon refuge et ma forteresse, Mon Dieu en qui je me confie !"
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 121,
    verse: 1,
    text: "Je lève mes yeux vers les montagnes... D'où me viendra le secours ?"
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 121,
    verse: 2,
    text: "Le secours me vient de l'Éternel, Qui a fait les cieux et la terre."
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 100,
    verse: 1,
    text: "Poussez vers l'Éternel des cris de joie, Vous tous, habitants de la terre !"
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 100,
    verse: 2,
    text: "Servez l'Éternel, avec joie, Venez avec allégresse en sa présence !"
  },
  {
    bookId: 19,
    bookName: 'Psaumes',
    chapter: 119,
    verse: 105,
    text: "Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier."
  },
  {
    bookId: 50,
    bookName: 'Philippiens',
    chapter: 4,
    verse: 13,
    text: "Je puis tout par celui qui me fortifie."
  },
  {
    bookId: 50,
    bookName: 'Philippiens',
    chapter: 4,
    verse: 6,
    text: "Ne vous inquiétez de rien ; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces."
  },
  {
    bookId: 50,
    bookName: 'Philippiens',
    chapter: 4,
    verse: 7,
    text: "Et la paix de Dieu, qui surpasse toute intelligence, gardera vos cœurs et vos pensées en Jésus-Christ."
  },
  {
    bookId: 49,
    bookName: 'Éphésiens',
    chapter: 2,
    verse: 8,
    text: "Car c'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c'est le don de Dieu."
  },
  {
    bookId: 49,
    bookName: 'Éphésiens',
    chapter: 2,
    verse: 9,
    text: "Ce n'est point par les œuvres, afin que personne ne se glorifie."
  },
  {
    bookId: 49,
    bookName: 'Éphésiens',
    chapter: 3,
    verse: 20,
    text: "Or, à celui qui peut faire, par la puissance qui agit en nous, infiniment au-delà de tout ce que nous demandons ou pensons,"
  },
  {
    bookId: 49,
    bookName: 'Éphésiens',
    chapter: 6,
    verse: 10,
    text: "Au reste, fortifiez-vous dans le Seigneur, et par sa force toute-puissante."
  },
  {
    bookId: 20,
    bookName: 'Proverbes',
    chapter: 3,
    verse: 5,
    text: "Confie-toi en l'Éternel de tout ton cœur, Et ne t'appuie pas sur ta sagesse ;"
  },
  {
    bookId: 20,
    bookName: 'Proverbes',
    chapter: 3,
    verse: 6,
    text: "Reconnais-le dans toutes tes voies, Et il aplanira tes sentiers."
  },
  {
    bookId: 23,
    bookName: 'Ésaïe',
    chapter: 40,
    verse: 31,
    text: "Mais ceux qui se confient en l'Éternel renouvellent leur force. Ils prennent le vol comme les aigles ; Ils courent, et ne se lassent point ; Ils marchent, et ne se fatiguent point."
  },
  {
    bookId: 23,
    bookName: 'Ésaïe',
    chapter: 53,
    verse: 5,
    text: "Mais il était blessé pour nos péchés, Brisé pour nos iniquités ; Le châtiment qui nous donne la paix est tombé sur lui, Et c'est par ses meurtrissures que nous sommes guéris."
  },
  {
    bookId: 23,
    bookName: 'Ésaïe',
    chapter: 41,
    verse: 10,
    text: "Ne crains rien, car je suis avec toi ; Ne promène pas des regards inquiets, car je suis ton Dieu ; Je te fortifie, je viens à ton secours, Je te soutiens de ma droite triomphante."
  },
  {
    bookId: 24,
    bookName: 'Jérémie',
    chapter: 29,
    verse: 11,
    text: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance."
  },
  {
    bookId: 24,
    bookName: 'Jérémie',
    chapter: 33,
    verse: 3,
    text: "Invoque-moi, et je te répondrai ; Je t'annoncerai de grandes choses, des choses cachées, Que tu ne connais pas."
  },
  {
    bookId: 40,
    bookName: 'Matthieu',
    chapter: 28,
    verse: 19,
    text: "Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit,"
  },
  {
    bookId: 40,
    bookName: 'Matthieu',
    chapter: 28,
    verse: 20,
    text: "et enseignez-leur à observer tout ce que je vous ai prescrit. Et voici, je suis avec vous tous les jours, jusqu'à la fin du monde."
  },
  {
    bookId: 40,
    bookName: 'Matthieu',
    chapter: 6,
    verse: 33,
    text: "Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus."
  },
  {
    bookId: 40,
    bookName: 'Matthieu',
    chapter: 11,
    verse: 28,
    text: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos."
  },
  {
    bookId: 46,
    bookName: '1 Corinthiens',
    chapter: 13,
    verse: 4,
    text: "La charité est patiente, elle est pleine de bonté ; la charité n'est point envieuse ; la charité ne se vante point, elle ne s'enfle point d'orgueil,"
  },
  {
    bookId: 46,
    bookName: '1 Corinthiens',
    chapter: 13,
    verse: 13,
    text: "Maintenant donc ces trois choses demeurent : la foi, l'espérance, la charité ; mais la plus grande de ces choses, c'est la charité."
  },
  {
    bookId: 47,
    bookName: '2 Corinthiens',
    chapter: 5,
    verse: 17,
    text: "Si quelqu'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées ; voici, toutes choses sont devenues nouvelles."
  },
  {
    bookId: 48,
    bookName: 'Galates',
    chapter: 5,
    verse: 22,
    text: "Mais le fruit de l'Esprit, c'est l'amour, la joie, la paix, la patience, la bonté, la bénignité, la fidélité, la douceur, la tempérance ;"
  },
  {
    bookId: 58,
    bookName: 'Hébreux',
    chapter: 11,
    verse: 1,
    text: "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas."
  },
  {
    bookId: 58,
    bookName: 'Hébreux',
    chapter: 13,
    verse: 8,
    text: "Jésus-Christ est le même hier, aujourd'hui, et éternellement."
  },
  {
    bookId: 55,
    bookName: '2 Timothée',
    chapter: 1,
    verse: 7,
    text: "Car ce n'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d'amour et de sagesse."
  },
  {
    bookId: 6,
    bookName: 'Josué',
    chapter: 1,
    verse: 9,
    text: "Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras."
  },
  {
    bookId: 66,
    bookName: 'Apocalypse',
    chapter: 21,
    verse: 4,
    text: "Il essuiera toute larme de leurs yeux, et la mort ne sera plus, et il n'y aura plus ni deuil, ni cri, ni douleur, car les premières choses ont disparu."
  }
];
