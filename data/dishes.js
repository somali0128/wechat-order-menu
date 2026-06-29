const dishes = [
  {
    id: "baby-steamed-egg",
    name: "宝宝蒸蛋",
    category: "宝宝推荐",
    tag: "软嫩少盐",
    calories: "约85 kcal",
    protein: "蛋白质 7g",
    imageTone: "egg",
    description: "口感细腻，适合宝宝和全家一起吃。",
    ingredients: ["鸡蛋", "温水", "小葱", "儿童酱油"]
  },
  {
    id: "baby-shrimp-tofu",
    name: "虾仁豆腐煲",
    category: "宝宝推荐",
    tag: "高蛋白",
    calories: "约180 kcal",
    protein: "蛋白质 18g",
    imageTone: "shrimp",
    description: "豆腐滑嫩，虾仁鲜甜，调味清淡。",
    ingredients: ["虾仁", "嫩豆腐", "胡萝卜", "豌豆", "姜片"]
  },
  {
    id: "cn-tomato-egg",
    name: "番茄炒蛋",
    category: "中餐",
    tag: "下饭",
    calories: "约160 kcal",
    protein: "蛋白质 11g",
    imageTone: "tomato",
    description: "经典家常菜，酸甜开胃。",
    ingredients: ["番茄", "鸡蛋", "小葱", "盐", "白糖"]
  },
  {
    id: "cn-braised-pork",
    name: "土豆红烧肉",
    category: "中餐",
    tag: "周末硬菜",
    calories: "约420 kcal",
    protein: "蛋白质 22g",
    imageTone: "pork",
    description: "浓香软糯，适合多人分享。",
    ingredients: ["五花肉", "土豆", "冰糖", "生抽", "八角", "姜片"]
  },
  {
    id: "cn-garlic-broccoli",
    name: "蒜蓉西兰花",
    category: "中餐",
    tag: "清爽",
    calories: "约90 kcal",
    protein: "蛋白质 5g",
    imageTone: "green",
    description: "颜色清亮，补充蔬菜很方便。",
    ingredients: ["西兰花", "蒜", "蚝油", "盐"]
  },
  {
    id: "west-pasta",
    name: "奶油蘑菇意面",
    category: "西餐",
    tag: "香浓",
    calories: "约520 kcal",
    protein: "蛋白质 17g",
    imageTone: "cream",
    description: "一锅出餐，适合想换口味的时候。",
    ingredients: ["意面", "口蘑", "淡奶油", "黄油", "黑胡椒", "芝士"]
  },
  {
    id: "west-salmon",
    name: "柠檬煎三文鱼",
    category: "西餐",
    tag: "快手",
    calories: "约360 kcal",
    protein: "蛋白质 31g",
    imageTone: "salmon",
    description: "外焦里嫩，搭配蔬菜就是完整一餐。",
    ingredients: ["三文鱼", "柠檬", "芦笋", "橄榄油", "海盐"]
  }
];

const categories = ["全部", "宝宝推荐", "中餐", "西餐"];

module.exports = {
  dishes,
  categories
};
