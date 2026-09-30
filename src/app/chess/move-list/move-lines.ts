import { moveNumber } from '../game-tree';
import type { MoveNode, RootNode, TreeNode } from '../model';
import { nagInfo, type Nag } from '../nags';

export interface MoveItem {
  kind: 'move';
  node: MoveNode;
  /** "14." or "14…", or null when the number is implied. */
  number: string | null;
  nags: Nag[];
}

/** A note inside a side line, shown inline with its moves. */
export interface InlineNote {
  kind: 'note';
  node: MoveNode;
  text: string;
}

export interface MovesLine {
  kind: 'moves';
  depth: number;
  items: (MoveItem | InlineNote)[];
}

/** A main-line note, shown as its own paragraph. */
export interface CommentLine {
  kind: 'comment';
  depth: 0;
  node: TreeNode;
  text: string;
}

export type Line = MovesLine | CommentLine;

/**
 * Flattens a game tree into book-style blocks: runs of moves, main-line
 * notes as paragraphs, and indented side lines (depth > 0) with their notes
 * inline, so templates never need recursion.
 */
export function buildLines(root: RootNode): Line[] {
  const lines: Line[] = [];
  let open: MovesLine | null = null;

  /** Adds a move (and its note); returns whether the next move must repeat its number. */
  const addMove = (node: MoveNode, depth: number, withNumber: boolean): boolean => {
    if (!open || open.depth !== depth) {
      open = { kind: 'moves', depth, items: [] };
      lines.push(open);
    }
    open.items.push({
      kind: 'move',
      node,
      number: withNumber || node.ply % 2 === 1 ? moveNumber(node.ply) : null,
      nags: node.nags.map(nagInfo).filter((nag) => nag !== undefined),
    });
    if (!node.comment) return false;
    if (depth > 0) {
      open.items.push({ kind: 'note', node, text: node.comment });
    } else {
      lines.push({ kind: 'comment', depth: 0, node, text: node.comment });
      open = null;
    }
    return true;
  };

  const addLine = (from: TreeNode, depth: number, withNumber: boolean) => {
    let node = from;
    let number = withNumber;
    while (node.children.length > 0) {
      const [main, ...alternatives] = node.children;
      number = addMove(main, depth, number);
      for (const alternative of alternatives) {
        open = null;
        addLine(alternative, depth + 1, addMove(alternative, depth + 1, true));
        open = null;
        number = true;
      }
      node = main;
    }
  };

  if (root.comment) lines.push({ kind: 'comment', depth: 0, node: root, text: root.comment });
  addLine(root, 0, true);
  return lines;
}
