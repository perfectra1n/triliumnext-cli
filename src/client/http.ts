import type { EtapiError } from "./types.js";

export class EtapiClientError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "EtapiClientError";
        this.status = status;
        this.code = code;
    }
}

/**
 * Return true when an error is a network-level failure (connection refused,
 * DNS failure, TLS error, etc.) rather than an HTTP status error.
 */
function isNetworkError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const cause = (err as Error & { cause?: Error & { code?: string } }).cause;
    if (cause?.code) {
        return ["ECONNREFUSED", "ENOTFOUND", "ECONNRESET", "DEPTH_ZERO_SELF_SIGNED_CERT",
                "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED",
                "ERR_TLS_CERT_ALTNAME_INVALID"].includes(cause.code);
    }
    // Bun and some Node versions surface errors differently
    if (err.message?.includes("Failed to parse URL")) return true;
    if (err.message?.includes("fetch failed")) return true;
    return false;
}

/**
 * Normalise a user-provided URL so it always has a protocol.
 * Returns `{ url, protocolWasAdded }` — when the protocol was inferred,
 * the caller should fall back to the other protocol on network errors.
 */
export function normalizeBaseUrl(raw: string): { url: string; protocolWasAdded: boolean } {
    const trimmed = raw.replace(/\/+$/, "");
    if (/^https?:\/\//i.test(trimmed)) {
        return { url: trimmed, protocolWasAdded: false };
    }
    // No protocol provided — default to https
    return { url: `https://${trimmed}`, protocolWasAdded: true };
}

export class HttpClient {
    private baseUrl: string;
    private token: string;
    private protocolWasAdded: boolean;
    private protocolResolved = false;

    constructor(baseUrl: string, token: string) {
        const { url, protocolWasAdded } = normalizeBaseUrl(baseUrl);
        const base = url.replace(/\/+$/, "");
        this.baseUrl = base.endsWith("/etapi") ? base : `${base}/etapi`;
        this.token = token;
        this.protocolWasAdded = protocolWasAdded;
    }

    private headers(contentType?: string): Record<string, string> {
        const h: Record<string, string> = { Authorization: this.token };
        if (contentType) h["Content-Type"] = contentType;
        return h;
    }

