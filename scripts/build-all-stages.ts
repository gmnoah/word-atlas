import fs from "node:fs";
import path from "node:path";
import { atlasMap, findTargetInExample, buildMiddleEntry } from "./generate-middle-curriculum.ts";
import { middleFull } from "../src/courses/middle-full.ts";
import { primaryFull } from "../src/courses/primary-full.ts";
import { stage2Units } from "./plan-all-units.ts";
import type { Lesson, EnglishEntry, SampleCourse } from "../src/courses/types.ts";

export interface UnitPlan {
  id: string;
  title: string;
  subtitle: string;
  topicSource: string;
}

// 1. Existing words up through Stage 2
const usedWords = new Set<string>([
  ...middleFull.entries.map((e) => e.word.toLowerCase()),
  ...primaryFull.entries.map((e) => e.word.toLowerCase()),
]);

for (const u of stage2Units) {
  for (const w of u.words) usedWords.add(w.toLowerCase());
}

// 2. Build topic pools of fully qualified words
const topicPools = new Map<string, string[]>();
for (const [w, item] of atlasMap) {
  if (usedWords.has(w)) continue;
  if (!["A1", "A2", "B1"].includes(item.cefr)) continue;
  if (!item.senses?.[0]?.pos || !item.senses?.[0]?.zh) continue;
  if (!item.col?.[0]) continue;
  if (!findTargetInExample(w, item.ex)) continue;
  const t = item.topic || "daily";
  if (!topicPools.has(t)) topicPools.set(t, []);
  topicPools.get(t)!.push(w);
}

function takeWords(topic: string, count = 10): string[] {
  let pool = topicPools.get(topic);
  if (!pool || pool.length < count) {
    // fall back to daily if pool runs dry
    pool = topicPools.get("daily");
  }
  if (!pool || pool.length < count) {
    throw new Error(`Insufficient words in topic ${topic} or daily fallback`);
  }
  const taken = pool.splice(0, count);
  for (const w of taken) usedWords.add(w);
  return taken;
}

