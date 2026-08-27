import { Song, Folder, Setlist } from '../types';

export const SAMPLE_FOLDERS: Folder[] = [
  {
    id: 'folder-louange',
    groupId: 'default-group',
    name: 'Louange & Célébration',
    color: '#38bdf8',
    icon: 'Flame'
  },
  {
    id: 'folder-adoration',
    groupId: 'default-group',
    name: 'Adoration & Méditation',
    color: '#818cf8',
    icon: 'Heart'
  },
  {
    id: 'folder-acoustique',
    groupId: 'default-group',
    name: 'Acoustique & Intimiste',
    color: '#34d399',
    icon: 'Music'
  },
  {
    id: 'folder-noel',
    groupId: 'default-group',
    name: 'Spécial Fêtes & Pâques',
    color: '#fbbf24',
    icon: 'Sparkles'
  }
];

export const SAMPLE_SONGS: Song[] = [
  {
    id: 'song-1',
    groupId: 'default-group',
    title: 'Jésus tu es bon (Goodness of God)',
    artist: 'Bethel Music / Jenn Johnson (Adapt. FR)',
    key: 'G',
    tempo: 70,
    timeSignature: '4/4',
    folderId: 'folder-adoration',
    capo: 0,
    tags: ['Adoration', 'Grâce', 'Fidélité'],
    notes: 'Intro douce à la guitare acoustique. Monter en puissance au Pont.',
    contentChordPro: `{title: Jésus tu es bon (Goodness of God)}
{artist: Bethel Music / Jenn Johnson}
{key: G}
{tempo: 70}
{time: 4/4}

{c: Intro}
[G] [Gsus4] [G] [Gsus4]

{c: Couplet 1}
Je t'[G]aime Seigneur, Ta [C]miséricorde ne [G]finit jamais
Tous mes [Em]jours, je suis [C]tenu dans Ta [D]main
Dès le [Em]lever du so[C]leil jusqu'au [G]coucher de la [D/F#]nuit [Em]
Je chan[C]terai la bonté [D]de mon [G]Dieu

{c: Refrain}
Toute ma [C]vie Tu as été [G]fidèle
Toute ma [C]vie Tu as été si [G]si [D]bon
Avec chaque [C]souffle dont je suis [G]rem[D/F#]pli [Em]
Je chan[C]terai la bonté [D]de mon [G]Dieu

{c: Couplet 2}
J'aime [G]Ta voix, Tu m'as [C]conduit à tra[G]vers le feu
Dans les nuits [Em]sombres, Tu es [C]si proche de [D]moi
Je Te [Em]connais comme un [C]Père, je Te [G]connais comme un [D/F#]Ami [Em]
Et j'ai [C]vécu dans la bon[D]té de mon [G]Dieu

{c: Pont}
Ta bon[G/B]té me poursuit, [C]elle me poursuit tou[D]jours [G]
Ta bon[G/B]té me poursuit, [C]elle me poursuit tou[D]jours [G]
Ma vie [G/B]abandonnée, Te [C]rendre tout ce que j'ai [D] [Em]
Ta bon[G/B]té me poursuit, [C]elle me poursuit tou[D]jours [G]

{c: Refrain}
Toute ma [C]vie Tu as été [G]fidèle
Toute ma [C]vie Tu as été si [G]si [D]bon
Avec chaque [C]souffle dont je suis [G]rem[D/F#]pli [Em]
Je chan[C]terai la bonté [D]de mon [G]Dieu`
  },
  {
    id: 'song-2',
    groupId: 'default-group',
    title: 'Comment ne pas te louer',
    artist: 'Aurélien Saniko',
    key: 'C',
    tempo: 118,
    timeSignature: '4/4',
    folderId: 'folder-louange',
    capo: 0,
    tags: ['Louange', 'Rythmé', 'Joie'],
    notes: 'Tempo dynamique avec clap des mains. Entrée énergique de la basse.',
    contentChordPro: `{title: Comment ne pas te louer}
{artist: Aurélien Saniko}
{key: C}
{tempo: 118}
{time: 4/4}

{c: Refrain}
Comment ne [C]pas te louer, [G]Seigneur Jésus !
Comment ne [Am]pas te louer, [Em]Seigneur Jésus !
Comment ne [F]pas te louer, [C]Seigneur Jésus !
Comment ne [Dm]pas te louer, [G]Seigneur Jé[C]sus !

{c: Couplet 1}
Quand je re[C]garde autour de moi
Je [G]vois ta gloire, Seigneur Jésus
Je [Am]te bénis
Quand je re[F]garde autour de moi
Je [C]vois mes frères, Seigneur Jésus
Je [G]te bénis

{c: Couplet 2}
Quand je re[C]garde au fond de moi
Je [G]vois ta paix, Seigneur Jésus
Je [Am]te bénis
Quand je re[F]garde la croix de bois
Je [C]vois ton pardon, Seigneur Jésus
Merci [G]pour ta grâce infinie !

{c: Refrain}
Comment ne [C]pas te louer, [G]Seigneur Jésus !
Comment ne [Am]pas te louer, [Em]Seigneur Jésus !
Comment ne [F]pas te louer, [C]Seigneur Jésus !
Comment ne [Dm]pas te louer, [G]Seigneur Jé[C]sus !`
  },
  {
    id: 'song-3',
    groupId: 'default-group',
    title: 'Grâce Infinie (Amazing Grace)',
    artist: 'John Newton / Chris Tomlin',
    key: 'E',
    tempo: 75,
    timeSignature: '3/4',
    folderId: 'folder-acoustique',
    capo: 2,
    tags: ['Classique', 'Hymne', 'Grâce'],
    notes: 'Capo 2 (jouer en D pour sonner en E). Valse 3/4.',
    contentChordPro: `{title: Grâce Infinie (Amazing Grace)}
{artist: John Newton / Chris Tomlin}
{key: E}
{tempo: 75}
{time: 3/4}
{capo: 2}

{c: Couplet 1}
Grâce in[E]finie du [A]Seigneur [E]Dieu
Qui un [E]jour m'a sau[B7]vé
J'étais [E]perdu mais [A]je suis [E]retrouvé
Aveu[E]gle, et [B7]je peux [E]voir

{c: Couplet 2}
La [E]grâce a mis la [A]crainte en mon [E]cœur
Et mes [E]peurs ont dispa[B7]ru
Combien [E]précieuse me [A]fut cette [E]grâce
À l'heure [E]où j'ai [B7]cru en [E]Lui

{c: Refrain}
Mes chaînes sont [A]brisées, je suis li[E]béré
Mon Dieu, mon [A]Sauveur m'a ra[E]cheté [B/D#]
Et comme un [C#m]fleuve, Sa [A]miséricorde coule [E]
Amour in[F#m]fini, [B7]grâce immor[E]telle

{c: Couplet 3}
Quand [E]nous serons là-[A]haut dix mille [E]ans
Brillants [E]comme le so[B7]leil
Nous au[E]rons autant de [A]jours pour chan[E]ter
Sa lou[E]ange pour [B7]l'éter[E]nité`
  },
  {
    id: 'song-4',
    groupId: 'default-group',
    title: '10 000 Raisons (Mon âme bénis le Seigneur)',
    artist: 'Matt Redman / Jonas Myrin',
    key: 'G',
    tempo: 73,
    timeSignature: '4/4',
    folderId: 'folder-louange',
    capo: 0,
    tags: ['Louange', 'Culte', 'Psaumes'],
    notes: 'Commencer directement par le refrain doux au piano.',
    contentChordPro: `{title: 10 000 Raisons (Mon âme bénis le Seigneur)}
{artist: Matt Redman}
{key: G}
{tempo: 73}
{time: 4/4}

{c: Refrain}
Bénis le [C]Seigneur, ô mon [G]âme
Ô [D/F#]mon [Em]âme
Chante [C]Son saint [G]Nom [Dsus4] [D]
Chante comme [C]jamais, [Em]ô mon [C]â[D]me [Em]
Je [C]bénis Ton [D]saint Nom [G]

{c: Couplet 1}
Le so[C]leil se lève, un [G]jour nouveau com[D]mence [Em]
Il est [C]temps de Te chan[G]ter à nou[D]veau [Em]
Quoi qu'il [C]arrive et quel [G]que soit le com[D]bat [Em]
Que je [C]chante encore [G]à la fin du [Dsus4]jour [D]

{c: Couplet 2}
Riche en a[C]mour et [G]lent à la co[D]lère [Em]
Ton nom est [C]grand et Ton [G]cœur est si [D]bon [Em]
Pour tous [C]Tes bienfaits, je [G]chanterai sans [D]cesse [Em]
J'ai dix [C]mille raisons [G]de Te lou[Dsus4]er [D]

{c: Couplet 3}
Et quand un [C]jour mes forces [G]m'abandonne[D]ront [Em]
Quand vien[C]dra le soir et [G]que sonnera l'[D]heure [Em]
Mon âme [C]chantera Ta [G]louange sans [D]fin [Em]
Pendant dix [C]mille ans et [G]pour l'éter[Dsus4]nité [D]`
  },
  {
    id: 'song-5',
    groupId: 'default-group',
    title: 'Révélation Song',
    artist: 'Jennie Lee Riddle / Kari Jobe',
    key: 'D',
    tempo: 62,
    timeSignature: '4/4',
    folderId: 'folder-adoration',
    capo: 0,
    tags: ['Adoration', 'Trône', 'Majesté'],
    notes: 'Progression continue: D - Am7 - C - G tout le long du chant.',
    contentChordPro: `{title: Révélation Song}
{artist: Jennie Lee Riddle / Kari Jobe}
{key: D}
{tempo: 62}
{time: 4/4}

{c: Intro}
[D] [Am7] [C] [G]

{c: Couplet 1}
Digne est l'A[D]gneau qui fut immo[Am7]lé
Saint, saint est le [C]Seigneur Dieu tout-puis[G]sant
Qui était, [D]qui est et qui [Am7]vient
Avec la cré[C]ation, j'élève [G]ma voix
Au Roi des [D]rois, Tu es tout [Am7]pour moi
Et je T'a[C]dore, Seigneur [G]

{c: Refrain}
[D]Saint, saint, saint est le [Am7]Seigneur Tout-Puissant
[C]Digne est l'Agneau de rece[G]voir la louange
Chan[D]tons un cantique nouveau [Am7]à Celui qui siège
[C]Sur le trône du ciel [G]

{c: Couplet 2}
Revê[D]tu de mille cou[Am7]leurs
L'éclair resplen[C]dit, le tonnerre é[G]clate
Louange et hon[D]neur, puissance et gloire [Am7]à Toi
Seul Roi de [C]sagesse, d'amour et de [G]paix`
  },
  {
    id: 'song-6',
    groupId: 'default-group',
    title: 'Ce nom si merveilleux (What a Beautiful Name)',
    artist: 'Hillsong Worship',
    key: 'D',
    tempo: 68,
    timeSignature: '4/4',
    folderId: 'folder-adoration',
    capo: 0,
    tags: ['Nom de Jésus', 'Puissance', 'Adoration'],
    notes: 'Monter au Pont avec la batterie complète.',
    contentChordPro: `{title: Ce nom si merveilleux (What a Beautiful Name)}
{artist: Hillsong Worship}
{key: D}
{tempo: 68}
{time: 4/4}

{c: Couplet 1}
Tu étais [D]la Parole au commencement
Le Très-[G]Haut avec le [Bm]Dieu Cre[A]ateur
Ta gloire cach[Bm]ée dans le mys[A/C#]tère du [D]monde
Révél[G]ée en Christ, no[Bm]tre Sau[A]veur

{c: Refrain 1}
Ce nom est si [D]merveilleux, ce nom est si [A]merveilleux
Le nom de [Bm]Jésus-[A]Christ mon [G]Roi
Ce nom est si [D/F#]merveilleux, sa beauté est sans [A]pareille
Ce nom est si [Bm]merveilleux, le [A]nom de Jé[G]sus

{c: Couplet 2}
Tu n'as pas [D]voulu le ciel sans nous
Alors [G]Tu es venu [Bm]jusqu'à [A]nous
Mon péché était [Bm]grand, Ton a[A/C#]mour plus grand [D]encore
Rien ne pour[G]ra nous sépa[Bm]rer de [A]Toi

{c: Pont}
La mort est vain[G]cue, le voile est déchi[A]ré
Le tombeau est [Bm]vide, Tu es ressusci[F#m]té
À Toi la [G]gloire, à Toi la vic[A]toire
Ton Nom surpasse [Bm]tout autre [A]nom`
  }
];

export const SAMPLE_SETLISTS: Setlist[] = [
  {
    id: 'setlist-dimanche',
    groupId: 'default-group',
    name: 'Culte Dimanche Matin',
    date: '2026-08-30',
    songIds: ['song-2', 'song-4', 'song-1', 'song-6'],
    notes: 'Transition en douceur entre 10 000 Raisons et Goodness of God (garder la tonalité de G). Prière finale sur What a Beautiful Name.',
    targetDuration: 25
  },
  {
    id: 'setlist-acoustique',
    groupId: 'default-group',
    name: 'Soirée Acoustique & Témoignages',
    date: '2026-09-05',
    songIds: ['song-3', 'song-5', 'song-1'],
    notes: 'Ambiance intimiste, guitare acoustique + violoncelle.',
    targetDuration: 18
  }
];
