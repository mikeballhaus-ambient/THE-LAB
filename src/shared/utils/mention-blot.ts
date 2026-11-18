import Quill from 'quill'

interface IMentionData {
  type: string
  value: string
}

type EmbedBlotConstructor = {
  new (): { domNode: Node };
  create(data?: IMentionData): HTMLElement;
};

const Embed = Quill.import('blots/embed') as EmbedBlotConstructor;

export class MentionBlot extends Embed  {
  static blotName = 'mention'
  static tagName = 'span'
  static className = 'mention'

  // ✅ Tell Quill this is real formatting (prevents collapsing into text)
  static formats() {
    return true
  }

  // ⭐ REQUIRED in Quill 2 to prevent merging + whitespace normalization
  optimize(context: unknown) {
    void context;
    return
  }

  // ⭐ Prevent Quill from inserting text *inside* the blot
  insertInto(parent: { insertBefore(node: Node, ref: Node | null): void }, ref: Node | null) {
    parent.insertBefore(this.domNode, ref)
  }

  static create(data?: IMentionData) {
    const node = super.create() as HTMLElement
    const mention = data ?? { type: '', value: '' };

    node.setAttribute('data-type', mention.type)
    node.setAttribute('data-value', mention.value)

    // Optional but helps avoid weird wrapping/spacing
    node.style.whiteSpace = 'nowrap'

    if (mention.type === 'file') {
      node.textContent = `@${mention.value}`
    } else if (mention.type === 'command') {
      node.textContent = `/${mention.value}`
    } else {
      node.textContent = mention.value
    }

    return node
  }

  static value(node: HTMLElement): IMentionData | undefined {
    if (node.classList && node.classList.contains('mention')) {
      return {
        type: node.getAttribute('data-type') ?? '',
        value: node.getAttribute('data-value') ?? ''
      }
    }
    return undefined
  }
}