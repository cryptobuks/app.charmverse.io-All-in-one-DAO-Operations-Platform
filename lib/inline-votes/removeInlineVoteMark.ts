import { EditorView, MarkType, Mark } from '@bangle.dev/pm';
import { findChildrenByMark, NodeWithPos } from 'prosemirror-utils';

export function removeInlineVoteMark (view: EditorView, voteId: string) {
  const doc = view.state.doc;
  const inlineVoteMarkSchema = view.state.schema.marks['inline-vote'] as MarkType;
  const inlineVoteNodes = findChildrenByMark(doc, inlineVoteMarkSchema);
  const inlineVoteNodeWithMarks: (NodeWithPos & {mark: Mark})[] = [];

  for (const inlineVoteNode of inlineVoteNodes) {
    // Find the inline vote mark for the node
    const inlineVoteMark = inlineVoteNode.node.marks.find(mark => mark.type.name === inlineVoteMarkSchema.name);
    // Make sure the mark has the same threadId as the given one
    if (inlineVoteMark?.attrs.id === voteId) {
      inlineVoteNodeWithMarks.push({
        ...inlineVoteNode,
        mark: inlineVoteMark
      });
    }
  }

  inlineVoteNodeWithMarks.forEach(inlineVoteNodeWithMark => {
    const from = inlineVoteNodeWithMark.pos;
    const to = from + inlineVoteNodeWithMark.node.nodeSize;
    const tr = view.state.tr.removeMark(from, to, inlineVoteMarkSchema);
    if (view.dispatch) {
      view.dispatch(tr);
    }
  });
}