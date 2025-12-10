// dynamic loader for projects
(function(){
  var container = document.getElementById('project-list');
  if(!container) return;
  fetch('data/projects.json')
    .then(function(r){ if(!r.ok) throw new Error('Failed to load projects.json'); return r.json(); })
    .then(function(json){
      container.innerHTML = json.projects.map(function(p){
        return '<div class="card glass-min">\n  <h3>'+p.title+'</h3>\n  <p>'+p.description+'</p>\n  <a href="'+p.link+'" class="btn-secondary">View Code</a>\n</div>';
      }).join('');
    })
    .catch(function(err){ container.innerHTML = '<p class="error">Unable to load projects: '+err.message+'</p>'});
})();
