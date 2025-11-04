const burger = document.getElementById('burger');
const menu   = document.getElementById('menu');

if (burger && menu){
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // 點頁面其它區域關閉
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !burger.contains(e.target)) {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded','false');
    }
  });
}
