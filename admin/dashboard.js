(function () {
  const DEMO_PASSWORD = 'demo1234';
  const store = window.PBPStore;
  const {
    STORAGE,
    MEMBER_RATES,
    OPERATING_START,
    OPERATING_END,
    DAILY_CAPACITY,
    today,
    formatDate,
    addDays,
    makeSlot,
    endSlot,
    prettyDate,
    prettyTime,
    toCivilTime,
    parseLocalDate,
    courtName,
    courtById,
    blocksForDate,
    validateSlot
  } = store;

  let currentRole = localStorage.getItem(STORAGE.role);
  let activeTab = 'bookings';
  let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  let pendingCancelBookingId = null;
  let pendingRemoveStaffId = null;
  let pendingRemoveMemberId = null;
  let editingMemberId = null;
  let incomePeriod = 'month';

  const el = {
    loginOverlay: document.getElementById('login-overlay'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    dashboardShell: document.getElementById('dashboard-shell'),
    roleBadge: document.getElementById('role-badge'),
    tabNav: document.getElementById('tab-nav'),
    bookingsPanel: document.getElementById('bookings-panel'),
    calendarPanel: document.getElementById('calendar-panel'),
    staffPanel: document.getElementById('staff-panel'),
    membersPanel: document.getElementById('members-panel'),
    incomePanel: document.getElementById('income-panel'),
    bookingsTable: document.getElementById('bookings-table'),
    bookingCount: document.getElementById('booking-count'),
    filterDate: document.getElementById('filter-date'),
    filterCourt: document.getElementById('filter-court'),
    filterStatus: document.getElementById('filter-status'),
    filterSearch: document.getElementById('filter-search'),
    clearDate: document.getElementById('clear-date'),
    openWalkin: document.getElementById('open-walkin'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    walkinModal: document.getElementById('walkin-modal'),
    walkinForm: document.getElementById('walkin-form'),
    walkinName: document.getElementById('walkin-name'),
    walkinContact: document.getElementById('walkin-contact'),
    walkinCourt: document.getElementById('walkin-court'),
    walkinDate: document.getElementById('walkin-date'),
    walkinTime: document.getElementById('walkin-time'),
    walkinParty: document.getElementById('walkin-party'),
    walkinWarning: document.getElementById('walkin-warning'),
    calendarTitle: document.getElementById('calendar-title'),
    calendarGrid: document.getElementById('calendar-grid'),
    prevMonth: document.getElementById('prev-month'),
    nextMonth: document.getElementById('next-month'),
    todayMonth: document.getElementById('today-month'),
    staffModal: document.getElementById('staff-modal'),
    staffForm: document.getElementById('staff-form'),
    staffName: document.getElementById('staff-name'),
    staffEmail: document.getElementById('staff-email'),
    staffRole: document.getElementById('staff-role'),
    membersModal: document.getElementById('members-modal'),
    memberForm: document.getElementById('member-form'),
    memberFormTitle: document.getElementById('member-form-title'),
    memberName: document.getElementById('member-name'),
    memberEmail: document.getElementById('member-email'),
    memberContact: document.getElementById('member-contact'),
    memberTier: document.getElementById('member-tier'),
    memberRate: document.getElementById('member-rate'),
    memberStatus: document.getElementById('member-status'),
    memberSubmit: document.getElementById('member-submit')
  };

  function peso(value) {
    return `PHP ${Number(value || 0).toLocaleString('en-PH')}`;
  }

  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function renderCourtOptions(select, includeAll) {
    select.innerHTML = '';
    if (includeAll) select.append(new Option('All courts', 'all'));
    store.courts.forEach((court) => select.append(new Option(court.name, court.id)));
  }

  function renderTimeOptions() {
    el.walkinTime.innerHTML = '';
    for (let hour = OPERATING_START; hour < OPERATING_END; hour += 1) {
      const value = makeSlot(hour);
      el.walkinTime.append(new Option(`${toCivilTime(value)} - ${toCivilTime(endSlot(value))}`, value));
    }
  }

  function sortedBookings() {
    return [...store.bookings].sort((a, b) => (
      `${a.date} ${a.startTime} ${a.courtId}`.localeCompare(`${b.date} ${b.startTime} ${b.courtId}`)
    ));
  }

  function filteredBookings() {
    const selectedDate = el.filterDate.value;
    const selectedCourt = el.filterCourt.value;
    const selectedStatus = el.filterStatus.value;
    const query = el.filterSearch.value.trim().toLowerCase();
    const todayString = formatDate(today);

    return sortedBookings().filter((booking) => {
      const dateMatches = selectedDate ? booking.date === selectedDate : booking.date >= todayString;
      const courtMatches = selectedCourt === 'all' || booking.courtId === selectedCourt;
      const statusMatches = selectedStatus === 'all' || booking.status === selectedStatus;
      const searchMatches = !query || booking.customerName.toLowerCase().includes(query);
      return dateMatches && courtMatches && statusMatches && searchMatches;
    });
  }

  function renderBookingAction(booking) {
    if (booking.status !== 'confirmed') return '<span class="muted-status">Soft-cancelled</span>';
    if (pendingCancelBookingId === booking.id) {
      return `
        <span class="confirm-actions">
          <button class="danger-button" type="button" data-confirm-cancel="${booking.id}">Confirm</button>
          <button class="small-button" type="button" data-cancel-cancel="${booking.id}">Keep</button>
        </span>
      `;
    }
    return `<button class="danger-button" type="button" data-start-cancel="${booking.id}">Cancel</button>`;
  }

  function renderBookings() {
    const rows = filteredBookings();
    el.bookingsTable.innerHTML = '';

    if (!rows.length) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="9">No bookings match the current filters.</td>';
      el.bookingsTable.append(row);
    } else {
      rows.forEach((booking) => {
        const row = document.createElement('tr');
        row.className = booking.status === 'cancelled' ? 'cancelled-row' : '';
        row.innerHTML = `
          <td>${prettyDate(booking.date)}</td>
          <td>${prettyTime(booking.startTime, booking.endTime)}</td>
          <td>${courtName(booking.courtId)}</td>
          <td>${booking.customerName}</td>
          <td>${booking.contact}</td>
          <td>${booking.partySize}</td>
          <td><span class="status-pill status-${booking.status}">${booking.status}</span></td>
          <td><span class="source-pill">${booking.source}</span></td>
          <td>${renderBookingAction(booking)}</td>
        `;
        el.bookingsTable.append(row);
      });
    }

    el.bookingCount.textContent = `${rows.length} booking${rows.length === 1 ? '' : 's'} shown`;
  }

  function bookingDensity(dateString) {
    const filled = new Set();
    store.bookings.forEach((booking) => {
      if (booking.status === 'confirmed' && booking.date === dateString) {
        filled.add(`${booking.courtId}-${booking.startTime}`);
      }
    });
    return filled.size;
  }

  function renderCalendar() {
    const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    const todayString = formatDate(today);

    el.calendarTitle.textContent = calendarCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    el.calendarGrid.innerHTML = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
      const header = document.createElement('div');
      header.className = 'weekday';
      header.textContent = day;
      el.calendarGrid.append(header);
    });

    for (let i = 0; i < 42; i += 1) {
      const date = addDays(gridStart, i);
      const dateString = formatDate(date);
      const density = bookingDensity(dateString);
      const percent = Math.min(100, Math.round((density / DAILY_CAPACITY) * 100));
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day-cell';
      if (date.getMonth() !== calendarCursor.getMonth()) cell.classList.add('outside-month');
      if (dateString === todayString) cell.classList.add('today');
      cell.dataset.date = dateString;
      cell.innerHTML = `
        <span class="day-topline">
          <span>${date.getDate()}</span>
          ${blocksForDate(dateString).length ? '<span class="block-marker" aria-label="Court block active"></span>' : ''}
        </span>
        <span class="density-track"><span class="density-fill" style="width: ${percent}%"></span></span>
        <span class="density-label">${density}/${DAILY_CAPACITY} slots booked</span>
      `;
      el.calendarGrid.append(cell);
    }
  }

  function renderStaffPanel() {
    if (currentRole !== 'owner') {
      el.staffPanel.innerHTML = '';
      return;
    }

    el.staffPanel.innerHTML = `
      <div class="staff-toolbar">
        <div>
          <p class="eyebrow">Owner tools</p>
          <h2>Staff</h2>
          <p class="staff-aside">Demo-only mock staff records. There is no backend account creation, invite, or authentication behind this list.</p>
        </div>
        <button id="open-staff-form" class="primary-button" type="button">Add Staff</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
          <tbody id="staff-table"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('staff-table');
    store.staffProfiles.forEach((profile) => {
      const row = document.createElement('tr');
      const action = pendingRemoveStaffId === profile.id
        ? `<span class="confirm-actions"><button class="danger-button" type="button" data-confirm-remove="${profile.id}">Confirm</button><button class="small-button" type="button" data-cancel-remove="${profile.id}">Keep</button></span>`
        : `<button class="danger-button" type="button" data-start-remove="${profile.id}">Remove</button>`;
      row.innerHTML = `<td>${profile.name}</td><td>${profile.email}</td><td><span class="role-badge">${profile.role}</span></td><td>${action}</td>`;
      tbody.append(row);
    });
  }

  function renderMembersPanel() {
    if (currentRole !== 'owner') {
      el.membersPanel.innerHTML = '';
      return;
    }

    el.membersPanel.innerHTML = `
      <div class="staff-toolbar">
        <div>
          <p class="eyebrow">Owner tools</p>
          <h2>Members</h2>
          <p class="staff-aside">Demo-only mock member records; no real billing, invoicing, or payment processor behind this list.</p>
        </div>
        <button id="open-member-form" class="primary-button" type="button">Add Member</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Tier</th><th>Status</th><th>Joined</th><th>Renews</th><th>Action</th></tr></thead>
          <tbody id="members-table"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('members-table');
    store.members.forEach((member) => {
      const row = document.createElement('tr');
      const removeAction = pendingRemoveMemberId === member.id
        ? `<span class="confirm-actions"><button class="danger-button" type="button" data-confirm-member-remove="${member.id}">Confirm</button><button class="small-button" type="button" data-cancel-member-remove="${member.id}">Keep</button></span>`
        : `<button class="danger-button" type="button" data-start-member-remove="${member.id}">Remove</button>`;
      row.innerHTML = `
        <td>${member.name}</td>
        <td>${member.email}</td>
        <td><span class="tier-badge tier-${member.tier}">${titleCase(member.tier)}</span></td>
        <td><span class="status-pill status-${member.status}">${member.status}</span></td>
        <td>${prettyDate(member.joinDate)}</td>
        <td>${prettyDate(member.renewalDate)}</td>
        <td><span class="confirm-actions"><button class="small-button" type="button" data-start-member-edit="${member.id}">Edit</button>${removeAction}</span></td>
      `;
      tbody.append(row);
    });
  }

  function bookingRevenue(booking) {
    const court = courtById(booking.courtId);
    return court ? court.rate : 0;
  }

  function periodRange() {
    const todayString = formatDate(today);
    if (incomePeriod === 'today') return { start: todayString, end: todayString };
    if (incomePeriod === 'month') {
      return {
        start: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
      };
    }
    return { start: '0000-01-01', end: '9999-12-31' };
  }

  function periodBookings(includeCancelled) {
    const range = periodRange();
    return store.bookings.filter((booking) => (
      booking.date >= range.start &&
      booking.date <= range.end &&
      (includeCancelled ? booking.status === 'cancelled' : booking.status === 'confirmed')
    ));
  }

  function makeBar(label, value, max) {
    const width = max ? Math.round((value / max) * 100) : 0;
    return `<div class="analytics-row"><span>${label}</span><div class="density-track"><span class="density-fill" style="width: ${width}%"></span></div><strong>${peso(value)}</strong></div>`;
  }

  function renderIncomePanel() {
    if (currentRole !== 'owner') {
      el.incomePanel.innerHTML = '';
      return;
    }

    const confirmed = periodBookings(false);
    const cancelled = periodBookings(true);
    const activeMembers = store.members.filter((member) => member.status === 'active');
    const courtRevenue = confirmed.reduce((sum, booking) => sum + bookingRevenue(booking), 0);
    const membershipMrr = activeMembers.reduce((sum, member) => sum + member.monthlyRate, 0);
    const totalRevenue = courtRevenue + membershipMrr;
    const lostBookingRevenue = cancelled.reduce((sum, booking) => sum + bookingRevenue(booking), 0);
    const churnedMrr = store.members.filter((member) => member.status === 'cancelled').reduce((sum, member) => sum + member.monthlyRate, 0);

    const byType = { indoor: 0, outdoor: 0 };
    const bySource = { online: 0, 'walk-in': 0 };
    const perCourt = store.courts.map((court) => ({ court, count: 0, revenue: 0 }));
    confirmed.forEach((booking) => {
      const court = courtById(booking.courtId);
      if (!court) return;
      const revenue = bookingRevenue(booking);
      byType[court.type] += revenue;
      bySource[booking.source] = (bySource[booking.source] || 0) + revenue;
      const courtRow = perCourt.find((row) => row.court.id === court.id);
      courtRow.count += 1;
      courtRow.revenue += revenue;
    });

    const tierRows = Object.keys(MEMBER_RATES).map((tier) => {
      const count = activeMembers.filter((member) => member.tier === tier).length;
      return { tier, count, revenue: count * MEMBER_RATES[tier] };
    });

    const trend = buildTrend(confirmed);
    const maxType = Math.max(...Object.values(byType), 1);
    const maxSource = Math.max(...Object.values(bySource), 1);
    const maxTrend = Math.max(...trend.map((item) => item.revenue), 1);

    el.incomePanel.innerHTML = `
      <div class="section-bar">
        <div>
          <p class="eyebrow">Owner analytics</p>
          <h2>Income</h2>
        </div>
        <div class="period-tabs">
          ${['today', 'month', 'all'].map((period) => `<button class="small-button ${incomePeriod === period ? 'active-period' : ''}" type="button" data-income-period="${period}">${period === 'today' ? 'Today' : period === 'month' ? 'This Month' : 'All-Time'}</button>`).join('')}
        </div>
      </div>
      <div class="summary-grid">
        <article class="summary-card"><span>Total Revenue</span><strong>${peso(totalRevenue)}</strong></article>
        <article class="summary-card"><span>Court Revenue</span><strong>${peso(courtRevenue)}</strong></article>
        <article class="summary-card"><span>Membership MRR</span><strong>${peso(membershipMrr)}</strong></article>
        <article class="summary-card"><span>Active Members</span><strong>${activeMembers.length}</strong></article>
      </div>
      <div class="analytics-grid">
        <section class="analytics-panel"><h3>Revenue by Court Type</h3>${Object.entries(byType).map(([label, value]) => makeBar(titleCase(label), value, maxType)).join('')}</section>
        <section class="analytics-panel"><h3>Revenue by Source</h3>${Object.entries(bySource).map(([label, value]) => makeBar(titleCase(label), value, maxSource)).join('')}</section>
        <section class="analytics-panel"><h3>Membership by Tier</h3>${tierRows.map((row) => makeBar(`${titleCase(row.tier)} (${row.count})`, row.revenue, membershipMrr || 1)).join('')}</section>
        <section class="analytics-panel"><h3>Revenue Trend</h3>${trend.map((row) => makeBar(row.label, row.revenue, maxTrend)).join('')}</section>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Court</th><th>Type</th><th>Bookings</th><th>Revenue</th></tr></thead>
          <tbody>${perCourt.sort((a, b) => b.revenue - a.revenue).map((row) => `<tr><td>${row.court.name}</td><td>${row.court.type}</td><td>${row.count}</td><td>${peso(row.revenue)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <article class="churn-card">
        <span>Lost revenue signal</span>
        <strong>${peso(lostBookingRevenue + churnedMrr)}</strong>
        <p>Cancelled bookings in period: ${peso(lostBookingRevenue)}. Churned MRR: ${peso(churnedMrr)}.</p>
      </article>
    `;
  }

  function buildTrend(confirmed) {
    const buckets = new Map();
    if (incomePeriod === 'today') {
      const label = prettyDate(formatDate(today));
      buckets.set(label, 0);
    }

    confirmed.forEach((booking) => {
      const date = parseLocalDate(booking.date);
      const label = incomePeriod === 'all'
        ? `Week of ${prettyDate(formatDate(addDays(date, -date.getDay())))}`
        : prettyDate(booking.date);
      buckets.set(label, (buckets.get(label) || 0) + bookingRevenue(booking));
    });

    return [...buckets.entries()].map(([label, revenue]) => ({ label, revenue }));
  }

  function renderTabs() {
    const tabs = [
      { id: 'bookings', label: 'Bookings' },
      { id: 'calendar', label: 'Calendar' }
    ];

    if (currentRole === 'owner') {
      tabs.push({ id: 'staff', label: 'Staff' }, { id: 'members', label: 'Members' }, { id: 'income', label: 'Income' });
    }

    if (['staff', 'members', 'income'].includes(activeTab) && currentRole !== 'owner') {
      activeTab = 'bookings';
    }

    el.tabNav.innerHTML = '';
    tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.id = `${tab.id}-tab`;
      button.className = 'tab-button';
      button.type = 'button';
      button.dataset.tab = tab.id;
      button.setAttribute('aria-selected', String(tab.id === activeTab));
      button.textContent = tab.label;
      el.tabNav.append(button);
    });

    el.bookingsPanel.hidden = activeTab !== 'bookings';
    el.calendarPanel.hidden = activeTab !== 'calendar';
    el.staffPanel.hidden = activeTab !== 'staff';
    el.membersPanel.hidden = activeTab !== 'members';
    el.incomePanel.hidden = activeTab !== 'income';
  }

  function renderAll() {
    el.roleBadge.textContent = currentRole === 'owner' ? 'Owner' : 'Staff';
    renderTabs();
    renderBookings();
    renderCalendar();
    renderStaffPanel();
    renderMembersPanel();
    renderIncomePanel();
  }

  function showDashboard() {
    el.loginOverlay.hidden = true;
    el.dashboardShell.hidden = false;
    renderAll();
  }

  function showLogin() {
    el.loginOverlay.hidden = false;
    el.dashboardShell.hidden = true;
  }

  function openModal(modal) {
    el.modalBackdrop.hidden = false;
    el.walkinModal.hidden = modal !== el.walkinModal;
    el.staffModal.hidden = modal !== el.staffModal;
    el.membersModal.hidden = modal !== el.membersModal;
  }

  function closeModals() {
    el.walkinModal.hidden = true;
    el.staffModal.hidden = true;
    el.membersModal.hidden = true;
    el.modalBackdrop.hidden = true;
    el.walkinWarning.hidden = true;
    editingMemberId = null;
  }

  function addWalkin() {
    const warning = validateSlot(el.walkinCourt.value, el.walkinDate.value, el.walkinTime.value);
    if (warning) {
      el.walkinWarning.textContent = warning;
      el.walkinWarning.hidden = false;
      return;
    }

    store.bookings.push({
      id: `bk-${Date.now()}`,
      courtId: el.walkinCourt.value,
      date: el.walkinDate.value,
      startTime: el.walkinTime.value,
      endTime: endSlot(el.walkinTime.value),
      customerName: el.walkinName.value.trim(),
      contact: el.walkinContact.value.trim(),
      partySize: Number(el.walkinParty.value),
      status: 'confirmed',
      source: 'walk-in',
      createdBy: 'demo-staff'
    });
    store.saveBookings();
    closeModals();
    renderAll();
  }

  function openMemberForm(member) {
    editingMemberId = member ? member.id : null;
    el.memberForm.reset();
    el.memberFormTitle.textContent = member ? 'Edit Member' : 'Add Member';
    el.memberSubmit.textContent = member ? 'Save Changes' : 'Add Member';
    el.memberName.value = member ? member.name : '';
    el.memberEmail.value = member ? member.email : '';
    el.memberContact.value = member ? member.contact : '';
    el.memberTier.value = member ? member.tier : 'basic';
    el.memberStatus.value = member ? member.status : 'active';
    updateMemberRate();
    openModal(el.membersModal);
  }

  function updateMemberRate() {
    el.memberRate.value = peso(MEMBER_RATES[el.memberTier.value]);
  }

  function saveMemberFromForm() {
    const tier = el.memberTier.value;
    const payload = {
      name: el.memberName.value.trim(),
      email: el.memberEmail.value.trim(),
      contact: el.memberContact.value.trim(),
      tier,
      monthlyRate: MEMBER_RATES[tier],
      status: el.memberStatus.value
    };

    if (editingMemberId) {
      const member = store.members.find((item) => item.id === editingMemberId);
      Object.assign(member, payload);
    } else {
      store.members.push({
        id: `member-${Date.now()}`,
        ...payload,
        joinDate: formatDate(today),
        renewalDate: formatDate(addDays(today, 30))
      });
    }
    store.saveMembers();
    closeModals();
    renderAll();
  }

  function attachEvents() {
    el.loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const password = document.getElementById('demo-password').value;
      // Demo-only cosmetic gate: this client-side string comparison is visible in source,
      // easy to bypass, and must never be treated or presented as real security.
      if (password !== DEMO_PASSWORD) {
        el.loginError.textContent = 'Use the demo password shown above.';
        el.loginError.hidden = false;
        return;
      }
      currentRole = document.getElementById('demo-role').value;
      localStorage.setItem(STORAGE.role, currentRole);
      el.loginError.hidden = true;
      showDashboard();
    });

    document.getElementById('logout').addEventListener('click', () => {
      localStorage.removeItem(STORAGE.role);
      currentRole = null;
      showLogin();
    });

    el.tabNav.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tab]');
      if (!button) return;
      activeTab = button.dataset.tab;
      renderAll();
    });

    [el.filterDate, el.filterCourt, el.filterStatus, el.filterSearch].forEach((control) => {
      control.addEventListener('input', () => {
        pendingCancelBookingId = null;
        renderBookings();
      });
    });

    el.clearDate.addEventListener('click', () => {
      el.filterDate.value = '';
      renderBookings();
    });

    el.bookingsTable.addEventListener('click', (event) => {
      const startButton = event.target.closest('[data-start-cancel]');
      const confirmButton = event.target.closest('[data-confirm-cancel]');
      const keepButton = event.target.closest('[data-cancel-cancel]');

      if (startButton) {
        pendingCancelBookingId = startButton.dataset.startCancel;
        renderBookings();
      }
      if (confirmButton) {
        const booking = store.bookings.find((item) => item.id === confirmButton.dataset.confirmCancel);
        if (booking) {
          booking.status = 'cancelled';
          store.saveBookings();
        }
        pendingCancelBookingId = null;
        renderAll();
      }
      if (keepButton) {
        pendingCancelBookingId = null;
        renderBookings();
      }
    });

    el.openWalkin.addEventListener('click', () => {
      el.walkinForm.reset();
      el.walkinDate.value = el.filterDate.value || formatDate(today);
      el.walkinWarning.hidden = true;
      openModal(el.walkinModal);
    });
    el.walkinForm.addEventListener('submit', (event) => {
      event.preventDefault();
      addWalkin();
    });

    [el.walkinCourt, el.walkinDate, el.walkinTime].forEach((control) => {
      control.addEventListener('input', () => {
        const warning = validateSlot(el.walkinCourt.value, el.walkinDate.value, el.walkinTime.value);
        el.walkinWarning.textContent = warning;
        el.walkinWarning.hidden = !warning;
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
    el.modalBackdrop.addEventListener('click', (event) => {
      if (event.target === el.modalBackdrop) closeModals();
    });

    el.prevMonth.addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      renderCalendar();
    });
    el.nextMonth.addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      renderCalendar();
    });
    el.todayMonth.addEventListener('click', () => {
      calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
      renderCalendar();
    });
    el.calendarGrid.addEventListener('click', (event) => {
      const cell = event.target.closest('[data-date]');
      if (!cell) return;
      el.filterDate.value = cell.dataset.date;
      activeTab = 'bookings';
      renderAll();
    });

    el.staffPanel.addEventListener('click', (event) => {
      const openButton = event.target.closest('#open-staff-form');
      const startButton = event.target.closest('[data-start-remove]');
      const confirmButton = event.target.closest('[data-confirm-remove]');
      const keepButton = event.target.closest('[data-cancel-remove]');
      if (openButton) {
        el.staffForm.reset();
        openModal(el.staffModal);
      }
      if (startButton) {
        pendingRemoveStaffId = startButton.dataset.startRemove;
        renderStaffPanel();
      }
      if (confirmButton) {
        store.staffProfiles = store.staffProfiles.filter((profile) => profile.id !== confirmButton.dataset.confirmRemove);
        pendingRemoveStaffId = null;
        renderStaffPanel();
      }
      if (keepButton) {
        pendingRemoveStaffId = null;
        renderStaffPanel();
      }
    });
    el.staffForm.addEventListener('submit', (event) => {
      event.preventDefault();
      // Portfolio mock only: this app pushes a display record and creates no real account, login, invite, or backend identity.
      store.staffProfiles.push({ id: `staff-${Date.now()}`, name: el.staffName.value.trim(), email: el.staffEmail.value.trim(), role: el.staffRole.value });
      store.saveStaff();
      closeModals();
      renderAll();
    });

    el.membersPanel.addEventListener('click', (event) => {
      const openButton = event.target.closest('#open-member-form');
      const editButton = event.target.closest('[data-start-member-edit]');
      const startButton = event.target.closest('[data-start-member-remove]');
      const confirmButton = event.target.closest('[data-confirm-member-remove]');
      const keepButton = event.target.closest('[data-cancel-member-remove]');
      if (openButton) openMemberForm(null);
      if (editButton) openMemberForm(store.members.find((member) => member.id === editButton.dataset.startMemberEdit));
      if (startButton) {
        pendingRemoveMemberId = startButton.dataset.startMemberRemove;
        renderMembersPanel();
      }
      if (confirmButton) {
        store.members = store.members.filter((member) => member.id !== confirmButton.dataset.confirmMemberRemove);
        pendingRemoveMemberId = null;
        renderMembersPanel();
        renderIncomePanel();
      }
      if (keepButton) {
        pendingRemoveMemberId = null;
        renderMembersPanel();
      }
    });
    el.memberTier.addEventListener('input', updateMemberRate);
    el.memberForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveMemberFromForm();
    });

    el.incomePanel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-income-period]');
      if (!button) return;
      incomePeriod = button.dataset.incomePeriod;
      renderIncomePanel();
    });
  }

  function init() {
    renderCourtOptions(el.filterCourt, true);
    renderCourtOptions(el.walkinCourt, false);
    renderTimeOptions();
    updateMemberRate();
    attachEvents();

    if (currentRole === 'owner' || currentRole === 'staff') {
      showDashboard();
    } else {
      showLogin();
    }
  }

  init();
}());
