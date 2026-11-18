export interface SearchResult {
    file: string;           // Full resolved path
    line: number;            // 1-indexed line number
    match: string;           // The matched regex string
    context: string;         // Surrounding line context (3 lines before + 3 after)
}