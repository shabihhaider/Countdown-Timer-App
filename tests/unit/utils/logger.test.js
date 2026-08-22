import { logger, createRequestLogger } from "../../../app/utils/logger.server";

describe("logger", () => {
  it("exports a pino logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("has the correct service base", () => {
    expect(logger.bindings().service).toBe("countdown-timer-app");
  });
});

describe("createRequestLogger", () => {
  it("creates a child logger with request context", () => {
    const mockRequest = {
      method: "GET",
      url: "http://localhost:3000/app/campaigns",
    };
    const child = createRequestLogger(mockRequest, "test-shop.myshopify.com");
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
    expect(child.bindings().shop).toBe("test-shop.myshopify.com");
    expect(child.bindings().method).toBe("GET");
    expect(child.bindings().path).toBe("/app/campaigns");
  });

  it("defaults shop to unknown when not provided", () => {
    const mockRequest = {
      method: "POST",
      url: "http://localhost:3000/webhooks",
    };
    const child = createRequestLogger(mockRequest);
    expect(child.bindings().shop).toBe("unknown");
  });
});
