import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BiblePassageData, BibleVerseItem } from '../types';
import {
  BIBLE_BOOKS,
  BibleBookInfo,
  parseScriptureReference,
  findBookByAliasOrName,
  normalizeSearchString
} from '../data/bibleBooksData';
import {
  BIBLE_TRANSLATIONS,
  DEFAULT_TRANSLATION,
  getChapterVerses,
  getPassageData,
  searchBibleKeywords
} from '../services/bibleService';
import {
  BookOpen,
  Search,
  Zap,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  Square,
  ListPlus,
  Bookmark,
  Book,
  ArrowRight,
  ChevronDown,
  Globe,
  Columns,
  ArrowLeftRight
} from 'lucide-react';

interface BibleProjectionModuleProps {
  onProjectLive: (passage: BiblePassageData, secondaryPassage?: BiblePassageData | null, format?: 'stacked' | 'columns') => void;
  onAddToQueue: (passage: BiblePassageData, secondaryPassage?: BiblePassageData | null, format?: 'stacked' | 'columns') => void;
  activeLiveBibleRef?: string | null;
  onStopLive?: () => void;
  onNextLiveVerse?: () => void;
  onPrevLiveVerse?: () => void;
}

const BOOK_CATEGORY_COLORS: Record<string, string> = {
  Pentateuque: '#EF4444', // Rouge (Genèse à Deutéronome)
  Historique: '#F97316',  // Orange (Josué à Esther)
  Poétique: '#F59E0B',    // Ambre (Job à Cantique des Cantiques)
  Prophètes: '#10B981',   // Émeraude (Ésaïe à Malachie)
  Évangiles: '#0EA5E9',   // Bleu ciel (Matthieu à Jean)
  Actes: '#06B6D4',       // Cyan (Actes)
  Épîtres: '#8B5CF6',     // Violet (Romains à Jude)
  Apocalypse: '#EC4899',  // Rose (Apocalypse)
};

const THEMATIC_PASSAGES = [
  { label: 'Le Salut', ref: 'Jean 3:16' },
  { label: 'La Grâce', ref: 'Éphésiens 2:8-9' },
  { label: 'Toutes choses concourent', ref: 'Romains 8:28' },
  { label: 'Le Berger', ref: 'Psaumes 23:1-4' },
  { label: 'L\'Abri du Très-Haut', ref: 'Psaumes 91:1-2' },
  { label: 'Je puis tout', ref: 'Philippiens 4:13' },
  { label: 'Les aigles', ref: 'Ésaïe 40:31' },
  { label: 'La Foi', ref: 'Hébreux 11:1' },
  { label: 'L\'Amour', ref: '1 Corinthiens 13:4-8' },
  { label: 'Paix & Prière', ref: 'Philippiens 4:6-7' },
  { label: 'Nouvelle créature', ref: '2 Corinthiens 5:17' },
  { label: 'Confession', ref: 'Romains 10:9' }
];

export const LanguageFlagIcon: React.FC<{ language: string; className?: string }> = ({
  language,
  className = 'w-4 h-3'
}) => {
  if (language === 'Français' || language === 'FR') {
    return (
      <svg
        className={`${className} inline-block shrink-0 rounded-xs shadow-xs overflow-hidden border border-white/15`}
        viewBox="0 0 3 2"
        role="img"
        aria-label="Drapeau Français"
      >
        <rect width="1" height="2" fill="#002395" />
        <rect width="1" height="2" x="1" fill="#FFFFFF" />
        <rect width="1" height="2" x="2" fill="#ED2939" />
      </svg>
    );
  }

  if (language === 'English' || language === 'EN') {
    return (
      <svg
        className={`${className} inline-block shrink-0 rounded-xs shadow-xs overflow-hidden border border-white/15`}
        viewBox="0 0 60 30"
        role="img"
        aria-label="Drapeau Anglais"
      >
        <clipPath id="uk-flag-clip">
          <rect width="60" height="30" />
        </clipPath>
        <g clipPath="url(#uk-flag-clip)">
          <path d="M0 0 v30 h60 v-30 z" fill="#012169" />
          <path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" strokeWidth="6" />
          <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="2" />
          <path d="M30 0 v30 M0 15 h60" stroke="#fff" strokeWidth="10" />
          <path d="M30 0 v30 M0 15 h60" stroke="#C8102E" strokeWidth="6" />
        </g>
      </svg>
    );
  }

  if (language === 'Español' || language === 'ES') {
    return (
      <svg
        className={`${className} inline-block shrink-0 rounded-xs shadow-xs overflow-hidden border border-white/15`}
        viewBox="0 0 3 2"
        role="img"
        aria-label="Drapeau Espagnol"
      >
        <rect width="3" height="0.5" y="0" fill="#AA151B" />
        <rect width="3" height="1" y="0.5" fill="#F1BF00" />
        <rect width="3" height="0.5" y="1.5" fill="#AA151B" />
      </svg>
    );
  }

  return null;
};