    private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
        const url = new URL(`${this.baseUrl}${path}`);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                if (v !== undefined) url.searchParams.set(k, String(v));
            }
        }
        return url.toString();
    }

    /**
     * Wrapper around `fetch` that handles protocol fallback.
     * When the user omitted the protocol (e.g. `trilium.example.com`), we
     * default to `https://`. If that fails with a network error, we retry
     * with `http://`. Once a protocol succeeds, we lock it in for all
     * subsequent requests.
     */
    private async fetchWithFallback(url: string, init: RequestInit): Promise<Response> {
        try {
            const res = await fetch(url, init);
            this.protocolResolved = true;
            return res;
        } catch (err) {
            if (this.protocolWasAdded && !this.protocolResolved && isNetworkError(err)) {
                // Flip https ↔ http and retry
                const altUrl = url.replace(/^https:\/\//, "http://");
                this.baseUrl = this.baseUrl.replace(/^https:\/\//, "http://");
                this.protocolResolved = true;
                return fetch(altUrl, init);
            }
            throw err;
        }
    }

    private async handleResponse<T>(res: Response): Promise<T> {
        if (!res.ok) {
            let body: EtapiError;
            try {
                body = await res.json() as EtapiError;
            } catch {
                throw new EtapiClientError(res.status, "UNKNOWN", res.statusText);
            }
            throw new EtapiClientError(body.status, body.code, body.message);
        }
        // 204 No Content
        if (res.status === 204) return undefined as T;
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
            return res.json() as Promise<T>;
        }
        return undefined as T;
    }

    async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
        const res = await this.fetchWithFallback(this.buildUrl(path, params), { method: "GET", headers: this.headers() });
        return this.handleResponse<T>(res);
    }

    async post<T>(path: string, body?: unknown): Promise<T> {
        const res = await this.fetchWithFallback(this.buildUrl(path), {
            method: "POST",
            headers: this.headers("application/json"),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse<T>(res);
    }

    async put<T>(path: string, body?: unknown): Promise<T> {
        const res = await this.fetchWithFallback(this.buildUrl(path), {
            method: "PUT",
            headers: this.headers("application/json"),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse<T>(res);
    }

    async patch<T>(path: string, body: unknown): Promise<T> {
        const res = await this.fetchWithFallback(this.buildUrl(path), {
            method: "PATCH",
            headers: this.headers("application/json"),
            body: JSON.stringify(body),
        });
        return this.handleResponse<T>(res);
    }

    async delete(path: string): Promise<void> {
        const res = await this.fetchWithFallback(this.buildUrl(path), { method: "DELETE", headers: this.headers() });
        await this.handleResponse<void>(res);
    }

    async getRaw(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<Buffer> {
        const res = await this.fetchWithFallback(this.buildUrl(path, params), { method: "GET", headers: this.headers() });
        if (!res.ok) {
            let body: EtapiError;
            try { body = await res.json() as EtapiError; } catch { throw new EtapiClientError(res.status, "UNKNOWN", res.statusText); }
            throw new EtapiClientError(body.status, body.code, body.message);
        }
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
    }

    async putRaw(path: string, data: Buffer | string, contentType: string = "text/plain"): Promise<void> {
        const res = await this.fetchWithFallback(this.buildUrl(path), {
            method: "PUT",
            headers: { ...this.headers(contentType) },
            body: data,
        });
        if (!res.ok) {
            let body: EtapiError;
            try { body = await res.json() as EtapiError; } catch { throw new EtapiClientError(res.status, "UNKNOWN", res.statusText); }
            throw new EtapiClientError(body.status, body.code, body.message);
        }
    }

    async postRaw(path: string, data: Buffer, contentType: string): Promise<unknown> {
        const res = await this.fetchWithFallback(this.buildUrl(path), {
            method: "POST",
            headers: { ...this.headers(contentType) },
            body: data,
        });
        if (!res.ok) {
            let body: EtapiError;
            try { body = await res.json() as EtapiError; } catch { throw new EtapiClientError(res.status, "UNKNOWN", res.statusText); }
            throw new EtapiClientError(body.status, body.code, body.message);
        }
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) return res.json();
        if (res.status === 204) return undefined;
        return undefined;
    }

    /**
     * Static login method with the same protocol fallback logic.
     * Used before a client instance exists (no token yet).
     */
    static async postNoAuth<T>(baseUrl: string, path: string, body: unknown): Promise<{ data: T; resolvedBaseUrl: string }> {
        const { url: normalizedUrl, protocolWasAdded } = normalizeBaseUrl(baseUrl);
        const base = normalizedUrl.replace(/\/+$/, "");
        const fullBase = base.endsWith("/etapi") ? base : `${base}/etapi`;
        const url = `${fullBase}${path}`;
        const init: RequestInit = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        };

        let res: Response;
        let resolvedBaseUrl = fullBase;
        try {
            res = await fetch(url, init);
        } catch (err) {
            if (protocolWasAdded && isNetworkError(err)) {
                const altUrl = url.replace(/^https:\/\//, "http://");
                resolvedBaseUrl = fullBase.replace(/^https:\/\//, "http://");
                res = await fetch(altUrl, init);
            } else {
                throw err;
            }
        }

        if (!res.ok) {
            let errBody: EtapiError;
            try { errBody = await res.json() as EtapiError; } catch { throw new EtapiClientError(res.status, "UNKNOWN", res.statusText); }
            throw new EtapiClientError(errBody.status, errBody.code, errBody.message);
        }
        const data = await res.json() as T;
        return { data, resolvedBaseUrl };
    }
}
