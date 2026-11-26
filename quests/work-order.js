// Field dialogs share the same shell; replacing the body also removes this layout.
export function renderWorkOrder(dialog, order) {
  dialog.querySelector('h2').textContent = order.heading;
  const body = dialog.querySelector('.field-body');
  body.innerHTML = `<article class="work-order">
    <div class="work-order-identity"><span>От кого</span><strong></strong></div>
    <h3></h3><div class="work-order-letter"></div>
    <section class="work-order-task"><h4>Задача</h4><p></p></section>
    <aside class="work-order-memo"><h4>Памятка</h4><p></p></aside>
    <footer><div><h4>Награда за ремонт</h4><p></p></div><button type="button"></button></footer>
  </article>`;
  body.querySelector('strong').textContent = order.sender;
  body.querySelector('h3').textContent = order.title;
  const letter = body.querySelector('.work-order-letter');
  for (const paragraph of order.letter) {
    const p = document.createElement('p');
    p.textContent = paragraph;
    letter.append(p);
  }
  body.querySelector('.work-order-task p').textContent = order.task;
  const memo = body.querySelector('.work-order-memo');
  if (order.memo) memo.querySelector('p').textContent = order.memo;
  else memo.remove();
  body.querySelector('footer p').textContent = order.reward;
  const action = body.querySelector('footer button');
  action.textContent = order.action;
  action.onclick = () => dialog.close();
}