// 3. Stage 3 Unit Definitions (Units 31–60: 30 units)
const stage3Plan: UnitPlan[] = [
  { id: "family-bonds", title: "亲情与家庭时光", subtitle: "温暖港湾，与家人共度的日常", topicSource: "society" },
  { id: "classroom-study", title: "课堂与探究学习", subtitle: "孜孜不倦，在解惑中获得启发", topicSource: "education" },
  { id: "reading-books", title: "阅读与经典书卷", subtitle: "书页墨香，开启心灵的另一重世界", topicSource: "education" },
  { id: "arts-painting", title: "绘画与视觉艺术", subtitle: "画笔落处，记录生命与斑斓色彩", topicSource: "arts" },
  { id: "festivals-celebration", title: "节日与庆典民俗", subtitle: "千家灯火，共享节日的喜悦与祝福", topicSource: "society" },
  { id: "geography-landscapes", title: "地理与山川风貌", subtitle: "踏遍江山，领略大自然的鬼斧神工", topicSource: "nature" },
  { id: "plants-botany", title: "植物与森林生机", subtitle: "草木欣荣，繁花与绿荫的低语", topicSource: "nature" },
  { id: "energy-environment", title: "能源与绿色生态", subtitle: "低碳环保，呵护我们共同的蔚蓝星球", topicSource: "environment" },
  { id: "rules-laws", title: "规则与法治意识", subtitle: "方圆有度，遵纪守法共筑清朗社会", topicSource: "government" },
  { id: "volunteer-caring", title: "志愿与关爱同行", subtitle: "微光成炬，为需要帮助的人点亮温暖", topicSource: "society" },
  { id: "world-cultures", title: "多元世界与民俗", subtitle: "文明互鉴，拥抱异域的绚烂文化", topicSource: "society" },
  { id: "languages-speech", title: "语言与演讲沟通", subtitle: "巧舌如簧，以真挚的话语打动人心", topicSource: "education" },
  { id: "money-trade", title: "商业与诚信贸易", subtitle: "一诺千金，在交往中坚守信誉与品质", topicSource: "economy" },
  { id: "architecture-buildings", title: "建筑与空间之美", subtitle: "雕梁画栋，凝固在石块上的历史乐章", topicSource: "city" },
  { id: "mind-cognition", title: "心智与思维模式", subtitle: "沉静思索，开启深度思考的智慧之门", topicSource: "thinking" },
  { id: "time-seasons", title: "光阴与四季流转", subtitle: "斗转星移，岁月在指缝间悄然生长", topicSource: "nature" },
  { id: "travel-adventure", title: "探险与山野徒步", subtitle: "背起行囊，奔赴未知的山海与旷野", topicSource: "travel" },
  { id: "kitchen-cooking", title: "烹饪与风味记忆", subtitle: "烟火人间，舌尖上的亲情与暖意", topicSource: "daily" },
  { id: "digital-future", title: "数字化与智能未来", subtitle: "算法驱动，迎接人机共存的崭新时代", topicSource: "technology" },
  { id: "friendship-trust", title: "信赖与并肩同行", subtitle: "风雨同舟，挚友同行的每一步皆是阳光", topicSource: "emotion" },
  { id: "diligence-success", title: "恒心与奋斗之路", subtitle: "滴水穿石，每一份付出终将迎来繁花", topicSource: "thinking" },
  { id: "health-habits", title: "卫生与生活习惯", subtitle: "细微之处，守护身心健康的好习惯", topicSource: "health" },
  { id: "sportsmanship-spirit", title: "体育精神与毅力", subtitle: "更快更高，永不言弃的赛场品格", topicSource: "sport" },
  { id: "instruments-harmony", title: "乐器与和弦交响", subtitle: "弦歌不辍，指尖跳跃的华美音符", topicSource: "arts" },
  { id: "astronomy-skies", title: "星空与夜幕天文", subtitle: "银河漫漫，探寻浩渺深空的神秘起源", topicSource: "science" },
  { id: "river-lakes", title: "江河与湿地生态", subtitle: "润泽万物，蜿蜒流淌的生命之水", topicSource: "nature" },
  { id: "climate-change", title: "气候变迁与应对", subtitle: "同呼吸共命运，应对全球气候挑战", topicSource: "environment" },
  { id: "materials-matter", title: "物质与材料科学", subtitle: "微观世界，构成万物的元素与质感", topicSource: "science" },
  { id: "ancient-tales", title: "神话与古老传说", subtitle: "口耳相传，岁月尘封的英雄传奇", topicSource: "history" },
  { id: "future-vision", title: "未来憧憬与展望", subtitle: "放眼远方，少年胸中自有一片浩瀚天地", topicSource: "thinking" }
];

