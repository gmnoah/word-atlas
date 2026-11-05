export interface UnitPlan {
  id: string;
  title: string;
  subtitle: string;
  words: string[];
}

export const stage2Units: UnitPlan[] = [
  { id: "health-fitness", title: "健康与体魄", subtitle: "规律作息，强健身心与体魄", words: ["diet", "fever", "stomach", "breathe", "healthy", "clinic", "cough", "medicine", "injury", "nurse"] },
  { id: "sports-games", title: "运动与竞技", subtitle: "赛场拼搏，汗水与团队荣耀", words: ["champion", "compete", "coach", "medal", "stadium", "beat", "player", "race", "court", "fan"] },
  { id: "personality-traits", title: "品格与素养", subtitle: "真诚谦逊，涵养阳光正直的心灵", words: ["modest", "generous", "reliable", "sensible", "polite", "positive", "sincere", "loyal", "clever", "wise"] },
  { id: "logic-reasoning", title: "逻辑与思辨", subtitle: "辨析真伪，用理性与证据说话", words: ["opinion", "argument", "reason", "prove", "doubt", "evidence", "explain", "judge", "statement", "point"] },
  { id: "career-aspiration", title: "职业与使命", subtitle: "各展所长，探索心中的未来航道", words: ["career", "volunteer", "profession", "engineer", "lawyer", "pilot", "artist", "duty", "salary", "task"] },
  { id: "safety-firstaid", title: "安全与急救", subtitle: "防患未然，危急时刻沉着自救", words: ["danger", "warning", "accident", "rescue", "safety", "damage", "shelter", "urgent", "prevent", "escape"] },
  { id: "drama-literature", title: "戏剧与文学", subtitle: "纸上风云，在剧场与名著中穿行", words: ["novel", "poem", "character", "plot", "theatre", "dialogue", "author", "scene", "classic", "tale"] },
  { id: "history-heritage", title: "历史与文明", subtitle: "岁月沉淀，倾听古老遗迹的回响", words: ["ancient", "century", "monument", "museum", "temple", "castle", "pyramid", "ruin", "palace", "statue"] },
  { id: "music-melody", title: "音乐与律动", subtitle: "音符流淌，琴键与和声的交响", words: ["melody", "compose", "orchestra", "chorus", "concert", "tune", "classical", "voice", "musical", "piano"] },
  { id: "craft-tradition", title: "传统与非遗", subtitle: "指尖匠心，薪火相传的岁月器物", words: ["craftsman", "pattern", "heritage", "clay", "treasure", "folk", "pottery", "weave", "silk", "carve"] },
  { id: "community-civics", title: "社区与公民", subtitle: "互助友爱，共建温暖守望的家园", words: ["neighbour", "donate", "service", "civic", "charity", "public", "assist", "society", "respect", "welfare"] },
  { id: "communication-media", title: "现代通讯与网络", subtitle: "数字互联，在信息浪潮中明辨前行", words: ["network", "privacy", "connect", "media", "message", "online", "information", "chat", "software", "email"] },
  { id: "city-transport", title: "城市与交通", subtitle: "车流交汇，穿行于晨昏的都市动脉", words: ["traffic", "vehicle", "subway", "passenger", "route", "signal", "crowded", "commute", "station", "speed"] },
  { id: "shopping-economy", title: "消费与理财", subtitle: "量入为出，学会规划生活的收支", words: ["price", "discount", "receipt", "cost", "market", "afford", "wallet", "budget", "value", "payment"] },
  { id: "weather-climate", title: "气象与气候", subtitle: "风云变幻，顺应四时冷暖的呼吸", words: ["forecast", "storm", "temperature", "freeze", "drought", "typhoon", "humid", "degree", "sunshine", "thunder"] },
  { id: "disaster-response", title: "减灾与救援", subtitle: "风雨同舟，灾难面前的互助与坚韧", words: ["earthquake", "flood", "disaster", "collapse", "alarm", "strike", "hero", "crisis", "victim", "drown"] },
  { id: "ocean-polar", title: "海洋与极地", subtitle: "蔚蓝深渊，冰原与洋流的壮阔世界", words: ["marine", "depth", "current", "polar", "shore", "wave", "tide", "island", "coast", "whale"] },
  { id: "space-universe", title: "太空与宇宙", subtitle: "仰望星空，探索无垠星海与苍穹", words: ["astronaut", "rocket", "telescope", "orbit", "lunar", "launch", "solar", "universe", "comet", "shuttle"] },
  { id: "animal-wildlife", title: "野生动物与保护", subtitle: "生灵万物，守护自然的生命律动", words: ["wildlife", "extinct", "habitat", "feed", "rare", "fur", "hunt", "mammal", "nature", "threat"] },
  { id: "science-inventions", title: "科学与发明", subtitle: "求真求索，点亮未来的奇思妙想", words: ["patent", "create", "device", "method", "laboratory", "tool", "smart", "test", "microscope", "battery"] }
];
