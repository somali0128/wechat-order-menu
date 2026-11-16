/**
 * 新建家庭时可选导入的示例菜单。
 * 可以按需修改，修改后需重新上传部署云函数；
 * 也可以直接在小程序「我的 → 菜品管理」里增删改。
 */
const categories = ["宝宝推荐", "中餐", "西餐"];

const dishes = [
  {
    name: "宝宝蒸蛋",
    category: "宝宝推荐",
    tags: ["软嫩少盐"],
    cookTime: "15分钟",
    calories: "约85 kcal",
    protein: "7g",
    description: "口感细腻，适合宝宝和全家一起吃。",
    ingredients: ["鸡蛋", "温水", "小葱", "儿童酱油"],
    steps: "鸡蛋打散，加入 1.5 倍温水搅匀\n过筛后盖上保鲜膜，扎几个小孔\n水开后中小火蒸 10 分钟\n出锅淋少许儿童酱油，撒葱花"
  },
  {
    name: "虾仁豆腐煲",
    category: "宝宝推荐",
    tags: ["高蛋白"],
    cookTime: "20分钟",
    calories: "约180 kcal",
    protein: "18g",
    description: "豆腐滑嫩，虾仁鲜甜，调味清淡。",
    ingredients: ["虾仁", "嫩豆腐", "胡萝卜", "豌豆", "姜片"],
    steps: "虾仁去虾线，用姜片腌 5 分钟\n豆腐切块，胡萝卜切丁\n少油炒香胡萝卜和豌豆，加水煮开\n放入豆腐和虾仁小火煮 5 分钟即可"
  },
  {
    name: "番茄炒蛋",
    category: "中餐",
    tags: ["下饭", "快手"],
    cookTime: "10分钟",
    calories: "约160 kcal",
    protein: "11g",
    description: "经典家常菜，酸甜开胃。",
    ingredients: ["番茄", "鸡蛋", "小葱", "盐", "白糖"],
    steps: "鸡蛋打散炒至凝固盛出\n番茄切块炒出汁\n倒回鸡蛋，加盐和少许糖翻匀\n撒葱花出锅"
  },
  {
    name: "土豆红烧肉",
    category: "中餐",
    tags: ["周末硬菜"],
    cookTime: "90分钟",
    calories: "约420 kcal",
    protein: "22g",
    description: "浓香软糯，适合多人分享。",
    ingredients: ["五花肉", "土豆", "冰糖", "生抽", "老抽", "八角", "姜片"],
    steps: "五花肉切块冷水下锅焯水\n小火炒糖色，下肉块翻炒上色\n加生抽、老抽、八角、姜片和热水\n小火炖 60 分钟，加土豆再炖 20 分钟收汁"
  },
  {
    name: "蒜蓉西兰花",
    category: "中餐",
    tags: ["清爽", "快手"],
    cookTime: "10分钟",
    calories: "约90 kcal",
    protein: "5g",
    description: "颜色清亮，补充蔬菜很方便。",
    ingredients: ["西兰花", "蒜", "蚝油", "盐"],
    steps: "西兰花掰小朵，盐水浸泡后焯水 1 分钟\n热油爆香蒜末\n下西兰花翻炒，加蚝油和盐调味"
  },
  {
    name: "奶油蘑菇意面",
    category: "西餐",
    tags: ["香浓"],
    cookTime: "25分钟",
    calories: "约520 kcal",
    protein: "17g",
    description: "一锅出餐，适合想换口味的时候。",
    ingredients: ["意面", "口蘑", "淡奶油", "黄油", "黑胡椒", "芝士"],
    steps: "意面加盐煮 8 分钟捞出\n黄油炒香口蘑片\n倒入淡奶油小火煮至微稠\n放入意面拌匀，撒黑胡椒和芝士"
  },
  {
    name: "柠檬煎三文鱼",
    category: "西餐",
    tags: ["快手", "高蛋白"],
    cookTime: "20分钟",
    calories: "约360 kcal",
    protein: "31g",
    description: "外焦里嫩，搭配蔬菜就是完整一餐。",
    ingredients: ["三文鱼", "柠檬", "芦笋", "橄榄油", "海盐"],
    steps: "三文鱼擦干，撒海盐和柠檬汁腌 10 分钟\n热锅少油，鱼皮朝下煎 4 分钟\n翻面再煎 2 分钟\n同锅煎熟芦笋，一起装盘"
  }
];

module.exports = { categories, dishes };
