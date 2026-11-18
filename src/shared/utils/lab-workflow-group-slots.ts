import type { LabWorkflowGraphNodeV2, LabWorkflowGraphPosition } from '@/shared/types/lab-workflow-graph';
import {
  DEFAULT_GROUP_WIDTH,
  LAB_WORKFLOW_NODE_DROP_HEIGHT,
  LAB_WORKFLOW_NODE_DROP_WIDTH,
} from '@/shared/types/lab-workflow-graph-flow';

export { DEFAULT_GROUP_WIDTH, LAB_WORKFLOW_NODE_DROP_HEIGHT, LAB_WORKFLOW_NODE_DROP_WIDTH };

/**
 * Geometry for dropping canvas nodes into a group and for laying members out in **slots**.
 *
 * ## Why these constants live here
 *
 * The drop maths, the group's rendered card and the auto-arrange pass all have to agree about where
 * the header ends and where the first slot starts. When they were three independent sets of numbers
 * the drop landed a node over the header, the card clipped it, and the arrangement pass then moved it
 * somewhere else on the next save — three symptoms of one disagreement.
 *
 * The numbers mirror `DEFAULT_OPTIONS` in `lab-workflow-graph-auto-arrange.ts` (`groupPadding: 28`,
 * `groupHeader: 44`, `siblingGap: 44`), which is what "Auto arrange" already produces. Slots and
 * auto-arrange therefore put members in the same place, so a user cannot tell which one ran.
 */
export const LAB_WORKFLOW_GROUP_PADDING = 20;
/** Height reserved for the group's own header (kind label, name, mode hint). */
export const LAB_WORKFLOW_GROUP_SLOT_TOP = 74;

/**
 * Slot band height, and the pitch between bands.
 *
 * The rail's own numbers, not the palette's `LAB_WORKFLOW_NODE_DROP_HEIGHT` (76): that constant answers
 * "where is a newly dropped node centred", which is a different question from "how tall is a band".
 * Sized so the tallest realistic member card — kind row, two-line summary, padding — fits with the
 * declared inset on both sides.
 */
/**
 * Band height, sized from the card it must contain — not the other way round.
 *
 * The member card needs ~54px for a kind row plus a two-line summary at the reduced member type scale,
 * and the inset adds 5px top and bottom. 74 gave a 64px card, which was **shorter** than its content,
 * so the summary overflowed and the band's dashed outline appeared to cut through the card. The card's
 * own `LAB_WORKFLOW_MEMBER_CARD_HEIGHT` is derived from this, so the two cannot disagree.
 */
/*
 * Raised from 84 alongside the 10px inset: the card needs ~74px for a kind row plus a two-line summary,
 * so the band is `card + inset * 2`. Bumping only the inset would have shrunk the card to 64px and
 * clipped the summary — the size is derived, so the band has to carry the padding.
 */
export const LAB_WORKFLOW_GROUP_SLOT_HEIGHT = 94;
export const LAB_WORKFLOW_GROUP_SLOT_GAP = 8;

/**
 * Inset of a member card inside its slot band, on **every** side.
 *
 * A single number, because the card is a separate surface sitting inside the band: the gap only reads
 * as padding when it is equal on all four sides. It is also the invariant that lets the card be
 * positioned before it renders — `labWorkflowGroupMemberSize` derives the card's footprint from this,
 * so the width used for centring is the width the card actually has.
 */
export const LAB_WORKFLOW_MEMBER_INSET = 10;

/**
 * Hard ceiling on the card width, for absurdly wide groups.
 *
 * **It must never contradict the inset.** A cap below `band - 2 * inset` silently widened the gap: at a
 * 320px group the band is 280, the inset asks for 270, and a 260 cap produced a 10px gap on each side
 * while the code and its tests still claimed 5. The cap is now expressed as a maximum only, and
 * `labWorkflowGroupMemberSize` prefers the inset whenever the two disagree.
 */
export const LAB_WORKFLOW_MEMBER_CARD_MAX_WIDTH = 400;

