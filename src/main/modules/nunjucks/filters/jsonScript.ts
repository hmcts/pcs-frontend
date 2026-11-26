/** JSON for a `<script type="application/json">`: `<` escaped so no text in it can end the script. */
export const jsonScript = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');
