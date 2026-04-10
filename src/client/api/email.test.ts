import { describe, test } from "bun:test";
import { Client } from "../client";
import { resend, autosend } from "./email";
import { MOCK_QSTASH_SERVER_URL, mockQStashServer } from "../workflow/test-utils";
import { nanoid } from "../utils";

describe("email", () => {
  const qstashToken = nanoid();
  const resendToken = nanoid();

  const globalHeader = "global-header";
  const globalHeaderOverwritten = "global-header-overwritten";
  const requestHeader = "request-header";

  const globalHeaderValue = nanoid();
  const overWrittenOldValue = nanoid();
  const overWrittenNewValue = nanoid();
  const requestHeaderValue = nanoid();

  const client = new Client({
    baseUrl: MOCK_QSTASH_SERVER_URL,
    token: qstashToken,
    headers: {
      [globalHeader]: globalHeaderValue,
      [globalHeaderOverwritten]: overWrittenOldValue,
    },
  });

  test("should use resend", async () => {
    await mockQStashServer({
      execute: async () => {
        await client.publishJSON({
          api: {
            name: "email",
            provider: resend({ token: resendToken }),
          },
          body: {
            from: "Acme <onboarding@resend.dev>",
            to: ["delivered@resend.dev"],
            subject: "hello world",
            html: "<p>it works!</p>",
          },
          headers: {
            "content-type": "application/json",
            [globalHeaderOverwritten]: overWrittenNewValue,
            [requestHeader]: requestHeaderValue,
          },
        });
      },
      responseFields: {
        body: { messageId: "msgId" },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/publish/https://api.resend.com/emails",
        body: {
          from: "Acme <onboarding@resend.dev>",
          to: ["delivered@resend.dev"],
          subject: "hello world",
          html: "<p>it works!</p>",
        },
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${resendToken}`,
          [`upstash-forward-${requestHeader}`]: requestHeaderValue,
          [`upstash-forward-${globalHeader}`]: globalHeaderValue,
          [`upstash-forward-${globalHeaderOverwritten}`]: overWrittenNewValue,
          "upstash-method": "POST",
        },
      },
    });
  });

  test("should use resend with batch", async () => {
    await mockQStashServer({
      execute: async () => {
        await client.publishJSON({
          api: {
            name: "email",
            provider: resend({ token: resendToken, batch: true }),
          },
          body: [
            {
              from: "Acme <onboarding@resend.dev>",
              to: ["foo@gmail.com"],
              subject: "hello world",
              html: "<h1>it works!</h1>",
            },
            {
              from: "Acme <onboarding@resend.dev>",
              to: ["bar@outlook.com"],
              subject: "world hello",
              html: "<p>it works!</p>",
            },
          ],
          headers: {
            "content-type": "application/json",
            [globalHeaderOverwritten]: overWrittenNewValue,
            [requestHeader]: requestHeaderValue,
          },
        });
      },
      responseFields: {
        body: { messageId: "msgId" },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/publish/https://api.resend.com/emails/batch",
        body: [
          {
            from: "Acme <onboarding@resend.dev>",
            to: ["foo@gmail.com"],
            subject: "hello world",
            html: "<h1>it works!</h1>",
          },
          {
            from: "Acme <onboarding@resend.dev>",
            to: ["bar@outlook.com"],
            subject: "world hello",
            html: "<p>it works!</p>",
          },
        ],
        headers: {
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${resendToken}`,
          "upstash-method": "POST",
          "content-type": "application/json",
          [`upstash-forward-${requestHeader}`]: requestHeaderValue,
          [`upstash-forward-${globalHeader}`]: globalHeaderValue,
          [`upstash-forward-${globalHeaderOverwritten}`]: overWrittenNewValue,
        },
      },
    });
  });

  test("should be able to overwrite method", async () => {
    await mockQStashServer({
      execute: async () => {
        await client.publishJSON({
          api: {
            name: "email",
            provider: resend({ token: resendToken, batch: true }),
          },
          method: "PUT",
          body: [
            {
              from: "Acme <onboarding@resend.dev>",
              to: ["foo@gmail.com"],
              subject: "hello world",
              html: "<h1>it works!</h1>",
            },
            {
              from: "Acme <onboarding@resend.dev>",
              to: ["bar@outlook.com"],
              subject: "world hello",
              html: "<p>it works!</p>",
            },
          ],
        });
      },
      responseFields: {
        body: { messageId: "msgId" },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/publish/https://api.resend.com/emails/batch",
        body: [
          {
            from: "Acme <onboarding@resend.dev>",
            to: ["foo@gmail.com"],
            subject: "hello world",
            html: "<h1>it works!</h1>",
          },
          {
            from: "Acme <onboarding@resend.dev>",
            to: ["bar@outlook.com"],
            subject: "world hello",
            html: "<p>it works!</p>",
          },
        ],
        headers: {
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${resendToken}`,
          "content-type": "application/json",
          "upstash-method": "PUT",
        },
      },
    });
  });

  test("should be able to enqueue", async () => {
    const queueName = "resend-queue";
    const queue = client.queue({ queueName });
    await mockQStashServer({
      execute: async () => {
        await queue.enqueueJSON({
          api: {
            name: "email",
            provider: resend({ token: resendToken, batch: true }),
          },
          body: [
            {
              from: "Acme <onboarding@resend.dev>",
              to: ["foo@gmail.com"],
              subject: "hello world",
              html: "<h1>it works!</h1>",
            },
            {
              from: "Acme <onboarding@resend.dev>",
              to: ["bar@outlook.com"],
              subject: "world hello",
              html: "<p>it works!</p>",
            },
          ],
          retryDelay: "pow(retried, 2) * 1000",
          headers: {
            "content-type": "application/json",
            [globalHeaderOverwritten]: overWrittenNewValue,
            [requestHeader]: requestHeaderValue,
          },
        });
      },
      responseFields: {
        body: { messageId: "msgId" },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/enqueue/resend-queue/https://api.resend.com/emails/batch",
        body: [
          {
            from: "Acme <onboarding@resend.dev>",
            to: ["foo@gmail.com"],
            subject: "hello world",
            html: "<h1>it works!</h1>",
          },
          {
            from: "Acme <onboarding@resend.dev>",
            to: ["bar@outlook.com"],
            subject: "world hello",
            html: "<p>it works!</p>",
          },
        ],
        headers: {
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${resendToken}`,
          "content-type": "application/json",
          "upstash-method": "POST",
          [`upstash-forward-${requestHeader}`]: requestHeaderValue,
          [`upstash-forward-${globalHeader}`]: globalHeaderValue,
          [`upstash-forward-${globalHeaderOverwritten}`]: overWrittenNewValue,
          "upstash-retry-delay": "pow(retried, 2) * 1000",
        },
      },
    });
  });
});

