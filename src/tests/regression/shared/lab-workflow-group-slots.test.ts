import { describe, expect, test } from '@jest/globals';
import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import {
  LAB_WORKFLOW_GROUP_SLOT_GAP,
  LAB_WORKFLOW_GROUP_SLOT_HEIGHT,
  LAB_WORKFLOW_GROUP_SLOT_TOP,
  LAB_WORKFLOW_MEMBER_CARD_MAX_WIDTH,
  LAB_WORKFLOW_MEMBER_INSET,
  labWorkflowGroupHeightForMembers,
  labWorkflowGroupHeightForSlots,
  labWorkflowGroupMemberPosition,
  labWorkflowGroupMemberSize,
  labWorkflowGroupRunStatus,
  labWorkflowGroupSlotCount,
  labWorkflowGroupSlotPosition,
  labWorkflowGroupSlotWidth,
  nextLabWorkflowGroupSlotIndex,
  resolveLabWorkflowGroupDropTarget,
} from '@/shared/utils/lab-workflow-group-slots';
import {
  labWorkflowFlowNodesFromVueFlow,
  labWorkflowFlowNodesToVueFlow,
} from '@/shared/types/lab-workflow-graph-flow';

function group(overrides: Partial<LabWorkflowGraphNodeV2> = {}): LabWorkflowGraphNodeV2 {
  return {
    id: 'g1',
    kind: 'group',
    position: { x: 100, y: 100 },
    label: 'G',
    width: 320,
    height: 200,
    groupType: 'actions',
    executionMode: 'sequential',
    failurePolicy: 'stop',
    ...overrides,
  } as LabWorkflowGraphNodeV2;
}

function action(id: string, groupId?: string): LabWorkflowGraphNodeV2 {
  return {
    id,
    kind: 'action',
    position: { x: 0, y: 0 },
    ...(groupId ? { groupId } : {}),
    step: { kind: 'notify_users', userIds: [1] },
  } as LabWorkflowGraphNodeV2;
}

describe('resolveLabWorkflowGroupDropTarget', () => {
  test('a point outside every group resolves to the canvas', () => {
    expect(resolveLabWorkflowGroupDropTarget([group()], { x: 10, y: 10 }, 'action')).toBeNull();
  });

  test('a point inside an action group accepts an action', () => {
    const target = resolveLabWorkflowGroupDropTarget([group()], { x: 200, y: 250 }, 'action');
    expect(target?.groupId).toBe('g1');
  });

  test('a rule is refused by an action group', () => {
    // The reason this returns null instead of the group: a refused drop must leave the node where it
    // was, rather than reparenting it somewhere it cannot run.
    expect(resolveLabWorkflowGroupDropTarget([group()], { x: 200, y: 250 }, 'rule')).toBeNull();
  });

  test('a rule group accepts a rule and refuses an action', () => {
    const ruleGroup = group({ groupType: 'rules' } as Partial<LabWorkflowGraphNodeV2>);
    expect(resolveLabWorkflowGroupDropTarget([ruleGroup], { x: 200, y: 250 }, 'rule')?.groupId).toBe('g1');
    expect(resolveLabWorkflowGroupDropTarget([ruleGroup], { x: 200, y: 250 }, 'action')).toBeNull();
  });

  test('the innermost group wins when two overlap', () => {
    // Creation order must not decide which group a drop joins, or the answer changes when a graph is
    // re-imported in a different order.
    const outer = group({ id: 'outer', width: 600, height: 600 });
    const inner = group({ id: 'inner', position: { x: 150, y: 150 }, width: 200, height: 200 });
    expect(resolveLabWorkflowGroupDropTarget([outer, inner], { x: 200, y: 250 }, 'action')?.groupId)
      .toBe('inner');
  });

  test('slot index increases as the pointer moves down the rail', () => {
    /*
     * The group box is derived from its member count, so a zero-member group only spans one slot plus
     * the empty one. Seed two members so the later probe is genuinely inside the card — otherwise a
     * "no target" result reads like a slot-index bug.
     */
    const nodes = [
      group(),
      { ...action('a1', 'g1'), position: labWorkflowGroupSlotPosition(0) },
      { ...action('a2', 'g1'), position: labWorkflowGroupSlotPosition(1) },
    ];
    const first = resolveLabWorkflowGroupDropTarget(
      nodes,
      { x: 200, y: 100 + LAB_WORKFLOW_GROUP_SLOT_TOP },
      'action',
    );
    const later = resolveLabWorkflowGroupDropTarget(
      nodes,
      {
        x: 200,
        y: 100 + LAB_WORKFLOW_GROUP_SLOT_TOP + LAB_WORKFLOW_GROUP_SLOT_HEIGHT
          + LAB_WORKFLOW_GROUP_SLOT_GAP,
      },
      'action',
    );
    expect(first?.index).toBe(0);
    expect(later?.index).toBe(1);
  });
});

