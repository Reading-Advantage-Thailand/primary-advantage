export default {
  // Main page
  heading: "遊戲",
  description: "透過有趣的遊戲練習你的詞彙技能",

  // Game sections
  sections: {
    vocabulary: "詞彙遊戲",
    vocabularyDescription: "透過這些引人入勝的遊戲練習並提升你的詞彙技能",
    sentence: "句子遊戲",
    sentenceDescription: "透過互動玩法掌握句子結構和理解",
  },

  // Game cards
  games: {
    rpgBattle: {
      title: "RPG 戰鬥",
      description: "與怪物戰鬥並以詞彙技能升級你的角色。",
    },
    runeMatch: {
      title: "符文配對",
      description: "配對符文和詞彙以解開古老的秘密。",
    },
  },

  // Badges
  badges: {
    popular: "熱門",
    new: "新",
    recommended: "推薦",
  },

  // Difficulty levels
  difficulty: {
    easy: "簡單",
    medium: "中等",
    hard: "困難",
  },

  // Game types
  types: {
    strategy: "策略",
    vocabulary: "詞彙",
    matching: "配對",
    spelling: "拼寫",
  },

  // Actions
  playNow: "立即遊玩",
  clickToPlay: "點擊開始！",
  selectTranslation: "選擇翻譯語言",

  // Coming soon
  comingSoon: "即將推出",
  comingSoonDescription: "更多精彩遊戲即將登場！敬請期待新的詞彙挑戰。",
  newGames: "新遊戲",

  // Individual game pages
  backToGames: "返回遊戲",
  loadingVocabulary: "正在載入詞彙…",
  preparingAdventure: "正在準備你的龍之冒險",
  preparingGame: "正在準備你的遊戲",
  unableToStartGame: "無法開始遊戲",
  notEnoughWords: "詞彙不足。請至少儲存 {count} 個單詞以開始遊戲。",
  saveTip: "提示：從文章中儲存詞彙以建立你的單詞收藏。",
  collectHealingOrbs: "收集治療寶珠以在屍潮中存活。",

  // Common game UI
  common: {
    score: "分數",
    accuracy: "準確率",
    xpEarned: "獲得的 XP",
    gameOver: "遊戲結束",
    victory: "勝利",
    defeat: "失敗",
    playAgain: "再玩一次",
    tryAgain: "再試一次",
    continue: "繼續",
    startGame: "開始遊戲",
    startBattle: "開始戰鬥",
    startSurvival: "開始生存",
    ready: "準備就緒",
    loading: "載入中",
    wordsToReview: "待復習的單詞",
    viewLeaderboard: "查看排行榜",
    howToPlay: "如何玩",
    tip: "提示",
    xp: "XP",
  },

  // RPG Battle specific
  rpgBattle: {
    battlePreparation: "戰鬥準備",
    reviewSpells: "在戰鬥前查看你的魔法並檢查排行榜。",
    theBattleAwaits: "戰鬥等著你",
    battleDescription: "輸入正確的翻譯釋放強大魔法，並在回合制戰鬥中擊敗敵人。",
    tabs: {
      briefing: "簡報",
      rankings: "排名",
      vocabulary: "詞彙",
    },
    instructions: {
      step1Title: "選擇你的道路",
      step1Desc: "選擇你的英雄、戰場和要面對的敵人。",
      step2Title: "施放你的魔法",
      step2Desc: "輸入正確的翻譯以發動攻擊。強力魔法造成更多傷害！",
      step3Title: "擊敗敵人",
      step3Desc: "在敵人擊敗你之前將其 HP 降至零。依表現獲得 XP！",
      tip: "更強的敵人會給予更多 XP 但更難擊敗。明智選擇！",
    },
    topWarriors: "頂級戰士",
    spellBook: "魔法書",
    spells: "魔法",
    noRankings: "此敵人暫無排名。",
    noVocabulary: "尚未載入詞彙。",
    loadingRankings: "正在載入排名…",
    correctAnswer: "正確答案：{answer}",
    turn: "回合：{who}",
    player: "玩家",
    enemy: "敵人",
  },

  // Rune Match specific
  runeMatch: {
    selectMonster: "選擇你的對手",
    selectMonsterDesc: "選擇一個怪物開始符文配對戰鬥。",
    adventureAwaits: "冒險在等待",
    prepareRunes: "準備你的符文並查看排行榜。",
    missionObjective: "任務目標",
    missionDescription:
      "配對 3 個或更多詞彙符文以攻擊怪物。找到翻譯對或配對增強道具以生存！",
    gameplayTips: "玩法提示",
    tip1: "配對符文以造成傷害。",
    tip2Prefix: "配對",
    tip2Heal: "治療",
    tip2Suffix: "符文以恢復 HP。",
    tip3Prefix: "配對",
    tip3Shield: "護盾",
    tip3Suffix: "符文以阻擋攻擊。",
    tip4: "大連擊造成巨額傷害！",
    combatReady: "戰鬥準備就緒",
    combatReadyDesc: "怪物正在接近。準備好測試你的詞彙技能了嗎？",
    topHeroes: "頂級英雄",
    loadingRankings: "正在載入排名…",
    noRankings: "還沒有排名。成為第一個！",
    runeCollection: "符文收藏",
    noVocabulary: "尚未載入詞彙。",
    hp: "生命值",
    attack: "攻擊",
    reward: "獎勵",
    battleButton: "開始戰鬥",
    tabs: {
      briefing: "簡報",
      rankings: "排名",
      vocabulary: "詞彙",
    },
    monsters: {
      goblin: "哥布林",
      goblinDescription: "弱小但快速。",
      skeleton: "骷髏",
      skeletonDescription: "不安的亡靈。",
      orc: "獸人",
      orcDescription: "兇猛的戰士。",
      dragon: "龍",
      dragonDescription: "終極挑戰。",
    },
    inGame: {
      playerHealth: "玩家",
      powerWord: "強力詞",
      skills: "技能",
      shuffle: "洗牌",
      hint: "提示",
      bomb: "炸彈",
      heal: "治療",
      shield: "護盾",
      combo: "連擊",
      damage: "傷害",
      freeze: "凍結",
    },
  },
} as const;