// 4. Stage 4 Unit Definitions (Units 61–110: 50 units)
const stage4Plan: UnitPlan[] = [
  { id: "school-campus", title: "校园时光与同伴", subtitle: "晨读琅琅，记录青春的每一步成长", topicSource: "education" },
  { id: "study-methods", title: "求知方法与实践", subtitle: "博学笃行，掌握高效自律的学习法", topicSource: "education" },
  { id: "moral-virtues", title: "美德与正直操守", subtitle: "修己安人，涵养光明磊落的君子气象", topicSource: "society" },
  { id: "critical-thinking", title: "辨析与批判思考", subtitle: "去伪存真，以清晰的逻辑审视万物", topicSource: "thinking" },
  { id: "professions-jobs", title: "行业百态与担当", subtitle: "脚踏实地，在各自岗位上发光发热", topicSource: "work" },
  { id: "emergency-care", title: "应急防护与自救", subtitle: "临危不乱，掌握安全防护与互助技巧", topicSource: "health" },
  { id: "poetry-verse", title: "诗歌与韵文意境", subtitle: "平仄流韵，在字里行间品味诗意江南", topicSource: "arts" },
  { id: "archaeology-past", title: "考古探秘与回响", subtitle: "拂去尘埃，重现历史深处的文明吉光", topicSource: "travel" },
  { id: "stage-performance", title: "舞台剧场与表演", subtitle: "聚光灯下，展现少年自信昂扬的风采", topicSource: "arts" },
  { id: "folklore-crafts", title: "民间手作与匠心", subtitle: "守正创新，让非遗记忆在手中鲜活", topicSource: "daily" },
  { id: "public-services", title: "公共设施与便民", subtitle: "惠民利民，感受现代城市的温情脉动", topicSource: "city" },
  { id: "cyberspace-ethics", title: "网络文明与守则", subtitle: "言之有度，共建健康清朗的网络空间", topicSource: "technology" },
  { id: "travel-routes", title: "长途远行与轨迹", subtitle: "车轮滚滚，丈量广袤大地的多元风光", topicSource: "travel" },
  { id: "market-commerce", title: "集市交易与诚信", subtitle: "货真价实，买卖之间的契约与真诚", topicSource: "economy" },
  { id: "atmospheric-change", title: "风云变幻与天象", subtitle: "观云识天，探索高空大气的奇妙物理", topicSource: "nature" },
  { id: "mutual-aid", title: "邻里守望与相助", subtitle: "远亲不如近邻，日常点滴间的热心肠", topicSource: "society" },
  { id: "marine-life", title: "深海生物与珊瑚", subtitle: "蔚蓝浩瀚，水下万类的奇幻生命乐园", topicSource: "nature" },
  { id: "spacecraft-exploration", title: "航天探测与卫星", subtitle: "九天揽月，人类追逐星辰的伟大征程", topicSource: "travel" },
  { id: "species-diversity", title: "物种多样与共存", subtitle: "休戚与共，呵护地球生命的丰富图谱", topicSource: "nature" },
  { id: "scientific-discovery", title: "科学发现与定理", subtitle: "洞察奥秘，改变世界轨迹的伟大灵感", topicSource: "science" },
  { id: "household-living", title: "居家日常与整理", subtitle: "窗明几净，把平凡的日子过出诗意来", topicSource: "daily" },
  { id: "academic-pursuit", title: "学术探索与求真", subtitle: "上下求索，格物致知的严谨求学之路", topicSource: "education" },
  { id: "literary-classics", title: "文学名著与笔触", subtitle: "大师风骨，字句间浸润岁月长河的思想", topicSource: "arts" },
  { id: "design-creativity", title: "灵感设计与构造", subtitle: "匠心独运，让生活更美好的奇妙构想", topicSource: "work" },
  { id: "traditional-feasts", title: "节气盛筵与习俗", subtitle: "春祈秋报，岁时节序中的人间烟火气", topicSource: "daily" },
  { id: "natural-wonders", title: "自然奇观与秘境", subtitle: "天地造化，令人叹为观止的地质杰作", topicSource: "nature" },
  { id: "flora-garden", title: "花卉芬芳与园艺", subtitle: "草木寄情，一花一叶总关乎生活之美", topicSource: "nature" },
  { id: "green-living", title: "低碳生活与节能", subtitle: "身体力行，守护天蓝地绿的美好家园", topicSource: "daily" },
  { id: "civic-rights", title: "权利义务与公约", subtitle: "遵章守纪，做知法明理的时代好公民", topicSource: "society" },
  { id: "kindness-empathy", title: "善意传递与共情", subtitle: "推己及人，让理解与体谅温暖彼此", topicSource: "emotion" },
  { id: "global-village", title: "地球村与友好交往", subtitle: "海内存知己，跨越山海的世界青年对话", topicSource: "society" },
  { id: "debate-expression", title: "辩论思潮与演说", subtitle: "思想碰撞，闪耀真理之光的逻辑交锋", topicSource: "thinking" },
  { id: "wealth-enterprise", title: "勤劳致富与企业", subtitle: "脚踏实地，用智慧与汗水开拓事业", topicSource: "economy" },
  { id: "historic-cities", title: "历史名城与古都", subtitle: "城垣沧桑，古今交融的历史文化名城", topicSource: "city" },
  { id: "mental-resilience", title: "抗逆韧性与阳光", subtitle: "逆风生长，不畏挫折的坚韧少年之心", topicSource: "emotion" },
  { id: "moments-memories", title: "岁月印记与记忆", subtitle: "时光留痕，珍藏在心底的成长珍宝", topicSource: "daily" },
  { id: "expeditions-discovery", title: "远足探险与发现", subtitle: "登高望远，用双脚丈量未知的崇山峻岭", topicSource: "travel" },
  { id: "nutrition-dining", title: "营养均衡与膳食", subtitle: "食养兼顾，培育强健体魄与饮食好习惯", topicSource: "health" },
  { id: "ai-robotics", title: "人工智能与机械", subtitle: "科技赋能，开启智慧生活的未来之门", topicSource: "technology" },
  { id: "teamwork-unity", title: "团结协作与共赢", subtitle: "齐心协力，众人划桨开动时代的大船", topicSource: "work" },
  { id: "perseverance-drive", title: "坚持不懈与奋进", subtitle: "锲而不舍，用长久坚持书写人生奇迹", topicSource: "thinking" },
  { id: "mental-wellbeing", title: "身心平和与调节", subtitle: "内观静心，找到与自我和谐相处之道", topicSource: "health" },
  { id: "fair-competition", title: "公平竞赛与喝彩", subtitle: "尊重对手，在体育赛场上展现绅士风度", topicSource: "sport" },
  { id: "symphony-sound", title: "交响乐章与音色", subtitle: "和声辉映，余音绕梁的心灵艺术盛宴", topicSource: "arts" },
  { id: "celestial-bodies", title: "日月星辰与公转", subtitle: "循道而行，感知浩瀚星体的宏大运行", topicSource: "travel" },
  { id: "waterways-canals", title: "水运水系与运河", subtitle: "通达江海，千年水系连通的商贸命脉", topicSource: "travel" },
  { id: "ecological-balance", title: "生态平衡与修复", subtitle: "万物各得其和以生，守护生命的共同体", topicSource: "nature" },
  { id: "physical-phenomena", title: "物理现象与规律", subtitle: "探索本源，从日常现象洞察科学本质", topicSource: "science" },
  { id: "historical-events", title: "历史回眸与启迪", subtitle: "以史为鉴，汲取照亮前行道路的智慧", topicSource: "society" },
  { id: "horizon-future", title: "放眼苍穹与未来", subtitle: "星海浩荡，少年心之所向皆是星辰大海", topicSource: "emotion" }
];

