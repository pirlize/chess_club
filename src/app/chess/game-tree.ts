import {
  isMove,
  type GameTree,
  type MoveNode,
  type PlayedMove,
  type RootNode,
  type TreeNode,
} from './model';

export const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

let nextId = 1;

/** Half-moves played before a FEN position, from its side-to-move and move-number fields. */
export function plyOfFen(fen: string): number {
  const [, turn = 'w', , , , fullmove = '1'] = fen.split(' ');
  return Math.max(0, (Number.parseInt(fullmove, 10) - 1) * 2 + (turn === 'b' ? 1 : 0)) || 0;
}

export function createTree(
  fen = STANDARD_START_FEN,
  headers = new Map<string, string>(),
): GameTree {
  return {
    headers,
    root: { id: 0, ply: plyOfFen(fen), fen, children: [], comment: '', shapes: [] },
  };
}

export function appendMove(parent: TreeNode, move: PlayedMove): MoveNode {
  const node: MoveNode = {
    ...move,
    id: nextId++,
    ply: parent.ply + 1,
    parent,
    children: [],
    comment: '',
    nags: [],
    shapes: [],
  };
  parent.children.push(node);
  return node;
}

export function mainline(from: TreeNode): MoveNode[] {
  const line: MoveNode[] = [];
  for (let node = from.children[0]; node; node = node.children[0]) line.push(node);
  return line;
}

export function endOfLine(node: TreeNode): TreeNode {
  while (node.children[0]) node = node.children[0];
  return node;
}

export function isOnMainline(node: TreeNode): boolean {
  for (let n = node; isMove(n); n = n.parent) {
    if (n.parent.children[0] !== n) return false;
  }
  return true;
}

/** The main-line node at `ply`, or the last one if the game is shorter. */
export function nodeAtPly(root: RootNode, ply: number): TreeNode {
  let node: TreeNode = root;
  while (node.ply < ply && node.children[0]) node = node.children[0];
  return node;
}

/** Removes a move and everything after it. Returns the node to select next. */
export function deleteMove(node: MoveNode): TreeNode {
  const siblings = node.parent.children;
  siblings.splice(siblings.indexOf(node), 1);
  return node.parent;
}

/** Makes the line through `node` the main continuation at the nearest fork where it is a variation. */
export function promoteLine(node: MoveNode): void {
  for (let n: TreeNode = node; isMove(n); n = n.parent) {
    const siblings = n.parent.children;
    const index = siblings.indexOf(n);
    if (index > 0) {
      siblings.splice(index, 1);
      siblings.unshift(n);
      return;
    }
  }
}

/** Whether a move or anything after it carries notes, symbols or arrows. */
export function hasAnnotations(node: MoveNode): boolean {
  return (
    node.comment.length > 0 ||
    node.nags.length > 0 ||
    node.shapes.length > 0 ||
    node.children.some(hasAnnotations)
  );
}

/** "14." for White, "14…" for Black. */
export function moveNumber(ply: number): string {
  return ply % 2 === 1 ? `${(ply + 1) / 2}.` : `${ply / 2}…`;
}

/** "14… Qe6" */
export function moveLabel(node: MoveNode): string {
  return `${moveNumber(node.ply)} ${node.san}`;
}
