const PALETTE = [
  ["#ffb35c", "#ff8a1f"],
  ["#ff9a8b", "#ff6a88"],
  ["#7ed6a5", "#1f9d63"],
  ["#8fb8ff", "#3370ff"],
  ["#c3a6ff", "#7b61ff"],
  ["#ffd36e", "#f5a623"],
  ["#7fd8e0", "#1a9fb0"],
  ["#d8b08c", "#a0673a"]
];

function hash(text) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) % 100000;
  }
  return value;
}

Component({
  options: {
    addGlobalClass: false
  },
  properties: {
    image: { type: String, value: "" },
    name: { type: String, value: "" },
    width: { type: Number, value: 120 },
    height: { type: Number, value: 120 },
    radius: { type: Number, value: 16 }
  },
  data: {
    initial: "",
    background: "",
    failed: false
  },
  observers: {
    name(name) {
      const text = name || "菜";
      const [from, to] = PALETTE[hash(text) % PALETTE.length];
      this.setData({
        initial: text.charAt(0),
        background: `linear-gradient(135deg, ${from}, ${to})`
      });
    },
    image() {
      this.setData({ failed: false });
    }
  },
  methods: {
    onError() {
      this.setData({ failed: true });
    }
  }
});
