(function(){
  function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function renderParagraphs(text){
    return text.split(/\\n\\n+/).map(function(par){
      return '<p>'+escapeHtml(par)+'</p>';
    }).join('');
  }

  fetch('data/blogs.json')
    .then(function(res){ if(!res.ok) throw new Error('Network response was not ok'); return res.json(); })
    .then(function(json){
      var container = document.getElementById('blog-posts');
      if(!container) return;

      container.innerHTML = json.blogs.map(function(post){
        return '\n<article class=\"blog-post glass-min\">\n  <h2>'+escapeHtml(post.title)+'</h2>\\n  <small class=\"muted\">'+escapeHtml(post.date)+'</small>\\n  <div class=\"post-body\">'+renderParagraphs(post.content)+'</div>\\n</article>\\n';
      }).join('\\n');

      // basic responsiveness tweak: collapse long posts with read-more
      document.querySelectorAll('.blog-post .post-body').forEach(function(el){
        var text = el.innerHTML;
        var maxChars = 2400; // approx for mobile preview
        if(text.length > maxChars){
          var preview = text.slice(0, maxChars);
          el.innerHTML = preview + '<div class=\"read-more\">... <a href=\"#\" class=\"open-full\">Read more</a></div>';
          el.dataset.full = text;
        }
      });

      document.body.addEventListener('click', function(e){
        if(e.target && e.target.classList.contains('open-full')){
          e.preventDefault();
          var parent = e.target.closest('.post-body');
          parent.innerHTML = parent.dataset.full + '<div class=\"read-less\"> <a href=\"#\" class=\"close-full\">Show less</a></div>';
        }
        if(e.target && e.target.classList.contains('close-full')){
          e.preventDefault();
          var parent = e.target.closest('.post-body');
          var full = parent.dataset.full || parent.innerHTML;
          var preview = full.slice(0,2400);
          parent.innerHTML = preview + '<div class=\"read-more\">... <a href=\"#\" class=\"open-full\">Read more</a></div>';
        }
      });

    })
    .catch(function(err){
      var c = document.getElementById('blog-posts');
      if(c) c.innerHTML = '<p class=\"error\">Unable to load posts: '+escapeHtml(err.message)+'</p>';
      console.error(err);
    });
})();