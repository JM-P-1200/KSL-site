fetch('data/updates.json')
 .then(r=>r.json())
 .then(d=>{
  document.getElementById('updates').innerHTML = d.map(u=>`
   <article>
    <h2>${u.title}</h2>
    <p>${u.content}</p>
   </article>`).join('');
 });
