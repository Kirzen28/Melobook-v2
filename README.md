# Melobook 🎵

Application PWA complète de gestion de chants et de setlists au format ChordPro conçue pour les musiciens, groupes et équipes de louange.

---

## 🚀 Fonctionnalités Clés

- **Gestionnaire ChordPro Avancé** : Éditeur visuel interactif et saisie texte ChordPro avec coloration syntaxique des sections (Couplet, Refrain, Pont, etc.).
- **Transposition & Notation en Direct** : Transposition instantanée au demi-ton près, gestion du Capodastre, bascule entre notation internationale (`C, D, E`) et latine (`Do, Ré, Mi`).
- **Mode Scène & Lecteur Live (Stage Mode)** :
  - Défilement automatique réglable (Auto-scroll)
  - Affichage multi-colonnes adaptatif (1 à 5 colonnes)
  - Thèmes optimisés pour la scène (Sombre, OLED Noir pur, Sepia, Clair)
  - Répétitions de sections (`x2`, `x3`) et arrangements vocaux (`Lead`, `Chœur`, etc.)
- **Outils Audio Intégrés** :
  - **Métronome audio & visuel** haute précision avec réglage du tempo et signature rythmique
  - **Générateur de Pad Ambiant** polyphonique continu (Doux / Chaud)
  - **Mini Piano** pour prise de tonalité
  - **Accordeur** audio
- **Contrôle Matériel & Accessibilité** :
  - **Support Web MIDI** : Assignation de pédaliers, footswitches et claviers MIDI pour tourner les pages, lancer le métronome ou changer de chant
  - **Commandes Vocales** : Navigation mains libres
- **Collaboration & Groupes** :
  - Gestion multi-équipes avec codes d'invitation
  - Rôles et permissions granulaires : Admin, Leader, Éditeur, Membre, Spectateur
  - Synchronisation Cloud (Firebase Firestore) avec mode hors-ligne PWA (IndexedDB + Service Worker)
- **Import & Export** :
  - Importation intelligente depuis paroles brutes ou moteurs externes (Ultimate Guitar, La Cuerda, Worship Together, Shir.fr)
  - Génération et export de fiches de chants et setlists en PDF (jsPDF)

---

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide React
- **Backend / Serveur** : Node.js, Express (`server.ts`)
- **Base de données & Auth** : Firebase Firestore, Firebase Authentication
- **Traitement Musical** : ChordSheetJS, Web Audio API, Web MIDI API
- **PWA & Offline** : Service Worker (`public/sw.js`), Cache API, IndexedDB

---

## 📦 Installation & Démarrage

### 1. Prérequis
- Node.js (v18+ recommandé)
- npm ou yarn

### 2. Cloner et installer les dépendances
```bash
git clone <URL_DU_REPO>
cd melobook
npm install
```

### 3. Configuration de l'environnement
Copier le fichier `.env.example` en `.env` et renseigner les clés nécessaires (Firebase, etc.) :
```bash
cp .env.example .env
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```
L'application démarre sur [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts Disponibles

- `npm run dev` : Lance le serveur Express avec Vite en mode développement (sur le port 3000).
- `npm run build` : Compile le client Vite et bundle le serveur Node via esbuild dans `dist/`.
- `npm run start` : Exécute le serveur de production compilé (`node dist/server.cjs`).
- `npm run lint` : Vérifie les types TypeScript (`tsc --noEmit`).
- `npm run clean` : Nettoie les artefacts de build (`dist/`).

---

## 📄 Licence

Propriétaire / Privé — Melobook.