describe('labWorkflowGroupRunStatus', () => {
  /*
   * The runner records a step per **member** and never one for the group, so the group's colour has to
   * be derived. Getting the precedence wrong is worse than showing nothing: a group that half-failed
   * must not read as green when scanned at a glance.
   */
  test('a single succeeded member turns the group green', () => {
    expect(labWorkflowGroupRunStatus(['a1'], { a1: 'succeeded' })).toBe('succeeded');
  });

  test('a failed member wins over a succeeded one', () => {
    expect(
      labWorkflowGroupRunStatus(['a1', 'a2'], { a1: 'succeeded', a2: 'failed' }),
    ).toBe('failed');
  });

  test('a failure wins regardless of member order', () => {
    expect(
      labWorkflowGroupRunStatus(['a1', 'a2'], { a1: 'failed', a2: 'succeeded' }),
    ).toBe('failed');
  });

  test('running beats succeeded, so a group still working is not shown as done', () => {
    expect(
      labWorkflowGroupRunStatus(['a1', 'a2'], { a1: 'succeeded', a2: 'running' }),
    ).toBe('running');
  });

  test('no recorded members yields null so the group stays untinted', () => {
    expect(labWorkflowGroupRunStatus(['a1', 'a2'], {})).toBeNull();
    expect(labWorkflowGroupRunStatus([], { a1: 'succeeded' })).toBeNull();
  });

  test('ignores members that are not part of the group', () => {
    // A status for a node outside the group must not colour it.
    expect(labWorkflowGroupRunStatus(['a1'], { a2: 'failed', a1: 'succeeded' })).toBe('succeeded');
  });
});