/** Member card footprint for a group width: the band minus its inset on every side. */
export function labWorkflowGroupMemberSize(groupWidth: number): {
  width: number;
  height: number;
} {
  const bandWidth = labWorkflowGroupSlotWidth(groupWidth);
  /*
   * The inset decides the size; the cap may only *reduce* it, never contradict it.
   *
   * The previous version took `min(cap, band - inset*2)`, so a cap smaller than the inset budget quietly
   * widened the visible gap while the code still reported the inset. Taking the inset first and applying
   * the cap afterwards keeps the declared padding honest for every group width the UI can produce.
   */
  const fromInset = bandWidth - LAB_WORKFLOW_MEMBER_INSET * 2;
  return {
    width: Math.max(80, Math.min(fromInset, LAB_WORKFLOW_MEMBER_CARD_MAX_WIDTH)),
    height: Math.max(40, LAB_WORKFLOW_GROUP_SLOT_HEIGHT - LAB_WORKFLOW_MEMBER_INSET * 2),
  };
}

/** Top-left for a member card, centred inside the slot at `index` after its inset. */
export function labWorkflowGroupMemberPosition(
  index: number,
  groupWidth: number,
): LabWorkflowGraphPosition {
  const slot = labWorkflowGroupSlotPosition(index, groupWidth);
  const size = labWorkflowGroupMemberSize(groupWidth);
  const bandWidth = labWorkflowGroupSlotWidth(groupWidth);
  return {
    x: slot.x + Math.max(0, (bandWidth - size.width) / 2),
    y: slot.y + Math.max(0, (LAB_WORKFLOW_GROUP_SLOT_HEIGHT - size.height) / 2),
  };
}
/**
 * Slots rendered for `memberCount` members — **always one more than the member count**.
 *
 * The trailing empty slot is the affordance, not spare capacity: without it a full group shows no
 * place to drop, and the only way to add a member is a palette click that ignores the visual story the
 * slots tell. One empty slot is always enough, because a drop consumes it and reveals the next.
 */
export function labWorkflowGroupSlotCount(memberCount: number): number {
  /*
   * Members **plus exactly one** empty slot — never a minimum of two.
   *
   * `Math.max(1, memberCount) + 1` made an empty group render two slots. That was not just cosmetic:
   * the rendered card was then taller than the derived hit box (which counts members), so the lower
   * half of the card was not recognised as the group and drops there fell through to the canvas.
   */
  return Math.max(0, memberCount) + 1;
}

/**
 * Rendered height of a **collapsed** group: header block only, no rail.
 *
 * Deliberately **view-only** and never persisted — the stored height stays the expanded value, because
 * the schema requires >= 120 and a view preference must not enter the definition. The CSS
 * `--collapsed` rule consumes this number, not the projection.
 */
export const LAB_WORKFLOW_GROUP_COLLAPSED_HEIGHT = 92;

/**
 * Schema minimum for `LabWorkflowGraphNodeV2` group height.
 *
 * Kept here as a named constant because the projected height is written **back into the definition** on
 * save. A projection below this value made the whole workflow unsaveable with
 * `nodes[N].height: Too small: expected number to be >=120` — a validation error the author could not
 * act on, since the group looked fine on canvas.
 */
export const LAB_WORKFLOW_GROUP_MIN_SCHEMA_HEIGHT = 120;
/** Schema maximum, mirrored for the same reason. */
export const LAB_WORKFLOW_GROUP_MAX_SCHEMA_HEIGHT = 600;

/** Height a group needs to show `slotCount` slots below its header, clamped to the schema bounds. */
export function labWorkflowGroupHeightForSlots(slotCount: number): number {
  const rows = Math.max(slotCount, 1);
  const natural =
    LAB_WORKFLOW_GROUP_SLOT_TOP
    + rows * LAB_WORKFLOW_GROUP_SLOT_HEIGHT
    + (rows - 1) * LAB_WORKFLOW_GROUP_SLOT_GAP
    + LAB_WORKFLOW_GROUP_PADDING;
  return Math.min(
    LAB_WORKFLOW_GROUP_MAX_SCHEMA_HEIGHT,
    Math.max(LAB_WORKFLOW_GROUP_MIN_SCHEMA_HEIGHT, natural),
  );
}

