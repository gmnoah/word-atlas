import { atlasMap, findTargetInExample } from "./generate-middle-curriculum.ts";
import { middleFull } from "../src/courses/middle-full.ts";
import { primaryFull } from "../src/courses/primary-full.ts";

export interface UnitDef {
  id: string;
  title: string;
  subtitle: string;
  words: string[];
}

const used = new Set<string>([
  ...middleFull.entries.map((e) => e.word.toLowerCase()),
  ...primaryFull.entries.map((e) => e.word.toLowerCase()),
]);

// Helper to select from pools or candidate lists
function pickFrom(candidateList: string[], count = 10): string[] {
  const chosen: string[] = [];
  for (const w of candidateList) {
    const lw = w.toLowerCase();
    if (used.has(lw)) continue;
    const item = atlasMap.get(lw);
    if (!item) continue;
    if (!item.senses?.[0]?.pos || !item.senses?.[0]?.zh) continue;
    if (!item.col?.[0]) continue;
    if (!findTargetInExample(lw, item.ex)) continue;
    chosen.push(lw);
    used.add(lw);
    if (chosen.length === count) break;
  }
  if (chosen.length < count) {
    throw new Error(`Could not pick ${count} words from candidates. Got ${chosen.length}`);
  }
  return chosen;
}

// Helper to pick by topic keywords or tags
function pickByTopic(topic: string, count = 10): string[] {
  const list: string[] = [];
  for (const [w, item] of atlasMap) {
    if (used.has(w)) continue;
    if (!["A1", "A2", "B1"].includes(item.cefr)) continue;
    if (item.topic !== topic) continue;
    if (!item.senses?.[0]?.pos || !item.senses?.[0]?.zh) continue;
    if (!item.col?.[0]) continue;
    if (!findTargetInExample(w, item.ex)) continue;
    list.push(w);
    if (list.length >= count * 3) break;
  }
  return pickFrom(list, count);
}

