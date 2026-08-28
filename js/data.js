/* ===== GACHA LIFE — data ===== */

const VERSION = "1.0.0";
const CHANGELOG = [
  {
    v: "1.0.0",
    d: "2026-08-28",
    notes: [
      "初版リリース。一生ガチャを引くだけのゲーム。",
      "ガチャ(単発 / 10連 / 無料枠)、6段階レアリティ、天井100連、ソフト天井80連。",
      "コレクション図鑑71種、ガチャ道ランク20段階、実績40種、星屑ショップ実装。",
      "放置ジェム生成、オフライン報酬(最大8時間)対応。",
    ],
  },
];

const RARITIES = {
  N:   { key: "N",   label: "N",    stars: "✦",     color: "#9aa4b2", glow: "#c3ccd8", weight: 0.785 },
  R:   { key: "R",   label: "R",    stars: "★",     color: "#5fa8ff", glow: "#8fc4ff", weight: 0.150 },
  SR:  { key: "SR",  label: "SR",   stars: "★★",    color: "#b06bff", glow: "#d0a3ff", weight: 0.050 },
  SSR: { key: "SSR", label: "SSR",  stars: "★★★",   color: "#ffb43d", glow: "#ffd98a", weight: 0.012 },
  UR:  { key: "UR",  label: "UR",   stars: "★★★★",  color: "#ff5d7e", glow: "#ffa9bc", weight: 0.0025 },
  LR:  { key: "LR",  label: "LR",   stars: "✧",     color: "#3dffcf", glow: "#a6fff0", weight: 0.0005 },
};
const RARITY_ORDER = ["N", "R", "SR", "SSR", "UR", "LR"];

// 重複時にもらえる星屑
const DUST_BY_RARITY = { N: 1, R: 3, SR: 12, SSR: 60, UR: 300, LR: 1500 };

const COSTS = { single: 150, ten: 1400 };
const PITY_HARD = 100;   // これまでにSSR以上が出ていなければ確定
const PITY_SOFT = 80;    // ここからSSR確率が加速

