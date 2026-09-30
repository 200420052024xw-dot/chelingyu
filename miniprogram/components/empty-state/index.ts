Component({
  options: {
    multipleSlots: true,
    styleIsolation: "isolated",
  },
  properties: {
    title: { type: String, value: "" },
    desc: { type: String, value: "" },
    iconText: { type: String, value: "" },
    image: { type: String, value: "" },
  },
  data: {},
  methods: {},
});