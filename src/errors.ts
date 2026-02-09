import { EtapiClientError } from "./client/http.js";

/**
 * Extract a URL from a Node.js network error message.
 * Typical messages look like:
 *   "fetch failed" with a cause containing "connect ECONNREFUSED 127.0.0.1:8080"
 *   or the message itself may contain a URL or host:port.
 */
function extractUrlFromError(err: Error): string | undefined {
    // Check the message and cause chain for host:port patterns
    const sources: string[] = [err.message];

    if (err.cause instanceof Error) {
        sources.push(err.cause.message);
    } else if (typeof err.cause === "string") {
        sources.push(err.cause);
    }

    for (const text of sources) {
        // Match patterns like "http://host:port" or "https://host:port"
        const urlMatch = text.match(/https?:\/\/[^\s,)]+/);
        if (urlMatch) return urlMatch[0];

        // Match "host:port" from ECONNREFUSED messages like "connect ECONNREFUSED 127.0.0.1:8080"
        const hostPortMatch = text.match(/(\d{1,3}(?:\.\d{1,3}){3}:\d+)/);
        if (hostPortMatch) return hostPortMatch[1];
    }

    return undefined;
}

/**
 * Determine whether an error represents an ECONNREFUSED network failure.
 */
function isConnectionRefused(err: Error): boolean {
    // Node.js fetch wraps the underlying error as `cause`
    if (err.cause instanceof Error) {
        const cause = err.cause as Error & { code?: string };
        if (cause.code === "ECONNREFUSED") return true;
        if (cause.message?.includes("ECONNREFUSED")) return true;
    }

    // Some environments surface the code directly on the error
    const coded = err as Error & { code?: string };
    if (coded.code === "ECONNREFUSED") return true;

    // Fallback: check the message itself
    if (err.message?.includes("ECONNREFUSED")) return true;

    return false;
}

/**
 * Handle any error thrown during CLI execution and exit the process.
 *
 * Provides user-friendly messages with actionable hints based on the error
 * type and status code.
 */
export function handleError(err: unknown): never {
    if (err instanceof EtapiClientError) {
        switch (err.status) {
            case 401:
                console.error(
                    "Error: Authentication failed. Check your auth token (--token or TRILIUM_TOKEN)."
                );
                break;
            case 403:
                console.error(
                    "Error: Access denied. Your token may lack permissions for this operation."
                );
                break;
            case 404:
                console.error(
                    "Error: Entity not found. Verify the ID is correct."
                );
                break;
            case 429:
                console.error(
                    "Error: Rate limited. Please wait and try again."
                );
                break;
            default:
                console.error(
                    `Error: ETAPI error (${err.status} ${err.code}): ${err.message}`
                );
                break;
        }

        process.exit(1);
    }

    if (err instanceof Error) {
        if (isConnectionRefused(err)) {
            const url = extractUrlFromError(err);
            if (url) {
                console.error(
                    `Error: Connection refused. Is Trilium running at ${url}?`
                );
            } else {
                console.error(
                    "Error: Connection refused. Is Trilium running at the configured server?"
                );
            }

            process.exit(1);
        }

        console.error(`Error: ${err.message}`);
        process.exit(1);
    }

    console.error("Error: An unexpected error occurred.");
    process.exit(1);
}
