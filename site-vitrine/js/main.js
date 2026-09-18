(function () {
  'use strict';

  const biz = CONFIG.business;
  const euro = (n) => `${n.toFixed(n % 1 === 0 ? 0 : 2)} €`;

  /* ---------- Header / brand / nav ---------- */
  document.title = `${biz.name} — Prise de rendez-vous en ligne`;
  document.getElementById('brand-name').textContent = biz.name;
  document.getElementById('hero-name').textContent = biz.name;
  document.getElementById('hero-tagline').textContent = biz.tagline;
  document.getElementById('hero-address').textContent = `📍 ${biz.address}`;
  document.getElementById('footer-name').textContent = biz.name;
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  const headerPhone = document.getElementById('header-phone');
  headerPhone.href = `tel:${biz.phone.replace(/\s+/g, '')}`;
  document.getElementById('header-phone-text').textContent = biz.phone;

  if (biz.photo) {
    document.getElementById('hero-photo').style.backgroundImage = `url('${biz.photo}')`;
    document.getElementById('about-photo').style.backgroundImage = `url('${biz.photo}')`;
  }

  document.getElementById('hero-rating').textContent = '★★★★★';

  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  navToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    })
  );

  /* ---------- About ---------- */
  document.getElementById('about-bio').textContent = biz.bio;
  const specialtiesEl = document.getElementById('about-specialties');
  biz.specialties.forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    specialtiesEl.appendChild(li);
  });

  /* ---------- Services ---------- */
  const flatServices = [];
  CONFIG.services.forEach((cat) =>
    cat.items.forEach((item) => flatServices.push({ ...item, category: cat.category }))
  );

  const servicesListEl = document.getElementById('services-list');
  CONFIG.services.forEach((cat) => {
    const block = document.createElement('div');
    block.className = 'service-category';
    const h3 = document.createElement('h3');
    h3.textContent = cat.category;
    block.appendChild(h3);

    cat.items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'service-row';
      row.innerHTML = `
        <div class="service-info">
          <span class="service-name">${item.name}</span>
          <span class="service-duration">${item.duration} min</span>
        </div>
        <span class="service-price">${euro(item.price)}</span>
        <button type="button" class="btn btn-primary">Réserver</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        rdvServiceSelect.value = item.name;
        goToStep(2);
        document.getElementById('rendezvous').scrollIntoView({ behavior: 'smooth' });
        renderDates();
      });
      block.appendChild(row);
    });
    servicesListEl.appendChild(block);
  });

  /* ---------- Booking (rendez-vous) ---------- */
  const rdvServiceSelect = document.getElementById('rdv-service');
  flatServices.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = `${s.name} — ${euro(s.price)} (${s.duration} min)`;
    rdvServiceSelect.appendChild(opt);
  });

  const stepsEl = document.getElementById('booking-steps');
  const panels = document.querySelectorAll('[data-step-panel]');
  let currentStep = 1;
  let selectedDate = null;
  let selectedTime = null;

  function goToStep(step) {
    currentStep = step;
    panels.forEach((p) => {
      p.hidden = Number(p.dataset.stepPanel) !== step;
    });
    stepsEl.querySelectorAll('li').forEach((li) => {
      li.classList.toggle('active', Number(li.dataset.step) === step);
    });
    if (step === 3) updateSummary();
  }

  document.querySelectorAll('[data-next]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (Number(btn.dataset.next) === 2) renderDates();
      goToStep(Number(btn.dataset.next));
    })
  );
  document.querySelectorAll('[data-prev]').forEach((btn) =>
    btn.addEventListener('click', () => goToStep(Number(btn.dataset.prev)))
  );

  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  function hoursForDate(date) {
    const dayName = dayNames[date.getDay()];
    const entry = biz.hours.find((h) => h.day === dayName);
    return entry ? entry.ranges : [];
  }

  function renderDates() {
    const datesEl = document.getElementById('rdv-dates');
    datesEl.innerHTML = '';
    selectedDate = null;
    selectedTime = null;
    const today = new Date();
    let firstOpenSet = false;

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const ranges = hoursForDate(d);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      if (ranges.length === 0) {
        chip.disabled = true;
      } else {
        chip.addEventListener('click', () => {
          datesEl.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
          chip.classList.add('selected');
          selectedDate = d;
          renderTimes(ranges, i === 0);
        });
        if (!firstOpenSet) {
          firstOpenSet = true;
        }
      }
      datesEl.appendChild(chip);
    }
    document.getElementById('rdv-times').innerHTML = '';
  }

  function renderTimes(ranges, isToday) {
    const timesEl = document.getElementById('rdv-times');
    timesEl.innerHTML = '';
    selectedTime = null;
    const now = new Date();
    const slots = [];

    ranges.forEach(([start, end]) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let mins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      while (mins + 30 <= endMins) {
        slots.push(mins);
        mins += 30;
      }
    });

    slots.forEach((mins) => {
      if (isToday && mins <= now.getHours() * 60 + now.getMinutes()) return;
      const h = String(Math.floor(mins / 60)).padStart(2, '0');
      const m = String(mins % 60).padStart(2, '0');
      const label = `${h}:${m}`;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = label;
      chip.addEventListener('click', () => {
        timesEl.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedTime = label;
      });
      timesEl.appendChild(chip);
    });

    if (!slots.length) {
      timesEl.innerHTML = '<p class="hint">Aucun créneau ce jour-là, choisissez une autre date.</p>';
    }
  }

  function updateSummary() {
    const service = rdvServiceSelect.value;
    const dateLabel = selectedDate
      ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'à définir';
    document.getElementById('rdv-summary').innerHTML =
      `<strong>Récapitulatif :</strong> ${service} — ${dateLabel}${selectedTime ? ' à ' + selectedTime : ''}`;
  }

  /* ---------- Generic form submission (Formspree or mailto fallback) ---------- */
  function submitLead(subject, fields) {
    const endpoint = CONFIG.formspreeEndpoint;
    if (endpoint) {
      return fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ _subject: subject, ...fields })
      }).then((res) => {
        if (!res.ok) throw new Error('Envoi impossible');
        return 'formspree';
      });
    }
    const body = Object.entries(fields)
      .map(([k, v]) => `${k} : ${v}`)
      .join('\n');
    const mailto = `mailto:${biz.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    return Promise.resolve('mailto');
  }

  function showSuccess(el, mode) {
    el.hidden = false;
    el.textContent =
      mode === 'formspree'
        ? "Merci ! Votre demande a bien été envoyée. Vous recevrez une confirmation sous 24h."
        : "Votre logiciel de messagerie va s'ouvrir pour envoyer votre demande. Merci !";
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- RDV form submit ---------- */
  const rdvForm = document.getElementById('rdv-form');
  const rdvWhatsapp = document.getElementById('rdv-whatsapp');

  function currentRdvFields() {
    return {
      Prestation: rdvServiceSelect.value,
      Date: selectedDate ? selectedDate.toLocaleDateString('fr-FR') : 'non précisée',
      Heure: selectedTime || 'non précisée',
      Nom: document.getElementById('rdv-nom').value,
      Téléphone: document.getElementById('rdv-tel').value,
      Email: document.getElementById('rdv-email').value,
      Message: document.getElementById('rdv-message').value || '—'
    };
  }

  function refreshWhatsapp() {
    if (!biz.whatsapp) {
      rdvWhatsapp.hidden = true;
      return;
    }
    rdvWhatsapp.hidden = false;
    const text = Object.entries(currentRdvFields())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    rdvWhatsapp.href = `https://wa.me/${biz.whatsapp}?text=${encodeURIComponent('Bonjour, je souhaite prendre rendez-vous :\n' + text)}`;
  }
  ['rdv-nom', 'rdv-tel', 'rdv-email', 'rdv-message'].forEach((id) =>
    document.getElementById(id).addEventListener('input', refreshWhatsapp)
  );

  rdvForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitLead(`Nouvelle demande de rendez-vous — ${biz.name}`, currentRdvFields()).then((mode) => {
      rdvForm.reset();
      showSuccess(document.getElementById('rdv-success'), mode);
    });
  });

  /* ---------- Boutique / cart ---------- */
  const CART_KEY = 'raissa_cart_v1';
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
  }

  const productsListEl = document.getElementById('products-list');
  CONFIG.products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-image" style="${p.image ? `background-image:url('${p.image}');background-size:cover;background-position:center;` : ''}"></div>
      <div class="product-body">
        <span class="product-name">${p.name}</span>
        <span class="product-desc">${p.description || ''}</span>
        <span class="product-price">${euro(p.price)}</span>
        <button type="button" class="btn btn-primary">Ajouter</button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', () => {
      cart[p.id] = (cart[p.id] || 0) + 1;
      saveCart();
    });
    productsListEl.appendChild(card);
  });

  function renderCart() {
    const panel = document.getElementById('cart-panel');
    const itemsEl = document.getElementById('cart-items');
    const ids = Object.keys(cart).filter((id) => cart[id] > 0);
    if (!ids.length) {
      panel.hidden = true;
      document.getElementById('cart-form').hidden = true;
      return;
    }
    panel.hidden = false;
    itemsEl.innerHTML = '';
    let total = 0;
    ids.forEach((id) => {
      const p = CONFIG.products.find((x) => x.id === id);
      if (!p) return;
      const qty = cart[id];
      total += p.price * qty;
      const li = document.createElement('li');
      li.innerHTML = `<span>${p.name} × ${qty}</span><span>${euro(p.price * qty)}</span>`;
      itemsEl.appendChild(li);
    });
    document.getElementById('cart-total').textContent = euro(total);
  }
  renderCart();

  document.getElementById('cart-checkout-btn').addEventListener('click', () => {
    document.getElementById('cart-form').hidden = false;
    document.getElementById('cart-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('cart-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const ids = Object.keys(cart).filter((id) => cart[id] > 0);
    let total = 0;
    const itemsText = ids
      .map((id) => {
        const p = CONFIG.products.find((x) => x.id === id);
        const qty = cart[id];
        total += p.price * qty;
        return `${p.name} x${qty} (${euro(p.price * qty)})`;
      })
      .join(', ');
    submitLead(`Nouvelle commande boutique — ${biz.name}`, {
      Articles: itemsText,
      Total: euro(total),
      Nom: document.getElementById('cart-nom').value,
      Téléphone: document.getElementById('cart-tel').value,
      Email: document.getElementById('cart-email').value
    }).then((mode) => {
      cart = {};
      saveCart();
      document.getElementById('cart-form').reset();
      document.getElementById('cart-form').hidden = true;
      showSuccess(document.getElementById('cart-success'), mode);
    });
  });

  /* ---------- Gift card ---------- */
  let giftAmount = null;
  document.querySelectorAll('#gift-amounts .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#gift-amounts .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      giftAmount = Number(chip.dataset.amount);
      document.getElementById('gift-custom').value = '';
    });
  });
  document.getElementById('gift-custom').addEventListener('input', (e) => {
    document.querySelectorAll('#gift-amounts .chip').forEach((c) => c.classList.remove('selected'));
    giftAmount = Number(e.target.value) || null;
  });

  document.getElementById('gift-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitLead(`Nouvelle carte cadeau — ${biz.name}`, {
      Montant: giftAmount ? euro(giftAmount) : 'non précisé',
      Nom: document.getElementById('gift-nom').value,
      Téléphone: document.getElementById('gift-tel').value,
      Email: document.getElementById('gift-email').value,
      Bénéficiaire: document.getElementById('gift-destinataire').value || '—',
      Message: document.getElementById('gift-message').value || '—'
    }).then((mode) => {
      e.target.reset();
      giftAmount = null;
      showSuccess(document.getElementById('gift-success'), mode);
    });
  });

  /* ---------- Testimonials ---------- */
  const testimonialsEl = document.getElementById('testimonials-list');
  CONFIG.testimonials.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <div class="testimonial-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
      <p>“${t.text}”</p>
      <p class="testimonial-name">${t.name}</p>
    `;
    testimonialsEl.appendChild(card);
  });

  /* ---------- Infos pratiques ---------- */
  document.getElementById('infos-address').textContent = biz.address;
  document.getElementById('infos-phone').textContent = biz.phone;
  document.getElementById('infos-email').textContent = biz.email;

  const socialsEl = document.getElementById('infos-socials');
  if (biz.instagram) {
    const a = document.createElement('a');
    a.href = biz.instagram;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Instagram';
    socialsEl.appendChild(a);
  }
  if (biz.facebook) {
    const a = document.createElement('a');
    a.href = biz.facebook;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Facebook';
    socialsEl.appendChild(a);
  }

  const hoursTable = document.getElementById('hours-table');
  biz.hours.forEach((h) => {
    const tr = document.createElement('tr');
    const label = h.ranges.length ? h.ranges.map((r) => r.join(' – ')).join(', ') : 'Fermé';
    tr.innerHTML = `<td>${h.day}</td><td>${label}</td>`;
    hoursTable.appendChild(tr);
  });

  document.getElementById('map-frame').src =
    `https://www.google.com/maps?q=${encodeURIComponent(biz.address)}&output=embed`;
})();
