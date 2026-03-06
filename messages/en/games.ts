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
    dragonRider: {
      title: "Dragon Rider",
      description:
        "Ride your dragon through the skies, collecting words and defeating enemies to save the kingdom!",
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

  dragonRider: {
    title: "Dragon Rider",
    description:
      "Ride your dragon through the skies, collecting words and defeating enemies to save the kingdom!",
    startScreen: {
      title: "Dragon Rider",
      description: "Choose your difficulty and embark on an epic adventure!",
      difficultyLabel: "Difficulty",
      difficultyEasy: "Easy",
      difficultyNormal: "Normal",
      difficultyHard: "Hard",
      difficultyExtreme: "Extreme",
      startButton: "Start Adventure",
      rankingButton: "High Scores",
      instructionsButton: "Instructions",
      loading: "Loading adventure...",
    },
    instructionsScreen: {
      title: "Instructions",
      backButton: "Back to Menu",
      controls: {
        title: "Controls",
        move: "Move",
        moveKeys: "Arrows / WASD",
        shield: "Shield",
        shieldKeys: "Space / Enter",
      },
      gameplay: {
        title: "Gameplay",
        objective: "Objective",
        objectiveDesc:
          "Collect words to grow your dragon flight and defeat the Skeleton King!",
        gates: "Gates",
        gatesDesc:
          "Choose the correct gate to grow your dragon flight before the Skeleton King arrives.",
        boss: "Boss Battle",
        bossDesc:
          "Defeat the Skeleton King by answering vocabulary questions correctly.",
        shields: "Shields",
        shieldsDesc: "Use shields to block attacks from the Skeleton King.",
        mana: "Mana",
        manaDesc:
          "Collect words to gain mana and use shields to protect yourself.",
      },
      scoring: {
        title: "Scoring",
        wordsCollected: "Words Collected",
        wordsCollectedDesc: "+10 points per word",
        correctAnswers: "Correct Answers",
        correctAnswersDesc: "+20 points per correct answer",
        shieldsUsed: "Shields Used",
        shieldsUsedDesc: "-5 points per shield used",
        timeBonus: "Time Bonus",
        timeBonusDesc: "+1 point per second remaining",
      },
    },
    gameplayScreen: {
      hud: {
        wordsCollected: "Words Collected",
        shields: "Shields",
        mana: "Mana",
        time: "Time",
        bossHealth: "Skeleton King Health",
      },
      messages: {
        waveIncoming: "Wave Incoming!",
        bossApproaching: "Skeleton King Approaching!",
        bossDefeated: "Skeleton King Defeated!",
        gameComplete: "Adventure Complete!",
        gameOver: "Game Over",
        pressEnterToContinue: "Press Enter to Continue",
        pressSpaceToShield: "Press Space to Shield",
      },
    },
    resultsScreen: {
      title: "Adventure Complete!",
      score: "Final Score",
      wordsCollected: "Words Collected",
      correctAnswers: "Correct Answers",
      shieldsUsed: "Shields Used",
      timeBonus: "Time Bonus",
      difficulty: "Difficulty",
      playAgainButton: "Play Again",
      backToMenuButton: "Back to Menu",
      rankingButton: "High Scores",
    },
    rankingScreen: {
      title: "High Scores",
      backButton: "Back to Menu",
      noScores: "No scores yet.",
      beTheFirst: "Be the first to conquer the skies!",
      yourRank: "Your Rank",
      topScores: "Top Scores",
      score: "Score",
      words: "Words",
      time: "Time",
      difficulty: "Difficulty",
    },
    ranking: {
      leaderboard: "High Scores",
      noChampions: "No scores yet.",
      beTheFirst: "Be the first to conquer the skies!",
      dragonRider: "Dragon Rider",
    },
    difficulty: {
      easy: "Easy",
      normal: "Normal",
      hard: "Hard",
      extreme: "Extreme",
    },
  },
} as const;
