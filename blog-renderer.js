(function(){
  function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function renderParagraphs(text){
    return text.split(/
    +/).map(function(par){
      return '<p>'+escapeHtml(par)+'</p>';
    }).join('');
  }

fetch('data/blogs.json')
.then(function(res){ if(!res.ok) throw new Error('Network response was not ok'); return res.json(); })
.then(function(json){
var container = document.getElementById('blog-posts');
if(!container) return;


container.innerHTML = json.blogs.map(function(post){
return '<article class="blog-post glass-min"><h2>'+escapeHtml(post.title)+'</h2><small class="muted">'+escapeHtml(post.date)+'</small><div class="post-body">'+renderParagraphs(post.content)+'</div></article>';
}).join('');


})
.catch(function(err){
var c = document.getElementById('blog-posts');
if(c) c.innerHTML = '<p class="error">Unable to load posts: '+escapeHtml(err.message)+'</p>';
console.error(err);
});
})();