describe('slot geometry', () => {
  test('slots stack below the header and never overlap', () => {
    const first = labWorkflowGroupSlotPosition(0);
    const second = labWorkflowGroupSlotPosition(1);
    expect(first.y).toBe(LAB_WORKFLOW_GROUP_SLOT_TOP);
    expect(second.y).toBeGreaterThan(first.y);
  });

  test('there is ALWAYS exactly one empty slot beyond the members', () => {
    /*
     * Never a minimum of two. `Math.max(1, count) + 1` drew two slots for an empty group, which also
     * made the rendered card taller than the derived hit box — so the lower half of the card was not
     * recognised as the group and drops there fell through to the canvas.
     */
    expect(labWorkflowGroupSlotCount(0)).toBe(1);
    expect(labWorkflowGroupSlotCount(1)).toBe(2);
    expect(labWorkflowGroupSlotCount(2)).toBe(3);
  });

  test('an empty group box is one slot tall, matching what it renders', () => {
    // The invariant behind the drop bug: rendered slot count and hit-test height must agree.
    const height = labWorkflowGroupHeightForMembers(0);
    const oneSlot = labWorkflowGroupHeightForSlots(labWorkflowGroupSlotCount(0));
    expect(height).toBe(oneSlot);
  });

  test('group height grows with member count and never shrinks below the default', () => {
    expect(labWorkflowGroupHeightForMembers(1)).toBeLessThan(labWorkflowGroupHeightForMembers(3));
    expect(labWorkflowGroupHeightForMembers(0)).toBeGreaterThan(0);
  });

  test('adding a member expands the group card', () => {
    // The user-visible requirement: the group must grow, not clip the new member.
    expect(labWorkflowGroupHeightForMembers(3)).toBeGreaterThan(labWorkflowGroupHeightForMembers(2));
  });

  test('a member card is centred inside its band, both axes', () => {
    /*
     * The bug this guards: the offset was computed against a *different* width than the card actually
     * had, because the card sized itself from its summary text. Two members with different summaries
     * therefore sat 20px apart, each centred against the wrong assumed size.
     */
    const groupWidth = 320;
    const index = 0;
    const band = labWorkflowGroupSlotPosition(index, groupWidth);
    const bandWidth = labWorkflowGroupSlotWidth(groupWidth);
    const member = labWorkflowGroupMemberPosition(index, groupWidth);

    const size = labWorkflowGroupMemberSize(groupWidth);

    // Equal gaps left and right.
    const leftGap = member.x - band.x;
    const rightGap = (band.x + bandWidth) - (member.x + size.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);

    // Equal gaps above and below (vertical centring was impossible while height was content-driven).
    const topGap = member.y - band.y;
    const bottomGap = (band.y + LAB_WORKFLOW_GROUP_SLOT_HEIGHT) - (member.y + size.height);
    expect(Math.abs(topGap - bottomGap)).toBeLessThanOrEqual(1);
  });

  test.each([320, 420])(
    'the inset is exactly the declared value on all four sides at a %ipx group',
    (groupWidth) => {
      /*
       * Widths are chosen to sit **below** the card cap, which is where the declared inset governs.
       *
       * The regression this guards: a `min(cap, band - inset*2)` formula let a 260px cap silently widen
       * the gap to 10px at a 320px group, while the code and its (weaker) test still claimed 5px. The
       * assertion is now on the measured gap, so a cap that contradicts the inset fails immediately.
       */
      const band = labWorkflowGroupSlotPosition(0, groupWidth);
      const bandWidth = labWorkflowGroupSlotWidth(groupWidth);
      const size = labWorkflowGroupMemberSize(groupWidth);
      const member = labWorkflowGroupMemberPosition(0, groupWidth);

      expect(member.x - band.x).toBe(LAB_WORKFLOW_MEMBER_INSET);
      expect(band.x + bandWidth - (member.x + size.width)).toBe(LAB_WORKFLOW_MEMBER_INSET);
      expect(member.y - band.y).toBe(LAB_WORKFLOW_MEMBER_INSET);
      expect(band.y + LAB_WORKFLOW_GROUP_SLOT_HEIGHT - (member.y + size.height))
        .toBe(LAB_WORKFLOW_MEMBER_INSET);
    },
  );

  test('a very wide group caps the card but stays centred', () => {
    // Beyond the cap the inset necessarily exceeds 5px; what must hold is that the card is centred.
    const groupWidth = 1400;
    const bandWidth = labWorkflowGroupSlotWidth(groupWidth);
    const size = labWorkflowGroupMemberSize(groupWidth);
    const band = labWorkflowGroupSlotPosition(0, groupWidth);
    const member = labWorkflowGroupMemberPosition(0, groupWidth);
    expect(size.width).toBe(LAB_WORKFLOW_MEMBER_CARD_MAX_WIDTH);
    expect(member.x - band.x).toBe(band.x + bandWidth - (member.x + size.width));
  });

  test('the band is tall enough to contain the card and its inset', () => {
    // A band shorter than the card is what made the outline appear to cut through it.
    const size = labWorkflowGroupMemberSize(320);
    expect(size.height + LAB_WORKFLOW_MEMBER_INSET * 2)
      .toBeLessThanOrEqual(LAB_WORKFLOW_GROUP_SLOT_HEIGHT);
  });

  test('a projected group height always satisfies the definition schema', () => {
    /*
     * The regression this guards: the projected height is written **back into the definition** on save,
     * and the schema requires 120..600. The collapsed height (92) therefore made the whole workflow
     * unsaveable with `nodes[N].height: Too small` — an error the author could not act on, because the
     * group looked fine on the canvas.
     */
    for (let members = 0; members <= 6; members += 1) {
      const height = labWorkflowGroupHeightForMembers(members);
      expect(height).toBeGreaterThanOrEqual(120);
      expect(height).toBeLessThanOrEqual(600);
    }
  });

  test('height and slot positions stay consistent for every slot', () => {
    const slots = 3;
    const height = labWorkflowGroupHeightForSlots(slots);
    const lastTop = labWorkflowGroupSlotPosition(slots - 1).y;
    // Every slot must fit inside the card, with the bottom padding to spare.
    expect(lastTop + LAB_WORKFLOW_GROUP_SLOT_TOP).toBeLessThan(height);
  });

  test('next slot index counts existing members', () => {
    const nodes = [group(), action('a1', 'g1'), action('a2', 'g1')];
    expect(nextLabWorkflowGroupSlotIndex(nodes, 'g1')).toBe(2);
  });
});