/** Height for a group, honouring the collapsed state. */
export function labWorkflowGroupHeight(slotCount: number, collapsed: boolean): number {
  return collapsed ? LAB_WORKFLOW_GROUP_COLLAPSED_HEIGHT : labWorkflowGroupHeightForSlots(slotCount);
}

/** Height for `count` members, including the mandatory empty slot. */
export function labWorkflowGroupHeightForMembers(count: number): number {
  return labWorkflowGroupHeightForSlots(labWorkflowGroupSlotCount(count));
}

/**
 * Horizontal inset of a slot band inside its group.
 *
 * Shared by the member projection and the rendered band so the two cannot disagree: a member centred
 * by one rule and a band drawn by another is exactly what made cards look off-centre in their slots.
 */
/**
 * Width of a slot band.
 *
 * Derived from the group's own width rather than the palette's drop footprint: a member card stretches
 * to fill the band, and the band should use the space the group actually has. Using a fixed 176px left
 * the slot visibly narrower than the member card that sat in it.
 */
export function labWorkflowGroupSlotWidth(groupWidth: number): number {
  const width = Number.isFinite(groupWidth) && groupWidth > 0 ? groupWidth : DEFAULT_GROUP_WIDTH;
  return Math.max(
    LAB_WORKFLOW_NODE_DROP_WIDTH,
    width - LAB_WORKFLOW_GROUP_PADDING * 2,
  );
}

/** Horizontal inset that centres a band of `labWorkflowGroupSlotWidth` in the group. */
export function labWorkflowGroupSlotInset(groupWidth: number): number {
  const width = Number.isFinite(groupWidth) && groupWidth > 0 ? groupWidth : DEFAULT_GROUP_WIDTH;
  return Math.max(0, (width - labWorkflowGroupSlotWidth(groupWidth)) / 2);
}

/**
 * Top-left of the slot a member should occupy, relative to the group node.
 *
 * `groupWidth` centres the card horizontally; without it the member sat at the left padding while the
 * band spanned the full width, so the card looked pinned to the corner of its slot.
 */
export function labWorkflowGroupSlotPosition(
  index: number,
  groupWidth: number = DEFAULT_GROUP_WIDTH,
): LabWorkflowGraphPosition {
  const row = Math.max(0, index);
  return {
    x: labWorkflowGroupSlotInset(groupWidth),
    y:
      LAB_WORKFLOW_GROUP_SLOT_TOP
      + row * (LAB_WORKFLOW_GROUP_SLOT_HEIGHT + LAB_WORKFLOW_GROUP_SLOT_GAP),
  };
}

export type LabWorkflowGroupDropTarget = {
  groupId: string;
  /** Slot index the node should take, derived from where in the group the pointer landed. */
  index: number;
};

/**
 * Aggregate a group's run status from its members.
 *
 * ## Why the group has no step of its own
 *
 * Members execute inside `runActionGroup`, which records a step per **member** and never one for the
 * group. So the group node was never painted during a run — it stayed untinted while every other node
 * went green, even though the group is what the author linked into the graph.
 *
 * Deriving instead of recording keeps the two honest: the group is green only if something inside it
 * actually succeeded, and red if any member failed. Recording a separate row would let the group claim
 * success while a member was skipped.
 *
 * Precedence is deliberately pessimistic — `failed` beats `running` beats `succeeded` beats `skipped` —
 * because a partially-failed group must not read as a success when scanned at a glance.
 */
export function labWorkflowGroupRunStatus(
  groupMemberIds: readonly string[],
  statusByNodeId: Readonly<Record<string, string | undefined>>,
): string | null {
  let seen: string | null = null;
  for (const id of groupMemberIds) {
    const status = statusByNodeId[id];
    if (!status) {
      continue;
    }
    if (status === 'failed') {
      return 'failed';
    }
    if (status === 'running') {
      seen = seen === 'failed' ? seen : 'running';
      continue;
    }
    if (status === 'succeeded' && seen == null) {
      seen = 'succeeded';
      continue;
    }
    if (seen == null) {
      seen = status;
    }
  }
  return seen;
}

