import { Injectable } from '@angular/core';
import { castlingSide, Chess, normalizeMove, type Position } from 'chessops/chess';
import { chessgroundDests } from 'chessops/compat';
import { makeFen, parseFen } from 'chessops/fen';
import {
  ChildNode,
  emptyHeaders,
  makeComment,
  makePgn,
  Node,
  parseComment,
  parsePgn,
  startingPosition,
  type CommentShape,
  type Game,
  type PgnNodeData,
} from 'chessops/pgn';
import { makeSanAndPlay, parseSan } from 'chessops/san';
import { isNormal, type NormalMove } from 'chessops/types';
import { kingCastlesTo, makeSquare, parseSquare, roleToChar } from 'chessops/util';
import {
  ChessRules,
  PgnError,
  type ParsedGame,
  type ParseWarning,
  type PositionStatus,
} from '../chess-rules';
import { appendMove, createTree, moveNumber } from '../game-tree';
import type {
  BoardShape,
  Color,
  GameTree,
  MoveInput,
  PlayedMove,
  Square,
  TreeNode,
} from '../model';

/** ChessRules backed by chessops (GPL-3.0-or-later). */
@Injectable()
export class ChessopsRules extends ChessRules {
  parsePgn(pgn: string): ParsedGame[] {
    const games = parsePgn(pgn, emptyHeaders)
      .map((game) => this.toParsedGame(game))
      .filter(({ tree }) => tree.root.children.length > 0 || tree.headers.size > 0);
    if (games.length === 0) {
      throw new PgnError('no-moves');
    }
    return games;
  }

  writePgn(tree: GameTree): string {
    const moves = new Node<PgnNodeData>();
    const build = (source: TreeNode, target: Node<PgnNodeData>) => {
      for (const child of source.children) {
        const node = new ChildNode<PgnNodeData>({
          san: child.san,
          comments: commentsOf(child),
          nags: child.nags.length ? [...child.nags] : undefined,
        });
        target.children.push(node);
        build(child, node);
      }
    };
    build(tree.root, moves);
    return makePgn({ headers: new Map(tree.headers), comments: commentsOf(tree.root), moves });
  }

  normalizeFen(fen: string): string | null {
    const setup = parseFen(fen.trim());
    if (setup.isErr) return null;
    const pos = Chess.fromSetup(setup.value);
    return pos.isOk ? makeFen(pos.value.toSetup()) : null;
  }

  legalDests(fen: string): Map<Square, Square[]> {
    return chessgroundDests(this.position(fen));
  }

  play(fen: string, input: MoveInput): PlayedMove | null {
    const pos = this.position(fen);
    const move = normalizeMove(pos, {
      from: parseSquare(input.from),
      to: parseSquare(input.to),
      promotion: input.promotion,
    });
    return isNormal(move) && pos.isLegal(move) ? playOn(pos, move) : null;
  }

  turn(fen: string): Color {
    return parseFen(fen).unwrap().turn;
  }

  isPromotion(fen: string, { from, to }: MoveInput): boolean {
    const pos = this.position(fen);
    const move = { from: parseSquare(from), to: parseSquare(to), promotion: 'queen' as const };
    return pos.board.getRole(move.from) === 'pawn' && pos.isLegal(move);
  }

  status(fen: string): PositionStatus {
    const pos = this.position(fen);
    return { check: pos.isCheck(), checkmate: pos.isCheckmate(), stalemate: pos.isStalemate() };
  }

  private position(fen: string): Position {
    return Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
  }

  private toParsedGame(game: Game<PgnNodeData>): ParsedGame {
    const warnings: ParseWarning[] = [];
    const start = startingPosition(game.headers);
    if (start.isErr) warnings.push({ code: 'bad-fen' });
    const pos = start.isOk ? start.value : Chess.default();

    const tree = createTree(makeFen(pos.toSetup()), new Map(game.headers));
    const intro = parseComment((game.comments ?? []).join('\n'));
    tree.root.comment = intro.text.trim();
    tree.root.shapes = intro.shapes.map(toShape);

    const addChildren = (source: Node<PgnNodeData>, target: TreeNode, position: Position) => {
      for (const child of source.children) {
        const next = position.clone();
        const move = parseSan(next, child.data.san);
        if (!move || !isNormal(move)) {
          warnings.push({
            code: 'illegal-move',
            move: `${moveNumber(target.ply + 1)} ${child.data.san}`,
          });
          continue;
        }
        const node = appendMove(target, playOn(next, move));
        const comment = parseComment(
          [...(child.data.startingComments ?? []), ...(child.data.comments ?? [])].join('\n'),
        );
        node.comment = comment.text.trim();
        node.shapes = comment.shapes.map(toShape);
        node.nags = [...(child.data.nags ?? [])];
        addChildren(child, node, next);
      }
    };
    addChildren(game.moves, tree.root, pos);
    return { tree, warnings };
  }
}

/** Plays `move` on `pos` (mutating it) and describes the result. */
function playOn(pos: Position, move: NormalMove): PlayedMove {
  const side = castlingSide(pos, move);
  const from = makeSquare(move.from);
  // chessops encodes castling as king-takes-rook; show and store the king's real move.
  const to = makeSquare(side ? kingCastlesTo(pos.turn, side) : move.to);
  const san = makeSanAndPlay(pos, move);
  return {
    san,
    uci: `${from}${to}${move.promotion ? roleToChar(move.promotion) : ''}`,
    from,
    to,
    fen: makeFen(pos.toSetup()),
    check: pos.isCheck(),
  };
}

function commentsOf(node: TreeNode): string[] | undefined {
  if (!node.comment && node.shapes.length === 0) return undefined;
  return [makeComment({ text: node.comment, shapes: node.shapes.map(fromShape) })];
}

const toShape = (s: CommentShape): BoardShape => ({
  from: makeSquare(s.from),
  to: makeSquare(s.to),
  color: s.color,
});

const fromShape = (s: BoardShape): CommentShape => ({
  from: parseSquare(s.from),
  to: parseSquare(s.to),
  color: s.color,
});