describe("autosend", () => {
  const qstashToken = nanoid();
  const autosendToken = nanoid();

  const globalHeader = "global-header";
  const globalHeaderOverwritten = "global-header-overwritten";
  const requestHeader = "request-header";

  const globalHeaderValue = nanoid();
  const overWrittenOldValue = nanoid();
  const overWrittenNewValue = nanoid();
  const requestHeaderValue = nanoid();

  const client = new Client({
    baseUrl: MOCK_QSTASH_SERVER_URL,
    token: qstashToken,
    headers: {
      [globalHeader]: globalHeaderValue,
      [globalHeaderOverwritten]: overWrittenOldValue,
    },
  });

  test("should use autosend to send a single email", async () => {
    await mockQStashServer({
      execute: async () => {
        await client.publishJSON({
          api: {
            name: "email",
            provider: autosend({ token: autosendToken }),
          },
          body: {
            from: { email: "hello@autosend.dev", name: "Acme" },
            to: { email: "delivered@example.com", name: "User" },
            subject: "hello world",
            html: "<p>it works!</p>",
          },
          headers: {
            "content-type": "application/json",
            [globalHeaderOverwritten]: overWrittenNewValue,
            [requestHeader]: requestHeaderValue,
          },
        });
      },
      responseFields: {
        body: { success: true, data: { emailId: "email-123", message: "Email sent", totalRecipients: 1 } },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/publish/https://api.autosend.com/v1/mails/send",
        body: {
          from: { email: "hello@autosend.dev", name: "Acme" },
          to: { email: "delivered@example.com", name: "User" },
          subject: "hello world",
          html: "<p>it works!</p>",
        },
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${autosendToken}`,
          [`upstash-forward-${requestHeader}`]: requestHeaderValue,
          [`upstash-forward-${globalHeader}`]: globalHeaderValue,
          [`upstash-forward-${globalHeaderOverwritten}`]: overWrittenNewValue,
          "upstash-method": "POST",
        },
      },
    });
  });

  test("should use autosend with bulk", async () => {
    await mockQStashServer({
      execute: async () => {
        await client.publishJSON({
          api: {
            name: "email",
            provider: autosend({ token: autosendToken, batch: true }),
          },
          body: {
            from: { email: "hello@autosend.dev", name: "Acme" },
            subject: "hello world",
            html: "<h1>it works!</h1>",
            recipients: [
              { email: "foo@gmail.com", name: "Foo" },
              { email: "bar@outlook.com", name: "Bar" },
            ],
          },
          headers: {
            "content-type": "application/json",
            [globalHeaderOverwritten]: overWrittenNewValue,
            [requestHeader]: requestHeaderValue,
          },
        });
      },
      responseFields: {
        body: { success: true, data: { batchId: "batch-123", totalRecipients: 2, successCount: 2, failedCount: 0 } },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/publish/https://api.autosend.com/v1/mails/bulk",
        body: {
          from: { email: "hello@autosend.dev", name: "Acme" },
          subject: "hello world",
          html: "<h1>it works!</h1>",
          recipients: [
            { email: "foo@gmail.com", name: "Foo" },
            { email: "bar@outlook.com", name: "Bar" },
          ],
        },
        headers: {
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${autosendToken}`,
          "upstash-method": "POST",
          "content-type": "application/json",
          [`upstash-forward-${requestHeader}`]: requestHeaderValue,
          [`upstash-forward-${globalHeader}`]: globalHeaderValue,
          [`upstash-forward-${globalHeaderOverwritten}`]: overWrittenNewValue,
        },
      },
    });
  });

  test("should be able to overwrite method", async () => {
    await mockQStashServer({
      execute: async () => {
        await client.publishJSON({
          api: {
            name: "email",
            provider: autosend({ token: autosendToken }),
          },
          method: "PUT",
          body: {
            from: { email: "hello@autosend.dev", name: "Acme" },
            to: { email: "delivered@example.com" },
            subject: "hello world",
            html: "<p>it works!</p>",
          },
        });
      },
      responseFields: {
        body: { success: true, data: { emailId: "email-123" } },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/publish/https://api.autosend.com/v1/mails/send",
        body: {
          from: { email: "hello@autosend.dev", name: "Acme" },
          to: { email: "delivered@example.com" },
          subject: "hello world",
          html: "<p>it works!</p>",
        },
        headers: {
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${autosendToken}`,
          "content-type": "application/json",
          "upstash-method": "PUT",
        },
      },
    });
  });

  test("should be able to enqueue", async () => {
    const queueName = "autosend-queue";
    const queue = client.queue({ queueName });
    await mockQStashServer({
      execute: async () => {
        await queue.enqueueJSON({
          api: {
            name: "email",
            provider: autosend({ token: autosendToken, batch: true }),
          },
          body: {
            from: { email: "hello@autosend.dev", name: "Acme" },
            subject: "hello world",
            html: "<h1>it works!</h1>",
            recipients: [
              { email: "foo@gmail.com", name: "Foo" },
              { email: "bar@outlook.com", name: "Bar" },
            ],
          },
          retryDelay: "pow(retried, 2) * 1000",
          headers: {
            "content-type": "application/json",
            [globalHeaderOverwritten]: overWrittenNewValue,
            [requestHeader]: requestHeaderValue,
          },
        });
      },
      responseFields: {
        body: { success: true, data: { batchId: "batch-456" } },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/enqueue/autosend-queue/https://api.autosend.com/v1/mails/bulk",
        body: {
          from: { email: "hello@autosend.dev", name: "Acme" },
          subject: "hello world",
          html: "<h1>it works!</h1>",
          recipients: [
            { email: "foo@gmail.com", name: "Foo" },
            { email: "bar@outlook.com", name: "Bar" },
          ],
        },
        headers: {
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${autosendToken}`,
          "content-type": "application/json",
          "upstash-method": "POST",
          [`upstash-forward-${requestHeader}`]: requestHeaderValue,
          [`upstash-forward-${globalHeader}`]: globalHeaderValue,
          [`upstash-forward-${globalHeaderOverwritten}`]: overWrittenNewValue,
          "upstash-retry-delay": "pow(retried, 2) * 1000",
        },
      },
    });
  });

  test("should send email with template and dynamic data", async () => {
    await mockQStashServer({
      execute: async () => {
        await client.publishJSON({
          api: {
            name: "email",
            provider: autosend({ token: autosendToken }),
          },
          body: {
            from: { email: "hello@autosend.dev", name: "Acme" },
            to: { email: "delivered@example.com" },
            templateId: "template-abc",
            dynamicData: { firstName: "John", orderNumber: "12345" },
          },
          headers: {
            "content-type": "application/json",
          },
        });
      },
      responseFields: {
        body: { success: true, data: { emailId: "email-789" } },
        status: 200,
      },
      receivesRequest: {
        method: "POST",
        token: qstashToken,
        url: "http://localhost:8080/v2/publish/https://api.autosend.com/v1/mails/send",
        body: {
          from: { email: "hello@autosend.dev", name: "Acme" },
          to: { email: "delivered@example.com" },
          templateId: "template-abc",
          dynamicData: { firstName: "John", orderNumber: "12345" },
        },
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${qstashToken}`,
          "upstash-forward-authorization": `Bearer ${autosendToken}`,
          "upstash-method": "POST",
        },
      },
    });
  });
});
