export const explorer = {
  id: "explorer",
  name: "Freies Erkunden",
  create() {
    return {
      markers: [],
      collected: [],
      step() {},
      status() {
        return "Erkunde deine Insel";
      },
    };
  },
};
