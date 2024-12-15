import * as email from "../services/email";

describe("send", () => {
  it("should send an email successfully", async () => {
    const testEmail = process.env.EMAIL_TEST as string;
    const subject = "Test Subject";
    const message = "Test Message";

    email.send(testEmail, subject, message).then((response: any) => {
      expect(response).resolves.toEqual("Email sent successfully");
    });
  });
});