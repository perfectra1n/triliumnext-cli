import { describe, it, expect, vi } from "vitest";
import { resolveDefaultParent } from "../../../src/utils/inbox.js";
import type { EtapiClient } from "../../../src/client/index.js";

function fakeClient(searchImpl: (q: string) => unknown[]): EtapiClient {
    return {
        searchNotes: vi.fn(async ({ search }: { search: string }) => ({
            results: searchImpl(search),
        })),
    } as unknown as EtapiClient;
}

describe("resolveDefaultParent", () => {
    it("passes through an explicit noteId without a search call", async () => {
        const search = vi.fn();
        const client = { searchNotes: search } as unknown as EtapiClient;

        await expect(resolveDefaultParent(client, "abc123")).resolves.toBe("abc123");
        expect(search).not.toHaveBeenCalled();
    });

    it("looks up #clipperInbox by default and returns the first match", async () => {
        const client = fakeClient((q) => {
            expect(q).toBe("#clipperInbox");
            return [{ noteId: "inboxId" }];
        });

        await expect(resolveDefaultParent(client, undefined)).resolves.toBe("inboxId");
    });

    it("uses a custom #label when configured", async () => {
        const client = fakeClient((q) => {
            expect(q).toBe("#workspaceInbox");
            return [{ noteId: "wsId" }];
        });

        await expect(resolveDefaultParent(client, "#workspaceInbox")).resolves.toBe("wsId");
    });

    it('falls back to "root" when the label search returns nothing', async () => {
        const client = fakeClient(() => []);

        await expect(resolveDefaultParent(client, undefined)).resolves.toBe("root");
        await expect(resolveDefaultParent(client, "#missing")).resolves.toBe("root");
    });
});