const ITEMS = [
  // ---------- N (12) ----------
  { id: "n_stone",   n: "ただの石ころ",       r: "N", e: "🪨", f: "道端で拾える。ガチャから出てくる意味はない。" },
  { id: "n_slime",   n: "はぐれスライム",     r: "N", e: "🟢", f: "とりあえず出てくる枠。悪気はない。" },
  { id: "n_npcA",    n: "通行人A",            r: "N", e: "🚶", f: "「いい天気ですね」以外の会話はできない。" },
  { id: "n_cap",     n: "空カプセル",         r: "N", e: "🥚", f: "中身が入っていなかった。返金はない。" },
  { id: "n_twig",    n: "折れた枝",           r: "N", e: "🥢", f: "武器と言い張れなくもない。" },
  { id: "n_potion",  n: "薄めた回復薬",       r: "N", e: "🧪", f: "HPが1だけ回復する。気休め。" },
  { id: "n_rat",     n: "ダンジョンのネズミ", r: "N", e: "🐀", f: "経験値1。踏まないであげて。" },
  { id: "n_coin",    n: "さびた銅貨",         r: "N", e: "🟤", f: "自販機でも使えない。" },
  { id: "n_bread",   n: "かたいパン",         r: "N", e: "🥖", f: "投げれば当たる。食べると歯が負ける。" },
  { id: "n_ghost",   n: "気の弱い幽霊",       r: "N", e: "👻", f: "驚かそうとして自分が驚く。" },
  { id: "n_book",    n: "白紙の魔導書",       r: "N", e: "📖", f: "何も書いていない。夢はある。" },
  { id: "n_boot",    n: "片方だけの長靴",     r: "N", e: "🥾", f: "もう片方は永遠に出ない。" },

  // ---------- R (16) ----------
  { id: "r_sword",   n: "そこそこ鋭い剣",     r: "R", e: "🗡️", f: "初心者卒業の証。振れば音が鳴る。" },
  { id: "r_mage",    n: "見習い魔法使い",     r: "R", e: "🧙", f: "ファイアの詠唱がまだ長い。" },
  { id: "r_shield",  n: "木の盾+1",           r: "R", e: "🛡️", f: "強化された。まだ木。" },
  { id: "r_wolf",    n: "森オオカミ",         r: "R", e: "🐺", f: "群れると急に強い。" },
  { id: "r_archer",  n: "村の弓兵",           r: "R", e: "🏹", f: "的の8割には当たる。" },
  { id: "r_cat",     n: "しゃべる黒猫",       r: "R", e: "🐈‍⬛", f: "助言は的確だが態度が悪い。" },
  { id: "r_ring",    n: "小さな加護の指輪",   r: "R", e: "💍", f: "転んでも痛くない、くらいの加護。" },
  { id: "r_knight",  n: "門番の騎士",         r: "R", e: "🛡️", f: "定時になると帰る。えらい。" },
  { id: "r_fairy",   n: "いたずら妖精",       r: "R", e: "🧚", f: "回復もするし財布も抜く。" },
  { id: "r_golem",   n: "レンガゴーレム",     r: "R", e: "🧱", f: "遅いが着実。約束は守る。" },
  { id: "r_bard",    n: "旅の吟遊詩人",       r: "R", e: "🎻", f: "戦闘中に曲を止めない胆力。" },
  { id: "r_slimeK",  n: "スライムの王",       r: "R", e: "👑", f: "大きいスライム。それだけ。" },
  { id: "r_alch",    n: "町の錬金術師",       r: "R", e: "⚗️", f: "たまに金を作る。たまに爆発。" },
  { id: "r_hawk",    n: "伝令のタカ",         r: "R", e: "🦅", f: "既読がとにかく速い。" },
  { id: "r_thief",   n: "気のいい盗賊",       r: "R", e: "🗝️", f: "盗んだ分だけ寄付する。差し引きゼロ。" },
  { id: "r_priest",  n: "駆け出し僧侶",       r: "R", e: "✨", f: "蘇生はまだ練習中。頼むぞ。" },

  // ---------- SR (18) ----------
  { id: "sr_capt",   n: "近衛隊長エルナ",     r: "SR", e: "⚔️", f: "部下からの信頼が厚い。書類仕事も速い。" },
  { id: "sr_sage",   n: "山の賢者",           r: "SR", e: "🧓", f: "答えは知っているが遠回りに話す。" },
  { id: "sr_dragonC",n: "仔竜ポポ",           r: "SR", e: "🐲", f: "まだ火は吐けないが本気で信じている。" },
  { id: "sr_assassin",n: "月影の暗殺者",      r: "SR", e: "🌙", f: "気配がない。会議の存在感もない。" },
  { id: "sr_paladin",n: "聖騎士ガレス",       r: "SR", e: "🛡️", f: "誓いを4つも立てていて予定が忙しい。" },
  { id: "sr_witch",  n: "沼の魔女",           r: "SR", e: "🧹", f: "薬の腕は一級。接客は零級。" },
  { id: "sr_samurai",n: "浪人サブロー",       r: "SR", e: "🥷", f: "一刀で竹を斬る。米も研ぐ。" },
  { id: "sr_valk",   n: "戦乙女シグ",         r: "SR", e: "🕊️", f: "勇者を戦場から回収する仕事。残業多め。" },
  { id: "sr_engineer",n: "からくり技師リン",  r: "SR", e: "🔧", f: "動く物なら何でも直す。心以外。" },
  { id: "sr_beast",  n: "白獅子キリ",         r: "SR", e: "🦁", f: "誇り高い。だが撫でられると喉を鳴らす。" },
  { id: "sr_navi",   n: "星読みの航海士",     r: "SR", e: "🧭", f: "陸でも方角がわかって少し困る。" },
  { id: "sr_gunner", n: "早撃ちのメイ",       r: "SR", e: "🔫", f: "抜くのは速い。しまうのはもっと速い。" },
  { id: "sr_druid",  n: "森守りドルイド",     r: "SR", e: "🌿", f: "熊とも会議できる。議事録は葉っぱ。" },
  { id: "sr_ice",    n: "氷雪の踊り子",       r: "SR", e: "❄️", f: "ステージ全体を凍らせて拍手だけ届く。" },
  { id: "sr_smith",  n: "名工ドワーフ",       r: "SR", e: "🔨", f: "妥協した剣は打たない。納期は妥協する。" },
  { id: "sr_spy",    n: "宮廷の間諜",         r: "SR", e: "🎭", f: "3つの名前と5つの趣味を持つ。" },
  { id: "sr_monk",   n: "拳聖ロウ",           r: "SR", e: "👊", f: "山を殴って形を整える。趣味は盆栽。" },
  { id: "sr_summoner",n: "契約召喚士",        r: "SR", e: "📜", f: "呼び出しは得意。帰ってもらうのが苦手。" },

  // ---------- SSR (14) ----------
  { id: "ssr_hero",  n: "選ばれし勇者アル",   r: "SSR", e: "🦸", f: "剣も心も折れない。たまに道には迷う。" },
  { id: "ssr_dragon",n: "紅蓮竜ヴォルガ",     r: "SSR", e: "🐉", f: "一睨みで軍が退く。撫でると崩れる山あり。" },
  { id: "ssr_queen", n: "銀氷の女王",         r: "SSR", e: "👸", f: "微笑むだけで湖が凍る。国政も冷静。" },
  { id: "ssr_arch",  n: "大賢者メルヴィナ",   r: "SSR", e: "🔮", f: "千年分の魔導書を暗記している。買い物メモは忘れる。" },
  { id: "ssr_black",  n: "漆黒の剣聖",        r: "SSR", e: "🖤", f: "抜刀した記憶がないのに勝負がついている。" },
  { id: "ssr_phoenix",n: "不死鳥アウロラ",    r: "SSR", e: "🦅", f: "負けても翌朝には元気。無敵のメンタル。" },
  { id: "ssr_kraken", n: "深淵のクラーケン",  r: "SSR", e: "🐙", f: "船を沈める。泳ぐ人には意外とやさしい。" },
  { id: "ssr_angel",  n: "熾天使ラファ",      r: "SSR", e: "😇", f: "翼が6枚。飛行許可の手続きが多い。" },
  { id: "ssr_demon",  n: "魔王グリモ",        r: "SSR", e: "😈", f: "世界征服の途中で部下の誕生日を祝う。" },
  { id: "ssr_time",   n: "時読みのクロノ",    r: "SSR", e: "⏳", f: "5秒だけ時を止める。だいたい寝坊に使う。" },
  { id: "ssr_storm",  n: "雷帝ボルド",        r: "SSR", e: "⚡", f: "拍手で雷が落ちる。ライブでは自粛。" },
  { id: "ssr_beastK", n: "獣王レオンハート",  r: "SSR", e: "🦁", f: "百獣が跪く。膝の悪い獣には椅子を出す。" },
  { id: "ssr_maid",   n: "戦闘メイド長セラ",  r: "SSR", e: "🧹", f: "紅茶を淹れながら暗殺者を3人無力化。" },
  { id: "ssr_gambler",n: "運命の賭博師",      r: "SSR", e: "🎲", f: "全てのダイスが彼の望む目を出す。ガチャは別。" },

  // ---------- UR (6) ----------
  { id: "ur_tree",   n: "世界樹ユグド",       r: "UR", e: "🌳", f: "世界を根で支えている。引っこ抜いてごめん。" },
  { id: "ur_god",    n: "創世神アイン",       r: "UR", e: "🌟", f: "『光あれ』が口癖。カプセルからも出てくる。" },
  { id: "ur_void",   n: "虚無の王",           r: "UR", e: "🕳️", f: "存在しないことで存在している。図鑑には載る。" },
  { id: "ur_star",   n: "堕ちた星の化身",     r: "UR", e: "💫", f: "願い事を1つ叶える。あなたはガチャに使った。" },
  { id: "ur_dream",  n: "夢喰いの獏",         r: "UR", e: "🌀", f: "悪夢を食べる。ガチャ爆死の記憶も食べてほしい。" },
  { id: "ur_titan",  n: "原初の巨人",         r: "UR", e: "🗿", f: "一歩で大陸を渡る。歩幅の調整が課題。" },

  // ---------- LR (5) ----------
  { id: "lr_dev",    n: "このゲームの開発者", r: "LR", e: "🧑‍💻", f: "「一生引くだけでいいの?」と真顔で聞いてくる。" },
  { id: "lr_you",    n: "ガチャに全てを捧げた者", r: "LR", e: "🫵", f: "鏡の中にいた。石は残っていない。" },
  { id: "lr_luck",   n: "確率そのもの",       r: "LR", e: "🎯", f: "0.05%。あなたに微笑んだ、今日だけは。" },
  { id: "lr_cat",    n: "全てを知る三毛猫",   r: "LR", e: "🐱", f: "宇宙の真理を知っているが、今は昼寝がしたい。" },
  { id: "lr_secret", n: "???",                r: "LR", e: "❔", f: "名前も姿も定まらない。図鑑の最後の枠。" },
];

