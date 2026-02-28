export default {
  // Main page
  heading: "游戏",
  description: "通过有趣的游戏练习你的词汇技能",

  // Game sections
  sections: {
    vocabulary: "词汇游戏",
    vocabularyDescription: "通过这些引人入胜的游戏练习和提高你的词汇技能",
    sentence: "句子游戏",
    sentenceDescription: "通过互动玩法掌握句子结构和理解",
  },

  // Game cards
  games: {
    rpgBattle: {
      title: "RPG 战斗",
      description: "与怪物战斗并通过词汇技能升级你的角色。",
    },
    runeMatch: {
      title: "符文匹配",
      description: "匹配符文和词汇以解锁古老的秘密。",
    },
  },

  // Badges
  badges: {
    popular: "热门",
    new: "新",
    recommended: "推荐",
  },

  // Difficulty levels
  difficulty: {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  },

  // Game types
  types: {
    strategy: "策略",
    vocabulary: "词汇",
    matching: "匹配",
    spelling: "拼写",
  },

  // Actions
  playNow: "立即游戏",
  clickToPlay: "点击开始！",
  selectTranslation: "选择翻译语言",

  // Coming soon
  comingSoon: "即将推出",
  comingSoonDescription: "更多精彩游戏即将到来！敬请期待新的词汇挑战。",
  newGames: "新游戏",

  // Individual game pages
  backToGames: "返回游戏",
  loadingVocabulary: "正在加载词汇…",
  preparingAdventure: "正在准备你的龙之冒险",
  preparingGame: "正在准备你的游戏",
  unableToStartGame: "无法开始游戏",
  notEnoughWords: "词汇不足。请至少保存 {count} 个单词以开始游戏。",
  saveTip: "提示：从文章中保存词汇以建立你的单词收藏。",
  collectHealingOrbs: "收集治疗宝珠以在僵尸群中生存。",

  // Common game UI
  common: {
    score: "得分",
    accuracy: "准确率",
    xpEarned: "获得的 XP",
    gameOver: "游戏结束",
    victory: "胜利",
    defeat: "失败",
    playAgain: "再玩一次",
    tryAgain: "再试一次",
    continue: "继续",
    startGame: "开始游戏",
    startBattle: "开始战斗",
    startSurvival: "开始生存",
    ready: "准备就绪",
    loading: "加载中",
    wordsToReview: "待复习的单词",
    viewLeaderboard: "查看排行榜",
    howToPlay: "如何玩",
    tip: "提示",
    xp: "XP",
  },

  // RPG Battle specific
  rpgBattle: {
    battlePreparation: "战斗准备",
    reviewSpells: "在战斗前查看你的法术并检查排行榜。",
    theBattleAwaits: "战斗等着你",
    battleDescription: "输入正确的翻译施放强大的法术并在回合制战斗中击败敌人。",
    tabs: {
      briefing: "简报",
      rankings: "排名",
      vocabulary: "词汇",
    },
    instructions: {
      step1Title: "选择你的道路",
      step1Desc: "选择你的英雄、战场和要面对的敌人。",
      step2Title: "施放你的法术",
      step2Desc: "输入正确的翻译以发动攻击。强力法术造成更多伤害！",
      step3Title: "击败敌人",
      step3Desc: "在敌人击败你之前将其 HP 降至零。根据表现获得 XP！",
      tip: "更强的敌人会给予更多 XP 但更难击败。明智选择！",
    },
    topWarriors: "顶级战士",
    spellBook: "法术书",
    spells: "法术",
    noRankings: "此敌人暂无排名。",
    noVocabulary: "尚未加载词汇。",
    loadingRankings: "正在加载排名…",
    correctAnswer: "正确答案：{answer}",
    turn: "回合：{who}",
    player: "玩家",
    enemy: "敌人",
  },

  // Rune Match specific
  runeMatch: {
    selectMonster: "选择你的对手",
    selectMonsterDesc: "选择一个怪物开始符文匹配战斗。",
    adventureAwaits: "冒险在等待",
    prepareRunes: "准备你的符文并查看排行榜。",
    missionObjective: "任务目标",
    missionDescription:
      "匹配 3 个或更多词汇符文以攻击怪物。找到翻译对或匹配增强道具以生存！",
    gameplayTips: "玩法提示",
    tip1: "匹配符文以造成伤害。",
    tip2Prefix: "匹配",
    tip2Heal: "治疗",
    tip2Suffix: "符文以恢复 HP。",
    tip3Prefix: "匹配",
    tip3Shield: "护盾",
    tip3Suffix: "符文以阻挡攻击。",
    tip4: "大连击造成巨额伤害！",
    combatReady: "战斗准备就绪",
    combatReadyDesc: "怪物正在接近。准备好测试你的词汇技能了吗？",
    topHeroes: "顶级英雄",
    loadingRankings: "正在加载排名…",
    noRankings: "还没有排名。成为第一个！",
    runeCollection: "符文收藏",
    noVocabulary: "尚未加载词汇。",
    hp: "生命值",
    attack: "攻击",
    reward: "奖励",
    battleButton: "开始战斗",
    tabs: {
      briefing: "简报",
      rankings: "排名",
      vocabulary: "词汇",
    },
    monsters: {
      goblin: "哥布林",
      goblinDescription: "弱小但快速。",
      skeleton: "骷髅",
      skeletonDescription: "不安的亡灵。",
      orc: "兽人",
      orcDescription: "凶猛的战士。",
      dragon: "龙",
      dragonDescription: "终极挑战。",
    },
    inGame: {
      playerHealth: "玩家",
      powerWord: "强力词",
      skills: "技能",
      shuffle: "洗牌",
      hint: "提示",
      bomb: "炸弹",
      heal: "治疗",
      shield: "护盾",
      combo: "连击",
      damage: "伤害",
      freeze: "冻结",
    },
  },
} as const;
