import { BaseProvider } from "./base";
import type { EmailOwner, ProviderInfo } from "./types";

export class EmailProvider extends BaseProvider<"email", EmailOwner> {
  public readonly apiKind = "email";
  public readonly batch: boolean;
  public readonly method = "POST";

  constructor(baseUrl: string, token: string, owner: EmailOwner, batch: boolean) {
    super(baseUrl, token, owner);
    this.batch = batch;
  }

  getRoute(): string[] {
    return this.batch ? ["emails", "batch"] : ["emails"];
  }
  getHeaders(_options: unknown): Record<string, string> {
    return {
      authorization: `Bearer ${this.token}`,
    };
  }

  onFinish(providerInfo: ProviderInfo, _options: unknown): ProviderInfo {
    return providerInfo;
  }
}

export const resend = ({
  token,
  batch = false,
}: {
  token: string;
  batch?: boolean;
}): EmailProvider => {
  return new EmailProvider("https://api.resend.com", token, "resend", batch);
};

class AutoSendEmailProvider extends EmailProvider {
  getRoute(): string[] {
    return this.batch ? ["v1", "mails", "bulk"] : ["v1", "mails", "send"];
  }
}

export const autosend = ({
  token,
  batch = false,
}: {
  token: string;
  batch?: boolean;
}): EmailProvider => {
  return new AutoSendEmailProvider("https://api.autosend.com", token, "autosend", batch);
};
