import type { SampleCourse } from "./types";
import { hanziManifest } from "./registry";
import { extraHanziEntries, extraHanziLessons } from "./hanzi-extra";
import { expandedHanziEntries, expandedHanziLessons } from "./hanzi-expansion";

/** 全量内容，人工教学审校仍待完成。 */
const originalHanzi: SampleCourse = { manifest: hanziManifest, ...{
  "lessons": [
    {
      "id": "nature",
      "title": "山水之间",
      "subtitle": "一起看看大自然",
      "entryIds": [
        "hanzi-u5c71",
        "hanzi-u6c34",
        "hanzi-u65e5",
        "hanzi-u6708",
        "hanzi-u4e91"
      ]
    },
    {
      "id": "body",
      "title": "认识自己",
      "subtitle": "从小手到小脚",
      "entryIds": [
        "hanzi-u4eba",
        "hanzi-u53e3",
        "hanzi-u624b",
        "hanzi-u8db3",
        "hanzi-u76ee"
      ]
    },
    {
      "id": "garden",
      "title": "花园里",
      "subtitle": "读一读花草的名字",
      "entryIds": [
        "hanzi-u6728",
        "hanzi-u82b1",
        "hanzi-u96e8",
        "hanzi-u77f3",
        "hanzi-u7530"
      ]
    },
    {
      "id": "animals",
      "title": "动物与生活",
      "subtitle": "在生活里认识字",
      "entryIds": [
        "hanzi-u9e1f",
        "hanzi-u9c7c",
        "hanzi-u9a6c",
        "hanzi-u8033",
        "hanzi-u706b"
      ]
    },
    {
      "id": "draft-hanzi-01",
      "title": "我的家人",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u5bb6",
        "hanzi-u7238",
        "hanzi-u5988",
        "hanzi-u54e5",
        "hanzi-u59d0",
        "hanzi-u5f1f",
        "hanzi-u59b9",
        "hanzi-u7237",
        "hanzi-u5976",
        "hanzi-u5b69"
      ]
    },
    {
      "id": "draft-hanzi-02",
      "title": "大小与方位",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u5927",
        "hanzi-u5c0f",
        "hanzi-u591a",
        "hanzi-u5c11",
        "hanzi-u4e0a",
        "hanzi-u4e0b",
        "hanzi-u5de6",
        "hanzi-u53f3",
        "hanzi-u91cc",
        "hanzi-u5916"
      ]
    },
    {
      "id": "draft-hanzi-03",
      "title": "自然与天气",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u5929",
        "hanzi-u5730",
        "hanzi-u98ce",
        "hanzi-u96ea",
        "hanzi-u5149",
        "hanzi-u661f",
        "hanzi-u6797",
        "hanzi-u6d77",
        "hanzi-u6cb3",
        "hanzi-u6e56"
      ]
    },
    {
      "id": "draft-hanzi-04",
      "title": "四季和时光",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u6625",
        "hanzi-u590f",
        "hanzi-u79cb",
        "hanzi-u51ac",
        "hanzi-u65e9",
        "hanzi-u665a",
        "hanzi-u4eca",
        "hanzi-u660e",
        "hanzi-u5e74",
        "hanzi-u65f6"
      ]
    },
    {
      "id": "draft-hanzi-05",
      "title": "吃饭喝水",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u5403",
        "hanzi-u559d",
        "hanzi-u996d",
        "hanzi-u679c",
        "hanzi-u83dc",
        "hanzi-u7c73",
        "hanzi-u9762",
        "hanzi-u8336",
        "hanzi-u86cb",
        "hanzi-u751c"
      ]
    },
    {
      "id": "draft-hanzi-06",
      "title": "书桌与家",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u4e66",
        "hanzi-u672c",
        "hanzi-u7b14",
        "hanzi-u753b",
        "hanzi-u7eb8",
        "hanzi-u684c",
        "hanzi-u6905",
        "hanzi-u95e8",
        "hanzi-u7a97",
        "hanzi-u706f"
      ]
    },
    {
      "id": "draft-hanzi-07",
      "title": "动物与植物",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u732b",
        "hanzi-u72d7",
        "hanzi-u725b",
        "hanzi-u7f8a",
        "hanzi-u9e21",
        "hanzi-u9e2d",
        "hanzi-u5154",
        "hanzi-u866b",
        "hanzi-u8349",
        "hanzi-u53f6"
      ]
    },
    {
      "id": "draft-hanzi-08",
      "title": "一起做动作",
      "subtitle": "和孩子一起在生活里找找",
      "entryIds": [
        "hanzi-u8d70",
        "hanzi-u8dd1",
        "hanzi-u8df3",
        "hanzi-u5750",
        "hanzi-u770b",
        "hanzi-u542c",
        "hanzi-u8bf4",
        "hanzi-u7b11",
        "hanzi-u6d17",
        "hanzi-u7761"
      ]
    }
  ],
  "entries": [
    {
      "kind": "hanzi",
      "id": "hanzi-u5c71",
      "topicId": "nature",
      "character": "山",
      "pinyin": "shān",
      "phrase": "高山",
      "sentence": "远处有一座高山。",
      "question": "远处高高隆起的地方，是什么？",
      "caregiverTip": "和孩子看看窗外，或找一本有山的绘本。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/mountain.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6c34",
      "topicId": "nature",
      "character": "水",
      "pinyin": "shuǐ",
      "phrase": "清水",
      "sentence": "清水倒进杯子里。",
      "question": "杯子里倒入的，是什么？",
      "caregiverTip": "在家找一找水，聊聊什么时候需要用水。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/water.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u65e5",
      "topicId": "nature",
      "character": "日",
      "pinyin": "rì",
      "phrase": "日光",
      "sentence": "日光照着海边。",
      "question": "“日光”是太阳的光，找找表示太阳的字。",
      "caregiverTip": "和孩子看看阳光照亮的地方，不要直视太阳。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/sun.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6708",
      "topicId": "nature",
      "character": "月",
      "pinyin": "yuè",
      "phrase": "月亮",
      "sentence": "月亮挂在夜空中。",
      "question": "夜空中有时圆圆、有时弯弯的，是什么？",
      "caregiverTip": "和孩子在绘本里找找不同形状的月亮。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/moon.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u4e91",
      "topicId": "nature",
      "character": "云",
      "pinyin": "yún",
      "phrase": "白云",
      "sentence": "天空中飘着白云。",
      "question": "天空里一团团飘着的，是什么？",
      "caregiverTip": "看看窗外的云，想象它像什么。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/cloud.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u4eba",
      "topicId": "body",
      "character": "人",
      "pinyin": "rén",
      "phrase": "行人",
      "sentence": "一位行人在路边等车。",
      "question": "“行人”是走在路上的人，找找表示人的字。",
      "caregiverTip": "在安全的地方看看路上的行人，聊聊过马路要注意什么。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/person.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u53e3",
      "topicId": "body",
      "character": "口",
      "pinyin": "kǒu",
      "phrase": "张口",
      "sentence": "看牙齿时，她张开了口。",
      "question": "我们用嘴巴吃东西，哪个字也表示嘴巴？",
      "caregiverTip": "和孩子一起张口、闭口，注意不是练习发音评分。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/mouth.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u624b",
      "topicId": "body",
      "character": "手",
      "pinyin": "shǒu",
      "phrase": "小手",
      "sentence": "手心里有一块小石头。",
      "question": "拿石头和挥一挥时，我们用什么？",
      "caregiverTip": "挥挥手，拍一拍手，找找手还能做什么。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hand.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8db3",
      "topicId": "body",
      "character": "足",
      "pinyin": "zú",
      "phrase": "足迹",
      "sentence": "沙滩上留下了足迹。",
      "question": "“足迹”就是脚印，找找表示脚的字。",
      "caregiverTip": "和孩子看看脚印，聊聊它们是怎么留下的。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/foot.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u76ee",
      "topicId": "body",
      "character": "目",
      "pinyin": "mù",
      "phrase": "目光",
      "sentence": "她的目光落在蝴蝶上。",
      "question": "“目光”和眼睛有关，找找表示眼睛的字。",
      "caregiverTip": "和孩子一起眨眨眼，聊聊看见了什么。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/eye.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6728",
      "topicId": "garden",
      "character": "木",
      "pinyin": "mù",
      "phrase": "木头",
      "sentence": "桌子是用木头做的。",
      "question": "树干可以做成木头，找找表示木头的字。",
      "caregiverTip": "在家看看哪些物品是木头做的。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/tree.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u82b1",
      "topicId": "garden",
      "character": "花",
      "pinyin": "huā",
      "phrase": "小花",
      "sentence": "小花开了。",
      "question": "花园里开出漂亮花瓣的，是什么？",
      "caregiverTip": "找一种花，说说它的颜色。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/flower.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u96e8",
      "topicId": "garden",
      "character": "雨",
      "pinyin": "yǔ",
      "phrase": "下雨",
      "sentence": "下雨了，我们撑起伞。",
      "question": "从云里落下的小水滴，叫什么？",
      "caregiverTip": "听一听下雨的声音，或翻翻雨天的绘本。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/rain.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u77f3",
      "topicId": "garden",
      "character": "石",
      "pinyin": "shí",
      "phrase": "石头",
      "sentence": "路边有一块石头。",
      "question": "路边硬硬的一块，可以叫它什么？",
      "caregiverTip": "由家长找一块安全的大石头，一起看看纹路。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/stone.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7530",
      "topicId": "garden",
      "character": "田",
      "pinyin": "tián",
      "phrase": "田地",
      "sentence": "田地里长着庄稼。",
      "question": "用来种庄稼的一块土地，叫什么？",
      "caregiverTip": "在绘本或照片里看看田地里的庄稼。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/field.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u9e1f",
      "topicId": "animals",
      "character": "鸟",
      "pinyin": "niǎo",
      "phrase": "小鸟",
      "sentence": "小鸟停在树上。",
      "question": "有羽毛、会叽叽叫的动物，是什么？",
      "caregiverTip": "找找绘本里的鸟，看看它的翅膀。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/bird.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u9c7c",
      "topicId": "animals",
      "character": "鱼",
      "pinyin": "yú",
      "phrase": "小鱼",
      "sentence": "小鱼在水里游。",
      "question": "在水里游来游去、有鳍的动物，是什么？",
      "caregiverTip": "用手模仿小鱼游泳。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/fish.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u9a6c",
      "topicId": "animals",
      "character": "马",
      "pinyin": "mǎ",
      "phrase": "小马",
      "sentence": "小马在草地上跑。",
      "question": "可以在草地上奔跑、长着马鬃的动物，是什么？",
      "caregiverTip": "看看马的图片，模仿轻轻的马蹄声。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/horse.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8033",
      "topicId": "animals",
      "character": "耳",
      "pinyin": "ěr",
      "phrase": "耳朵",
      "sentence": "我们用耳朵听声音。",
      "question": "听故事时，我们用什么来听？",
      "caregiverTip": "闭上眼睛，听听身边有哪些声音。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/ear.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u706b",
      "topicId": "animals",
      "character": "火",
      "pinyin": "huǒ",
      "phrase": "火苗",
      "sentence": "火苗亮起来了。",
      "question": "燃烧时亮起来的小火苗，用哪个字表示？",
      "caregiverTip": "只看图认识火，提醒孩子不碰火、不玩火。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/fire.webp",
        "recording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5bb6",
      "topicId": "draft-hanzi-01",
      "character": "家",
      "pinyin": "jiā",
      "phrase": "家人",
      "sentence": "我和家人在一起。",
      "question": "这句话里缺了哪个字？我和□人在一起。",
      "caregiverTip": "和孩子在生活里找找“家人”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/family.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7238",
      "topicId": "draft-hanzi-01",
      "character": "爸",
      "pinyin": "bà",
      "phrase": "爸爸",
      "sentence": "爸爸陪我看书。",
      "question": "这句话里缺了哪个字？□□陪我看书。",
      "caregiverTip": "和孩子在生活里找找“爸爸”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u7238.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5988",
      "topicId": "draft-hanzi-01",
      "character": "妈",
      "pinyin": "mā",
      "phrase": "妈妈",
      "sentence": "妈妈陪我散步。",
      "question": "这句话里缺了哪个字？□□陪我散步。",
      "caregiverTip": "和孩子在生活里找找“妈妈”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u5988.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u54e5",
      "topicId": "draft-hanzi-01",
      "character": "哥",
      "pinyin": "gē",
      "phrase": "哥哥",
      "sentence": "哥哥和我玩球。",
      "question": "这句话里缺了哪个字？□□和我玩球。",
      "caregiverTip": "和孩子在生活里找找“哥哥”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u54e5.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u59d0",
      "topicId": "draft-hanzi-01",
      "character": "姐",
      "pinyin": "jiě",
      "phrase": "姐姐",
      "sentence": "姐姐在画画。",
      "question": "这句话里缺了哪个字？□□在画画。",
      "caregiverTip": "和孩子在生活里找找“姐姐”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u59d0.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5f1f",
      "topicId": "draft-hanzi-01",
      "character": "弟",
      "pinyin": "dì",
      "phrase": "弟弟",
      "sentence": "弟弟喜欢小狗。",
      "question": "这句话里缺了哪个字？□□喜欢小狗。",
      "caregiverTip": "和孩子在生活里找找“弟弟”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u5f1f.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u59b9",
      "topicId": "draft-hanzi-01",
      "character": "妹",
      "pinyin": "mèi",
      "phrase": "妹妹",
      "sentence": "妹妹拿着一本书。",
      "question": "这句话里缺了哪个字？□□拿着一本书。",
      "caregiverTip": "和孩子在生活里找找“妹妹”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u59b9.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7237",
      "topicId": "draft-hanzi-01",
      "character": "爷",
      "pinyin": "yé",
      "phrase": "爷爷",
      "sentence": "爷爷坐在树下。",
      "question": "这句话里缺了哪个字？□□坐在树下。",
      "caregiverTip": "和孩子在生活里找找“爷爷”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/grandfather.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5976",
      "topicId": "draft-hanzi-01",
      "character": "奶",
      "pinyin": "nǎi",
      "phrase": "奶奶",
      "sentence": "奶奶给花浇水。",
      "question": "这句话里缺了哪个字？□□给花浇水。",
      "caregiverTip": "和孩子在生活里找找“奶奶”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/grandmother.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5b69",
      "topicId": "draft-hanzi-01",
      "character": "孩",
      "pinyin": "hái",
      "phrase": "孩子",
      "sentence": "孩子们一起唱歌。",
      "question": "这句话里缺了哪个字？□子们一起唱歌。",
      "caregiverTip": "和孩子在生活里找找“孩子”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/child.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5927",
      "topicId": "draft-hanzi-02",
      "character": "大",
      "pinyin": "dà",
      "phrase": "大小",
      "sentence": "这个苹果很大。",
      "question": "这句话里缺了哪个字？这个苹果很□。",
      "caregiverTip": "和孩子在生活里找找“大小”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/big.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5c0f",
      "topicId": "draft-hanzi-02",
      "character": "小",
      "pinyin": "xiǎo",
      "phrase": "小鸟",
      "sentence": "小鸟落在树上。",
      "question": "这句话里缺了哪个字？□鸟落在树上。",
      "caregiverTip": "和孩子在生活里找找“小鸟”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/small.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u591a",
      "topicId": "draft-hanzi-02",
      "character": "多",
      "pinyin": "duō",
      "phrase": "多少",
      "sentence": "盘子里有很多水果。",
      "question": "这句话里缺了哪个字？盘子里有很□水果。",
      "caregiverTip": "和孩子在生活里找找“多少”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/many.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5c11",
      "topicId": "draft-hanzi-02",
      "character": "少",
      "pinyin": "shǎo",
      "phrase": "多少",
      "sentence": "杯子里的水很少。",
      "question": "这句话里缺了哪个字？杯子里的水很□。",
      "caregiverTip": "和孩子在生活里找找“多少”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/few.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u4e0a",
      "topicId": "draft-hanzi-02",
      "character": "上",
      "pinyin": "shàng",
      "phrase": "上面",
      "sentence": "小猫在椅子上面。",
      "question": "这句话里缺了哪个字？小猫在椅子□面。",
      "caregiverTip": "和孩子在生活里找找“上面”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/above.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u4e0b",
      "topicId": "draft-hanzi-02",
      "character": "下",
      "pinyin": "xià",
      "phrase": "下面",
      "sentence": "小球在桌子下面。",
      "question": "这句话里缺了哪个字？小球在桌子□面。",
      "caregiverTip": "和孩子在生活里找找“下面”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u4e0b.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5de6",
      "topicId": "draft-hanzi-02",
      "character": "左",
      "pinyin": "zuǒ",
      "phrase": "左边",
      "sentence": "书在杯子的左边。",
      "question": "这句话里缺了哪个字？书在杯子的□边。",
      "caregiverTip": "和孩子在生活里找找“左边”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u5de6.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u53f3",
      "topicId": "draft-hanzi-02",
      "character": "右",
      "pinyin": "yòu",
      "phrase": "右边",
      "sentence": "笔在本子的右边。",
      "question": "这句话里缺了哪个字？笔在本子的□边。",
      "caregiverTip": "和孩子在生活里找找“右边”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u53f3.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u91cc",
      "topicId": "draft-hanzi-02",
      "character": "里",
      "pinyin": "lǐ",
      "phrase": "里面",
      "sentence": "书包里面有书。",
      "question": "这句话里缺了哪个字？书包□面有书。",
      "caregiverTip": "和孩子在生活里找找“里面”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/inside.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5916",
      "topicId": "draft-hanzi-02",
      "character": "外",
      "pinyin": "wài",
      "phrase": "外面",
      "sentence": "窗户外面有树。",
      "question": "这句话里缺了哪个字？窗户□面有树。",
      "caregiverTip": "和孩子在生活里找找“外面”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/outside.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5929",
      "topicId": "draft-hanzi-03",
      "character": "天",
      "pinyin": "tiān",
      "phrase": "天空",
      "sentence": "天空中有白云。",
      "question": "这句话里缺了哪个字？□空中有白云。",
      "caregiverTip": "和孩子在生活里找找“天空”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/sky.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5730",
      "topicId": "draft-hanzi-03",
      "character": "地",
      "pinyin": "dì",
      "phrase": "地面",
      "sentence": "落叶铺在地面上。",
      "question": "这句话里缺了哪个字？落叶铺在□面上。",
      "caregiverTip": "和孩子在生活里找找“地面”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u5730.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u98ce",
      "topicId": "draft-hanzi-03",
      "character": "风",
      "pinyin": "fēng",
      "phrase": "风儿",
      "sentence": "风儿吹动树叶。",
      "question": "这句话里缺了哪个字？□儿吹动树叶。",
      "caregiverTip": "和孩子在生活里找找“风儿”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/wind.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u96ea",
      "topicId": "draft-hanzi-03",
      "character": "雪",
      "pinyin": "xuě",
      "phrase": "下雪",
      "sentence": "下雪了，屋顶白了。",
      "question": "这句话里缺了哪个字？下□了，屋顶白了。",
      "caregiverTip": "和孩子在生活里找找“下雪”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/snow.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5149",
      "topicId": "draft-hanzi-03",
      "character": "光",
      "pinyin": "guāng",
      "phrase": "阳光",
      "sentence": "阳光照进窗户。",
      "question": "这句话里缺了哪个字？阳□照进窗户。",
      "caregiverTip": "和孩子在生活里找找“阳光”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/light.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u661f",
      "topicId": "draft-hanzi-03",
      "character": "星",
      "pinyin": "xīng",
      "phrase": "星星",
      "sentence": "夜空中有星星。",
      "question": "这句话里缺了哪个字？夜空中有□□。",
      "caregiverTip": "和孩子在生活里找找“星星”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/star.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6797",
      "topicId": "draft-hanzi-03",
      "character": "林",
      "pinyin": "lín",
      "phrase": "树林",
      "sentence": "树林里有许多树。",
      "question": "这句话里缺了哪个字？树□里有许多树。",
      "caregiverTip": "和孩子在生活里找找“树林”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/forest.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6d77",
      "topicId": "draft-hanzi-03",
      "character": "海",
      "pinyin": "hǎi",
      "phrase": "大海",
      "sentence": "大海边有沙子。",
      "question": "这句话里缺了哪个字？大□边有沙子。",
      "caregiverTip": "和孩子在生活里找找“大海”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/sea.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6cb3",
      "topicId": "draft-hanzi-03",
      "character": "河",
      "pinyin": "hé",
      "phrase": "小河",
      "sentence": "小河里的水清清的。",
      "question": "这句话里缺了哪个字？小□里的水清清的。",
      "caregiverTip": "和孩子在生活里找找“小河”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/river.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6e56",
      "topicId": "draft-hanzi-03",
      "character": "湖",
      "pinyin": "hú",
      "phrase": "湖水",
      "sentence": "湖水映着天空。",
      "question": "这句话里缺了哪个字？□水映着天空。",
      "caregiverTip": "和孩子在生活里找找“湖水”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/lake.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6625",
      "topicId": "draft-hanzi-04",
      "character": "春",
      "pinyin": "chūn",
      "phrase": "春天",
      "sentence": "春天，小花开了。",
      "question": "这句话里缺了哪个字？□天，小花开了。",
      "caregiverTip": "和孩子在生活里找找“春天”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/spring.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u590f",
      "topicId": "draft-hanzi-04",
      "character": "夏",
      "pinyin": "xià",
      "phrase": "夏天",
      "sentence": "夏天，我们吃西瓜。",
      "question": "这句话里缺了哪个字？□天，我们吃西瓜。",
      "caregiverTip": "和孩子在生活里找找“夏天”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/summer.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u79cb",
      "topicId": "draft-hanzi-04",
      "character": "秋",
      "pinyin": "qiū",
      "phrase": "秋天",
      "sentence": "秋天，树叶落下来。",
      "question": "这句话里缺了哪个字？□天，树叶落下来。",
      "caregiverTip": "和孩子在生活里找找“秋天”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/autumn.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u51ac",
      "topicId": "draft-hanzi-04",
      "character": "冬",
      "pinyin": "dōng",
      "phrase": "冬天",
      "sentence": "冬天，我们穿外套。",
      "question": "这句话里缺了哪个字？□天，我们穿外套。",
      "caregiverTip": "和孩子在生活里找找“冬天”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/winter.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u65e9",
      "topicId": "draft-hanzi-04",
      "character": "早",
      "pinyin": "zǎo",
      "phrase": "早上",
      "sentence": "早上，我们说早安。",
      "question": "这句话里缺了哪个字？□上，我们说□安。",
      "caregiverTip": "和孩子在生活里找找“早上”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/morning.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u665a",
      "topicId": "draft-hanzi-04",
      "character": "晚",
      "pinyin": "wǎn",
      "phrase": "晚上",
      "sentence": "晚上，我们一起看书。",
      "question": "这句话里缺了哪个字？□上，我们一起看书。",
      "caregiverTip": "和孩子在生活里找找“晚上”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/evening.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u4eca",
      "topicId": "draft-hanzi-04",
      "character": "今",
      "pinyin": "jīn",
      "phrase": "今天",
      "sentence": "今天我们去公园。",
      "question": "这句话里缺了哪个字？□天我们去公园。",
      "caregiverTip": "和孩子在生活里找找“今天”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u4eca.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u660e",
      "topicId": "draft-hanzi-04",
      "character": "明",
      "pinyin": "míng",
      "phrase": "明天",
      "sentence": "明天我们一起画画。",
      "question": "这句话里缺了哪个字？□天我们一起画画。",
      "caregiverTip": "和孩子在生活里找找“明天”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u660e.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5e74",
      "topicId": "draft-hanzi-04",
      "character": "年",
      "pinyin": "nián",
      "phrase": "新年",
      "sentence": "新年到了，大家互相问好。",
      "question": "这句话里缺了哪个字？新□到了，大家互相问好。",
      "caregiverTip": "和孩子在生活里找找“新年”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u5e74.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u65f6",
      "topicId": "draft-hanzi-04",
      "character": "时",
      "pinyin": "shí",
      "phrase": "时间",
      "sentence": "吃饭的时间到了。",
      "question": "这句话里缺了哪个字？吃饭的□间到了。",
      "caregiverTip": "和孩子在生活里找找“时间”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/time.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5403",
      "topicId": "draft-hanzi-05",
      "character": "吃",
      "pinyin": "chī",
      "phrase": "吃饭",
      "sentence": "我们一起吃饭。",
      "question": "这句话里缺了哪个字？我们一起□饭。",
      "caregiverTip": "和孩子在生活里找找“吃饭”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/eat.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u559d",
      "topicId": "draft-hanzi-05",
      "character": "喝",
      "pinyin": "hē",
      "phrase": "喝水",
      "sentence": "运动后我喝水。",
      "question": "这句话里缺了哪个字？运动后我□水。",
      "caregiverTip": "和孩子在生活里找找“喝水”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/drink.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u996d",
      "topicId": "draft-hanzi-05",
      "character": "饭",
      "pinyin": "fàn",
      "phrase": "米饭",
      "sentence": "碗里有米饭。",
      "question": "这句话里缺了哪个字？碗里有米□。",
      "caregiverTip": "和孩子在生活里找找“米饭”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/meal.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u679c",
      "topicId": "draft-hanzi-05",
      "character": "果",
      "pinyin": "guǒ",
      "phrase": "水果",
      "sentence": "盘子里有水果。",
      "question": "这句话里缺了哪个字？盘子里有水□。",
      "caregiverTip": "和孩子在生活里找找“水果”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/fruit.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u83dc",
      "topicId": "draft-hanzi-05",
      "character": "菜",
      "pinyin": "cài",
      "phrase": "青菜",
      "sentence": "桌上有一盘青菜。",
      "question": "这句话里缺了哪个字？桌上有一盘青□。",
      "caregiverTip": "和孩子在生活里找找“青菜”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/vegetable.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7c73",
      "topicId": "draft-hanzi-05",
      "character": "米",
      "pinyin": "mǐ",
      "phrase": "大米",
      "sentence": "大米可以煮成饭。",
      "question": "这句话里缺了哪个字？大□可以煮成饭。",
      "caregiverTip": "和孩子在生活里找找“大米”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/rice.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u9762",
      "topicId": "draft-hanzi-05",
      "character": "面",
      "pinyin": "miàn",
      "phrase": "面条",
      "sentence": "碗里有热面条。",
      "question": "这句话里缺了哪个字？碗里有热□条。",
      "caregiverTip": "和孩子在生活里找找“面条”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u9762.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8336",
      "topicId": "draft-hanzi-05",
      "character": "茶",
      "pinyin": "chá",
      "phrase": "茶水",
      "sentence": "爷爷喝了一口茶水。",
      "question": "这句话里缺了哪个字？爷爷喝了一口□水。",
      "caregiverTip": "和孩子在生活里找找“茶水”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/tea.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u86cb",
      "topicId": "draft-hanzi-05",
      "character": "蛋",
      "pinyin": "dàn",
      "phrase": "鸡蛋",
      "sentence": "早餐有一个鸡蛋。",
      "question": "这句话里缺了哪个字？早餐有一个鸡□。",
      "caregiverTip": "和孩子在生活里找找“鸡蛋”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/egg.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u751c",
      "topicId": "draft-hanzi-05",
      "character": "甜",
      "pinyin": "tián",
      "phrase": "甜甜",
      "sentence": "这个苹果甜甜的。",
      "question": "这句话里缺了哪个字？这个苹果□□的。",
      "caregiverTip": "和孩子在生活里找找“甜甜”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/sweet.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u4e66",
      "topicId": "draft-hanzi-06",
      "character": "书",
      "pinyin": "shū",
      "phrase": "书本",
      "sentence": "我打开一本书。",
      "question": "这句话里缺了哪个字？我打开一本□。",
      "caregiverTip": "和孩子在生活里找找“书本”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/book.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u672c",
      "topicId": "draft-hanzi-06",
      "character": "本",
      "pinyin": "běn",
      "phrase": "本子",
      "sentence": "我在本子上画画。",
      "question": "这句话里缺了哪个字？我在□子上画画。",
      "caregiverTip": "和孩子在生活里找找“本子”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/notebook.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7b14",
      "topicId": "draft-hanzi-06",
      "character": "笔",
      "pinyin": "bǐ",
      "phrase": "画笔",
      "sentence": "我用画笔画小花。",
      "question": "这句话里缺了哪个字？我用画□画小花。",
      "caregiverTip": "和孩子在生活里找找“画笔”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/pencil.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u753b",
      "topicId": "draft-hanzi-06",
      "character": "画",
      "pinyin": "huà",
      "phrase": "画画",
      "sentence": "我们一起画画。",
      "question": "这句话里缺了哪个字？我们一起□□。",
      "caregiverTip": "和孩子在生活里找找“画画”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/draw.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7eb8",
      "topicId": "draft-hanzi-06",
      "character": "纸",
      "pinyin": "zhǐ",
      "phrase": "白纸",
      "sentence": "桌上有一张白纸。",
      "question": "这句话里缺了哪个字？桌上有一张白□。",
      "caregiverTip": "和孩子在生活里找找“白纸”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/paper.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u684c",
      "topicId": "draft-hanzi-06",
      "character": "桌",
      "pinyin": "zhuō",
      "phrase": "桌子",
      "sentence": "书放在桌子上。",
      "question": "这句话里缺了哪个字？书放在□子上。",
      "caregiverTip": "和孩子在生活里找找“桌子”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/table.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6905",
      "topicId": "draft-hanzi-06",
      "character": "椅",
      "pinyin": "yǐ",
      "phrase": "椅子",
      "sentence": "我坐在椅子上。",
      "question": "这句话里缺了哪个字？我坐在□子上。",
      "caregiverTip": "和孩子在生活里找找“椅子”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/chair.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u95e8",
      "topicId": "draft-hanzi-06",
      "character": "门",
      "pinyin": "mén",
      "phrase": "房门",
      "sentence": "我们轻轻关上房门。",
      "question": "这句话里缺了哪个字？我们轻轻关上房□。",
      "caregiverTip": "和孩子在生活里找找“房门”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/door.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7a97",
      "topicId": "draft-hanzi-06",
      "character": "窗",
      "pinyin": "chuāng",
      "phrase": "窗户",
      "sentence": "窗户外面有树。",
      "question": "这句话里缺了哪个字？□户外面有树。",
      "caregiverTip": "和孩子在生活里找找“窗户”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/window.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u706f",
      "topicId": "draft-hanzi-06",
      "character": "灯",
      "pinyin": "dēng",
      "phrase": "台灯",
      "sentence": "台灯照亮了书本。",
      "question": "这句话里缺了哪个字？台□照亮了书本。",
      "caregiverTip": "和孩子在生活里找找“台灯”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/lamp.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u732b",
      "topicId": "draft-hanzi-07",
      "character": "猫",
      "pinyin": "māo",
      "phrase": "小猫",
      "sentence": "小猫趴在垫子上。",
      "question": "这句话里缺了哪个字？小□趴在垫子上。",
      "caregiverTip": "和孩子在生活里找找“小猫”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/cat.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u72d7",
      "topicId": "draft-hanzi-07",
      "character": "狗",
      "pinyin": "gǒu",
      "phrase": "小狗",
      "sentence": "小狗在草地上跑。",
      "question": "这句话里缺了哪个字？小□在草地上跑。",
      "caregiverTip": "和孩子在生活里找找“小狗”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/dog.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u725b",
      "topicId": "draft-hanzi-07",
      "character": "牛",
      "pinyin": "niú",
      "phrase": "小牛",
      "sentence": "小牛在草地上走。",
      "question": "这句话里缺了哪个字？小□在草地上走。",
      "caregiverTip": "和孩子在生活里找找“小牛”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/cow.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7f8a",
      "topicId": "draft-hanzi-07",
      "character": "羊",
      "pinyin": "yáng",
      "phrase": "小羊",
      "sentence": "小羊有白白的毛。",
      "question": "这句话里缺了哪个字？小□有白白的毛。",
      "caregiverTip": "和孩子在生活里找找“小羊”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/sheep.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u9e21",
      "topicId": "draft-hanzi-07",
      "character": "鸡",
      "pinyin": "jī",
      "phrase": "小鸡",
      "sentence": "小鸡跟着妈妈走。",
      "question": "这句话里缺了哪个字？小□跟着妈妈走。",
      "caregiverTip": "和孩子在生活里找找“小鸡”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/chicken.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u9e2d",
      "topicId": "draft-hanzi-07",
      "character": "鸭",
      "pinyin": "yā",
      "phrase": "小鸭",
      "sentence": "小鸭在水里游。",
      "question": "这句话里缺了哪个字？小□在水里游。",
      "caregiverTip": "和孩子在生活里找找“小鸭”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/duck.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5154",
      "topicId": "draft-hanzi-07",
      "character": "兔",
      "pinyin": "tù",
      "phrase": "兔子",
      "sentence": "兔子的耳朵长长的。",
      "question": "这句话里缺了哪个字？□子的耳朵长长的。",
      "caregiverTip": "和孩子在生活里找找“兔子”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/rabbit.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u866b",
      "topicId": "draft-hanzi-07",
      "character": "虫",
      "pinyin": "chóng",
      "phrase": "小虫",
      "sentence": "小虫在叶子上爬。",
      "question": "这句话里缺了哪个字？小□在叶子上爬。",
      "caregiverTip": "和孩子在生活里找找“小虫”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/insect.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8349",
      "topicId": "draft-hanzi-07",
      "character": "草",
      "pinyin": "cǎo",
      "phrase": "小草",
      "sentence": "小草在风里轻轻摇。",
      "question": "这句话里缺了哪个字？小□在风里轻轻摇。",
      "caregiverTip": "和孩子在生活里找找“小草”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u8349.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u53f6",
      "topicId": "draft-hanzi-07",
      "character": "叶",
      "pinyin": "yè",
      "phrase": "叶子",
      "sentence": "树上的叶子绿绿的。",
      "question": "这句话里缺了哪个字？树上的□子绿绿的。",
      "caregiverTip": "和孩子在生活里找找“叶子”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/hanzi-u53f6.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "OpenAI imagegen；使用项目插画作风格参考，使用条件及儿童适龄性待人工确认；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8d70",
      "topicId": "draft-hanzi-08",
      "character": "走",
      "pinyin": "zǒu",
      "phrase": "走路",
      "sentence": "我们一起走路。",
      "question": "这句话里缺了哪个字？我们一起□路。",
      "caregiverTip": "和孩子在生活里找找“走路”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/walk.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8dd1",
      "topicId": "draft-hanzi-08",
      "character": "跑",
      "pinyin": "pǎo",
      "phrase": "跑步",
      "sentence": "小狗在草地上跑步。",
      "question": "这句话里缺了哪个字？小狗在草地上□步。",
      "caregiverTip": "和孩子在生活里找找“跑步”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/run.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8df3",
      "topicId": "draft-hanzi-08",
      "character": "跳",
      "pinyin": "tiào",
      "phrase": "跳跳",
      "sentence": "小兔轻轻跳跳。",
      "question": "这句话里缺了哪个字？小兔轻轻□□。",
      "caregiverTip": "和孩子在生活里找找“跳跳”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/jump.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u5750",
      "topicId": "draft-hanzi-08",
      "character": "坐",
      "pinyin": "zuò",
      "phrase": "坐下",
      "sentence": "我们坐下看书。",
      "question": "这句话里缺了哪个字？我们□下看书。",
      "caregiverTip": "和孩子在生活里找找“坐下”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/sit.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u770b",
      "topicId": "draft-hanzi-08",
      "character": "看",
      "pinyin": "kàn",
      "phrase": "看书",
      "sentence": "我和妈妈一起看书。",
      "question": "这句话里缺了哪个字？我和妈妈一起□书。",
      "caregiverTip": "和孩子在生活里找找“看书”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/look.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u542c",
      "topicId": "draft-hanzi-08",
      "character": "听",
      "pinyin": "tīng",
      "phrase": "听见",
      "sentence": "我听见小鸟在叫。",
      "question": "这句话里缺了哪个字？我□见小鸟在叫。",
      "caregiverTip": "和孩子在生活里找找“听见”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/listen.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u8bf4",
      "topicId": "draft-hanzi-08",
      "character": "说",
      "pinyin": "shuō",
      "phrase": "说话",
      "sentence": "我们轻轻地说话。",
      "question": "这句话里缺了哪个字？我们轻轻地□话。",
      "caregiverTip": "和孩子在生活里找找“说话”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/speak.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7b11",
      "topicId": "draft-hanzi-08",
      "character": "笑",
      "pinyin": "xiào",
      "phrase": "微笑",
      "sentence": "姐姐对我微笑。",
      "question": "这句话里缺了哪个字？姐姐对我微□。",
      "caregiverTip": "和孩子在生活里找找“微笑”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/smile.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u6d17",
      "topicId": "draft-hanzi-08",
      "character": "洗",
      "pinyin": "xǐ",
      "phrase": "洗手",
      "sentence": "吃饭前我们洗手。",
      "question": "这句话里缺了哪个字？吃饭前我们□手。",
      "caregiverTip": "和孩子在生活里找找“洗手”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/wash.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    },
    {
      "kind": "hanzi",
      "id": "hanzi-u7761",
      "topicId": "draft-hanzi-08",
      "character": "睡",
      "pinyin": "shuì",
      "phrase": "睡觉",
      "sentence": "小猫安静地睡觉。",
      "question": "这句话里缺了哪个字？小猫安静地□觉。",
      "caregiverTip": "和孩子在生活里找找“睡觉”。",
      "reviewStatus": "draft",
      "media": {
        "image": "atlas/img/sleep.webp",
        "recording": null,
        "exampleRecording": null,
        "locale": "zh-CN",
        "source": "Word Atlas contributors · CC BY 4.0；沿用原项目插画；插画语义和适龄性待人工审校"
      }
    }
  ]
} };

export const hanziFull: SampleCourse = {
  manifest: hanziManifest,
  lessons: [...originalHanzi.lessons, ...extraHanziLessons, ...expandedHanziLessons],
  entries: [...originalHanzi.entries, ...extraHanziEntries, ...expandedHanziEntries],
};
