(function () {
  'use strict';

  const biz = CONFIG.business;
  const euro = (n) => `${n.toFixed(n % 1 === 0 ? 0 : 2)} €`;
  const $ = (id) => document.getElementById(id);

  /* ---------- Shared: brand / footer (present on every page) ---------- */
  document.querySelectorAll('#brand-name').forEach((el) => (el.textContent = biz.name));
  document.querySelectorAll('#footer-name').forEach((el) => (el.textContent = biz.name));
  document.querySelectorAll('#footer-year').forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Hero (home page only) ---------- */
  if ($('hero-name')) {
    $('hero-name').textContent = biz.name;
    $('hero-tagline').textContent = biz.tagline;
    $('hero-address').textContent = `📍 ${biz.address}`;
    $('hero-rating').textContent = '★★★★★';
    if (biz.photo) $('hero-photo').style.backgroundImage = `url('${biz.photo}')`;
  }

  /* ---------- About (apropos page) ---------- */
  if ($('about-bio')) {
    $('about-bio').textContent = biz.bio;
    if (biz.photo) $('about-photo').style.backgroundImage = `url('${biz.photo}')`;
    const specialtiesEl = $('about-specialties');
    biz.specialties.forEach((s) => {
      const li = document.createElement('li');
      li.textContent = s;
      specialtiesEl.appendChild(li);
    });
  }

  /* ---------- Services & booking (home page) ---------- */
  const flatServices = [];
  CONFIG.services.forEach((cat) =>
    cat.items.forEach((item) => flatServices.push({ ...item, category: cat.category }))
  );

  let currentStep = 1;
  let selectedDate = null;
  let selectedTime = null;
  let rdvServiceSelect = null;

  if ($('services-list')) {
    const servicesListEl = $('services-list');
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
          $('rendezvous').scrollIntoView({ behavior: 'smooth' });
          renderDates();
        });
        block.appendChild(row);
      });
      servicesListEl.appendChild(block);
    });
  }

  if ($('rdv-service')) {
    rdvServiceSelect = $('rdv-service');
    flatServices.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = `${s.name} — ${euro(s.price)} (${s.duration} min)`;
      rdvServiceSelect.appendChild(opt);
    });

    const stepsEl = $('booking-steps');
    const panels = document.querySelectorAll('[data-step-panel]');

    var goToStep = function (step) {
      currentStep = step;
      panels.forEach((p) => {
        p.hidden = Number(p.dataset.stepPanel) !== step;
      });
      stepsEl.querySelectorAll('li').forEach((li) => {
        li.classList.toggle('active', Number(li.dataset.step) === step);
      });
      if (step === 3) updateSummary();
    };

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

    const hoursForDate = (date) => {
      const dayName = dayNames[date.getDay()];
      const entry = biz.hours.find((h) => h.day === dayName);
      return entry ? entry.ranges : [];
    };

    var renderDates = function () {
      const datesEl = $('rdv-dates');
      datesEl.innerHTML = '';
      selectedDate = null;
      selectedTime = null;
      const today = new Date();

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
        }
        datesEl.appendChild(chip);
      }
      $('rdv-times').innerHTML = '';
    };

    var renderTimes = function (ranges, isToday) {
      const timesEl = $('rdv-times');
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
    };

    var updateSummary = function () {
      const service = rdvServiceSelect.value;
      const dateLabel = selectedDate
        ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'à définir';
      $('rdv-summary').innerHTML =
        `<strong>Récapitulatif :</strong> ${service} — ${dateLabel}${selectedTime ? ' à ' + selectedTime : ''}`;
    };
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

  /* ---------- RDV form submit (home page) ---------- */
  if ($('rdv-form')) {
    const rdvForm = $('rdv-form');
    const rdvWhatsapp = $('rdv-whatsapp');

    const currentRdvFields = () => ({
      Prestation: rdvServiceSelect.value,
      Date: selectedDate ? selectedDate.toLocaleDateString('fr-FR') : 'non précisée',
      Heure: selectedTime || 'non précisée',
      Nom: $('rdv-nom').value,
      Téléphone: $('rdv-tel').value,
      Email: $('rdv-email').value,
      Message: $('rdv-message').value || '—'
    });

    const refreshWhatsapp = () => {
      if (!biz.whatsapp) {
        rdvWhatsapp.hidden = true;
        return;
      }
      rdvWhatsapp.hidden = false;
      const text = Object.entries(currentRdvFields())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      rdvWhatsapp.href = `https://wa.me/${biz.whatsapp}?text=${encodeURIComponent('Bonjour, je souhaite prendre rendez-vous :\n' + text)}`;
    };
    ['rdv-nom', 'rdv-tel', 'rdv-email', 'rdv-message'].forEach((id) =>
      $(id).addEventListener('input', refreshWhatsapp)
    );

    rdvForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitLead(`Nouvelle demande de rendez-vous — ${biz.name}`, currentRdvFields()).then((mode) => {
        rdvForm.reset();
        showSuccess($('rdv-success'), mode);
      });
    });
  }

  /* ---------- Boutique / cart (boutique page) ---------- */
  if ($('products-list')) {
    const CART_KEY = 'raissa_cart_v1';
    let cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');

    var saveCart = function () {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      renderCart();
    };

    const productsListEl = $('products-list');
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
      const panel = $('cart-panel');
      const itemsEl = $('cart-items');
      const ids = Object.keys(cart).filter((id) => cart[id] > 0);
      if (!ids.length) {
        panel.hidden = true;
        $('cart-form').hidden = true;
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
      $('cart-total').textContent = euro(total);
    }
    renderCart();

    $('cart-checkout-btn').addEventListener('click', () => {
      $('cart-form').hidden = false;
      $('cart-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    $('cart-form').addEventListener('submit', (e) => {
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
        Nom: $('cart-nom').value,
        Téléphone: $('cart-tel').value,
        Email: $('cart-email').value
      }).then((mode) => {
        cart = {};
        saveCart();
        $('cart-form').reset();
        $('cart-form').hidden = true;
        showSuccess($('cart-success'), mode);
      });
    });
  }

  /* ---------- Gift card (offrir page) ---------- */
  if ($('gift-form')) {
    let giftAmount = null;
    document.querySelectorAll('#gift-amounts .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#gift-amounts .chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        giftAmount = Number(chip.dataset.amount);
        $('gift-custom').value = '';
      });
    });
    $('gift-custom').addEventListener('input', (e) => {
      document.querySelectorAll('#gift-amounts .chip').forEach((c) => c.classList.remove('selected'));
      giftAmount = Number(e.target.value) || null;
    });

    $('gift-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitLead(`Nouvelle carte cadeau — ${biz.name}`, {
        Montant: giftAmount ? euro(giftAmount) : 'non précisé',
        Nom: $('gift-nom').value,
        Téléphone: $('gift-tel').value,
        Email: $('gift-email').value,
        Bénéficiaire: $('gift-destinataire').value || '—',
        Message: $('gift-message').value || '—'
      }).then((mode) => {
        e.target.reset();
        giftAmount = null;
        showSuccess($('gift-success'), mode);
      });
    });
  }

  /* ---------- Testimonials (avis page) ---------- */
  if ($('testimonials-list')) {
    const testimonialsEl = $('testimonials-list');
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
  }

  /* ---------- Infos pratiques (apropos page) ---------- */
  if ($('infos-address')) {
    $('infos-address').textContent = biz.address;
    $('infos-phone').textContent = biz.phone;
    $('infos-email').textContent = biz.email;

    const socialsEl = $('infos-socials');
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

    const hoursTable = $('hours-table');
    biz.hours.forEach((h) => {
      const tr = document.createElement('tr');
      const label = h.ranges.length ? h.ranges.map((r) => r.join(' – ')).join(', ') : 'Fermé';
      tr.innerHTML = `<td>${h.day}</td><td>${label}</td>`;
      hoursTable.appendChild(tr);
    });

    $('map-frame').src = `https://www.google.com/maps?q=${encodeURIComponent(biz.address)}&output=embed`;
  }
})();
