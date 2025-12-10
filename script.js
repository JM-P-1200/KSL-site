<script>
function loadSection(id, url){
 fetch(url).then(r=>r.text()).then(html=>{
   document.getElementById(id).innerHTML = html;
 });
}
</script>

const projectList = document.getElementById("project-list");

fetch("data/projects.json")
  .then(res => res.json())
  .then(data => {
    projectList.innerHTML = data.projects
      .map(
        p => `
        <div class="card glass-min">
          <h3>${p.title}</h3>
          <p>${p.description}</p>
          <a href="${p.link}" target="_blank">View Code →</a>
        </div>
      `
      )
      .join("");
  });

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


</html>