// ガチャ道ランク: [必要累計ガチャ回数, 称号]
const RANKS = [
  [0,      "見習いガチャ民"],
  [10,     "石の使い手"],
  [30,     "課金しない勢"],
  [60,     "沼のほとり"],
  [110,    "確率と友達"],
  [180,    "天井コレクター"],
  [280,    "爆死の常連"],
  [420,    "無心の回し手"],
  [620,    "ガチャ職人"],
  [880,    "レア厨"],
  [1250,   "コンプ狂"],
  [1750,   "ガチャ仙人"],
  [2400,   "確率超越者"],
  [3300,   "石油王(石)"],
  [4500,   "ガチャの化身"],
  [6200,   "運命操作士"],
  [8500,   "無限回し"],
  [11500,  "ガチャ神"],
  [16000,  "一生ガチャ"],
  [23000,  "ガチャそのもの"],
];

const ACHIEVEMENTS = [
  { id: "first",      n: "はじめの一回",         d: "ガチャを1回引く",                 c: s => s.stats.pulls >= 1 },
  { id: "p10",        n: "10連童貞卒業",         d: "累計10回引く",                    c: s => s.stats.pulls >= 10 },
  { id: "p100",       n: "沼の入口",             d: "累計100回引く",                   c: s => s.stats.pulls >= 100 },
  { id: "p1000",      n: "沼の主",               d: "累計1,000回引く",                 c: s => s.stats.pulls >= 1000 },
  { id: "p10000",     n: "一生ガチャ",           d: "累計10,000回引く",                c: s => s.stats.pulls >= 10000 },
  { id: "firstR",     n: "はじめてのレア",       d: "R以上を初めて入手",               c: s => s.stats.byR.R + s.stats.byR.SR + s.stats.byR.SSR + s.stats.byR.UR + s.stats.byR.LR >= 1 },
  { id: "firstSR",    n: "紫の輝き",             d: "SRを初めて入手",                  c: s => s.stats.byR.SR + s.stats.byR.SSR + s.stats.byR.UR + s.stats.byR.LR >= 1 },
  { id: "firstSSR",   n: "金色の瞬間",           d: "SSRを初めて入手",                 c: s => s.stats.byR.SSR + s.stats.byR.UR + s.stats.byR.LR >= 1 },
  { id: "firstUR",    n: "極彩色",               d: "URを初めて入手",                  c: s => s.stats.byR.UR + s.stats.byR.LR >= 1 },
  { id: "firstLR",    n: "0.05%の男",            d: "LRを初めて入手",                  c: s => s.stats.byR.LR >= 1 },
  { id: "ssr3",       n: "神引き",               d: "1回の10連でSSR以上を3体",         c: s => s.flags.ssr3 },
  { id: "ssr5",       n: "画面が金色",           d: "1回の10連でSSR以上を5体",         c: s => s.flags.ssr5 },
  { id: "pityHit",    n: "天井の民",             d: "天井(100連)でSSRを引く",          c: s => s.flags.pityHit },
  { id: "freeSSR",    n: "無料で神引き",         d: "無料枠でSSR以上を引く",           c: s => s.flags.freeSSR },
  { id: "dupe50",     n: "ダブりの山",           d: "重複を50回引く",                  c: s => s.stats.dupes >= 50 },
  { id: "dupe500",    n: "産業廃棄物",           d: "重複を500回引く",                 c: s => s.stats.dupes >= 500 },
  { id: "dust1k",     n: "星屑コレクター",       d: "星屑を累計1,000貯める",           c: s => s.stats.dustEarned >= 1000 },
  { id: "dust50k",    n: "天の川",               d: "星屑を累計50,000貯める",          c: s => s.stats.dustEarned >= 50000 },
  { id: "spend100k",  n: "石油王",               d: "ジェムを累計100,000消費",         c: s => s.stats.gemsSpent >= 100000 },
  { id: "spend1m",    n: "石だけはある",         d: "ジェムを累計1,000,000消費",       c: s => s.stats.gemsSpent >= 1000000 },
  { id: "rank5",      n: "確率と友達",           d: "ガチャ道ランク5到達",             c: s => rankIndex(s.stats.pulls) >= 4 },
  { id: "rank10",     n: "レア厨",               d: "ガチャ道ランク10到達",            c: s => rankIndex(s.stats.pulls) >= 9 },
  { id: "rank15",     n: "ガチャの化身",         d: "ガチャ道ランク15到達",            c: s => rankIndex(s.stats.pulls) >= 14 },
  { id: "rank20",     n: "ガチャそのもの",       d: "ガチャ道ランク20(最大)到達",      c: s => rankIndex(s.stats.pulls) >= 19 },
  { id: "col10",      n: "図鑑うすい",           d: "コレクション10種",                c: s => ownedCount(s) >= 10 },
  { id: "col25",      n: "揃ってきた",           d: "コレクション25種",                c: s => ownedCount(s) >= 25 },
  { id: "col50",      n: "半分の壁",             d: "コレクション50種",                c: s => ownedCount(s) >= 50 },
  { id: "col65",      n: "あと少し",             d: "コレクション65種",                c: s => ownedCount(s) >= 65 },
  { id: "colAll",     n: "コンプリート",         d: "全71種をコンプ",                  c: s => ownedCount(s) >= ITEMS.length },
  { id: "allN",       n: "Nマスター",            d: "N全種コンプ",                     c: s => rarityComplete(s, "N") },
  { id: "allR",       n: "Rマスター",            d: "R全種コンプ",                     c: s => rarityComplete(s, "R") },
  { id: "allSR",      n: "SRマスター",           d: "SR全種コンプ",                    c: s => rarityComplete(s, "SR") },
  { id: "allSSR",     n: "SSRマスター",          d: "SSR全種コンプ",                   c: s => rarityComplete(s, "SSR") },
  { id: "allUR",      n: "URマスター",           d: "UR全種コンプ",                    c: s => rarityComplete(s, "UR") },
  { id: "allLR",      n: "LRマスター",           d: "LR全種コンプ(廃人)",              c: s => rarityComplete(s, "LR") },
  { id: "shopFirst",  n: "星屑で交換",           d: "星屑ショップを初めて利用",        c: s => s.flags.shopUsed },
  { id: "idle1h",     n: "放置で貯まる",         d: "オフライン報酬を初めて受け取る",  c: s => s.flags.offlineClaimed },
  { id: "free10",     n: "タダより",             d: "無料枠を10回使う",                c: s => s.stats.freePulls >= 10 },
  { id: "hero",       n: "勇者を添えて",         d: "『選ばれし勇者アル』を入手",      c: s => !!s.owned["ssr_hero"] },
  { id: "dev",        n: "作った人",             d: "『このゲームの開発者』を入手",    c: s => !!s.owned["lr_dev"] },
];

function rankIndex(pulls) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (pulls >= RANKS[i][0]) idx = i;
  return idx;
}
function ownedCount(s) { return Object.keys(s.owned).length; }
function rarityComplete(s, r) {
  const all = ITEMS.filter(it => it.r === r);
  return all.every(it => s.owned[it.id]);
}
