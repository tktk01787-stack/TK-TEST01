/* Hash router + page rendering. No server, no database. */
(function () {
  'use strict';

  var LESSONS = window.LESSONS;
  var STORE_KEY = 'chess-guide-done';
  var app = document.getElementById('app');
  var sidebar = document.getElementById('sidebar');
  var navToggle = document.getElementById('navToggle');

  // Progress lives in localStorage only; the guide works fine without it.
  function loadDone() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveDone(done) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(done)); } catch (e) { /* ignore */ }
  }
  var done = loadDone();

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function diagram(spec) {
    var fig = el('figure', 'diagram');
    fig.appendChild(Chess.renderBoard(spec.fen, spec));
    if (spec.caption) fig.appendChild(el('figcaption', null, spec.caption));
    return fig;
  }

  function renderSection(s) {
    switch (s.type) {
      case 'text': return el('div', 'text', s.html);
      case 'tip': return el('aside', 'tip', s.html);
      case 'board': return diagram(s);
      case 'boards': {
        var row = el('div', 'diagram-row');
        s.items.forEach(function (it) { row.appendChild(diagram(it)); });
        return row;
      }
      case 'table': {
        var wrap = el('div', 'table-wrap');
        var html = '<table><thead><tr>' + s.head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
        html += s.rows.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
        }).join('');
        wrap.innerHTML = html + '</tbody></table>';
        return wrap;
      }
    }
    return el('div');
  }

  function renderSidebar(currentId) {
    var ol = el('ol');
    LESSONS.forEach(function (l, i) {
      var li = el('li', done[l.id] ? 'done' : '');
      var a = el('a', null, '<span class="num">' + (done[l.id] ? '✓' : i + 1) + '</span><span></span>');
      a.lastChild.textContent = l.title;
      a.href = '#/lesson/' + l.id;
      if (l.id === currentId) a.setAttribute('aria-current', 'page');
      li.appendChild(a);
      ol.appendChild(li);
    });
    sidebar.innerHTML = '';
    sidebar.appendChild(ol);
  }

  function progressBar() {
    var count = LESSONS.filter(function (l) { return done[l.id]; }).length;
    var pct = Math.round((count / LESSONS.length) * 100);
    return '<div class="progress"><div class="progress-bar"><span style="width:' + pct + '%"></span></div>' +
      '<span>' + count + ' מתוך ' + LESSONS.length + ' שיעורים</span></div>';
  }

  function renderHome() {
    document.title = 'שחמט למתחילים';
    renderSidebar(null);
    app.innerHTML = '';

    var firstOpen = LESSONS.filter(function (l) { return !done[l.id]; })[0] || LESSONS[0];
    var hero = el('section', 'hero');
    var text = el('div', null,
      '<h1>לומדים שחמט, צעד אחר צעד</h1>' +
      '<p>מדריך למתחילים מוחלטים: מהכרת הלוח והכלים, דרך החוקים, ועד טקטיקות, מטים וסיומים בסיסיים. ' + LESSONS.length + ' שיעורים קצרים עם תרשימים.</p>');
    var start = el('a', 'btn', firstOpen === LESSONS[0] && !done[LESSONS[0].id] ? 'מתחילים ←' : 'להמשיך ←');
    start.href = '#/lesson/' + firstOpen.id;
    text.appendChild(start);
    text.appendChild(el('div', null, '<br>' + progressBar()));
    hero.appendChild(text);
    hero.appendChild(Chess.renderBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', { label: 'לוח שחמט בעמדת הפתיחה' }));
    app.appendChild(hero);

    var cards = el('div', 'cards');
    LESSONS.forEach(function (l, i) {
      var a = el('a', 'card');
      a.href = '#/lesson/' + l.id;
      a.innerHTML = '<span class="badge"></span><h3></h3><p></p>' + (done[l.id] ? '<span class="check-mark" aria-label="הושלם">✓</span>' : '');
      a.querySelector('.badge').textContent = (i + 1) + ' · ' + l.level;
      a.querySelector('h3').textContent = l.title;
      a.querySelector('p').textContent = l.summary;
      cards.appendChild(a);
    });
    app.appendChild(cards);
  }

  function renderLesson(id) {
    var idx = LESSONS.findIndex(function (l) { return l.id === id; });
    if (idx === -1) { location.hash = '#/'; return; }
    var lesson = LESSONS[idx];
    document.title = lesson.title + ' · שחמט למתחילים';
    renderSidebar(id);
    app.innerHTML = '';

    var article = el('article', 'lesson');
    var head = el('header', 'lesson-head', '<span class="badge"></span><h1></h1><p class="summary"></p>');
    head.querySelector('.badge').textContent = 'שיעור ' + (idx + 1) + ' · ' + lesson.level;
    head.querySelector('h1').textContent = lesson.title;
    head.querySelector('.summary').textContent = lesson.summary;
    article.appendChild(head);

    lesson.sections.forEach(function (s) { article.appendChild(renderSection(s)); });

    var foot = el('footer', 'lesson-foot');
    var label = el('label', 'done-toggle', '<input type="checkbox"> סיימתי את השיעור');
    var box = label.querySelector('input');
    box.checked = !!done[id];
    box.addEventListener('change', function () {
      if (box.checked) done[id] = true; else delete done[id];
      saveDone(done);
      renderSidebar(id);
    });
    foot.appendChild(label);

    var nav = el('div', 'nav');
    if (idx > 0) {
      var prev = el('a', 'btn secondary', '→ הקודם');
      prev.href = '#/lesson/' + LESSONS[idx - 1].id;
      nav.appendChild(prev);
    }
    var next = el('a', 'btn', idx < LESSONS.length - 1 ? 'הבא ←' : 'לעמוד הראשי');
    next.href = idx < LESSONS.length - 1 ? '#/lesson/' + LESSONS[idx + 1].id : '#/';
    next.addEventListener('click', function () {
      // Moving on counts as finishing the lesson.
      done[id] = true;
      saveDone(done);
    });
    nav.appendChild(next);
    foot.appendChild(nav);
    article.appendChild(foot);

    app.appendChild(article);
  }

  function route() {
    var m = location.hash.match(/^#\/lesson\/([\w-]+)/);
    if (m) renderLesson(m[1]); else renderHome();
    sidebar.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  navToggle.addEventListener('click', function () {
    var open = sidebar.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  window.addEventListener('hashchange', route);
  route();
})();