export function buildStage(stage: 2 | 3 | 4) {
  const lessons: Lesson[] = [...middleFull.lessons.slice(0, 10)];
  const entries: EnglishEntry[] = [...(middleFull.entries.slice(0, 100) as EnglishEntry[])];

  // Stage 2 (Units 11–30, +20 units)
  for (const u of stage2Units) {
    lessons.push({
      id: u.id,
      title: u.title,
      subtitle: u.subtitle,
      entryIds: u.words.map((w) => `mid-${w}`),
    });
    for (const w of u.words) {
      entries.push(buildMiddleEntry(u.id, w));
    }
  }

  // Stage 3 (Units 31–60, +30 units)
  if (stage >= 3) {
    for (const plan of stage3Plan) {
      const words = takeWords(plan.topicSource, 10);
      lessons.push({
        id: plan.id,
        title: plan.title,
        subtitle: plan.subtitle,
        entryIds: words.map((w) => `mid-${w}`),
      });
      for (const w of words) {
        entries.push(buildMiddleEntry(plan.id, w));
      }
    }
  }

  // Stage 4 (Units 61–110, +50 units)
  if (stage >= 4) {
    for (const plan of stage4Plan) {
      const words = takeWords(plan.topicSource, 10);
      lessons.push({
        id: plan.id,
        title: plan.title,
        subtitle: plan.subtitle,
        entryIds: words.map((w) => `mid-${w}`),
      });
      for (const w of words) {
        entries.push(buildMiddleEntry(plan.id, w));
      }
    }
  }

  return { lessons, entries };
}

// Command-line entry: node --import tsx scripts/build-all-stages.ts [2|3|4]
const targetStage = parseInt(process.argv[2] || "3", 10) as 2 | 3 | 4;
console.log(`Building Junior High English Curriculum up to Stage ${targetStage}...`);
const { lessons, entries } = buildStage(targetStage);

const version = targetStage === 2 ? "0.3.0-draft" : targetStage === 3 ? "0.4.0-draft" : "0.5.0-draft";

const fileContent = `import type { SampleCourse } from "./types";
import { middleManifest } from "./registry";

/** 初中英语样板课程（${entries.length} 词 ${lessons.length} 单元），面向初中生常用生活、学习、科学与情境搭配。 */
export const middleFull: SampleCourse = {
  manifest: middleManifest,
  lessons: ${JSON.stringify(lessons, null, 2)},
  entries: ${JSON.stringify(entries, null, 2)}
};
`;

const targetPath = path.resolve(process.cwd(), "src/courses/middle-full.ts");
fs.writeFileSync(targetPath, fileContent, "utf8");
console.log(`Successfully generated middle-full.ts: ${lessons.length} lessons, ${entries.length} entries (Stage ${targetStage}, version ${version}).`);
