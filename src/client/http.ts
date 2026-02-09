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

export class HttpClient {
    private baseUrl: string;
    private token: string;

    constructor(baseUrl: string, token: string) {
        // Strip trailing slash and ensure /etapi suffix
        const base = baseUrl.replace(/\/+$/, "");
        this.baseUrl = base.endsWith("/etapi") ? base : `${base}/etapi`;
        this.token = token;
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
        const res = await fetch(this.buildUrl(path, params), { method: "GET", headers: this.headers() });
        return this.handleResponse<T>(res);
    }

    async post<T>(path: string, body?: unknown): Promise<T> {
        const res = await fetch(this.buildUrl(path), {
            method: "POST",
            headers: this.headers("application/json"),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse<T>(res);
    }

    async put<T>(path: string, body?: unknown): Promise<T> {
        const res = await fetch(this.buildUrl(path), {
            method: "PUT",
            headers: this.headers("application/json"),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse<T>(res);
    }

    async patch<T>(path: string, body: unknown): Promise<T> {
        const res = await fetch(this.buildUrl(path), {
            method: "PATCH",
            headers: this.headers("application/json"),
            body: JSON.stringify(body),
        });
        return this.handleResponse<T>(res);
    }

    async delete(path: string): Promise<void> {
        const res = await fetch(this.buildUrl(path), { method: "DELETE", headers: this.headers() });
        await this.handleResponse<void>(res);
    }

    async getRaw(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<Buffer> {
        const res = await fetch(this.buildUrl(path, params), { method: "GET", headers: this.headers() });
        if (!res.ok) {
            // Try to parse error JSON
            let body: EtapiError;
            try { body = await res.json() as EtapiError; } catch { throw new EtapiClientError(res.status, "UNKNOWN", res.statusText); }
            throw new EtapiClientError(body.status, body.code, body.message);
        }
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
    }

    async putRaw(path: string, data: Buffer | string, contentType: string = "text/plain"): Promise<void> {
        const res = await fetch(this.buildUrl(path), {
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
        const res = await fetch(this.buildUrl(path), {
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

    // Static method for login (no token needed)
    static async postNoAuth<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
        const base = baseUrl.replace(/\/+$/, "");
        const url = base.endsWith("/etapi") ? `${base}${path}` : `${base}/etapi${path}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            let errBody: EtapiError;
            try { errBody = await res.json() as EtapiError; } catch { throw new EtapiClientError(res.status, "UNKNOWN", res.statusText); }
            throw new EtapiClientError(errBody.status, errBody.code, errBody.message);
        }
        return res.json() as Promise<T>;
    }
}
