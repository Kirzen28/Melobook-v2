export interface ExternalSongItem {
  id: string;
  title: string;
  artist: string;
  source: 'Shir.fr' | 'WorshipTogether' | 'Ultimate Guitar' | 'LaCuerda' | 'JEM / Recueils' | 'CCLI Praise';
  key: string;
  tempo: number;
  timeSignature?: string;
  tags: string[];
  snippet: string;
  contentChordPro: string;
  url?: string;
}

export const EXTERNAL_SONGS_DATABASE: ExternalSongItem[] = [
  {
    id: 'ext-shir-1',
    title: 'Que ma vie te glorifie (Prends ma vie)',
    artist: 'Exo / Chris Christensen',
    source: 'Shir.fr',
    key: 'D',
    tempo: 72,
    timeSignature: '4/4',
    tags: ['Adoration', 'Consécration', 'Prière'],
    snippet: 'Que ma vie te glorifie, que ma vie te glorifie, Seigneur...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Que ma vie te glorifie}
{artist: Exo / Chris Christensen}
{key: D}
{tempo: 72}
{time: 4/4}

{c: Couplet 1}
[D]Que ma vie [A/C#]Te glorifie,
[Bm]Que ma vie [F#m/A]Te glorifie,
[G]Que ma [D/F#]vie Te glori[Em7]fie, Sei[A7]gneur !
[D]Que ma vie [A/C#]Te glorifie,
[Bm]Que ma vie [F#m/A]Te glorifie,
[G]Que ma [A7]vie Te glori[D]fie !

{c: Couplet 2}
[D]Prends mon cœur [A/C#]et transforme-le,
[Bm]Prends mon cœur [F#m/A]et transforme-le,
[G]Prends mon [D/F#]cœur et trans[Em7]forme-le, Sei[A7]gneur !
[D]Prends mon cœur [A/C#]et transforme-le,
[Bm]Prends mon cœur [F#m/A]et transforme-le,
[G]Prends mon [A7]cœur et transforme-[D]le !

{c: Couplet 3}
[D]Que Ton Esprit [A/C#]remplisse mon âme,
[Bm]Que Ton Esprit [F#m/A]remplisse mon âme,
[G]Que Ton Es[D/F#]prit remplisse [Em7]mon âme, Sei[A7]gneur !
[D]Que Ton Esprit [A/C#]remplisse mon âme,
[Bm]Que Ton Esprit [F#m/A]remplisse mon âme,
[G]Que Ton Es[A7]prit remplisse [D]mon âme !`
  },
  {
    id: 'ext-shir-2',
    title: 'Ce nom si merveilleux (What a Beautiful Name)',
    artist: 'Hillsong Worship (Traduction FR)',
    source: 'Shir.fr',
    key: 'D',
    tempo: 68,
    timeSignature: '4/4',
    tags: ['Louange', 'Adoration', 'Victoire'],
    snippet: 'De tout temps Tu étais le Verbe, auprès du Père au plus haut lieu...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Ce nom si merveilleux (What a Beautiful Name)}
{artist: Hillsong Worship}
{key: D}
{tempo: 68}
{time: 4/4}

{c: Couplet 1}
[D]De tout temps Tu étais le Verbe
Au[G]près du Père [Bm]au plus haut [A]lieu
La [Bm]gloire cachée [A/C#]de la créa[D]tion
Re[G]vêtue de [Bm]Ton grand a[A]mour

{c: Refrain 1}
Ce nom est si [D]merveilleux, ce nom est si [A]merveilleux
Le nom de [Bm]Jésus-[A]Christ mon [G]Roi
Ce nom est si [D/F#]merveilleux, Sa beauté est sans pa[A]reille
Ce nom est si [Bm]merveil[A]leux, le nom de [G]Jésus

{c: Couplet 2}
[D]Tu n'as pas voulu du paradis
Sans [G]nous alors [Bm]Tu es ve[A]nu
Mon [Bm]péché était [A/C#]grand, Ton a[D]mour plus fort
Rien [G]ne pouvait [Bm]nous sépa[A]rer

{c: Refrain 2}
Ce nom est si [D]glorieux, ce nom est si [A]glorieux
Le nom de [Bm]Jésus-[A]Christ mon [G]Roi
Ce nom est si [D/F#]glorieux, Sa beauté est sans pa[A]reille
Ce nom est si [Bm]glo[A]rieux, le nom de [G]Jésus

{c: Pont}
La mort a failli, [G]le voile s'est déchi[A]ré
Le péché et la tombe [Bm]sont vaincus [F#m]
Le ciel retentit [G]de louanges infinies [A]
Car Tu es ressuscité [Bm]des morts [A]

Tu n'as point d'égal, [G]Tu n'as point de rival [A]
Dès maintenant et à ja[Bm]mais Tu règnes [F#m]
À Toi le royaume, [G]à Toi la puissance [A]
À Toi la gloire à ja[Bm]mais [A]

{c: Refrain 3}
Ce nom est si [D]puissant, ce nom est si [A]puissant
Le nom de [Bm]Jésus-[A]Christ mon [G]Roi
Ce nom est si [D/F#]puissant, rien ne peut Lui ré[A]sister
Ce nom est si [Bm]puis[A]sant, le nom de [G]Jésus`
  },
  {
    id: 'ext-wt-1',
    title: '10,000 Reasons (Bless the Lord)',
    artist: 'Matt Redman / Jonas Myrin',
    source: 'WorshipTogether',
    key: 'G',
    tempo: 73,
    timeSignature: '4/4',
    tags: ['Louange', 'Adoration', 'Grâce'],
    snippet: 'Bless the Lord, O my soul, O my soul, worship His holy name...',
    url: 'https://www.worshiptogether.com',
    contentChordPro: `{title: 10,000 Reasons (Bless the Lord)}
{artist: Matt Redman / Jonas Myrin}
{key: G}
{tempo: 73}
{time: 4/4}

{c: Chorus}
Bless the [C]Lord, O my [G]soul, [D/F#]O my [Em]soul
[C]Worship His [G]holy [Dsus4]name [D]
Sing like [C]never be[Em]fore, [C] [D] [Em]O my soul
I'll [C]worship Your [D]holy [G]name

{c: Verse 1}
The [C]sun comes [G]up, it's a [D]new day [Em]dawning
[C]It's time to [G]sing Your [D]song a[Em]gain
What[C]ever may [G]pass, and what[D]ever lies be[Em]fore me
[C2]Let me be [G]singing when the [Dsus4]eve - [D]ning [G]comes

{c: Verse 2}
You're [C]rich in [G]love, and You're [D]slow to [Em]anger
Your [C]name is [G]great, and Your [D]heart is [Em]kind
For [C]all Your [G]goodness I will [D]keep on [Em]singing
[C2]Ten thousand [G]reasons for my [Dsus4]heart [D]to [G]find

{c: Verse 3}
And [C]on that [G]day when my [D]strength is [Em]failing
The [C]end draws [G]near and my [D]time has [Em]come
[C]Still my [G]soul will sing Your [D]praise un[Em]ending
[C2]Ten thousand [G]years and then for[Dsus4]e - [D]ver[G]more`
  },
  {
    id: 'ext-shir-3',
    title: 'Pour Toi (Je veux vivre pour Toi)',
    artist: 'Dan Luiten',
    source: 'Shir.fr',
    key: 'A',
    tempo: 125,
    timeSignature: '4/4',
    tags: ['Louange', 'Célébration', 'Joie', 'Engagement'],
    snippet: 'Mon cœur s\'enflamme pour Ta maison, j\'élève les mains en adoration...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Pour Toi}
{artist: Dan Luiten}
{key: A}
{tempo: 125}
{time: 4/4}

{c: Intro}
[F#m] [D] [A] [E]

{c: Couplet 1}
[F#m]Mon cœur s'enflamme pour [D]Ta maison
[A]J'élève les mains en a[E]doration
[F#m]Tout ce que j'ai est à [D]Toi Seigneur
[A]Reçois l'offrande de [E]tout mon cœur

{c: Pré-refrain}
[Bm]Je veux crier au [D]monde entier
[A]Que Tu es le seul Sau[E]veur
[Bm]Rien ne pourra m'em[D]pêcher
De louer [E]Ta grandeur !

{c: Refrain}
Je veux vivre pour [A]Toi, brûler pour [E]Toi
Marcher dans Tes [F#m]voies, n'avoir d'yeux que pour [D]Toi
Je chanterai pour [A]Toi, danserai pour [E]Toi
Mon Dieu et mon [F#m]Roi, je vivrai pour [D]Toi !

{c: Pont}
[D]Plus de Toi et [E]moins de moi
[F#m]Que Ton règne vienne en [A/C#]moi
[D]Tout pour Ta gloire, [E]Seigneur Jésus
[F#m]À Toi la victoire, [E]le salut !`
  },
  {
    id: 'ext-jem-1',
    title: 'Majesté (JEM 287)',
    artist: 'Jack Hayford (JEM / Jeunesse en Mission)',
    source: 'JEM / Recueils',
    key: 'G',
    tempo: 76,
    timeSignature: '4/4',
    tags: ['Louange', 'Cantique', 'Adoration'],
    snippet: 'Majesté, à Lui la majesté ! À Jésus soient louange, honneur et gloire...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Majesté}
{artist: Jack Hayford / JEM}
{key: G}
{tempo: 76}
{time: 4/4}

{c: Couplet}
[G]Majesté, [C]à Lui la majesté !
[G]À Jésus soient louange, [Em]honneur [Am7]et gloi[D7]re.
[G]Majesté, [C]autorité suprême
[G/D]Du haut des cieux, Son règne [D7]vient sur Son peu[G]ple.

{c: Refrain}
Exal[Am7]tons [D7]et célébrons le [G]nom de Jésus !
Glori[Am7]fions, [D7]magni[B7]fions [Em]Jésus le [Am7]Roi [D7]!
[G]Majesté, [C]à Lui la majesté !
[G/D]Il est mort, est ressuscité, [D7]Il est [G]Seigneur !`
  },
  {
    id: 'ext-ug-1',
    title: 'Way Maker',
    artist: 'Sinach / Leeland',
    source: 'Ultimate Guitar',
    key: 'E',
    tempo: 68,
    timeSignature: '4/4',
    tags: ['Adoration', 'Foi', 'Victoire'],
    snippet: 'You are here, moving in our midst, I worship You, I worship You...',
    url: 'https://www.ultimate-guitar.com',
    contentChordPro: `{title: Way Maker}
{artist: Sinach / Leeland}
{key: E}
{tempo: 68}
{time: 4/4}

{c: Verse 1}
You are [A]here, moving in our [E]midst
I worship [B]You, I worship [C#m]You
You are [A]here, working in this [E]place
I worship [B]You, I worship [C#m]You

{c: Chorus}
(You are) [A]Way Maker, Miracle Worker, [E]Promise Keeper
Light in the darkness, [B]my God, that is who You [C#m]are
[A]Way Maker, Miracle Worker, [E]Promise Keeper
Light in the darkness, [B]my God, that is who You [C#m]are

{c: Verse 2}
You are [A]here, touching every [E]heart
I worship [B]You, I worship [C#m]You
You are [A]here, healing every [E]heart
I worship [B]You, I worship [C#m]You

{c: Bridge}
Even when I [A]don't see it, You're working
Even when I [E]don't feel it, You're working
You never [B]stop, You never stop working
You never [C#m]stop, You never stop working`
  },
  {
    id: 'ext-lacuerda-1',
    title: 'Cuan Grande Es Dios (How Great Is Our God)',
    artist: 'Chris Tomlin / En Espiritu y En Verdad',
    source: 'LaCuerda',
    key: 'G',
    tempo: 78,
    timeSignature: '4/4',
    tags: ['Adoración', 'Alabanza', 'Latino'],
    snippet: 'El esplendor de un Rey, vestido en majestad, la tierra alegre está...',
    url: 'https://lacuerda.net',
    contentChordPro: `{title: Cuan Grande Es Dios (How Great Is Our God)}
{artist: Chris Tomlin / En Espiritu y En Verdad}
{key: G}
{tempo: 78}
{time: 4/4}

{c: Verso 1}
El es[G]plendor de un Rey, ves[Em7]tido en majestad
La tierra ale[C2]gre está, la tierra alegre está
Se cu[G]bre de Su luz, la os[Em7]curidad huyó
Y tiembla a [C2]Su voz, tiembla a Su voz

{c: Coro}
Cuán [G]grande es Dios, cántale
Cuán [Em7]grande es Dios, y todos lo verán
Cuán [C]grande, cuán [D]grande es [G]Dios

{c: Verso 2}
Su [G]trono eterno es, el [Em7]tiempo en Sus manos
Principio [C2]y el fin, principio y el fin
La [G]Trinidad en Dios, el [Em7]Padre, Hijo y Espíritu
Cordero [C2]y el León, Cordero y el León

{c: Puente}
Y Tu [G]Nombre sobre todo es, [Em7]digno de alabar
Y mi [C]ser dirá: Cuán [D]grande es [G]Dios`
  },
  {
    id: 'ext-shir-4',
    title: 'Graves Into Gardens (Des tombeaux aux jardins)',
    artist: 'Elevation Worship / Brandon Lake (Adapt. FR)',
    source: 'Shir.fr',
    key: 'B',
    tempo: 70,
    timeSignature: '6/8',
    tags: ['Louange', 'Adoration', 'Puissance', 'Témoignage'],
    snippet: 'J\'ai cherché dans ce monde, mais rien n\'a pu combler ce vide en moi...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Graves Into Gardens (Des tombeaux aux jardins)}
{artist: Elevation Worship / Brandon Lake}
{key: B}
{tempo: 70}
{time: 6/8}

{c: Couplet 1}
J'ai cher[B]ché dans ce monde
Mais [E/B]rien n'a pu com[B]bler ce vide en moi
Aucun [G#m7]trésor d'ici-bas
Ne com[F#]parera à Ta pré[E]sence

{c: Refrain}
Il n'y a [B]rien qui vaille plus que Toi
Il n'y a [G#m7]rien qui vaille plus que Toi
Rien [E]ne Te ressemble, [B/D#]rien ne Te sur[C#m7]passe
Mon [E]Dieu, il n'y a rien

{c: Couplet 2}
Je n'ai [B]plus peur de rien
Ve[E/B]nu avec mes [B]hontes et mes fardeaux
Tu m'ac[G#m7]cueilles comme un ami
Ton a[F#]mour ne me repoussera [E]jamais

{c: Pont}
Tu transformes les tom[B]beaux en jardins [E/B] [B]
Tu transformes nos os [B]secs en une armée [E/B] [B]
Tu transformes nos deuils [G#m7]en cris de joie
Tu es le seul qui [E]puisse le faire, Tu es le seul !`
  },
  {
    id: 'ext-jem-2',
    title: 'Comme un phare (JEM 45)',
    artist: 'Graham Kendrick (JEM)',
    source: 'JEM / Recueils',
    key: 'G',
    tempo: 105,
    timeSignature: '4/4',
    tags: ['Louange', 'Célébration', 'Évangile'],
    snippet: 'Comme un phare dans la nuit, brille la gloire de Jésus...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Comme un phare (Shine Jesus Shine)}
{artist: Graham Kendrick / JEM}
{key: G}
{tempo: 105}
{time: 4/4}

{c: Couplet 1}
[G]Seigneur, Ta lu[C/G]mière nous é[G]claire [D/F#]
Au [Em]milieu des té[Am]nèbres de la [D]terre
[C]Jésus, Lu[D/C]mière du monde, [Bm]brille en ce [Em]lieu
[C]Libère-[D/C]nous par la vé[Bm]rité de [Em]Dieu
[F]Brille sur [D]moi, [F]brille sur [D]moi !

{c: Refrain}
[G]Brille, Jé[D/F#]sus, brille !
[C/E]Remplis ce [G/D]monde de la [Am]gloire du [C/D]Père [D]!
[G]Brûle, Es[D/F#]prit, brûle !
[C/E]Embrase [G/D]nos cœurs de [F]Ton saint [D]feu !
[G]Coule, [D/F#]fleuve de vie !
Inonde [C/E]toutes les na[G/D]tions de [Am]grâce et d'a[C/D]mour [D]!
[G]Envoie [D/F#]Ta parole,
[C/E]Et que la [D7]lumière [G]soit !`
  },
  {
    id: 'ext-shir-5',
    title: 'Mon âme bénis le Seigneur (10,000 Reasons FR)',
    artist: 'Matt Redman / Adapt. Hillsong En Français',
    source: 'Shir.fr',
    key: 'G',
    tempo: 73,
    timeSignature: '4/4',
    tags: ['Louange', 'Adoration', 'Grâce'],
    snippet: 'Mon âme bénis le Seigneur, ô mon âme, bénis Son saint Nom...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Mon âme bénis le Seigneur (10,000 Reasons FR)}
{artist: Matt Redman / Hillsong En Français}
{key: G}
{tempo: 73}
{time: 4/4}

{c: Refrain}
Mon [C]âme bénis [G]le Seigneur, [D/F#]ô mon [Em]âme
[C]Bénis Son [G]saint [Dsus4]Nom [D]
Chante [C]comme jamais, [Em] [C] [D] [Em]ô mon âme
Je [C]bénis Ton [D]saint [G]Nom

{c: Couplet 1}
Le [C]soleil se [G]lève, un nou[D]veau jour com[Em]mence
[C]C'est le moment [G]de Te lou[D]er en[Em]core
Qu'im[C]porte ce qui [G]m'attend et [D]ce qui peut sur[Em]venir
[C2]Que je chante [G]encore au cou[Dsus4]cher [D]du so[G]leil

{c: Couplet 2}
Riche [C]en amour [G]et lent à [D]la co[Em]lère
Ton [C]Nom est grand, [G]Ton cœur est [D]si bon [Em]
Pour [C]tous Tes bien[G]faits je veux [D]chanter sans [Em]cesse
[C2]J'ai dix mille [G]raisons de lou[Dsus4]er [D]mon [G]Dieu

{c: Couplet 3}
Et [C]quand ce jour [G]viendra où [D]mes forces fai[Em]bliront
Où [C]la fin sera [G]proche et mon [D]heure son[Em]née
Mon [C]âme chantera [G]encore Tes [D]louanges éter[Em]nelles
[C2]Pendant dix mille [G]ans et pour l'é[Dsus4]ter - [D]ni[G]té`
  },
  {
    id: 'ext-wt-2',
    title: 'Goodness of God',
    artist: 'CeCe Winans / Bethel Music',
    source: 'WorshipTogether',
    key: 'G',
    tempo: 70,
    timeSignature: '4/4',
    tags: ['Worship', 'Grace', 'Faithfulness'],
    snippet: 'I love You Lord, for Your mercy never fails me, all my days I\'ve been held in Your hands...',
    url: 'https://www.worshiptogether.com',
    contentChordPro: `{title: Goodness of God}
{artist: CeCe Winans / Bethel Music}
{key: G}
{tempo: 70}
{time: 4/4}

{c: Verse 1}
I love You [G]Lord, for Your [C]mercy never [G]fails me
All my [Em]days, I've been [C]held in Your [D]hands
From the moment that I [Em]wake up [C]until I lay my [G]head [D/F#] [Em]
I will [C]sing of the [D]goodness of [G]God

{c: Chorus}
All my [C]life You have been [G]faithful
All my [C]life You have been so, so [G]good [D]
With every [C]breath that I am [G]able [D/F#] [Em]
I will [C]sing of the [D]goodness of [G]God

{c: Verse 2}
I love Your [G]voice, You have [C]led me through the [G]fire
In darkest [Em]night, You are [C]close like no [D]other
I've known You as a [Em]Father, [C]I've known You as a [G]Friend [D/F#] [Em]
And I have [C]lived in the [D]goodness of [G]God

{c: Bridge}
Your goodness is [G/B]running after, it's [C]running after [D]me [G]
Your goodness is [G/B]running after, it's [C]running after [D]me [G]
With my life [G/B]laid down, I'm sur[C]rendered now, I give You [D]every[Em]thing
Your goodness is [G/B]running after, it's [C]running after [D]me [G]`
  },
  {
    id: 'ext-shir-6',
    title: 'Je louerai l\'Éternel (De tout mon cœur)',
    artist: 'Claude Fraysse / Cantique',
    source: 'Shir.fr',
    key: 'Em',
    tempo: 120,
    timeSignature: '4/4',
    tags: ['Louange', 'Cantique', 'Joie'],
    snippet: 'Je louerai l\'Éternel de tout mon cœur, je raconterai toutes Tes merveilles...',
    url: 'https://shir.fr',
    contentChordPro: `{title: Je louerai l'Éternel}
{artist: Claude Fraysse}
{key: Em}
{tempo: 120}
{time: 4/4}

{c: Couplet 1}
[Em]Je louerai l'Éternel de [Am]tout mon cœur,
[D]Je raconterai toutes [G]Tes mer[B7]veilles,
[Em]Je chanterai Ton Nom, [Am]je ferai de Toi
Le su[B7]jet de ma joie [Em]!

{c: Refrain}
Alle[G]luia, alle[D]luia !
Je fe[Am]rai de Toi le su[B7]jet de ma joie !
Alle[Em]luia, alle[Am]luia !
Je fe[B7]rai de Toi le sujet de ma [Em]joie !`
  }
];