export const BibleProjectionModule: React.FC<BibleProjectionModuleProps> = ({
  onProjectLive,
  onAddToQueue,
  activeLiveBibleRef,
  onStopLive,
  onNextLiveVerse,
  onPrevLiveVerse
}) => {
  // Traduction courante (LSG par défaut)
  const [selectedTranslation, setSelectedTranslation] = useState<string>(() => {
    try {
      return localStorage.getItem('bible_selected_translation') || DEFAULT_TRANSLATION;
    } catch {
      return DEFAULT_TRANSLATION;
    }
  });

  const handleSelectTranslation = (tr: string) => {
    setSelectedTranslation(tr);
    try {
      localStorage.setItem('bible_selected_translation', tr);
    } catch {}
  };

  // Liste déroulante des versions de la Bible
  const [isTranslationDropdownOpen, setIsTranslationDropdownOpen] = useState(false);
  const [translationSearchQuery, setTranslationSearchQuery] = useState('');
  const translationDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (translationDropdownRef.current && !translationDropdownRef.current.contains(e.target as Node)) {
        setIsTranslationDropdownOpen(false);
      }
    };
    if (isTranslationDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      setTranslationSearchQuery('');
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isTranslationDropdownOpen]);

  const currentTranslation = useMemo(() => {
    return BIBLE_TRANSLATIONS.find(t => t.id === selectedTranslation) || BIBLE_TRANSLATIONS[0];
  }, [selectedTranslation]);

  // Filtrage des versions de la Bible selon la requête de recherche
  const filteredTranslations = useMemo(() => {
    const q = translationSearchQuery.trim().toLowerCase();
    if (!q) return BIBLE_TRANSLATIONS;
    return BIBLE_TRANSLATIONS.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.language.toLowerCase().includes(q) ||
      (t.year && t.year.includes(q))
    );
  }, [translationSearchQuery]);

  // Mode Bilingue pour le Module Bible
  const [isBilingual, setIsBilingual] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bible_bilingual_enabled') === 'true';
    } catch {
      return false;
    }
  });

  const [secondaryTranslation, setSecondaryTranslation] = useState<string>(() => {
    try {
      return localStorage.getItem('bible_secondary_translation') || 'kjv';
    } catch {
      return 'kjv';
    }
  });

  const [bilingualFormat, setBilingualFormat] = useState<'stacked' | 'columns'>(() => {
    try {
      return (localStorage.getItem('bible_bilingual_format') as 'stacked' | 'columns') || 'stacked';
    } catch {
      return 'stacked';
    }
  });

  const handleToggleBilingual = () => {
    setIsBilingual(prev => {
      const next = !prev;
      try {
        localStorage.setItem('bible_bilingual_enabled', String(next));
      } catch {}
      return next;
    });
  };

  const handleSelectSecondaryTranslation = (tr: string) => {
    setSecondaryTranslation(tr);
    try {
      localStorage.setItem('bible_secondary_translation', tr);
    } catch {}
  };


  const handleSwapTranslations = () => {
    const temp = selectedTranslation;
    setSelectedTranslation(secondaryTranslation);
    setSecondaryTranslation(temp);
    try {
      localStorage.setItem('bible_selected_translation', secondaryTranslation);
      localStorage.setItem('bible_secondary_translation', temp);
    } catch {}
  };

  // Liste déroulante de la 2ème version (secondaire)
  const [isSecondaryDropdownOpen, setIsSecondaryDropdownOpen] = useState(false);
  const [secondarySearchQuery, setSecondarySearchQuery] = useState('');
  const secondaryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (secondaryDropdownRef.current && !secondaryDropdownRef.current.contains(e.target as Node)) {
        setIsSecondaryDropdownOpen(false);
      }
    };
    if (isSecondaryDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      setSecondarySearchQuery('');
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isSecondaryDropdownOpen]);

  const currentSecondaryTranslation = useMemo(() => {
    return BIBLE_TRANSLATIONS.find(t => t.id === secondaryTranslation) || BIBLE_TRANSLATIONS[1] || BIBLE_TRANSLATIONS[0];
  }, [secondaryTranslation]);

  const filteredSecondaryTranslations = useMemo(() => {
    const q = secondarySearchQuery.trim().toLowerCase();
    if (!q) return BIBLE_TRANSLATIONS;
    return BIBLE_TRANSLATIONS.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.language.toLowerCase().includes(q) ||
      (t.year && t.year.includes(q))
    );
  }, [secondarySearchQuery]);

  // Barre de saisie rapide / commande
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [keywordResults, setKeywordResults] = useState<{
    book: BibleBookInfo;
    chapter: number;
    verse: number;
    text: string;
    referenceText: string;
  }[]>([]);
  const [isSearchingKeywords, setIsSearchingKeywords] = useState(false);

  // Livre, chapitre et versets sélectionnés dans le navigateur visuel
  const [selectedBook, setSelectedBook] = useState<BibleBookInfo>(() => BIBLE_BOOKS.find(b => b.id === 43) || BIBLE_BOOKS[0]); // Jean par défaut
  const [selectedChapter, setSelectedChapter] = useState<number>(3);
  const [selectedVerseStart, setSelectedVerseStart] = useState<number | null>(null);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState<number | null>(null);

  // Référence pour auto-scroll sur le livre sélectionné
  const selectedBookItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedBookItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedBook.id]);

  // Barre de recherche rapide de livres
  const [bookSearchQuery, setBookSearchQuery] = useState('');

  const filteredBooks = useMemo(() => {
    const q = normalizeSearchString(bookSearchQuery).replace(/\s+/g, '');
    if (!q) return BIBLE_BOOKS;
    return BIBLE_BOOKS.filter(b => {
      const nameNorm = normalizeSearchString(b.name).replace(/\s+/g, '');
      if (nameNorm.includes(q)) return true;
      if (b.aliases.some(a => normalizeSearchString(a).replace(/\s+/g, '').includes(q))) return true;
      if (normalizeSearchString(b.category).includes(q)) return true;
      return false;
    });
  }, [bookSearchQuery]);

  // Versets du chapitre actuellement chargé
  const [chapterVerses, setChapterVerses] = useState<BibleVerseItem[]>([]);
  const [isLoadingChapter, setIsLoadingChapter] = useState<boolean>(false);

  // Versets de la version secondaire pour le mode bilingue
  const [secondaryChapterVerses, setSecondaryChapterVerses] = useState<BibleVerseItem[]>([]);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState<boolean>(false);

  // Historique des versets projetés pendant la séance de culte
  const [recentSermonVerses, setRecentSermonVerses] = useState<BiblePassageData[]>(() => {
    try {
      const saved = localStorage.getItem('bible_sermon_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Mode auto : projection automatique dès qu'un verset est cliqué
  const [autoProject, setAutoProject] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bible_auto_project_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleAutoProject = () => {
    setAutoProject(prev => {
      const next = !prev;
      try {
        localStorage.setItem('bible_auto_project_mode', String(next));
      } catch {}
      return next;
    });
  };

  const addToRecentHistory = useCallback((passage: BiblePassageData) => {
    setRecentSermonVerses(prev => {
      const filtered = prev.filter(p => p.referenceText !== passage.referenceText || p.version !== passage.version);
      const next = [passage, ...filtered].slice(0, 12);
      try {
        localStorage.setItem('bible_sermon_history', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Détection en direct de la référence tapée dans l'input
  const detectedRef = useMemo(() => {
    return parseScriptureReference(quickSearchInput);
  }, [quickSearchInput]);

  // Synchronisation automatique de la recherche ultra rapide avec le sélecteur (livre, chapitre, verset)
  useEffect(() => {
    if (detectedRef) {
      setSelectedBook(detectedRef.book);
      setSelectedChapter(detectedRef.chapter);
      const vStart = detectedRef.verseStart || null;
      const vEnd = detectedRef.verseEnd || vStart;
      setSelectedVerseStart(vStart);
      setSelectedVerseEnd(vEnd);
      return;
    }

    const trimmed = quickSearchInput.trim();
    if (trimmed.length >= 2) {
      const matchedBook = findBookByAliasOrName(trimmed);
      if (matchedBook) {
        setSelectedBook(matchedBook);
        setSelectedChapter(1);
        setSelectedVerseStart(null);
        setSelectedVerseEnd(null);
        onStopLive?.();
      }
    }
  }, [detectedRef, quickSearchInput, onStopLive]);

  // Chargement asynchrone des versets du chapitre dès que book, chapter ou translation changent
  useEffect(() => {
    let isMounted = true;
    setIsLoadingChapter(true);
    getChapterVerses(selectedBook.id, selectedChapter, selectedTranslation)
      .then(verses => {
        if (isMounted) {
          setChapterVerses(verses);
          setIsLoadingChapter(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingChapter(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedBook.id, selectedChapter, selectedTranslation]);

  // Chargement asynchrone des versets de la version secondaire quand le mode bilingue est actif
  useEffect(() => {
    if (!isBilingual) return;
    let isMounted = true;
    setIsLoadingSecondary(true);
    getChapterVerses(selectedBook.id, selectedChapter, secondaryTranslation)
      .then(verses => {
        if (isMounted) {
          setSecondaryChapterVerses(verses);
          setIsLoadingSecondary(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingSecondary(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isBilingual, selectedBook.id, selectedChapter, secondaryTranslation]);

  // Si l'utilisateur tape une recherche par mot-clé (sans référence book/chapter valide)
  useEffect(() => {
    const q = quickSearchInput.trim();
    if (detectedRef || q.length < 3) {
      setKeywordResults([]);
      setIsSearchingKeywords(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingKeywords(true);
      try {
        const results = await searchBibleKeywords(q, selectedTranslation);
        setKeywordResults(results);
      } catch {
        setKeywordResults([]);
      } finally {
        setIsSearchingKeywords(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [quickSearchInput, detectedRef, selectedTranslation]);

  // Sélection d'un livre : réinitialise le verset et éteint la projection pour afficher un écran noir
  const handleSelectBook = (book: BibleBookInfo) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    onStopLive?.();
  };

  // Sélection d'un chapitre : réinitialise le verset et éteint la projection pour afficher un écran noir
  const handleSelectChapter = (ch: number) => {
    setSelectedChapter(ch);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    onStopLive?.();
  };

  // Sélection d'un verset : projette automatiquement si le mode auto / projection est activé
  const handleSelectVerse = useCallback((verseNum: number, isShiftKey: boolean = false) => {
    let vStart = verseNum;
    let vEnd = verseNum;
    if (isShiftKey && selectedVerseStart !== null) {
      // Sélection de plage avec Shift
      if (verseNum >= selectedVerseStart) {
        vStart = selectedVerseStart;
        vEnd = verseNum;
      } else {
        vStart = verseNum;
        vEnd = selectedVerseStart;
      }
    }
    setSelectedVerseStart(vStart);
    setSelectedVerseEnd(vEnd);

    // Si le mode auto est activé, projeter directement le verset cliqué
    if (autoProject) {
      const versesSlice = chapterVerses.filter(
        v => v.verseNumber >= vStart && v.verseNumber <= vEnd
      );
      const transObj = BIBLE_TRANSLATIONS.find(t => t.id === selectedTranslation) || BIBLE_TRANSLATIONS[0];
      let refText = `${selectedBook.name} ${selectedChapter}:${vStart}`;
      if (vEnd > vStart) {
        refText = `${selectedBook.name} ${selectedChapter}:${vStart}-${vEnd}`;
      }

      const passage: BiblePassageData = {
        bookId: selectedBook.id,
        bookName: selectedBook.name,
        chapter: selectedChapter,
        verseStart: vStart,
        verseEnd: vEnd,
        version: transObj.shortName,
        referenceText: refText,
        text: versesSlice.map(v => `${v.verseNumber}. ${v.text}`).join('\n\n'),
        verses: versesSlice.length > 0 ? versesSlice : [{ verseNumber: vStart, text: 'Chargement...' }]
      };

      let secPassage: BiblePassageData | undefined = undefined;
      if (isBilingual) {
        const secSlice = secondaryChapterVerses.filter(
          v => v.verseNumber >= vStart && v.verseNumber <= vEnd
        );
        const secTransObj = BIBLE_TRANSLATIONS.find(t => t.id === secondaryTranslation) || BIBLE_TRANSLATIONS[1] || BIBLE_TRANSLATIONS[0];
        secPassage = {
          bookId: selectedBook.id,
          bookName: selectedBook.name,
          chapter: selectedChapter,
          verseStart: vStart,
          verseEnd: vEnd,
          version: secTransObj.shortName,
          referenceText: refText,
          text: secSlice.map(v => `${v.verseNumber}. ${v.text}`).join('\n\n'),
          verses: secSlice.length > 0 ? secSlice : [{ verseNumber: vStart, text: 'Chargement...' }]
        };
      }

      addToRecentHistory(passage);
      onProjectLive(passage, isBilingual ? secPassage : null, bilingualFormat);
    }
  }, [selectedVerseStart, autoProject, chapterVerses, secondaryChapterVerses, selectedTranslation, secondaryTranslation, isBilingual, bilingualFormat, selectedBook, selectedChapter, addToRecentHistory, onProjectLive]);

  // Navigation au verset suivant (raccourcis clavier Flèche Droite / Bas / Espace)
  const handleNextVerse = useCallback(async () => {
    if (selectedVerseStart === null) {
      const firstNum = chapterVerses.length > 0 ? chapterVerses[0].verseNumber : 1;
      handleSelectVerse(firstNum);
      return;
    }

    const currentV = selectedVerseEnd || selectedVerseStart;
    const maxInChapter = chapterVerses.length > 0
      ? chapterVerses[chapterVerses.length - 1].verseNumber
      : chapterVerses.length;

    if (currentV < maxInChapter) {
      handleSelectVerse(currentV + 1);
    } else if (selectedChapter < selectedBook.chapters) {
      // Passer au chapitre suivant, verset 1
      const nextCh = selectedChapter + 1;
      setSelectedChapter(nextCh);
      setSelectedVerseStart(1);
      setSelectedVerseEnd(1);

      try {
        const nextVerses = await getChapterVerses(selectedBook.id, nextCh, selectedTranslation);
        setChapterVerses(nextVerses);
        if (autoProject) {
          const transObj = BIBLE_TRANSLATIONS.find(t => t.id === selectedTranslation) || BIBLE_TRANSLATIONS[0];
          const v1 = nextVerses.find(v => v.verseNumber === 1);
          const passage: BiblePassageData = {
            bookId: selectedBook.id,
            bookName: selectedBook.name,
            chapter: nextCh,
            verseStart: 1,
            verseEnd: 1,
            version: transObj.shortName,
            referenceText: `${selectedBook.name} ${nextCh}:1`,
            text: v1 ? `1. ${v1.text}` : '',
            verses: v1 ? [v1] : [{ verseNumber: 1, text: 'Chargement...' }]
          };

          let secPassage: BiblePassageData | undefined = undefined;
          if (isBilingual) {
            try {
              const secNextVerses = await getChapterVerses(selectedBook.id, nextCh, secondaryTranslation);
              setSecondaryChapterVerses(secNextVerses);
              const secTransObj = BIBLE_TRANSLATIONS.find(t => t.id === secondaryTranslation) || BIBLE_TRANSLATIONS[1];
              const secV1 = secNextVerses.find(v => v.verseNumber === 1);
              secPassage = {
                bookId: selectedBook.id,
                bookName: selectedBook.name,
                chapter: nextCh,
                verseStart: 1,
                verseEnd: 1,
                version: secTransObj.shortName,
                referenceText: `${selectedBook.name} ${nextCh}:1`,
                text: secV1 ? `1. ${secV1.text}` : '',
                verses: secV1 ? [secV1] : [{ verseNumber: 1, text: 'Chargement...' }]
              };
            } catch {}
          }

          addToRecentHistory(passage);
          onProjectLive(passage, isBilingual ? secPassage : null, bilingualFormat);
        }
      } catch {}
    }
  }, [selectedVerseStart, selectedVerseEnd, chapterVerses, selectedBook, selectedChapter, selectedTranslation, secondaryTranslation, isBilingual, bilingualFormat, autoProject, handleSelectVerse, addToRecentHistory, onProjectLive]);

  // Navigation au verset précédent (raccourcis clavier Flèche Gauche / Haut / PageUp)
  const handlePrevVerse = useCallback(async () => {
    if (selectedVerseStart === null) {
      const firstNum = chapterVerses.length > 0 ? chapterVerses[0].verseNumber : 1;
      handleSelectVerse(firstNum);
      return;
    }

    if (selectedVerseStart > 1) {
      handleSelectVerse(selectedVerseStart - 1);
    } else if (selectedChapter > 1) {
      // Revenir au chapitre précédent, dernier verset
      const prevCh = selectedChapter - 1;
      setSelectedChapter(prevCh);
      try {
        const prevVerses = await getChapterVerses(selectedBook.id, prevCh, selectedTranslation);
        setChapterVerses(prevVerses);
        const lastVNum = prevVerses.length > 0 ? prevVerses[prevVerses.length - 1].verseNumber : 1;
        setSelectedVerseStart(lastVNum);
        setSelectedVerseEnd(lastVNum);

        if (autoProject) {
          const transObj = BIBLE_TRANSLATIONS.find(t => t.id === selectedTranslation) || BIBLE_TRANSLATIONS[0];
          const lastV = prevVerses.find(v => v.verseNumber === lastVNum);
          const passage: BiblePassageData = {
            bookId: selectedBook.id,
            bookName: selectedBook.name,
            chapter: prevCh,
            verseStart: lastVNum,
            verseEnd: lastVNum,
            version: transObj.shortName,
            referenceText: `${selectedBook.name} ${prevCh}:${lastVNum}`,
            text: lastV ? `${lastVNum}. ${lastV.text}` : '',
            verses: lastV ? [lastV] : [{ verseNumber: lastVNum, text: 'Chargement...' }]
          };

          let secPassage: BiblePassageData | undefined = undefined;
          if (isBilingual) {
            try {
              const secPrevVerses = await getChapterVerses(selectedBook.id, prevCh, secondaryTranslation);
              setSecondaryChapterVerses(secPrevVerses);
              const secTransObj = BIBLE_TRANSLATIONS.find(t => t.id === secondaryTranslation) || BIBLE_TRANSLATIONS[1];
              const secLastV = secPrevVerses.find(v => v.verseNumber === lastVNum);
              secPassage = {
                bookId: selectedBook.id,
                bookName: selectedBook.name,
                chapter: prevCh,
                verseStart: lastVNum,
                verseEnd: lastVNum,
                version: secTransObj.shortName,
                referenceText: `${selectedBook.name} ${prevCh}:${lastVNum}`,
                text: secLastV ? `${lastVNum}. ${secLastV.text}` : '',
                verses: secLastV ? [secLastV] : [{ verseNumber: lastVNum, text: 'Chargement...' }]
              };
            } catch {}
          }

          addToRecentHistory(passage);
          onProjectLive(passage, isBilingual ? secPassage : null, bilingualFormat);
        }
      } catch {}
    }
  }, [selectedVerseStart, chapterVerses, selectedBook, selectedChapter, selectedTranslation, secondaryTranslation, isBilingual, bilingualFormat, autoProject, handleSelectVerse, addToRecentHistory, onProjectLive]);

  // Écoute des raccourcis clavier pour naviguer entre les versets (←, →, ↑, ↓, Espace, PageUp, PageDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
      if (target?.isContentEditable) return;
      if (isTranslationDropdownOpen || isSecondaryDropdownOpen) return;

      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        handleNextVerse();
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        handlePrevVerse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextVerse, handlePrevVerse, isTranslationDropdownOpen, isSecondaryDropdownOpen]);

  // Défilement automatique dans la grille pour garder le verset sélectionné visible
  useEffect(() => {
    if (selectedVerseStart !== null) {
      const el = document.getElementById(`bible-verse-btn-${selectedVerseStart}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedVerseStart]);

  // Récupération de l'objet BiblePassageData pour la sélection courante (ou null si aucun verset sélectionné)
  const currentSelectedPassage = useMemo<BiblePassageData | null>(() => {
    if (selectedVerseStart === null) return null;
    const vEnd = selectedVerseEnd || selectedVerseStart;
    const versesSlice = chapterVerses.filter(
      v => v.verseNumber >= selectedVerseStart && v.verseNumber <= vEnd
    );
    const transObj = BIBLE_TRANSLATIONS.find(t => t.id === selectedTranslation) || BIBLE_TRANSLATIONS[0];

    let refText = `${selectedBook.name} ${selectedChapter}:${selectedVerseStart}`;
    if (vEnd > selectedVerseStart) {
      refText = `${selectedBook.name} ${selectedChapter}:${selectedVerseStart}-${vEnd}`;
    }

    return {
      bookId: selectedBook.id,
      bookName: selectedBook.name,
      chapter: selectedChapter,
      verseStart: selectedVerseStart,
      verseEnd: vEnd,
      version: transObj.shortName,
      referenceText: refText,
      text: versesSlice.map(v => `${v.verseNumber}. ${v.text}`).join('\n\n'),
      verses: versesSlice.length > 0 ? versesSlice : [{ verseNumber: selectedVerseStart, text: 'Chargement...' }]
    };
  }, [selectedBook, selectedChapter, selectedVerseStart, selectedVerseEnd, selectedTranslation, chapterVerses]);

  // Récupération de l'objet BiblePassageData pour la version secondaire (mode bilingue)
  const currentSecondaryPassage = useMemo<BiblePassageData | null>(() => {
    if (!isBilingual || selectedVerseStart === null) return null;
    const vEnd = selectedVerseEnd || selectedVerseStart;
    const versesSlice = secondaryChapterVerses.filter(
      v => v.verseNumber >= selectedVerseStart && v.verseNumber <= vEnd
    );
    const transObj = BIBLE_TRANSLATIONS.find(t => t.id === secondaryTranslation) || BIBLE_TRANSLATIONS[1] || BIBLE_TRANSLATIONS[0];

    let refText = `${selectedBook.name} ${selectedChapter}:${selectedVerseStart}`;
    if (vEnd > selectedVerseStart) {
      refText = `${selectedBook.name} ${selectedChapter}:${selectedVerseStart}-${vEnd}`;
    }

    return {
      bookId: selectedBook.id,
      bookName: selectedBook.name,
      chapter: selectedChapter,
      verseStart: selectedVerseStart,
      verseEnd: vEnd,
      version: transObj.shortName,
      referenceText: refText,
      text: versesSlice.map(v => `${v.verseNumber}. ${v.text}`).join('\n\n'),
      verses: versesSlice.length > 0 ? versesSlice : [{ verseNumber: selectedVerseStart, text: 'Chargement...' }]
    };
  }, [isBilingual, selectedBook, selectedChapter, selectedVerseStart, selectedVerseEnd, secondaryTranslation, secondaryChapterVerses]);

  // Vérifier si le passage courant est actuellement en diffusion directe
  const isCurrentlyLive = Boolean(
    activeLiveBibleRef &&
    currentSelectedPassage && (
      activeLiveBibleRef === `${currentSelectedPassage.referenceText} (${currentSelectedPassage.version})` ||
      activeLiveBibleRef.startsWith(currentSelectedPassage.referenceText)
    )
  );

  const handleSelectBilingualFormat = useCallback((fmt: 'stacked' | 'columns') => {
    setBilingualFormat(fmt);
    try {
      localStorage.setItem('bible_bilingual_format', fmt);
    } catch {}
    if ((isCurrentlyLive || activeLiveBibleRef) && currentSelectedPassage) {
      onProjectLive(currentSelectedPassage, isBilingual ? currentSecondaryPassage : null, fmt);
    }
  }, [isCurrentlyLive, activeLiveBibleRef, currentSelectedPassage, isBilingual, currentSecondaryPassage, onProjectLive]);

  // Bouton unique fusionné : active directement le mode auto et projette immédiatement le passage
  const handleToggleProject = useCallback(() => {
    if (isCurrentlyLive || (autoProject && Boolean(activeLiveBibleRef))) {
      // Arrêt de la diffusion et désactivation
      setAutoProject(false);
      try {
        localStorage.setItem('bible_auto_project_mode', 'false');
      } catch {}
      onStopLive?.();
      return;
    }

    // Activer directement le mode auto
    setAutoProject(true);
    try {
      localStorage.setItem('bible_auto_project_mode', 'true');
    } catch {}

    // Si un verset est sélectionné, le projeter immédiatement
    if (currentSelectedPassage) {
      addToRecentHistory(currentSelectedPassage);
      onProjectLive(currentSelectedPassage, isBilingual ? currentSecondaryPassage : null, bilingualFormat);
    }
  }, [isCurrentlyLive, autoProject, activeLiveBibleRef, currentSelectedPassage, isBilingual, currentSecondaryPassage, bilingualFormat, addToRecentHistory, onProjectLive, onStopLive]);

  // Ajouter à la file de projection la sélection courante
  const handleAddToQueueCurrent = useCallback(() => {
    if (!currentSelectedPassage) return;
    addToRecentHistory(currentSelectedPassage);
    onAddToQueue(currentSelectedPassage, isBilingual ? currentSecondaryPassage : null, bilingualFormat);
  }, [currentSelectedPassage, isBilingual, currentSecondaryPassage, bilingualFormat, addToRecentHistory, onAddToQueue]);

  // Valider et projeter la référence tapée dans la recherche rapide
  const handleExecuteQuickRef = useCallback(async (projectLive: boolean = true) => {
    if (!detectedRef) return;
    const { book, chapter, verseStart, verseEnd } = detectedRef;
    setSelectedBook(book);
    setSelectedChapter(chapter);
    if (verseStart) {
      setSelectedVerseStart(verseStart);
      setSelectedVerseEnd(verseEnd || verseStart);
    } else {
      setSelectedVerseStart(1);
      setSelectedVerseEnd(1);
    }

    const passage = await getPassageData(book, chapter, verseStart, verseEnd, selectedTranslation);
    let secPassage: BiblePassageData | undefined = undefined;
    if (isBilingual) {
      secPassage = await getPassageData(book, chapter, verseStart, verseEnd, secondaryTranslation);
    }
    addToRecentHistory(passage);
    if (projectLive) {
      setAutoProject(true);
      try {
        localStorage.setItem('bible_auto_project_mode', 'true');
      } catch {}
      onProjectLive(passage, isBilingual ? secPassage : null, bilingualFormat);
    } else {
      onAddToQueue(passage, isBilingual ? secPassage : null, bilingualFormat);
    }
    setQuickSearchInput('');
  }, [detectedRef, selectedTranslation, secondaryTranslation, isBilingual, bilingualFormat, addToRecentHistory, onProjectLive, onAddToQueue]);

  // Gestion de la touche Entrée dans la barre de commande
  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (detectedRef) {
        handleExecuteQuickRef(true);
      } else if (keywordResults.length > 0) {
        const first = keywordResults[0];
        handleSelectKeywordResult(first, true);
      }
    }
  };

  // Sélection d'un résultat de recherche par mot-clé
  const handleSelectKeywordResult = async (item: {
    book: BibleBookInfo;
    chapter: number;
    verse: number;
  }, projectLive: boolean = false) => {
    setSelectedBook(item.book);
    setSelectedChapter(item.chapter);
    setSelectedVerseStart(item.verse);
    setSelectedVerseEnd(item.verse);
    setKeywordResults([]);

    const passage = await getPassageData(item.book, item.chapter, item.verse, item.verse, selectedTranslation);
    let secPassage: BiblePassageData | undefined = undefined;
    if (isBilingual) {
      secPassage = await getPassageData(item.book, item.chapter, item.verse, item.verse, secondaryTranslation);
    }
    addToRecentHistory(passage);
    if (projectLive) {
      setAutoProject(true);
      try {
        localStorage.setItem('bible_auto_project_mode', 'true');
      } catch {}
      onProjectLive(passage, isBilingual ? secPassage : null, bilingualFormat);
    }
  };

  // Sélection d'un passage thématique prédéfini
  const handleSelectThematicPassage = async (refStr: string, projectLive: boolean = false) => {
    const parsed = parseScriptureReference(refStr);
    if (!parsed) return;
    setSelectedBook(parsed.book);
    setSelectedChapter(parsed.chapter);
    setSelectedVerseStart(parsed.verseStart || 1);
    setSelectedVerseEnd(parsed.verseEnd || parsed.verseStart || 1);

    const passage = await getPassageData(
      parsed.book,
      parsed.chapter,
      parsed.verseStart,
      parsed.verseEnd,
      selectedTranslation
    );
    let secPassage: BiblePassageData | undefined = undefined;
    if (isBilingual) {
      secPassage = await getPassageData(
        parsed.book,
        parsed.chapter,
        parsed.verseStart,
        parsed.verseEnd,
        secondaryTranslation
      );
    }
    addToRecentHistory(passage);
    if (projectLive) {
      setAutoProject(true);
      try {
        localStorage.setItem('bible_auto_project_mode', 'true');
      } catch {}
      onProjectLive(passage, isBilingual ? secPassage : null, bilingualFormat);
    }
  };



  return (
    <div className="bg-[#121216] border border-[#23232C] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 text-gray-200">
      
      {/* 1. Bandeau de contrôle en direct si un verset est projeté */}
      {activeLiveBibleRef && (
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-500/50 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-amber-950/30 animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                Diffusion Biblique en Direct
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white truncate block">
                📖 {activeLiveBibleRef}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-300/80 font-mono bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
              Clavier : ← → / ↑ ↓
            </span>
            <button
              type="button"
              onClick={handlePrevVerse}
              className="p-2 rounded-lg bg-black/40 hover:bg-black/60 text-amber-200 border border-amber-500/30 flex items-center justify-center cursor-pointer transition-colors"
              title="Verset précédent (Flèche Gauche / Flèche Haut)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextVerse}
              className="p-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/50 flex items-center justify-center cursor-pointer transition-colors shadow-md"
              title="Verset suivant (Flèche Droite / Flèche Bas / Espace)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {onStopLive && (
              <button
                type="button"
                onClick={onStopLive}
                className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer flex items-center justify-center"
                title="Arrêter la diffusion biblique et revenir aux chants"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Barre de Commande Rapide & Recherche instantanée */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label htmlFor="bible-quick-search-input" className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Recherche & Projection Ultra-Rapide</span>
          </label>

          <div className="flex items-center gap-2">
            {/* Bouton Mode Bilingue */}
            <button
              type="button"
              onClick={handleToggleBilingual}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isBilingual
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-900/40 ring-2 ring-indigo-500/30'
                  : 'bg-[#181822] hover:bg-[#20202E] border-[#2B2B38] text-gray-300 hover:text-white hover:border-gray-500'
              }`}
              title={isBilingual ? 'Mode Bilingue actif - Cliquer pour désactiver' : 'Activer le mode bilingue (2 versions de la Bible en simultané)'}
            >
              <Columns className="w-3.5 h-3.5 text-cyan-300" />
              <span>Mode Bilingue</span>
              {isBilingual && (
                <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse ml-0.5" />
              )}
            </button>

            {/* Sélecteur de Traduction sous forme de Liste Déroulante */}
            <div className="relative" ref={translationDropdownRef}>
              <button
                type="button"
                id="bible-translation-dropdown-btn"
                onClick={() => setIsTranslationDropdownOpen(prev => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isTranslationDropdownOpen}
                className={`flex items-center gap-2 bg-[#181822] hover:bg-[#20202E] border rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer shadow-xs ${
                  isTranslationDropdownOpen
                    ? 'border-amber-500 ring-2 ring-amber-500/20 text-white bg-[#1F1F2C]'
                    : 'border-[#2B2B38] text-gray-200 hover:border-gray-500'
                }`}
                title="Changer la version de la Bible (Hors-ligne / Domaine Public / API)"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <LanguageFlagIcon language={currentTranslation.language} className="w-4 h-3" />
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                    {currentTranslation.shortName}
                  </span>
                  <span className="hidden sm:inline text-xs font-medium text-gray-300 truncate max-w-[120px]">
                    {currentTranslation.name}
                  </span>
                  {currentTranslation.isOfflineReady ? (
                    <span
                      title="Domaine Public — Version disponible 100% hors-ligne (zéro latence)"
                      className="hidden sm:inline-flex items-center justify-center p-1 rounded-md text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 shrink-0 cursor-help"
                    >
                      <Zap className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span
                      title="Sous Licence — Extension via API en ligne (API.Bible / Bolls)"
                      className="hidden sm:inline-flex items-center justify-center p-1 rounded-md text-blue-400 bg-blue-950/60 border border-blue-500/30 shrink-0 cursor-help"
                    >
                      <Globe className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${isTranslationDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {/* Menu Déroulant */}
              {isTranslationDropdownOpen && (
                <div 
                  role="listbox"
                  className="absolute right-0 top-full mt-1.5 w-72 sm:w-84 bg-[#14141B] border border-[#2D2D3D] rounded-2xl shadow-2xl p-2 z-50 max-h-96 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1.5 border-b border-[#22222E] flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Versions de la Bible (PWA Hybride)
                    </span>
                    <span className="text-[9px] text-amber-400/90 font-mono">
                      {filteredTranslations.length} / {BIBLE_TRANSLATIONS.length}
                    </span>
                  </div>

                  {/* Barre de recherche textuelle au-dessus de la liste */}
                  <div className="p-1 pb-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={translationSearchQuery}
                        onChange={(e) => setTranslationSearchQuery(e.target.value)}
                        placeholder="Filtrer (ex: LSG, KJV, Segond, Español)..."
                        className="w-full bg-[#181822] border border-[#2D2D3D] focus:border-amber-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none transition-all shadow-inner font-sans"
                        autoFocus
                      />
                      {translationSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTranslationSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                          title="Effacer le filtre"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message si aucun résultat */}
                  {filteredTranslations.length === 0 && (
                    <div className="py-6 px-3 text-center text-xs text-gray-400">
                      <p className="font-medium text-gray-300">Aucune version trouvée</p>
                      <p className="text-[11px] text-gray-500 mt-1">pour « {translationSearchQuery} »</p>
                    </div>
                  )}

                  {/* Groupes par langue */}
                  {(['Français', 'English', 'Español'] as const).map(lang => {
                    const translationsInLang = filteredTranslations.filter(t => t.language === lang);
                    if (translationsInLang.length === 0) return null;
                    const langTitle = lang === 'Français' ? 'Français' : lang === 'English' ? 'English (Anglais)' : 'Español (Espagnol)';

                    return (
                      <div key={lang} className="mb-2 last:mb-0">
                        <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 flex items-center gap-2">
                          <LanguageFlagIcon language={lang} className="w-4 h-3" />
                          <span>{langTitle}</span>
                        </div>
                        <div className="space-y-0.5">
                          {translationsInLang.map(tr => {
                            const isSelected = selectedTranslation === tr.id;
                            return (
                              <button
                                key={tr.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  handleSelectTranslation(tr.id);
                                  setIsTranslationDropdownOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-600/20 border border-amber-500/40 text-amber-200 font-semibold'
                                    : 'hover:bg-[#1E1E2A] text-gray-300 hover:text-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                    isSelected
                                      ? 'bg-amber-500 text-black'
                                      : 'bg-[#232330] text-gray-300'
                                  }`}>
                                    {tr.shortName}
                                  </span>
                                  <div className="min-w-0 flex-1 flex items-center gap-1.5">
                                    <span className="truncate text-xs text-gray-100">{tr.name}</span>
                                    {tr.year && <span className="text-[10px] text-gray-500 font-mono shrink-0">({tr.year})</span>}
                                    {tr.isOfflineReady ? (
                                      <span
                                        title="Domaine Public — 100% Hors-ligne / Immédiat"
                                        className="shrink-0 p-0.5 rounded text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 cursor-help flex items-center justify-center"
                                      >
                                        <Zap className="w-2.5 h-2.5" />
                                      </span>
                                    ) : (
                                      <span
                                        title="Sous Licence — Extension via API en ligne"
                                        className="shrink-0 p-0.5 rounded text-blue-400 bg-blue-950/60 border border-blue-500/30 cursor-help flex items-center justify-center"
                                      >
                                        <Globe className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Note informative de l'approche hybride recommandée */}
                  <div className="mt-2 pt-2 border-t border-[#22222E] px-2 py-1.5 bg-black/30 rounded-xl">
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      💡 <span className="text-gray-300 font-semibold">Approche Hybride :</span> Versions Domaine Public (LSG, Darby, Ostervald, KJV, RVR1960, BLA) en cache immédiat hors-ligne. Versions sous licence (NBS, PDV, NVI, NTV) via l'API.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de Configuration du Mode Bilingue */}
        {isBilingual && (
          <div className="bg-[#151522] border border-indigo-500/40 rounded-xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider flex items-center gap-1.5">
                <Columns className="w-3.5 h-3.5 text-cyan-400" />
                <span>2 Versions :</span>
              </span>

              {/* Version Principale */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-amber-500/40 text-xs">
                <LanguageFlagIcon language={currentTranslation.language} className="w-3.5 h-2.5" />
                <span className="font-mono font-bold text-amber-300 text-[11px]">{currentTranslation.shortName}</span>
                <span className="text-gray-300 text-[10px] hidden sm:inline truncate max-w-[90px]">{currentTranslation.name}</span>
              </div>

              {/* Bouton Permuter */}
              <button
                type="button"
                onClick={handleSwapTranslations}
                className="p-1.5 rounded-lg bg-[#202030] hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors cursor-pointer"
                title="Permuter la 1ère et la 2ème version"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* Sélecteur Version 2 (Traduction) */}
              <div className="relative" ref={secondaryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSecondaryDropdownOpen(v => !v)}
                  className={`flex items-center gap-1.5 bg-[#14141E] hover:bg-[#1C1C2A] border rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    isSecondaryDropdownOpen
                      ? 'border-cyan-400 ring-2 ring-cyan-500/20 text-white bg-[#1C1C2A]'
                      : 'border-cyan-500/40 text-cyan-200 hover:border-cyan-400'
                  }`}
                  title="Choisir la version secondaire pour le mode bilingue"
                >
                  <LanguageFlagIcon language={currentSecondaryTranslation.language} className="w-3.5 h-2.5" />
                  <span className="font-mono font-bold text-cyan-300 text-[11px]">
                    {currentSecondaryTranslation.shortName}
                  </span>
                  <span className="hidden sm:inline text-[11px] text-gray-300 truncate max-w-[90px]">
                    {currentSecondaryTranslation.name}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-cyan-400 transition-transform ${isSecondaryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSecondaryDropdownOpen && (
                  <div 
                    role="listbox"
                    className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-72 sm:w-84 bg-[#14141B] border border-cyan-500/40 rounded-2xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-2.5 py-1.5 border-b border-[#22222E] flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                        2ème Version (Traduction)
                      </span>
                      <span className="text-[9px] text-cyan-400/90 font-mono">
                        {filteredSecondaryTranslations.length} / {BIBLE_TRANSLATIONS.length}
                      </span>
                    </div>

                    <div className="p-1 pb-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={secondarySearchQuery}
                          onChange={(e) => setSecondarySearchQuery(e.target.value)}
                          placeholder="Filtrer (ex: KJV, RVR, Segond)..."
                          className="w-full bg-[#181822] border border-[#2D2D3D] focus:border-cyan-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none transition-all font-sans"
                          autoFocus
                        />
                        {secondarySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSecondarySearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {(['English', 'Français', 'Español'] as const).map(lang => {
                      const translationsInLang = filteredSecondaryTranslations.filter(t => t.language === lang);
                      if (translationsInLang.length === 0) return null;
                      const langTitle = lang === 'Français' ? 'Français' : lang === 'English' ? 'English (Anglais)' : 'Español (Espagnol)';

                      return (
                        <div key={lang} className="mb-2 last:mb-0">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 flex items-center gap-2">
                            <LanguageFlagIcon language={lang} className="w-4 h-3" />
                            <span>{langTitle}</span>
                          </div>
                          <div className="space-y-0.5">
                            {translationsInLang.map(tr => {
                              const isSelected = secondaryTranslation === tr.id;
                              return (
                                <button
                                  key={tr.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectSecondaryTranslation(tr.id);
                                    setIsSecondaryDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                    isSelected
                                      ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 font-semibold'
                                      : 'hover:bg-[#1E1E2A] text-gray-300 hover:text-white border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                      isSelected
                                        ? 'bg-cyan-500 text-black'
                                        : 'bg-[#232330] text-gray-300'
                                    }`}>
                                      {tr.shortName}
                                    </span>
                                    <span className="truncate text-xs text-gray-100">{tr.name}</span>
                                    {tr.year && <span className="text-[10px] text-gray-500 font-mono shrink-0">({tr.year})</span>}
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sélecteur de format : Empilé vs 2 Colonnes */}
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-indigo-500/30">
              <button
                type="button"
                onClick={() => handleSelectBilingualFormat('stacked')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  bilingualFormat === 'stacked'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Sous-titres empilés (texte original au centre, traduction en-dessous)"
              >
                <span>Empilé</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectBilingualFormat('columns')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  bilingualFormat === 'columns'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="2 Colonnes côte-à-côte (Version 1 à gauche, Version 2 à droite)"
              >
                <span>2 Colonnes</span>
              </button>
            </div>
          </div>
        )}

        {/* Input principal de recherche ultra-rapide */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="bible-quick-search-input"
            type="text"
            value={quickSearchInput}
            onChange={(e) => setQuickSearchInput(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder="Tapez un passage (ex: Jean 3:16, Rom 8:28, Ps 23:1-4) ou mot-clé..."
            className="w-full bg-[#181822] border border-[#2C2C3C] focus:border-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none transition-all shadow-inner font-sans"
            autoComplete="off"
          />
          {quickSearchInput && (
            <button
              type="button"
              onClick={() => setQuickSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Indicateur de détection en temps réel */}
        {detectedRef && (
          <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 animate-in fade-in duration-150">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Passage détecté : <strong>{detectedRef.book.name} {detectedRef.chapter}:{detectedRef.verseStart || 1}{detectedRef.verseEnd && detectedRef.verseEnd !== detectedRef.verseStart ? `-${detectedRef.verseEnd}` : ''}</strong>
              </span>
            </span>
            <span className="text-[11px] text-amber-300/80">
              Appuyez sur <kbd className="px-1 py-0.5 rounded bg-black/40 border border-amber-500/40 font-mono">Entrée</kbd> pour projeter
            </span>
          </div>
        )}

        {/* Résultats de recherche par mots-clés */}
        {keywordResults.length > 0 && !detectedRef && (
          <div className="bg-[#181822] border border-[#2B2B38] rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 custom-scrollbar shadow-2xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1 block">
              Résultats de recherche ({keywordResults.length}) :
            </span>
            {keywordResults.map((kr, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-[#222230] text-xs cursor-pointer group transition-colors"
                onClick={() => handleSelectKeywordResult(kr, false)}
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-amber-300 block">{kr.referenceText}</span>
                  <p className="text-[11px] text-gray-400 line-clamp-1 group-hover:text-gray-200">{kr.text}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectKeywordResult(kr, true);
                  }}
                  className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] shrink-0 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Projeter</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* 4. Navigateur Visuel : Livres -> Chapitres -> Versets -> Aperçu */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1 border-t border-[#22222C]">
        
        {/* Colonne 1 : Sélecteur de Livres (1 colonne avec ligne code couleurs par catégorie) */}
        <div className="md:col-span-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 px-0.5">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Book className="w-3.5 h-3.5 text-amber-400" />
              <span>Livres ({filteredBooks.length === BIBLE_BOOKS.length ? BIBLE_BOOKS.length : `${filteredBooks.length}/${BIBLE_BOOKS.length}`})</span>
            </span>
            {bookSearchQuery && (
              <span className="text-[10px] text-amber-400 font-mono">
                {filteredBooks.length} résultat{filteredBooks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Barre de recherche rapide de livres */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={bookSearchQuery}
              onChange={(e) => setBookSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredBooks.length > 0) {
                  handleSelectBook(filteredBooks[0]);
                }
              }}
              placeholder="Trouver un livre (ex: Jean, Rom, Ps, Gen)..."
              className="w-full bg-[#161622] border border-[#272738] focus:border-amber-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none transition-all shadow-inner font-sans"
            />
            {bookSearchQuery && (
              <button
                type="button"
                onClick={() => setBookSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                title="Effacer la recherche de livre"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-col max-h-72 overflow-y-auto rounded-xl border border-[#252533] bg-[#14141B] divide-y divide-[#20202C] custom-scrollbar shadow-inner">
            {filteredBooks.length === 0 ? (
              <div className="py-8 px-3 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                <span>Aucun livre trouvé pour « {bookSearchQuery} »</span>
                <button
                  type="button"
                  onClick={() => setBookSearchQuery('')}
                  className="text-amber-400 hover:underline text-[11px] cursor-pointer"
                >
                  Réinitialiser le filtre
                </button>
              </div>
            ) : (
              filteredBooks.map(bk => {
                const isSelected = selectedBook.id === bk.id;
                const lineColor = BOOK_CATEGORY_COLORS[bk.category] || '#F59E0B';
                return (
                  <button
                    key={bk.id}
                    ref={isSelected ? selectedBookItemRef : undefined}
                    type="button"
                    onClick={() => handleSelectBook(bk)}
                    className={`relative flex items-center justify-between w-full pl-3.5 pr-2.5 py-2 text-left text-xs transition-colors cursor-pointer select-none group ${
                      isSelected
                        ? 'bg-[#252538] text-white font-bold shadow-xs'
                        : 'bg-[#151520] hover:bg-[#1E1E2C] text-gray-300 hover:text-white'
                    }`}
                    title={`${bk.name} (${bk.category} - ${bk.chapters} chapitres)`}
                  >
                    {/* Ligne code couleur selon la catégorie */}
                    <span
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ backgroundColor: lineColor }}
                    />
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="truncate">{bk.name}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne 2 : Sélecteur de Chapitre & Versets (4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-2.5">
          {/* Chapitres */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-semibold text-gray-300">{selectedBook.name} : Chapitre</span>
              <span className="font-mono text-amber-300">{selectedChapter} / {selectedBook.chapters}</span>
            </div>

            <div className="grid grid-cols-6 gap-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => {
                const isCurrent = selectedChapter === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => handleSelectChapter(ch)}
                    className={`py-1 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-[#181824] hover:bg-[#202030] text-gray-300 border border-[#262636]'
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Versets */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <span>
                  Versets {selectedVerseStart !== null ? (selectedVerseEnd && selectedVerseEnd > selectedVerseStart ? `(${selectedVerseStart} à ${selectedVerseEnd})` : `(${selectedVerseStart})`) : '(aucun sélectionné)'} :
                </span>
                {autoProject && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1 animate-in fade-in">
                    <Zap className="w-2.5 h-2.5 fill-current" />
                    <span>Auto</span>
                  </span>
                )}
              </span>
              <span className="text-[10px] text-gray-400 italic">
                {autoProject ? 'Clic ou Flèches ← → : projection directe' : 'Clic ou Flèches ← → pour naviguer'}
              </span>
            </div>

            {isLoadingChapter ? (
              <div className="py-4 text-center text-xs text-gray-500 font-mono animate-pulse">
                Chargement des versets...
              </div>
            ) : chapterVerses.length === 0 ? (
              <div className="py-3 text-center text-xs text-gray-500">
                Versets non disponibles
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                {chapterVerses.map(v => {
                  const inRange = selectedVerseStart !== null && v.verseNumber >= selectedVerseStart && v.verseNumber <= (selectedVerseEnd || selectedVerseStart);
                  const isBoundary = selectedVerseStart !== null && (v.verseNumber === selectedVerseStart || v.verseNumber === (selectedVerseEnd || selectedVerseStart));
                  return (
                    <button
                      key={v.verseNumber}
                      id={`bible-verse-btn-${v.verseNumber}`}
                      type="button"
                      onClick={(e) => handleSelectVerse(v.verseNumber, e.shiftKey)}
                      className={`py-1 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                        isBoundary
                          ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                          : inRange
                          ? 'bg-amber-600/40 text-amber-200 border border-amber-500/50'
                          : 'bg-[#181824] hover:bg-[#202030] text-gray-300 border border-[#262636]'
                      }`}
                      title={autoProject ? `Verset ${v.verseNumber} (projette directement)` : `Verset ${v.verseNumber}`}
                    >
                      {v.verseNumber}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne 3 : Aperçu en Direct du Passage & Actions (4 cols) */}
        <div className="md:col-span-4 flex flex-col justify-between gap-3 bg-[#161622] border border-[#2A2A3C] rounded-xl p-3.5 shadow-inner">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#282838] pb-1.5">
              <span className="text-xs font-extrabold text-amber-300 truncate">
                📖 {currentSelectedPassage ? currentSelectedPassage.referenceText : `${selectedBook.name} ${selectedChapter}`}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {currentSelectedPassage && (
                  <button
                    type="button"
                    onClick={handleAddToQueueCurrent}
                    className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    title="Ajouter comme élément individuel dans la file de projection"
                  >
                    <ListPlus className="w-3 h-3 text-emerald-400" />
                    <span>+ File</span>
                  </button>
                )}
                <span className="text-[10px] font-mono text-gray-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                  {isBilingual && currentSecondaryPassage
                    ? `${currentSelectedPassage?.version || currentTranslation.shortName} • ${currentSecondaryPassage.version}`
                    : (currentSelectedPassage?.version || currentTranslation.shortName)}
                </span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar text-xs leading-relaxed text-gray-200 space-y-1.5">
              {currentSelectedPassage ? (
                isBilingual && currentSecondaryPassage ? (
                  bilingualFormat === 'columns' ? (
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold text-amber-300 uppercase block mb-1">
                          {currentTranslation.shortName}
                        </span>
                        {currentSelectedPassage.verses.map(v => (
                          <p key={v.verseNumber} className="text-[11px] leading-snug">
                            <strong className="text-amber-400 font-mono mr-1">{v.verseNumber}.</strong>
                            <span>{v.text}</span>
                          </p>
                        ))}
                      </div>
                      <div className="border-l border-white/15 pl-2 space-y-1">
                        <span className="text-[9px] font-mono font-bold text-cyan-300 uppercase block mb-1">
                          {currentSecondaryTranslation.shortName}
                        </span>
                        {currentSecondaryPassage.verses.map(v => (
                          <p key={v.verseNumber} className="text-[11px] leading-snug text-cyan-200/90 italic">
                            <strong className="text-cyan-400 font-mono mr-1">{v.verseNumber}.</strong>
                            <span>{v.text}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentSelectedPassage.verses.map(v => {
                        const secV = currentSecondaryPassage.verses.find(sv => sv.verseNumber === v.verseNumber);
                        return (
                          <div key={v.verseNumber} className="space-y-0.5">
                            <p className="text-[11px] leading-snug">
                              <strong className="text-amber-400 font-mono mr-1.5">{v.verseNumber}.</strong>
                              <span className="text-white font-medium">{v.text}</span>
                            </p>
                            {secV && (
                              <p className="text-[10.5px] text-cyan-300/90 italic pl-2.5 border-l-2 border-cyan-500/40 leading-snug">
                                {secV.text}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  currentSelectedPassage.verses.map(v => (
                    <p key={v.verseNumber}>
                      <strong className="text-amber-400 font-mono mr-1.5">{v.verseNumber}.</strong>
                      <span>{v.text}</span>
                    </p>
                  ))
                )
              ) : (
                <div className="py-7 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2 select-none">
                  <BookOpen className="w-6 h-6 text-amber-500/30" />
                  <span className="font-semibold text-gray-300">Aucun verset sélectionné</span>
                  <p className="text-[11px] text-gray-500 max-w-[220px]">
                    {autoProject
                      ? 'Cliquez sur un verset ci-contre pour le projeter automatiquement.'
                      : 'Cliquez sur un verset ci-contre pour le sélectionner et le projeter.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#282838] space-y-2">
            <div>
              <button
                type="button"
                onClick={handleToggleProject}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isCurrentlyLive
                    ? 'bg-amber-500 hover:bg-amber-400 text-black ring-2 ring-amber-400/50 shadow-amber-950/40'
                    : autoProject
                    ? 'bg-amber-600 hover:bg-amber-500 text-white ring-1 ring-amber-400/40'
                    : 'bg-amber-600 hover:bg-amber-500 active:scale-95 text-white shadow-amber-950/30'
                }`}
                title={
                  isCurrentlyLive
                    ? 'En direct avec projection automatique active. Cliquez pour arrêter la diffusion.'
                    : autoProject
                    ? currentSelectedPassage
                      ? 'Mode Auto actif : chaque clic sur un verset le projette immédiatement.'
                      : 'Mode Auto actif : sélectionnez un verset ci-contre pour le projeter.'
                    : 'Projeter ce passage et activer la projection automatique'
                }
              >
                <Zap className={`w-4 h-4 fill-current ${isCurrentlyLive ? 'text-black animate-pulse' : 'text-amber-200'}`} />
                <span>
                  {isCurrentlyLive
                    ? (isBilingual ? 'En direct (Bilingue)' : 'En direct (Mode Auto actif)')
                    : autoProject
                    ? currentSelectedPassage
                      ? (isBilingual ? 'Projeter Bilingue (Auto)' : 'Projeter (Mode Auto actif)')
                      : 'Mode Auto actif (Sélectionnez un verset)'
                    : (isBilingual ? 'Projeter Bilingue' : 'Projeter (Mode Auto)')}
                </span>
                {autoProject && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold uppercase ${
                    isCurrentlyLive ? 'bg-black/20 text-black' : 'bg-black/30 text-amber-200'
                  }`}>
                    {isCurrentlyLive ? 'LIVE' : 'AUTO'}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToQueueCurrent}
              disabled={!currentSelectedPassage}
              className="w-full py-2 px-3 rounded-xl bg-[#1B1B26] hover:bg-[#232332] active:scale-98 text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title={
                currentSelectedPassage?.verses && currentSelectedPassage.verses.length > 1
                  ? "Ajouter chaque verset comme un élément individuel repositionnable dans la file de projection"
                  : "Ajouter ce verset comme un élément individuel repositionnable dans la file de projection"
              }
            >
              <ListPlus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {currentSelectedPassage?.verses && currentSelectedPassage.verses.length > 1
                  ? `Ajouter chaque verset (${currentSelectedPassage.verses.length}) individuellement${isBilingual ? ' (Bilingue)' : ''}`
                  : `Ajouter le verset à la file${isBilingual ? ' (Bilingue)' : ''}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