// Stage 3 Units (Units 31–60: 30 units × 10 = 300 words)
export const stage3Units: UnitDef[] = [
  { id: "family-bonds", title: "亲情与家庭时光", subtitle: "温暖港湾，与家人共度的日常", words: pickFrom(["parent", "daughter", "son", "cousin", "elder", "comfort", "gather", "belong", "baby", "relative", "sister", "brother"]) },
  { id: "classroom-study", title: "课堂与探究学习", subtitle: "孜孜不倦，在解惑中获得启发", words: pickFrom(["lesson", "develop", "improve", "basic", "calculator", "essay", "attend", "title", "comma", "topic", "grade", "term"]) },
  { id: "reading-books", title: "阅读与经典书卷", subtitle: "书页墨香，开启心灵的另一重世界", words: pickFrom(["chapter", "edition", "paragraph", "review", "content", "print", "author", "story", "note", "sentence", "text", "reader"]) },
  { id: "arts-painting", title: "绘画与视觉艺术", subtitle: "画笔落处，记录生命与斑斓色彩", words: pickFrom(["gallery", "drawing", "painter", "sketch", "colour", "shade", "portrait", "sculpture", "comedy", "circus", "drama", "ending"]) },
  { id: "festivals-celebration", title: "节日与庆典民俗", subtitle: "千家灯火，共享节日的喜悦与祝福", words: pickFrom(["celebrate", "tradition", "parade", "lantern", "ceremony", "feast", "gift", "annual", "memorial", "event", "party", "holiday"]) },
  { id: "geography-landscapes", title: "地理与山川风貌", subtitle: "踏遍江山，领略大自然的鬼斧神工", words: pickFrom(["desert", "canyon", "plain", "peak", "volcano", "cliff", "landscape", "slope", "valley", "land", "earth", "sand"]) },
  { id: "plants-botany", title: "植物与森林生机", subtitle: "草木欣荣，繁花与绿荫的低语", words: pickFrom(["seed", "root", "branch", "leaf", "blossom", "trunk", "sprout", "bark", "soil", "tree", "plant", "forest"]) },
  { id: "energy-environment", title: "能源与绿色生态", subtitle: "低碳环保，呵护我们共同的蔚蓝星球", words: pickFrom(["energy", "solar", "recycle", "waste", "rubbish", "clean", "coal", "fuel", "resource", "oil", "noise", "garbage"]) },
  { id: "rules-laws", title: "规则与法治意识", subtitle: "方圆有度，遵纪守法共筑清朗社会", words: pickFrom(["legal", "court", "judge", "crime", "punish", "police", "guilty", "prison", "ban", "law", "rule", "order"]) },
  { id: "volunteer-caring", title: "志愿与关爱同行", subtitle: "微光成炬，为需要帮助的人点亮温暖", words: pickFrom(["support", "kindness", "shelter", "aid", "charity", "caring", "warmth", "help", "care", "share", "give", "friend"]) },
  { id: "world-cultures", title: "多元世界与民俗", subtitle: "文明互鉴，拥抱异域的绚烂文化", words: pickFrom(["custom", "culture", "foreign", "abroad", "global", "citizen", "ethnic", "costume", "native", "world", "nation", "people"]) },
  { id: "languages-speech", title: "语言与演讲沟通", subtitle: "巧舌如簧，以真挚的话语打动人心", words: pickFrom(["accent", "grammar", "pronounce", "speech", "fluent", "express", "tone", "phrase", "vocabulary", "translate", "voice", "word"]) },
  { id: "money-trade", title: "商业与诚信贸易", subtitle: "一诺千金，在交往中坚守信誉与品质", words: pickFrom(["trade", "business", "company", "contract", "profit", "customer", "sale", "merchant", "deal", "cash", "penny", "pound"]) },
  { id: "architecture-buildings", title: "建筑与空间之美", subtitle: "雕梁画栋，凝固在石块上的历史乐章", words: pickFrom(["tower", "hall", "column", "arch", "balcony", "roof", "gate", "brick", "concrete", "structure", "wall", "bridge"]) },
  { id: "mind-cognition", title: "心智与思维模式", subtitle: "沉静思索，开启深度思考的智慧之门", words: pickFrom(["memory", "focus", "imagine", "concentrate", "brain", "think", "wisdom", "curious", "interest", "guess", "mean", "seem"]) },
  { id: "time-seasons", title: "光阴与四季流转", subtitle: "斗转星移，岁月在指缝间悄然生长", words: pickFrom(["season", "autumn", "winter", "spring", "summer", "period", "duration", "calendar", "dawn", "dusk", "hour", "clock"]) },
  { id: "travel-adventure", title: "探险与山野徒步", subtitle: "背起行囊，奔赴未知的山海与旷野", words: pickFrom(["adventure", "journey", "explore", "route", "compass", "backpack", "trail", "camp", "path", "tent", "rucksack", "tourist"]) },
  { id: "kitchen-cooking", title: "烹饪与风味记忆", subtitle: "烟火人间，舌尖上的亲情与暖意", words: pickFrom(["bake", "roast", "boil", "fry", "flavour", "ingredient", "recipe", "delicious", "spice", "taste", "dish", "cook"]) },
  { id: "digital-future", title: "数字化与智能未来", subtitle: "算法驱动，迎接人机共存的崭新时代", words: pickFrom(["digital", "screen", "keyboard", "printer", "computer", "internet", "wireless", "password", "headphone", "tablet", "app", "download"]) },
  { id: "friendship-trust", title: "信赖与并肩同行", subtitle: "风雨同舟，挚友同行的每一步皆是阳光", words: pickFrom(["companion", "fellow", "faithful", "bond", "devoted", "rely", "warmth", "friendly", "friend", "trust", "honest", "kind"]) },
  { id: "diligence-success", title: "恒心与奋斗之路", subtitle: "滴水穿石，每一份付出终将迎来繁花", words: pickFrom(["diligence", "progress", "triumph", "persistence", "goal", "aim", "target", "strive", "work", "grow", "success", "effort"]) },
  { id: "health-habits", title: "卫生与生活习惯", subtitle: "细微之处，守护身心健康的好习惯", words: pickFrom(["hygiene", "soap", "towel", "brush", "rest", "sleep", "pure", "fresh", "clean", "habit", "wash", "water"]) },
  { id: "sportsmanship-spirit", title: "体育精神与毅力", subtitle: "更快更高，永不言弃的赛场品格", words: pickFrom(["victory", "defeat", "spirit", "fair", "opponent", "team", "score", "referee", "running", "jogging", "skiing", "soccer"]) },
  { id: "instruments-harmony", title: "乐器与和弦交响", subtitle: "弦歌不辍，指尖跳跃的华美音符", words: pickFrom(["violin", "flute", "drum", "trumpet", "harp", "organ", "instrument", "chord", "jazz", "band", "music", "play"]) },
  { id: "astronomy-skies", title: "星空与夜幕天文", subtitle: "银河漫漫，探寻浩渺深空的神秘起源", words: pickFrom(["constellation", "planet", "meteor", "eclipse", "satellite", "crater", "gravity", "starlight", "midnight", "sunset", "sky", "space"]) },
  { id: "river-lakes", title: "江河与湿地生态", subtitle: "润泽万物，蜿蜒流淌的生命之水", words: pickFrom(["stream", "creek", "canal", "lake", "swamp", "wetland", "bank", "delta", "basin", "flow", "river", "water"]) },
  { id: "climate-change", title: "气候变迁与应对", subtitle: "同呼吸共命运，应对全球气候挑战", words: pickFrom(["greenhouse", "carbon", "emission", "warming", "melt", "threat", "disaster", "crisis", "survive", "action", "weather", "air"]) },
  { id: "materials-matter", title: "物质与材料科学", subtitle: "微观世界，构成万物的元素与质感", words: pickFrom(["plastic", "glass", "rubber", "wood", "cotton", "iron", "copper", "steel", "substance", "metal", "chemistry", "physics"]) },
  { id: "ancient-tales", title: "神话与古老传说", subtitle: "口耳相传，岁月尘封的英雄传奇", words: pickFrom(["legend", "monster", "dragon", "heroic", "fable", "tomb", "scroll", "magic", "wonder", "story", "king", "queen"]) },
  { id: "future-vision", title: "未来憧憬与展望", subtitle: "放眼远方，少年胸中自有一片浩瀚天地", words: pickFrom(["vision", "aspire", "destiny", "prospect", "inspire", "promise", "hope", "dream", "wish", "future", "world", "light"]) }
];

console.log(`Stage 3 successfully curated: ${stage3Units.length} units, total words: ${stage3Units.reduce((acc, u) => acc + u.words.length, 0)}`);
