/* Script commun aux pages projet : bascule français / anglais et thème clair / sombre.
 * Chaque élément traduisible porte data-fr et data-en ; il ne doit contenir que du texte. */
(function(){
  var bFr = document.getElementById('btn-fr'),
      bEn = document.getElementById('btn-en'),
      bTh = document.getElementById('btn-theme'),
      root = document.documentElement,
      titleFr = document.title,
      titleEn = root.getAttribute('data-title-en') || document.title;

  function setLang(l){
    var isFr = (l === 'fr');
    bFr.setAttribute('aria-pressed', isFr);
    bEn.setAttribute('aria-pressed', !isFr);
    root.lang = l;
    document.title = isFr ? titleFr : titleEn;
    document.querySelectorAll('[data-fr]').forEach(function(el){
      var v = el.getAttribute(isFr ? 'data-fr' : 'data-en');
      if (v !== null) el.textContent = v;
    });
    try { localStorage.setItem('lang', l); } catch(e){}
  }

  bFr.addEventListener('click', function(){ setLang('fr'); });
  bEn.addEventListener('click', function(){ setLang('en'); });

  bTh.addEventListener('click', function(){
    var dark = root.getAttribute('data-theme') === 'dark';
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
    bTh.setAttribute('aria-pressed', String(!dark));
    try { localStorage.setItem('theme', dark ? 'light' : 'dark'); } catch(e){}
  });

  try {
    var l = localStorage.getItem('lang');
    if (l) setLang(l);
    else if ((navigator.language || '').slice(0,2) !== 'fr') setLang('en');
    var t = localStorage.getItem('theme');
    if (t) { root.setAttribute('data-theme', t); bTh.setAttribute('aria-pressed', String(t === 'dark')); }
  } catch(e){}
})();
