/**
 * Read all data from stdin when input is piped.
 * Returns null if stdin is a TTY (interactive terminal, no pipe).
 */
export async function readStdin(): Promise<Buffer | null> {
    if (process.stdin.isTTY) return null;

    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}
