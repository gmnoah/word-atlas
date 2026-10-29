import type { SampleCourse } from "./types";
import { primaryManifest } from "./registry";

/** Editorial draft; teaching review is still required. */
export const primarySample: SampleCourse =
  {
    manifest: primaryManifest,
    lessons: [
      {
        id: "fruit",
        title: "水果篮子",
        subtitle: "认识身边的水果",
        entryIds: ["en-apple", "en-banana", "en-orange", "en-pear", "en-grape"],
      },
      {
        id: "animals",
        title: "动物朋友",
        subtitle: "和小动物打个招呼",
        entryIds: ["en-cat", "en-dog", "en-bird", "en-fish", "en-rabbit"],
      },
      {
        id: "nature",
        title: "去看大自然",
        subtitle: "抬头看看身边的世界",
        entryIds: ["en-sun", "en-moon", "en-star", "en-tree", "en-flower"],
      },
      {
        id: "school",
        title: "我的小书包",
        subtitle: "打开书包，找一找",
        entryIds: ["en-book", "en-pen", "en-pencil", "en-bag", "en-chair"],
      },
      {
        id: "breakfast",
        title: "一起吃早餐",
        subtitle: "在餐桌边学几个词",
        entryIds: ["en-milk", "en-bread", "en-egg", "en-rice", "en-water"],
      },
      {
        id: "home",
        title: "身边的小发现",
        subtitle: "找一找，指一指",
        entryIds: ["en-cup", "en-table", "en-hand", "en-eye", "en-ear"],
      },
    ],
    entries: [
      {
        kind: "english",
        id: "en-apple",
        topicId: "fruit",
        word: "apple",
        meaning: "苹果",
        example: {
          text: "I like apples.",
          targetForm: "apples",
          translation: "我喜欢苹果。",
        },
        caregiverTip: "在身边或绘本里找找“苹果”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/apple.webp",
          recording: "atlas/audio/uk/apple.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-banana",
        topicId: "fruit",
        word: "banana",
        meaning: "香蕉",
        example: {
          text: "This banana is yellow.",
          targetForm: "banana",
          translation: "这根香蕉是黄色的。",
        },
        caregiverTip: "在身边或绘本里找找“香蕉”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/banana.webp",
          recording: "atlas/audio/uk/banana.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-orange",
        topicId: "fruit",
        word: "orange",
        meaning: "橙子",
        example: {
          text: "Here is an orange.",
          targetForm: "orange",
          translation: "这里有一个橙子。",
        },
        caregiverTip: "在身边或绘本里找找“橙子”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/orange.webp",
          recording: "atlas/audio/uk/orange.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-pear",
        topicId: "fruit",
        word: "pear",
        meaning: "梨",
        example: {
          text: "The pear is green.",
          targetForm: "pear",
          translation: "这个梨是绿色的。",
        },
        caregiverTip: "在身边或绘本里找找“梨”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/pear.webp",
          recording: "atlas/audio/uk/pear.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-grape",
        topicId: "fruit",
        word: "grape",
        meaning: "葡萄",
        example: {
          text: "I can see grapes.",
          targetForm: "grapes",
          translation: "我能看见葡萄。",
        },
        caregiverTip: "在身边或绘本里找找“葡萄”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/grape.webp",
          recording: "atlas/audio/uk/grape.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-cat",
        topicId: "animals",
        word: "cat",
        meaning: "猫",
        example: {
          text: "The cat is resting.",
          targetForm: "cat",
          translation: "这只猫正在休息。",
        },
        caregiverTip: "在身边或绘本里找找“猫”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/cat.webp",
          recording: "atlas/audio/uk/cat.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-dog",
        topicId: "animals",
        word: "dog",
        meaning: "狗",
        example: {
          text: "The dog is with a girl.",
          targetForm: "dog",
          translation: "这只狗和一个女孩在一起。",
        },
        caregiverTip: "在身边或绘本里找找“狗”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/dog.webp",
          recording: "atlas/audio/uk/dog.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-bird",
        topicId: "animals",
        word: "bird",
        meaning: "鸟",
        example: {
          text: "A bird is in the tree.",
          targetForm: "bird",
          translation: "一只鸟在树上。",
        },
        caregiverTip: "在身边或绘本里找找“鸟”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/bird.webp",
          recording: "atlas/audio/uk/bird.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-fish",
        topicId: "animals",
        word: "fish",
        meaning: "鱼",
        example: {
          text: "The fish are swimming.",
          targetForm: "fish",
          translation: "这些鱼正在游泳。",
        },
        caregiverTip: "在身边或绘本里找找“鱼”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/fish.webp",
          recording: "atlas/audio/uk/fish.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-rabbit",
        topicId: "animals",
        word: "rabbit",
        meaning: "兔子",
        example: {
          text: "The rabbit has long ears.",
          targetForm: "rabbit",
          translation: "这只兔子有长耳朵。",
        },
        caregiverTip: "在身边或绘本里找找“兔子”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/rabbit.webp",
          recording: "atlas/audio/uk/rabbit.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-sun",
        topicId: "nature",
        word: "sun",
        meaning: "太阳",
        example: {
          text: "The sun is warm.",
          targetForm: "sun",
          translation: "阳光很温暖。",
        },
        caregiverTip: "在身边或绘本里找找“太阳”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/sun.webp",
          recording: "atlas/audio/uk/sun.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-moon",
        topicId: "nature",
        word: "moon",
        meaning: "月亮",
        example: {
          text: "Look at the moon.",
          targetForm: "moon",
          translation: "看看月亮。",
        },
        caregiverTip: "在身边或绘本里找找“月亮”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/moon.webp",
          recording: "atlas/audio/uk/moon.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-star",
        topicId: "nature",
        word: "star",
        meaning: "星星",
        example: {
          text: "I can see a star.",
          targetForm: "star",
          translation: "我能看见一颗星星。",
        },
        caregiverTip: "在身边或绘本里找找“星星”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/star.webp",
          recording: "atlas/audio/uk/star.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-tree",
        topicId: "nature",
        word: "tree",
        meaning: "树",
        example: {
          text: "The tree is tall.",
          targetForm: "tree",
          translation: "这棵树很高。",
        },
        caregiverTip: "在身边或绘本里找找“树”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/tree.webp",
          recording: "atlas/audio/uk/tree.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-flower",
        topicId: "nature",
        word: "flower",
        meaning: "花",
        example: {
          text: "This flower is beautiful.",
          targetForm: "flower",
          translation: "这朵花很美。",
        },
        caregiverTip: "在身边或绘本里找找“花”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/flower.webp",
          recording: "atlas/audio/uk/flower.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-book",
        topicId: "school",
        word: "book",
        meaning: "书",
        example: {
          text: "Open your book.",
          targetForm: "book",
          translation: "打开你的书。",
        },
        caregiverTip: "在身边或绘本里找找“书”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/book.webp",
          recording: "atlas/audio/uk/book.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-pen",
        topicId: "school",
        word: "pen",
        meaning: "钢笔",
        example: {
          text: "This is my pen.",
          targetForm: "pen",
          translation: "这是我的钢笔。",
        },
        caregiverTip: "在身边或绘本里找找“钢笔”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/pen.webp",
          recording: "atlas/audio/uk/pen.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-pencil",
        topicId: "school",
        word: "pencil",
        meaning: "铅笔",
        example: {
          text: "I have a pencil.",
          targetForm: "pencil",
          translation: "我有一支铅笔。",
        },
        caregiverTip: "在身边或绘本里找找“铅笔”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/pencil.webp",
          recording: "atlas/audio/uk/pencil.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-bag",
        topicId: "school",
        word: "bag",
        meaning: "包",
        example: {
          text: "My bag is blue.",
          targetForm: "bag",
          translation: "我的包是蓝色的。",
        },
        caregiverTip: "在身边或绘本里找找“包”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/bag.webp",
          recording: "atlas/audio/uk/bag.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-chair",
        topicId: "school",
        word: "chair",
        meaning: "椅子",
        example: {
          text: "Sit on the chair.",
          targetForm: "chair",
          translation: "坐在椅子上。",
        },
        caregiverTip: "在身边或绘本里找找“椅子”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/chair.webp",
          recording: "atlas/audio/uk/chair.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-milk",
        topicId: "breakfast",
        word: "milk",
        meaning: "牛奶",
        example: {
          text: "I drink milk.",
          targetForm: "milk",
          translation: "我喝牛奶。",
        },
        caregiverTip: "在身边或绘本里找找“牛奶”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/milk.webp",
          recording: "atlas/audio/uk/milk.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-bread",
        topicId: "breakfast",
        word: "bread",
        meaning: "面包",
        example: {
          text: "This bread is soft.",
          targetForm: "bread",
          translation: "这块面包很软。",
        },
        caregiverTip: "在身边或绘本里找找“面包”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/bread.webp",
          recording: "atlas/audio/uk/bread.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-egg",
        topicId: "breakfast",
        word: "egg",
        meaning: "鸡蛋",
        example: {
          text: "I have an egg.",
          targetForm: "egg",
          translation: "我有一个鸡蛋。",
        },
        caregiverTip: "在身边或绘本里找找“鸡蛋”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/egg.webp",
          recording: "atlas/audio/uk/egg.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-rice",
        topicId: "breakfast",
        word: "rice",
        meaning: "米饭",
        example: {
          text: "I like rice.",
          targetForm: "rice",
          translation: "我喜欢米饭。",
        },
        caregiverTip: "在身边或绘本里找找“米饭”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/rice.webp",
          recording: "atlas/audio/uk/rice.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-water",
        topicId: "breakfast",
        word: "water",
        meaning: "水",
        example: {
          text: "Please drink some water.",
          targetForm: "water",
          translation: "请喝点水。",
        },
        caregiverTip: "在身边或绘本里找找“水”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/water.webp",
          recording: "atlas/audio/uk/water.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-cup",
        topicId: "home",
        word: "cup",
        meaning: "杯子",
        example: {
          text: "This is my cup.",
          targetForm: "cup",
          translation: "这是我的杯子。",
        },
        caregiverTip: "在身边或绘本里找找“杯子”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/cup.webp",
          recording: "atlas/audio/uk/cup.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-table",
        topicId: "home",
        word: "table",
        meaning: "桌子",
        example: {
          text: "The book is on the table.",
          targetForm: "table",
          translation: "书在桌子上。",
        },
        caregiverTip: "在身边或绘本里找找“桌子”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/table.webp",
          recording: "atlas/audio/uk/table.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-hand",
        topicId: "home",
        word: "hand",
        meaning: "手",
        example: {
          text: "Wash your hands.",
          targetForm: "hands",
          translation: "洗洗你的手。",
        },
        caregiverTip: "在身边或绘本里找找“手”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/hand.webp",
          recording: "atlas/audio/uk/hand.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-eye",
        topicId: "home",
        word: "eye",
        meaning: "眼睛",
        example: {
          text: "Close your eyes.",
          targetForm: "eyes",
          translation: "闭上你的眼睛。",
        },
        caregiverTip: "在身边或绘本里找找“眼睛”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/eye.webp",
          recording: "atlas/audio/uk/eye.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
      {
        kind: "english",
        id: "en-ear",
        topicId: "home",
        word: "ear",
        meaning: "耳朵",
        example: {
          text: "Touch your ears.",
          targetForm: "ears",
          translation: "摸摸你的耳朵。",
        },
        caregiverTip: "在身边或绘本里找找“耳朵”，试着说一说英文。",
        reviewStatus: "draft",
        media: {
          image: "atlas/img/ear.webp",
          recording: "atlas/audio/uk/ear.mp3",
          locale: "en-GB",
          source:
            "Word Atlas contributors（词光）· CC BY 4.0；插画借作语义预览，适龄匹配待审校",
        },
      },
    ],
  };