describe('labWorkflowFlowNodesFromVueFlow position contract', () => {
  test('a parented node persists its PARENT-RELATIVE offset, not the absolute point', () => {
    /*
     * The regression this guards: `computedPosition` is absolute (`parent + position`) while the
     * domain field is read back as parent-relative. Persisting the absolute value pushed the child by
     * the group's origin on every round-trip, which is why members appeared outside their group and
     * drifted further on each save.
     */
    const nodes = labWorkflowFlowNodesFromVueFlow([
      {
        id: 'a1',
        type: 'action',
        position: { x: 28, y: 84 },
        computedPosition: { x: 128, y: 184, z: 1 },
        parentNode: 'g1',
        data: { node: action('a1', 'g1'), label: 'A' },
      } as never,
    ]);
    expect(nodes[0]?.position).toEqual({ x: 28, y: 84 });
  });

  test('a group member is NOT clamped to its parent extent', () => {
    /*
     * The regression this guards: the Vue Flow mapper defaulted `extent` to `'parent'` for any
     * parented node, which re-applied the clamp the domain mapper deliberately omits. A clamped child
     * cannot be dragged onto the canvas, so "drag it out of the group" was impossible no matter what
     * the drop handler did.
     */
    const member = labWorkflowFlowNodesToVueFlow([
      {
        id: 'a1',
        type: 'action',
        position: { x: 28, y: 84 },
        parentNode: 'g1',
        data: { node: action('a1', 'g1'), label: 'A' },
      },
    ]);
    expect(member[0]?.parentNode).toBe('g1');
    expect(member[0]?.extent).toBeUndefined();
  });

  test('an explicit extent is still forwarded', () => {
    const member = labWorkflowFlowNodesToVueFlow([
      {
        id: 'a1',
        type: 'action',
        position: { x: 28, y: 84 },
        parentNode: 'g1',
        extent: 'parent',
        data: { node: action('a1', 'g1'), label: 'A' },
      },
    ]);
    expect(member[0]?.extent).toBe('parent');
  });

  test('a detached member loses parentNode AND takes its absolute position', () => {
    /*
     * The regression this guards: `buildDefinitionFromFlow` derives `groupId` from Vue Flow's
     * `parentNode`, which the store keeps even after we clear containment on our copy — so every
     * rebuild re-joined the node and the group still counted it. The canvas passes an explicit
     * `detachedIds` set, applied before position is read so the node also switches from a
     * parent-relative offset to the absolute point it was dropped at.
     */
    const mapped = labWorkflowFlowNodesFromVueFlow(
      [
        {
          id: 'a1',
          type: 'action',
          position: { x: 28, y: 74 },
          computedPosition: { x: 428, y: 574, z: 1 },
          parentNode: 'g1',
          data: { node: action('a1', 'g1'), label: 'A' },
        } as never,
      ],
      new Set(['a1']),
    );
    expect(mapped[0]?.parentNode).toBeUndefined();
    expect(mapped[0]?.extent).toBeUndefined();
    expect(mapped[0]?.position).toEqual({ x: 428, y: 574 });
  });

  test('a non-detached member still keeps its parent-relative offset', () => {
    const mapped = labWorkflowFlowNodesFromVueFlow(
      [
        {
          id: 'a1',
          type: 'action',
          position: { x: 28, y: 74 },
          computedPosition: { x: 428, y: 574, z: 1 },
          parentNode: 'g1',
          data: { node: action('a1', 'g1'), label: 'A' },
        } as never,
      ],
      new Set<string>(),
    );
    expect(mapped[0]?.parentNode).toBe('g1');
    expect(mapped[0]?.position).toEqual({ x: 28, y: 74 });
  });

  test('a top-level node keeps using the resolved absolute position', () => {
    const nodes = labWorkflowFlowNodesFromVueFlow([
      {
        id: 't1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        computedPosition: { x: 40, y: 60, z: 1 },
        data: { node: { id: 't1', kind: 'trigger', position: { x: 0, y: 0 }, eventType: 'a.b' }, label: 'T' },
      } as never,
    ]);
    expect(nodes[0]?.position).toEqual({ x: 40, y: 60 });
  });
});
