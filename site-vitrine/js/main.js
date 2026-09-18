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
    $('hero-bio').textContent = biz.bio;
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
  let selectedServices = [];
  const VISIBLE_DAYS = 5;
  let calendarOffset = 0;

  const totalPrice = () => selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = () => selectedServices.reduce((sum, s) => sum + s.duration, 0);

  var addServiceToBooking = function (service) {
    selectedServices.push(service);
    renderSelectedServices();
  };

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
          addServiceToBooking({ ...item, category: cat.category });
          goToStep(1);
          $('rendezvous').scrollIntoView({ behavior: 'smooth' });
        });
        block.appendChild(row);
      });
      servicesListEl.appendChild(block);
    });
  }

  if ($('rdv-selected-services')) {
    const picker = $('rdv-service-picker');
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = 'Choisir une prestation…';
    picker.appendChild(placeholderOpt);
    flatServices.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = `${s.name} — ${euro(s.price)} (${s.duration} min)`;
      picker.appendChild(opt);
    });

    $('rdv-add-service-btn').addEventListener('click', () => {
      const name = picker.value;
      if (!name) return;
      const service = flatServices.find((s) => s.name === name);
      if (service) addServiceToBooking(service);
      picker.value = '';
    });

    var renderSelectedServices = function () {
      const wrap = $('rdv-selected-services');
      wrap.innerHTML = '';
      selectedServices.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'selected-service-card';
        card.innerHTML = `
          <div>
            <span class="service-name">${s.name}</span>
            <span class="service-meta">${s.duration} min · ${euro(s.price)}</span>
          </div>
          <button type="button" class="link-btn">Supprimer</button>
        `;
        card.querySelector('.link-btn').addEventListener('click', () => {
          selectedServices.splice(i, 1);
          renderSelectedServices();
        });
        wrap.appendChild(card);
      });
      $('rdv-step1-next').disabled = selectedServices.length === 0;
    };
    renderSelectedServices();

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

    $('rdv-step1-next').addEventListener('click', () => {
      calendarOffset = 0;
      renderCalendar();
      goToStep(2);
    });
    $('rdv-step2-next').addEventListener('click', () => goToStep(3));
    document.querySelectorAll('[data-prev]').forEach((btn) =>
      btn.addEventListener('click', () => goToStep(Number(btn.dataset.prev)))
    );

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const hoursForDate = (date) => {
      const dayName = dayNames[date.getDay()];
      const entry = biz.hours.find((h) => h.day === dayName);
      return entry ? entry.ranges : [];
    };

    const startOfToday = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const buildSlots = (ranges, isToday) => {
      const now = new Date();
      const slots = [];
      ranges.forEach(([start, end]) => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let mins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        while (mins + 30 <= endMins) {
          if (!isToday || mins > now.getHours() * 60 + now.getMinutes()) slots.push(mins);
          mins += 30;
        }
      });
      return slots.map((mins) => {
        const h = String(Math.floor(mins / 60)).padStart(2, '0');
        const m = String(mins % 60).padStart(2, '0');
        return `${h}:${m}`;
      });
    };

    const sameDay = (a, b) => a.toDateString() === b.toDateString();

    var renderCalendar = function () {
      const container = $('rdv-slots-calendar');
      container.innerHTML = '';
      const today = startOfToday();
      const cols = [];
      for (let i = 0; i < VISIBLE_DAYS; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + calendarOffset + i);
        cols.push(d);
      }

      cols.forEach((d, idx) => {
        const col = document.createElement('div');
        col.className = 'slot-day-col';
        const header = document.createElement('div');
        header.className = 'slot-day-header';
        header.innerHTML = `<span>${d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span><strong>${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</strong>`;
        col.appendChild(header);

        const ranges = hoursForDate(d);
        const isToday = calendarOffset + idx === 0;
        const slots = buildSlots(ranges, isToday);

        if (!slots.length) {
          const p = document.createElement('p');
          p.className = 'slot-day-empty';
          p.textContent = '—';
          col.appendChild(p);
        } else {
          slots.forEach((label) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip slot-btn';
            btn.textContent = label;
            if (selectedDate && sameDay(selectedDate, d) && selectedTime === label) btn.classList.add('selected');
            btn.addEventListener('click', () => {
              selectedDate = d;
              selectedTime = label;
              $('rdv-step2-next').disabled = false;
              renderCalendar();
            });
            col.appendChild(btn);
          });
        }
        container.appendChild(col);
      });

      $('rdv-cal-range').textContent =
        `${cols[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${cols[cols.length - 1].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
      $('rdv-cal-prev').disabled = calendarOffset <= 0;
    };

    $('rdv-cal-prev').addEventListener('click', () => {
      calendarOffset = Math.max(0, calendarOffset - VISIBLE_DAYS);
      renderCalendar();
    });
    $('rdv-cal-next').addEventListener('click', () => {
      calendarOffset += VISIBLE_DAYS;
      renderCalendar();
    });

    const dateJump = $('rdv-date-jump');
    dateJump.min = startOfToday().toISOString().slice(0, 10);
    dateJump.addEventListener('change', (e) => {
      if (!e.target.value) return;
      const chosen = new Date(e.target.value + 'T00:00:00');
      const diffDays = Math.round((chosen - startOfToday()) / 86400000);
      calendarOffset = Math.max(0, diffDays);
      renderCalendar();
    });

    var updateSummary = function () {
      const list = selectedServices.map((s) => s.name).join(', ');
      const dateLabel = selectedDate
        ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'à définir';
      $('rdv-summary').innerHTML =
        `<strong>Récapitulatif :</strong> ${list} (${totalDuration()} min, ${euro(totalPrice())}) — ${dateLabel}${selectedTime ? ' à ' + selectedTime : ''}`;
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
      Prestations: selectedServices.map((s) => `${s.name} (${euro(s.price)})`).join(', ') || 'non précisée',
      'Durée totale': `${totalDuration()} min`,
      'Total estimé': euro(totalPrice()),
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
        selectedServices = [];
        selectedDate = null;
        selectedTime = null;
        renderSelectedServices();
        goToStep(1);
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
