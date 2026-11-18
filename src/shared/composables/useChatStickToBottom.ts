import { nextTick, ref } from 'vue';

const DEFAULT_PIN_THRESHOLD_PX = 48;

/** Auto-scroll only while the user remains near the bottom of a chat scroll container. */
export function useChatStickToBottom(thresholdPx = DEFAULT_PIN_THRESHOLD_PX) {
  const stickToBottom = ref(true);

  function isPinnedToBottom(el: HTMLElement): boolean {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= thresholdPx;
  }

  function onScrollContainer(el: HTMLElement | null | undefined): void {
    if (!el) {
      return;
    }
    stickToBottom.value = isPinnedToBottom(el);
  }

  function onScrollEvent(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      onScrollContainer(target);
    }
  }

  async function scrollElToBottom(el: HTMLElement | null | undefined): Promise<void> {
    await nextTick();
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  async function scrollToBottomIfPinned(el: HTMLElement | null | undefined): Promise<void> {
    if (!stickToBottom.value) {
      return;
    }
    await scrollElToBottom(el);
  }

  function pinAndScroll(el: HTMLElement | null | undefined): void {
    stickToBottom.value = true;
    void scrollElToBottom(el);
  }

  function resetPin(): void {
    stickToBottom.value = true;
  }

  return {
    stickToBottom,
    isPinnedToBottom,
    onScrollContainer,
    onScrollEvent,
    scrollElToBottom,
    scrollToBottomIfPinned,
    pinAndScroll,
    resetPin,
  };
}