/**
 * The group's **rendered** box.
 *
 * The height is derived from the slot count, not read from `group.height`: the canvas projects a
 * derived height so the card always fits its members, and the stored value goes stale the moment a
 * member is added or removed. Testing containment against the stale value is what made the empty slot
 * undroppable — it rendered *outside* the box the hit-test believed in.
 */
function groupBounds(
  group: LabWorkflowGraphNodeV2,
  nodes: readonly LabWorkflowGraphNodeV2[],
): { x: number; y: number; width: number; height: number } | null {
  if (group.kind !== 'group') {
    return null;
  }
  const memberCount = nodes.filter(
    (node) =>
      (node.kind === 'action' || node.kind === 'rule')
      && node.groupId === group.id,
  ).length;
  return {
    x: group.position.x,
    y: group.position.y,
    width: group.width ?? DEFAULT_GROUP_WIDTH,
    // Derived, never the stored value: the canvas projects a height that fits the slots, so a stored
    // height goes stale as soon as a member is added — and hit-testing against it made the empty slot
    // (rendered outside the stale box) undroppable.
    height: labWorkflowGroupHeightForMembers(memberCount),
  };
}

/**
 * Which group (if any) contains a point, in **canvas** coordinates.
 *
 * Smallest-area wins so a group dragged over another still resolves to the one the user aimed at —
 * picking the first match in array order made the answer depend on creation order, which is why
 * dropping into the visible group sometimes attached the node to a hidden one underneath.
 */
export function labWorkflowGroupAtPoint(
  nodes: readonly LabWorkflowGraphNodeV2[],
  point: LabWorkflowGraphPosition,
): LabWorkflowGraphNodeV2 | null {
  let best: { node: LabWorkflowGraphNodeV2; area: number } | null = null;
  for (const node of nodes) {
    const bounds = groupBounds(node, nodes);
    if (!bounds) {
      continue;
    }
    const inside =
      point.x >= bounds.x
      && point.x <= bounds.x + bounds.width
      && point.y >= bounds.y
      && point.y <= bounds.y + bounds.height;
    if (!inside) {
      continue;
    }
    const area = bounds.width * bounds.height;
    if (!best || area < best.area) {
      best = { node, area };
    }
  }
  return best?.node ?? null;
}

/**
 * Drop target for a node whose **centre** is at `point`, or null to stay on the canvas.
 *
 * The group must accept the member kind: an action group holds actions, a rule group holds rules.
 * Returning null rather than a wrong group is what makes the "snap back to the original slot"
 * behaviour possible — the caller keeps the node where it was instead of silently reparenting it.
 */
export function resolveLabWorkflowGroupDropTarget(
  nodes: readonly LabWorkflowGraphNodeV2[],
  point: LabWorkflowGraphPosition,
  memberKind: 'action' | 'rule',
): LabWorkflowGroupDropTarget | null {
  const group = labWorkflowGroupAtPoint(nodes, point);
  if (!group) {
    return null;
  }
  const groupType = group.kind === 'group' ? (group.groupType ?? 'actions') : 'actions';
  const accepts = groupType === 'actions' ? 'action' : 'rule';
  if (accepts !== memberKind) {
    return null;
  }
  const offsetY = point.y - group.position.y - LAB_WORKFLOW_GROUP_SLOT_TOP;
  const index = Math.max(
    0,
    Math.round(offsetY / (LAB_WORKFLOW_GROUP_SLOT_HEIGHT + LAB_WORKFLOW_GROUP_SLOT_GAP)),
  );
  return { groupId: group.id, index };
}

/**
 * Next free slot for a group, given its current members.
 *
 * Members are counted rather than positioned: a graph authored before slots existed has arbitrary
 * offsets, so "lowest free index" is the only question whose answer does not depend on where those
 * old nodes happen to sit.
 */
export function nextLabWorkflowGroupSlotIndex(
  nodes: readonly LabWorkflowGraphNodeV2[],
  groupId: string,
): number {
  return nodes.filter(
    (node) => (node.kind === 'action' || node.kind === 'rule') && node.groupId === groupId,
  ).length;
}
