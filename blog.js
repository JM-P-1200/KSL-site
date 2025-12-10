fetch('data/blogs.json')
 .then(r=>r.json())
 .then(posts=>{
   document.getElementById('blog-posts').innerHTML = posts.map(p=>`
     <article>
       <h2>${p.title}</h2>
       <small>${p.date}</small>
       <p>${p.content}</p>
     </article>`).join('');
 });
