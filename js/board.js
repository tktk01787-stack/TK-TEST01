/* Static chess diagram renderer: FEN piece placement -> DOM board. */
(function () {
  'use strict';

  var FILES = 'abcdefgh';

  // Filled glyphs for both colors; color comes from CSS. U+FE0E forces text (non-emoji) rendering.
  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  var NAME = { k: 'מלך', q: 'מלכה', r: 'צריח', b: 'רץ', n: 'פרש', p: 'רגלי' };

  function parseFen(fen) {
    var placement = fen.trim().split(/\s+/)[0];
    var rows = placement.split('/');
    if (rows.length !== 8) throw new Error('Bad FEN: ' + fen);
    var squares = {};
    rows.forEach(function (row, i) {
      var rank = 8 - i;
      var file = 0;
      for (var c = 0; c < row.length; c++) {
        var ch = row[c];
        if (/\d/.test(ch)) {
          file += parseInt(ch, 10);
        } else {
          squares[FILES[file] + rank] = ch;
          file++;
        }
      }
      if (file !== 8) throw new Error('Bad FEN row: ' + row);
    });
    return squares;
  }

  function toSet(list) {
    var set = {};
    (list || []).forEach(function (sq) { set[sq] = true; });
    return set;
  }

  function describe(squares) {
    var white = [], black = [];
    Object.keys(squares).forEach(function (sq) {
      var p = squares[sq];
      var entry = NAME[p.toLowerCase()] + ' ב-' + sq;
      (p === p.toUpperCase() ? white : black).push(entry);
    });
    var parts = [];
    if (white.length) parts.push('לבן: ' + white.join(', '));
    if (black.length) parts.push('שחור: ' + black.join(', '));
    return 'לוח שחמט. ' + (parts.length ? parts.join('. ') : 'לוח ריק');
  }

  /**
   * opts.hl     – squares to highlight (yellow, e.g. a move just played)
   * opts.dots   – squares a piece can move to
   * opts.area   – squares to tint (an area or a line)
   * opts.check  – squares in check / attacked targets (red)
   * opts.flip   – view from black's side
   */
  function renderBoard(fen, opts) {
    opts = opts || {};
    var squares = parseFen(fen);
    var hl = toSet(opts.hl), dots = toSet(opts.dots), area = toSet(opts.area), check = toSet(opts.check);

    var board = document.createElement('div');
    board.className = 'board';
    board.setAttribute('dir', 'ltr');
    board.setAttribute('role', 'img');
    board.setAttribute('aria-label', opts.label || describe(squares));

    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var rank = opts.flip ? r + 1 : 8 - r;
        var file = opts.flip ? 7 - f : f;
        var name = FILES[file] + rank;
        var cell = document.createElement('div');
        var light = (file + rank) % 2 === 0; // a1 (0 + 1) is dark
        cell.className = 'sq ' + (light ? 'light' : 'dark');
        if (area[name]) cell.classList.add('area');
        if (hl[name]) cell.classList.add('hl');
        if (check[name]) cell.classList.add('check');

        var piece = squares[name];
        if (piece) {
          var span = document.createElement('span');
          var isWhite = piece === piece.toUpperCase();
          span.className = 'piece ' + (isWhite ? 'white' : 'black');
          span.textContent = GLYPH[piece.toLowerCase()] + '︎';
          cell.appendChild(span);
        }
        if (dots[name]) {
          var dot = document.createElement('span');
          dot.className = piece ? 'dot capture' : 'dot';
          cell.appendChild(dot);
        }
        if (f === 0) {
          var rl = document.createElement('span');
          rl.className = 'coord rank';
          rl.textContent = rank;
          cell.appendChild(rl);
        }
        if (r === 7) {
          var fl = document.createElement('span');
          fl.className = 'coord file';
          fl.textContent = FILES[file];
          cell.appendChild(fl);
        }
        board.appendChild(cell);
      }
    }
    return board;
  }

  // Helpers for lesson data: squares reachable along rays on an empty board.
  function rays(from, dirs, maxSteps) {
    var f0 = FILES.indexOf(from[0]), r0 = parseInt(from[1], 10);
    var out = [];
    dirs.forEach(function (d) {
      for (var s = 1; s <= (maxSteps || 7); s++) {
        var f = f0 + d[0] * s, r = r0 + d[1] * s;
        if (f < 0 || f > 7 || r < 1 || r > 8) break;
        out.push(FILES[f] + r);
      }
    });
    return out;
  }

  var ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

  window.Chess = {
    renderBoard: renderBoard,
    moves: {
      rook: function (sq) { return rays(sq, ORTHO); },
      bishop: function (sq) { return rays(sq, DIAG); },
      queen: function (sq) { return rays(sq, ORTHO.concat(DIAG)); },
      king: function (sq) { return rays(sq, ORTHO.concat(DIAG), 1); },
      knight: function (sq) { return rays(sq, KNIGHT, 1); }
    },
    file: function (f) { return [1, 2, 3, 4, 5, 6, 7, 8].map(function (r) { return f + r; }); },
    rank: function (r) { return FILES.split('').map(function (f) { return f + r; }); },
    box: function (f1, r1, f2, r2) {
      var out = [];
      for (var f = FILES.indexOf(f1); f <= FILES.indexOf(f2); f++) {
        for (var r = r1; r <= r2; r++) out.push(FILES[f] + r);
      }
      return out;
    }
  };
})();
