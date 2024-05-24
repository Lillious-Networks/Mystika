import items from "../systems/items";

const item = {
  name: "unit_test_item",
  quality: "common",
  description: "This is a unit test item.",
};

describe("add", () => {
  it("should add an item to the items table successfully", async () => {
    const response = await items.add(item);
    expect(response).toBeDefined();
    const findResponse = await items.find(item);
    expect(findResponse).toBeDefined();
  });
});

describe("remove", () => {
  it("should remove an item from the items table successfully", async () => {
    const response = await items.remove(item);
    expect(response).toBeDefined();
    const findResponse = await items.find(item);
    expect(findResponse).toEqual([]);
  });
});

describe("list", () => {
  it("should list all items in the items table successfully", async () => {
    const response = await items.list();
    expect(response).toBeDefined();
  });
});