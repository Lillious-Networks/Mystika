import query from "../controllers/sqldatabase";

describe("connection", () => {
  it("should connect to the database successfully", async () => {
    query("SELECT 1 + 1 AS solution", [])
      .then(() => expect(true).toBeTruthy())
      .catch(() => expect(false).toBeTruthy());
  });
});