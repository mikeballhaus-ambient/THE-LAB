export interface SseEvent {
  event: string;
  data: string;
}

/**
 * Incrementally parse `text/event-stream` chunks from a byte stream.
 */
export function createSseParser(onEvent: (ev: SseEvent) => void): (chunk: string) => void {
  let buffer = '';

  return (chunk: string) => {
    buffer += chunk;
    let sep = buffer.indexOf('\n\n');
    while (sep >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (dataLines.length > 0) {
        onEvent({ event, data: dataLines.join('\n') });
      }
      sep = buffer.indexOf('\n\n');
    }
  };
}

export async function readFetchSse(
  response: Response,
  onEvent: (ev: SseEvent) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response has no body');
  }
  const decoder = new TextDecoder();
  const parse = createSseParser(onEvent);
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    parse(decoder.decode(value, { stream: true }));
  }
  parse(decoder.decode());
}
