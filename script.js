/* -------------------------
  HotelEase — Interactive JS
  - booking form with validation
  - localStorage bookings
  - mini charts (canvas)
  - testimonials slider
  - CSV export
--------------------------*/

(() => {
  // Demo state & prices
  const PRICES = { "Deluxe": 3000, "Suite": 5500, "Standard": 2200 };
  const bookingsKey = 'he_bookings_demo_v1';

  // DOM refs
  const guestName = document.getElementById('guestName');
  const guestPhone = document.getElementById('guestPhone');
  const checkIn = document.getElementById('checkIn');
  const checkOut = document.getElementById('checkOut');
  const roomType = document.getElementById('roomType');
  const totalPriceEl = document.getElementById('totalPrice');
  const bookingForm = document.getElementById('bookingForm');
  const bookingsList = document.getElementById('bookingsList');
  const activeBookings = document.getElementById('activeBookings');
  const occupancyRate = document.getElementById('occupancyRate');
  const revenue30 = document.getElementById('revenue30');
  const clearBookingsBtn = document.getElementById('clearBookings');
  const exportBtn = document.getElementById('exportBtn');
  const heroBook = document.getElementById('heroBook');
  const heroExplore = document.getElementById('heroExplore');
  const openBookingForm = document.getElementById('openBookingForm');

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init(){
    attachUI();
    renderBookings();
    updateDashboard();
    initMiniChart();
    initRevenueChart();
    initBgParticles();
    startTestimonials();
  }

  function attachUI(){
    // calculate price when dates or room change
    [checkIn, checkOut, roomType].forEach(el => el?.addEventListener('change', calculatePrice));
    bookingForm.addEventListener('submit', onSubmitBooking);
    document.getElementById('clearForm').addEventListener('click', clearForm);
    document.getElementById('searchBtn')?.addEventListener('click', scrollToFeaturesSafe);
    document.getElementById('navDashboard')?.addEventListener('click', ()=>document.getElementById('dashboard').scrollIntoView({behavior:'smooth'}));
    heroBook.addEventListener('click', ()=>document.getElementById('booking').scrollIntoView({behavior:'smooth'}));
    heroExplore.addEventListener('click', ()=>document.getElementById('features').scrollIntoView({behavior:'smooth'}));
    openBookingForm.addEventListener('click', ()=>document.getElementById('booking').scrollIntoView({behavior:'smooth'}));
    clearBookingsBtn.addEventListener('click', ()=>{ if(confirm('Clear all demo bookings?')){ localStorage.removeItem(bookingsKey); renderBookings(); updateDashboard(); }});
    exportBtn.addEventListener('click', exportCSV);
    document.getElementById('contactForm')?.addEventListener('submit', e=>{ e.preventDefault(); alert('Thanks — message sent (demo).'); e.target.reset(); });
  }

  function scrollToFeaturesSafe(){
    document.getElementById('features').scrollIntoView({behavior:'smooth'});
  }

  // Price calculation
  function calculatePrice(){
    const inDate = new Date(checkIn.value);
    const outDate = new Date(checkOut.value);
    if(!checkIn.value || !checkOut.value || outDate <= inDate){ totalPriceEl.textContent = '₹0'; return; }
    const nights = Math.round((outDate - inDate) / (1000*60*60*24));
    const pricePerNight = PRICES[roomType.value] || 0;
    const total = nights * pricePerNight;
    totalPriceEl.textContent = `₹ ${total.toLocaleString()}`;
    return total;
  }

  // Booking submit
  function onSubmitBooking(e){
    e.preventDefault();
    if(!guestName.value.trim() || !/^\d{10}$/.test(guestPhone.value.trim())){
      return alert('Please enter valid name and 10-digit phone.');
    }
    const inDate = new Date(checkIn.value);
    const outDate = new Date(checkOut.value);
    if(!checkIn.value || !checkOut.value || outDate <= inDate) return alert('Please pick a valid date range.');

    const nights = Math.round((outDate - inDate) / (1000*60*60*24));
    const price = nights * (PRICES[roomType.value] || 0);

    const booking = {
      id: 'bk_' + Date.now(),
      name: guestName.value.trim(),
      phone: guestPhone.value.trim(),
      roomType: roomType.value,
      checkIn: checkIn.value,
      checkOut: checkOut.value,
      nights, price,
      created: new Date().toISOString()
    };

    const arr = loadBookings();
    arr.push(booking);
    saveBookings(arr);
    renderBookings();
    updateDashboard();
    clearForm();
    alert('Booking reserved (demo). Check the Bookings list.');
  }

  function clearForm(){
    bookingForm.reset();
    totalPriceEl.textContent = '₹0';
  }

  // LocalStorage helpers
  function loadBookings(){ try{ return JSON.parse(localStorage.getItem(bookingsKey) || '[]'); } catch { return []; } }
  function saveBookings(arr){ localStorage.setItem(bookingsKey, JSON.stringify(arr)); }

  // Render bookings list
  function renderBookings(){
    const arr = loadBookings();
    bookingsList.innerHTML = '';
    if(arr.length === 0){
      bookingsList.innerHTML = '<div class="muted">No demo bookings yet.</div>';
      return;
    }
    arr.slice().reverse().forEach(b => {
      const el = document.createElement('div');
      el.className = 'booking-item';
      el.innerHTML = `
        <div>
          <div><strong>${escapeHtml(b.name)}</strong> • ${escapeHtml(b.roomType)}</div>
          <div class="meta">${b.checkIn} → ${b.checkOut} • ${b.nights} night(s)</div>
        </div>
        <div style="text-align:right">
          <div><strong>₹ ${b.price.toLocaleString()}</strong></div>
          <div class="meta" style="margin-top:6px"><button class="ghost small" data-id="${b.id}">Cancel</button></div>
        </div>
      `;
      el.querySelector('button')?.addEventListener('click', () => {
        if(confirm('Cancel this demo booking?')) { cancelBooking(b.id); }
      });
      bookingsList.appendChild(el);
    });
  }

  function cancelBooking(id){
    const arr = loadBookings().filter(x => x.id !== id);
    saveBookings(arr);
    renderBookings();
    updateDashboard();
  }

  // Dashboard calculations
  function updateDashboard(){
    const arr = loadBookings();
    document.getElementById('activeBookings').textContent = arr.length;
    const totalRooms = 120;
    let occupied = 0, revenue = 0;
    const today = new Date().toISOString().slice(0,10);
    arr.forEach(b => {
      revenue += b.price;
      if(b.checkIn <= today && b.checkOut > today) occupied++;
    });
    const occPercent = Math.round((occupied / totalRooms) * 100);
    document.getElementById('occupancyRate').textContent = `${occPercent}%`;
    document.getElementById('revenue30').textContent = `₹ ${revenue.toLocaleString()}`;
    document.getElementById('statActive').textContent = arr.length;
    document.getElementById('statOccupancy').textContent = `${occPercent}%`;
    document.getElementById('statRooms').textContent = totalRooms;
    fillMiniChart(arr);
    fillRevenueChart(arr);
  }

  // Simple CSV export
  function exportCSV(){
    const arr = loadBookings();
    if(arr.length === 0) return alert('No bookings to export.');
    const header = ['id','name','phone','roomType','checkIn','checkOut','nights','price','created'];
    const rows = arr.map(a => header.map(h => `"${(a[h] || '').toString().replace(/"/g,'""')}"`).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hotel_bookings_demo.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Mini chart (canvas) — bookings per day (last 7 days)
  const miniCtx = document.getElementById('miniChart')?.getContext('2d');
  function initMiniChart(){
    if(!miniCtx) return;
    miniCtx.canvas.width = miniCtx.canvas.clientWidth;
    miniCtx.canvas.height = miniCtx.canvas.clientHeight;
    drawEmptyMini();
  }
  function drawEmptyMini(){
    if(!miniCtx) return;
    miniCtx.clearRect(0,0,miniCtx.canvas.width,miniCtx.canvas.height);
    miniCtx.fillStyle = 'rgba(255,255,255,0.06)';
    miniCtx.fillRect(0,miniCtx.canvas.height-20,miniCtx.canvas.width,20);
    miniCtx.fillStyle = 'rgba(255,255,255,0.6)';
    miniCtx.fillText('Bookings trend (demo)', 8, 12);
  }
  function fillMiniChart(bookings){
    if(!miniCtx) return;
    const days = 7; const labels = []; const counts = [];
    for(let i=days-1;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      labels.push(key.slice(5)); // MM-DD
      counts.push(bookings.filter(b => b.checkIn === key).length);
    }
    // draw
    const w = miniCtx.canvas.width; const h = miniCtx.canvas.height; miniCtx.clearRect(0,0,w,h);
    const max = Math.max(...counts,1);
    const pad = 10;
    miniCtx.strokeStyle = 'rgba(91,140,255,0.9)'; miniCtx.lineWidth = 2; miniCtx.beginPath();
    counts.forEach((v,i) => {
      const x = pad + (i/(counts.length-1))*(w-pad*2);
      const y = h - pad - (v/max)*(h-pad*2);
      if(i===0) miniCtx.moveTo(x,y); else miniCtx.lineTo(x,y);
      miniCtx.fillStyle = 'rgba(91,140,255,0.3)'; miniCtx.fillRect(x-6,y,12,h-y-pad);
    });
    miniCtx.stroke();
  }

  // Revenue Chart (larger one)
  const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
  function initRevenueChart(){
    if(!revenueCtx) return;
    revenueCtx.canvas.width = revenueCtx.canvas.clientWidth;
    revenueCtx.canvas.height = revenueCtx.canvas.clientHeight;
    revenueCtx.fillStyle = 'rgba(255,255,255,0.06)';
    revenueCtx.fillRect(0,revenueCtx.canvas.height-20,revenueCtx.canvas.width,20);
  }
  function fillRevenueChart(bookings){
    if(!revenueCtx) return;
    // last 10 days
    const days = 10; const labels=[]; const sums=[];
    for(let i=days-1;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      labels.push(key.slice(5));
      sums.push(bookings.filter(b => b.created.slice(0,10) === key).reduce((s,x)=>s+x.price,0));
    }
    // draw simple bars
    const w = revenueCtx.canvas.width; const h = revenueCtx.canvas.height; revenueCtx.clearRect(0,0,w,h);
    const max = Math.max(...sums,1);
    const pad = 12; const barW = (w - pad*2) / sums.length * 0.7;
    sums.forEach((v,i) => {
      const x = pad + i*((w-pad*2)/sums.length) + ((w - pad*2)/sums.length - barW)/2;
      const bh = (v/max)*(h-pad*2);
      revenueCtx.fillStyle = 'rgba(29,211,176,0.9)';
      revenueCtx.fillRect(x, h - pad - bh, barW, bh);
    });
  }

  // Testimonials slider
  function startTestimonials(){
    const slider = document.getElementById('testSlider');
    if(!slider) return;
    let idx = 0;
    const slides = slider.querySelectorAll('.test-slide');
    setInterval(()=> {
      idx = (idx + 1) % slides.length;
      slider.style.transform = `translateX(-${idx * 100}%)`;
      slider.style.transition = 'transform 500ms ease';
    }, 4000);
  }

  // Utility: escape HTML
  function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // CSV, cancel booking handlers are above

  // Background animated particles (light)
  function initBgParticles(){
    const canvas = document.getElementById('bg'); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = innerWidth; let H = canvas.height = innerHeight;
    const pts = [];
    for(let i=0;i<60;i++) pts.push({x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.6+0.6, vx:(Math.random()-0.5)*0.4, vy:(Math.random()-0.5)*0.4});
    function loop(){
      ctx.clearRect(0,0,W,H);
      pts.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(91,140,255,0.06)';
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if(p.x<0) p.x = W; if(p.x>W) p.x = 0;
        if(p.y<0) p.y = H; if(p.y>H) p.y = 0;
      });
      requestAnimationFrame(loop);
    }
    window.addEventListener('resize', ()=>{ W = canvas.width = innerWidth; H = canvas.height = innerHeight; });
    loop();
  }

  // Helper fills
  function fillMiniChart(arr){ initMiniChart(); fillMiniChart(arr); } // wrapper not used
  function fillRevenueChart(arr){ initRevenueChart(); fillRevenueChart(arr); } // wrapper not used

  // Fix wrappers above (avoid infinite recursion by calling internal versions)
  function fillMiniChartInternal(arr){ fillMiniChart(arr); }
  function fillRevenueChartInternal(arr){ fillRevenueChart(arr); }
  // Overwrite previous assignments with correct functions
  window.fillMiniChart = fillMiniChartInternal;
  window.fillRevenueChart = fillRevenueChartInternal;

})();