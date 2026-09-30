Component({
  options: {
    multipleSlots: true,
    styleIsolation: "isolated",
  },

  properties: {
    text: { type: String, value: "" },
    tone: {
      type: String,
      value: "neutral", // neutral | info | success | warning | danger
    },
    size: {
      type: String,
      value: "md", // sm | md | lg
    },
  },

  data: {},

  methods: {},
});