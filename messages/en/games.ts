export default {
  // Main page
  heading: "Games",
  description: "Practice your vocabulary skills with fun and engaging games",

  // Game sections
  sections: {
    vocabulary: "Vocabulary Games",
    vocabularyDescription:
      "Practice and improve your vocabulary skills with these engaging games",
    sentence: "Sentence Games",
    sentenceDescription:
      "Master sentence structure and comprehension through interactive gameplay",
  },

  // Game cards
  games: {
    rpgBattle: {
      title: "RPG Battle",
      description:
        "Battle monsters and level up your character with vocabulary skills.",
    },
    runeMatch: {
      title: "Rune Match",
      description: "Match runes and vocabulary to unlock ancient secrets.",
    },
  },

  // Badges
  badges: {
    popular: "Popular",
    new: "New",
    recommended: "Recommended",
  },

  // Difficulty levels
  difficulty: {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  },

  // Game types
  types: {
    strategy: "Strategy",
    vocabulary: "Vocabulary",
    matching: "Matching",
    spelling: "Spelling",
  },

  // Actions
  playNow: "Play Now",
  clickToPlay: "Click to play!",
  selectTranslation: "Select Translation Language",

  // Coming soon
  comingSoon: "Coming Soon",
  comingSoonDescription:
    "More exciting games are on the way! Stay tuned for new vocabulary challenges.",
  newGames: "New Games",

  // Individual game pages
  backToGames: "Back to Games",
  loadingVocabulary: "Loading vocabulary...",
  preparingAdventure: "Preparing your dragon adventure",
  preparingGame: "Preparing your game",
  unableToStartGame: "Unable to Start Game",
  notEnoughWords:
    "Not enough vocabulary words. Please save at least {count} words to play.",
  saveTip:
    "Tip: Save vocabulary words from articles to build your word collection.",
  collectHealingOrbs: "Collect healing orbs and survive the zombie horde.",

  // Common game UI
  common: {
    score: "Score",
    accuracy: "Accuracy",
    xpEarned: "XP Earned",
    gameOver: "Game Over",
    victory: "Victory",
    defeat: "Defeat",
    playAgain: "Play Again",
    tryAgain: "Try Again",
    continue: "Continue",
    startGame: "Start Game",
    startBattle: "Start Battle",
    startSurvival: "Start Survival",
    ready: "Ready",
    loading: "Loading",
    wordsToReview: "Words to Review",
    viewLeaderboard: "View Leaderboard",
    howToPlay: "How to Play",
    tip: "Tip",
    xp: "XP",
  },

  // RPG Battle specific
  rpgBattle: {
    battlePreparation: "Battle Preparation",
    reviewSpells:
      "Review your spells and check the leaderboards before battle.",
    theBattleAwaits: "The Battle Awaits",
    battleDescription:
      "Type correct translations to cast powerful spells and defeat your enemies in turn-based combat.",
    tabs: {
      briefing: "Briefing",
      rankings: "Rankings",
      vocabulary: "Vocabulary",
    },
    instructions: {
      step1Title: "Choose Your Path",
      step1Desc: "Select your hero, battlefield, and enemy to face.",
      step2Title: "Cast Your Spells",
      step2Desc:
        "Type the correct translation to unleash attacks. Power spells deal more damage!",
      step3Title: "Defeat the Enemy",
      step3Desc:
        "Reduce enemy HP to zero before they defeat you. Earn XP based on performance!",
      tip: "Stronger enemies grant more XP but are harder to defeat. Choose wisely!",
    },
    topWarriors: "Top Warriors",
    spellBook: "Spell Book",
    spells: "spells",
    noRankings: "No rankings yet for this enemy.",
    noVocabulary: "No vocabulary loaded yet.",
    loadingRankings: "Loading rankings...",
    correctAnswer: "Correct answer: {answer}",
    turn: "Turn: {who}",
    player: "Player",
    enemy: "Enemy",
  },

  // Rune Match specific
  runeMatch: {
    selectMonster: "Choose Your Opponent",
    selectMonsterDesc: "Select a monster to begin the rune match battle.",
    adventureAwaits: "Adventure awaits",
    prepareRunes: "Prepare your runes and check the leaderboards.",
    missionObjective: "Mission Objective",
    missionDescription:
      "Match 3 or more vocabulary runes to attack monsters. Find translated pairs or match power-ups to survive!",
    gameplayTips: "Gameplay Tips",
    tip1: "Match runes to deal damage.",
    tip2Prefix: "Match",
    tip2Heal: "Heal",
    tip2Suffix: "runes to restore HP.",
    tip3Prefix: "Match",
    tip3Shield: "Shield",
    tip3Suffix: "runes to block attacks.",
    tip4: "Large combos deal massive damage!",
    combatReady: "Combat Ready",
    combatReadyDesc:
      "The monsters are approaching. Are you ready to test your vocabulary skills?",
    topHeroes: "Top Heroes",
    loadingRankings: "Loading rankings...",
    noRankings: "No rankings yet. Be the first!",
    runeCollection: "Rune Collection",
    noVocabulary: "No vocabulary loaded.",
    hp: "HP",
    attack: "Attack",
    reward: "Reward",
    battleButton: "Start Battle",
    tabs: {
      briefing: "Briefing",
      rankings: "Rankings",
      vocabulary: "Vocabulary",
    },
    monsters: {
      goblin: "Goblin",
      goblinDescription: "Weak but fast.",
      skeleton: "Skeleton",
      skeletonDescription: "Restless undead.",
      orc: "Orc",
      orcDescription: "A fierce warrior.",
      dragon: "Dragon",
      dragonDescription: "The ultimate challenge.",
    },
    inGame: {
      playerHealth: "Player",
      powerWord: "Power Word",
      skills: "Skills",
      shuffle: "Shuffle",
      hint: "Hint",
      bomb: "Bomb",
      heal: "Heal",
      shield: "Shield",
      combo: "Combo",
      damage: "Damage",
      freeze: "Freeze",
    },
  },
} as const;
