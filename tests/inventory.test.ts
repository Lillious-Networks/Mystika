import inventory from "../systems/inventory";
const name = "UNIT_TEST";
const item = {
  name: "green_apple",
  quantity: 2,
};

describe("add", () => {
  it("should add an item to the inventory successfully", async () => {
    const response = await inventory.add(name, {
      name: item.name,
      quantity: item.quantity,
    });
    expect(response).toBeDefined();
    const findResponse = await inventory.find(name, { name: item.name });
    expect(findResponse).toBeDefined();
  });
});

describe("remove", () => {
  it("should remove an item from the inventory successfully", async () => {
    const response = await inventory.remove(name, {
      name: item.name,
      quantity: item.quantity,
    });
    expect(response).toBeDefined();
  });
});

describe("delete", () => {
  it("should delete an item from the inventory successfully", async () => {
    const response = await inventory.delete(name, { name: item.name });
    expect(response).toBeDefined();
    const findResponse = await inventory.find(name, { name: item.name });
    expect(findResponse).toEqual([]);
  });
});